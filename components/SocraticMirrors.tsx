import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Sparkles, Loader2, Mic, MicOff, X } from 'lucide-react';
import { getGeminiChat } from '../services/geminiService';
import { Message } from '../types';
import { Chat, GenerateContentResponse, GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// --- Audio Helper Functions for Gemini Live API ---

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Resample audio to 16kHz for Gemini Input (Low Latency optimized)
const resampleTo16kHZ = (audioData: Float32Array, sampleRate: number): Int16Array => {
  const targetSampleRate = 16000;
  if (sampleRate === targetSampleRate) {
    const l = audioData.length;
    const result = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      result[i] = Math.max(-1, Math.min(1, audioData[i])) * 32768;
    }
    return result;
  }
  
  const ratio = sampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Int16Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const originalIndex = Math.floor(i * ratio);
    const val = audioData[originalIndex]; 
    result[i] = Math.max(-1, Math.min(1, val)) * 32768;
  }
  return result;
};

const SocraticMirrors: React.FC = () => {
  // --- Text Chat State ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'model',
      content: "Eu sou um espelho, não um conselheiro. Diga-me o que pesa em sua mente e eu o ajudarei a examinar.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Voice Mode State ---
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'listening' | 'processing' | 'speaking' | 'interrupted'>('listening');
  
  // Visualizer States
  const [aiVolume, setAiVolume] = useState(0);       // Volume of the model speaking
  const [userMicLevel, setUserMicLevel] = useState(0); // Volume of the user mic input
  const [isUserSpeaking, setIsUserSpeaking] = useState(false); // Client-side VAD

  // --- Refs ---
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Contexts for Live API
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const liveSessionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize text chat session
    chatSessionRef.current = getGeminiChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isVoiceMode]);

  // --- Text Handling ---

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
         setTimeout(() => {
             const fallbackMsg: Message = {
                 id: (Date.now() + 1).toString(),
                 role: 'model',
                 content: "Estou com dificuldades para me conectar aos meus reflexos. Tente novamente.",
                 timestamp: Date.now()
             };
             setMessages(prev => [...prev, fallbackMsg]);
             setIsLoading(false);
         }, 1000);
         return;
      }

      const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({
          message: userMsg.content
      });

      const modelMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: result.text || "...",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Voice Handling (Gemini Live) ---

  const startVoiceSession = async () => {
    setIsVoiceMode(true);
    setIsConnectingVoice(true);
    setVoiceStatus('listening');

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // 24kHz is standard output for Gemini Flash Audio
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 }); 
      
      // Request Mic - optimizing constraints for Voice (Low Latency)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true, // Essential for Full Duplex to avoid AI hearing itself
          noiseSuppression: true,
          autoGainControl: true,
          latency: 0 // Request lowest possible latency
        } as any
      });
      mediaStreamRef.current = stream;

      const apiKey = process.env.API_KEY || '';
      const client = new GoogleGenAI({ apiKey });

      const sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          // System instruction tuned for natural conversation flow
          systemInstruction: `Você é o "Espelho Socrático". 
          
          OBJETIVO: Levar o usuário à autodescoberta através da reflexão profunda.

          DIRETRIZES DE PROSÓDIA E ÁUDIO (CRÍTICO):
          1. **Ritmo Lento:** Fale devagar. Não tenha pressa. Imagine que você está conversando ao lado de uma fogueira. O silêncio é permitido e encorajado.
          2. **Pausas Naturais:** Faça pausas breves entre as frases para que o usuário possa absorver o significado. Não despeje informações rapidamente.
          3. **Tom de Voz:** Mantenha um tom sereno, empático, profundo e acolhedor. Evite o tom padrão "animado" de assistentes virtuais. Seja humano, falível e reflexivo.
          
          ESTRUTURA DA CONVERSA:
          - Faça apenas UMA pergunta por vez.
          - Use perguntas abertas ("O que...", "Como...").
          - Evite dar conselhos. Apenas reflita o que o usuário disse para que ele mesmo encontre a resposta.
          - Se o usuário interromper, pare imediatamente.
          
          Idioma: Português Brasileiro.`,
        },
        callbacks: {
          onopen: () => {
            console.log("Voice connection opened");
            setIsConnectingVoice(false);
            
            // --- Input Streaming Setup ---
            const inputCtx = new AudioContext({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            
            // BUFFER SIZE OPTIMIZATION: 
            // 2048 provides a good balance between low latency (~128ms at 16k) and stability.
            // Lowering to 1024 is possible but risks audio glitches on slower devices.
            const processor = inputCtx.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // --- Client-Side VAD (Voice Activity Detection) ---
              // Simple energy-based detection for UI feedback
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
              const avg = sum / inputData.length;
              
              const vadThreshold = 0.01; // Adjust based on noise floor
              const isSpeakingNow = avg > vadThreshold;
              
              setUserMicLevel(Math.min(1, avg * 15)); // Visual gain
              setIsUserSpeaking(isSpeakingNow);

              if (isSpeakingNow) {
                 // If user is speaking, visual state update
                 // Note: We don't stop AI here; we let the Server VAD decide interruption to avoid false positives.
              }

              // Resample and Send
              const pcmData = resampleTo16kHZ(inputData, inputCtx.sampleRate);
              const base64Audio = arrayBufferToBase64(pcmData.buffer);

              sessionPromise.then(session => {
                  session.sendRealtimeInput({
                      media: {
                          mimeType: 'audio/pcm;rate=16000',
                          data: base64Audio
                      }
                  });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // 1. Handle Interruption (Full Duplex / Barge-in)
            // If the server detects the user interrupting, it sends this flag.
            if (message.serverContent?.interrupted) {
                console.log("Interruption detected - Stopping playback");
                setVoiceStatus('interrupted');
                
                // CRITICAL: Stop all currently playing nodes immediately
                audioQueueRef.current.forEach(src => {
                    try { src.stop(); } catch(e){}
                });
                audioQueueRef.current = [];
                nextStartTimeRef.current = 0;
                setAiVolume(0);
                
                // Briefly reset status then go back to listening
                setTimeout(() => setVoiceStatus('listening'), 500);
                return; 
            }

            // 2. Handle Turn Complete (End of AI speech)
            if (message.serverContent?.turnComplete) {
                setVoiceStatus('listening');
            }

            // 3. Handle Output Audio
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
                setVoiceStatus('speaking');
                
                const ctx = audioContextRef.current;
                const rawBytes = base64ToUint8Array(audioData);
                const float32Data = new Float32Array(rawBytes.length / 2);
                const dataView = new DataView(rawBytes.buffer);
                
                for (let i = 0; i < float32Data.length; i++) {
                    float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
                }

                // Volume visualization logic
                let sum = 0;
                for (let i=0; i<float32Data.length; i+=10) sum += Math.abs(float32Data[i]);
                setAiVolume((sum / (float32Data.length/10)) * 3);

                const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
                audioBuffer.getChannelData(0).set(float32Data);

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                // Low-Latency Queueing
                const currentTime = ctx.currentTime;
                // If next start time is in the past (gap), start NOW. 
                // Don't try to catch up to a drift, just play immediate.
                const startTime = Math.max(currentTime, nextStartTimeRef.current);
                
                source.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                
                audioQueueRef.current.push(source);
                source.onended = () => {
                    const idx = audioQueueRef.current.indexOf(source);
                    if (idx > -1) audioQueueRef.current.splice(idx, 1);
                    if (audioQueueRef.current.length === 0) {
                         // Fallback to listening state if queue empties naturally
                         setAiVolume(0); 
                    }
                };
            }
          },
          onclose: () => {
            console.log("Voice connection closed");
            stopVoiceSession();
          },
          onerror: (err) => {
            console.error("Voice connection error", err);
            stopVoiceSession();
          }
        }
      });
      
      liveSessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start voice session", error);
      stopVoiceSession();
    }
  };

  const stopVoiceSession = () => {
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    setIsVoiceMode(false);
    setIsConnectingVoice(false);
    setAiVolume(0);
    setUserMicLevel(0);
    setIsUserSpeaking(false);
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
  };

  return (
    <div className="w-full h-full flex flex-col bg-surface overflow-hidden relative">
      
      {/* --- Voice Mode Overlay --- */}
      <div 
        className={`absolute inset-0 z-50 bg-void/95 backdrop-blur-xl flex flex-col items-center justify-center transition-all duration-700 ${isVoiceMode ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
         <button 
           onClick={stopVoiceSession}
           className="absolute top-6 right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-starlight transition-all"
         >
           <X className="w-6 h-6" />
         </button>

         {/* The Living Voice Orb - Full Duplex Visuals */}
         <div className="relative flex items-center justify-center">
            
            {/* 1. AI Output Aura */}
            <div 
              className="absolute rounded-full bg-starlight/10 blur-3xl transition-all duration-100 ease-out"
              style={{
                width: `${200 + aiVolume * 400}px`,
                height: `${200 + aiVolume * 400}px`,
                opacity: 0.3
              }}
            />

            {/* 2. User Mic Level / VAD Indicator */}
            <div 
              className="absolute rounded-full border border-white transition-all duration-75 ease-out"
              style={{
                width: `${140 + userMicLevel * 100}px`,
                height: `${140 + userMicLevel * 100}px`,
                opacity: isUserSpeaking ? 0.6 : 0, // Explicit VAD visual
                borderColor: userMicLevel > 0.9 ? '#ef4444' : (isUserSpeaking ? '#ffffff' : 'transparent'),
                borderWidth: '2px'
              }}
            />
            
            {/* 3. Core Orb */}
            <div 
              className={`w-32 h-32 rounded-full border border-starlight/20 flex items-center justify-center transition-all duration-300 relative ${isConnectingVoice ? 'animate-pulse' : ''}`}
              style={{
                transform: `scale(${1 + aiVolume * 1.5})`,
                boxShadow: `0 0 ${20 + aiVolume * 50}px ${aiVolume > 0.1 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
               <div className="absolute inset-0 rounded-full border border-white/10 animate-[spin_10s_linear_infinite]" />
               <div className="absolute inset-2 rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]" />
               
               {isConnectingVoice ? (
                 <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
               ) : (
                 <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_white] transition-all duration-200 ${
                     voiceStatus === 'speaking' ? 'bg-starlight scale-150' : 
                     (isUserSpeaking ? 'bg-emerald-400 scale-125' : 'bg-zinc-600')
                 }`} />
               )}
            </div>
         </div>

         <div className="mt-12 text-center space-y-2 h-16">
            <h3 className="text-2xl font-display font-light text-starlight tracking-widest transition-all duration-300">
                {isConnectingVoice ? 'SINTONIZANDO...' : 
                 (voiceStatus === 'interrupted' ? 'INTERROMPIDO' : 
                 (isUserSpeaking ? 'OUVINDO...' : 
                 (voiceStatus === 'speaking' ? 'FALANDO' : 'AGUARDANDO')))}
            </h3>
            <p className="text-zinc-500 font-light text-xs max-w-xs mx-auto">
               {isUserSpeaking ? 'Você está falando...' : 'O Espelho está ouvindo.'}
            </p>
         </div>
      </div>

      {/* --- Text Mode Interface (Hidden in Voice Mode) --- */}
      <div className={`h-16 border-b border-mist flex items-center justify-center bg-void/50 backdrop-blur-md z-10 transition-opacity duration-500 ${isVoiceMode ? 'opacity-0' : 'opacity-100'}`}>
        <h2 className="text-xl font-display font-light tracking-widest text-starlight">ESPELHOS SOCRÁTICOS</h2>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-6 transition-opacity duration-500 ${isVoiceMode ? 'opacity-0' : 'opacity-100'}`}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] md:max-w-[70%] animate-fade-in flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-zinc-800 border-zinc-700' : 'bg-starlight/10 border-starlight/20'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-400" /> : <Sparkles className="w-4 h-4 text-starlight" />}
              </div>
              <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-sm md:text-base font-light leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-zinc-800 text-starlight rounded-tr-none' 
                    : 'bg-transparent border border-mist text-zinc-300 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full animate-pulse">
             <div className="flex gap-4 max-w-[70%]">
                <div className="w-8 h-8 rounded-full bg-starlight/10 border border-starlight/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-starlight animate-spin" />
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-4 bg-void border-t border-mist transition-opacity duration-500 ${isVoiceMode ? 'opacity-0' : 'opacity-100'}`}>
        <div className="max-w-4xl mx-auto relative flex items-center gap-2">
            <button
               onClick={startVoiceSession}
               className="group relative w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
               title="Falar com o Espelho"
            >
               <Mic className="w-5 h-5 text-zinc-500 group-hover:text-starlight transition-colors" />
               <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-starlight text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                 Modo Voz
               </span>
            </button>

            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Digite seu pensamento aqui..."
                disabled={isLoading}
                className="flex-1 bg-surface border border-mist rounded-full px-6 py-4 text-starlight placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-all disabled:opacity-50"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-14 h-14 rounded-full bg-starlight text-void flex items-center justify-center hover:bg-white hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-starlight"
            >
                <Send className="w-5 h-5 ml-0.5" />
            </button>
        </div>
        <div className="text-center mt-2 text-[10px] text-zinc-700">
            IA executada no Gemini Flash. As conversas são efêmeras.
        </div>
      </div>
    </div>
  );
};

export default SocraticMirrors;