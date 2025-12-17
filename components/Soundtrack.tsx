import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Volume2, Waves } from 'lucide-react';
import { AudioState } from '../types';

const Soundtrack: React.FC = () => {
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    volume: 0.5,
    mood: 'calm'
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const lfoRef = useRef<OscillatorNode | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
  };

  const createDrone = (mood: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(audioState.volume * 0.3, ctx.currentTime);
    masterGain.connect(ctx.destination);
    gainNodeRef.current = masterGain;

    // Frequencies based on mood
    let freqs = [110, 165, 220]; // Default chords
    if (mood === 'deep') freqs = [55, 110, 165, 55.5]; // Lower, darker, binaural beat
    if (mood === 'focus') freqs = [220, 330, 440, 660]; // Higher, clearer

    const oscs: OscillatorNode[] = [];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      // Detune for organic feel
      osc.detune.setValueAtTime((Math.random() - 0.5) * 10, ctx.currentTime);

      // Simple LFO for movement
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.05 + Math.random() * 0.1, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.1, ctx.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);
      lfo.start();
      
      oscGain.gain.setValueAtTime(0.2 / freqs.length, ctx.currentTime);
      
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      
      oscs.push(osc);
      oscs.push(lfo); // Keep track to stop later
    });

    oscillatorsRef.current = oscs;
  };

  const stopAudio = () => {
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    oscillatorsRef.current = [];
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
    }
  };

  const togglePlay = () => {
    if (audioState.isPlaying) {
      stopAudio();
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    } else {
      initAudio();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      createDrone(audioState.mood);
      setAudioState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setAudioState(prev => ({ ...prev, volume: newVolume }));
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(newVolume * 0.3, audioContextRef.current.currentTime, 0.1);
    }
  };

  // Re-create drone if mood changes while playing
  useEffect(() => {
    if (audioState.isPlaying) {
      stopAudio();
      createDrone(audioState.mood);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioState.mood]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const moodLabels: {[key: string]: string} = {
    calm: 'CALMA',
    focus: 'FOCO',
    deep: 'PROFUNDO'
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-void via-surface to-void">
      <div className="w-full max-w-md p-8 bg-mist/20 backdrop-blur-md rounded-2xl border border-mist shadow-xl space-y-8">
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-light text-starlight">Trilha Sonora do Ser</h2>
          <p className="text-sm text-ash">Paisagens sonoras biométricas para foco profundo.</p>
        </div>

        {/* Visualizer Simulation */}
        <div className="h-32 w-full flex items-center justify-center gap-1 overflow-hidden">
           {audioState.isPlaying ? (
             Array.from({ length: 20 }).map((_, i) => (
               <div 
                key={i}
                className="w-2 bg-zinc-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDuration: `${0.5 + Math.random()}s`,
                  opacity: 0.3 + Math.random() * 0.7
                }}
               />
             ))
           ) : (
             <div className="w-full h-[1px] bg-zinc-800" />
           )}
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-8">
           <button 
             onClick={togglePlay}
             className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${audioState.isPlaying ? 'bg-zinc-800 shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-starlight text-void hover:scale-105'}`}
           >
             {audioState.isPlaying ? <Square className="w-8 h-8 text-starlight" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
           </button>
        </div>

        {/* Mood Selectors */}
        <div className="grid grid-cols-3 gap-4">
          {['calm', 'focus', 'deep'].map((m) => (
             <button
               key={m}
               onClick={() => setAudioState(prev => ({ ...prev, mood: m as any }))}
               className={`py-3 rounded-lg text-sm font-medium tracking-wide transition-all border ${
                 audioState.mood === m 
                   ? 'bg-zinc-800 border-zinc-600 text-starlight shadow-lg' 
                   : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
               }`}
             >
               {moodLabels[m]}
             </button>
          ))}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-4 text-zinc-500">
          <Volume2 className="w-5 h-5" />
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={audioState.volume} 
            onChange={handleVolumeChange}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-starlight [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

      </div>
    </div>
  );
};

export default Soundtrack;