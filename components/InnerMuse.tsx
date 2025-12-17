import React, { useState, useEffect, useRef } from 'react';
import { StopCircle, Save, BookOpen, X, Edit3, Download, Check, Trash2, Calendar, Activity, Loader2 } from 'lucide-react';
import { generateMuseImage, analyzeEmotionalState } from '../services/geminiService';
import { EmotionAnalysis, MuseEntry } from '../types';

// --- PSYCHO-VISUAL ENGINE ---
class DynamicParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    history: {x: number, y: number}[];
    maxLength: number;
    angle: number;
    speed: number;
    mode: 'JAGGED' | 'VISCOUS' | 'SERENE' | 'EXPLOSIVE';
    age: number;
    lifeSpan: number;
    
    constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = 0;
        this.vy = 0;
        this.history = [];
        this.maxLength = 15;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 2 + 1;
        this.mode = 'SERENE';
        this.age = 0;
        this.lifeSpan = Math.random() * 200 + 100;
    }

    reset(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.history = [];
        this.age = 0;
    }

    update(w: number, h: number, emotion: EmotionAnalysis, typing: number, time: number) {
        this.age++;
        const { valence, intensity } = emotion;
        
        // Determine Mode
        if (valence < 0) {
            this.mode = intensity > 0.6 ? 'JAGGED' : 'VISCOUS';
        } else {
            this.mode = intensity > 0.6 ? 'EXPLOSIVE' : 'SERENE';
        }

        const scale = 0.002;
        let noise = Math.sin(this.x * scale + time) * Math.cos(this.y * scale + time * 0.8) * Math.PI * 2;
        
        // Physics based on mode
        let targetVx = 0;
        let targetVy = 0;
        let jitter = 0;

        switch (this.mode) {
            case 'JAGGED': // Anxiety/Anger
                jitter = (Math.random() - 0.5) * (intensity * 10);
                this.angle += (Math.random() - 0.5) * intensity * 2;
                this.speed = 4 + intensity * 5 + typing * 3;
                break;
            case 'VISCOUS': // Sadness/Melancholy (Sinking)
                targetVy = 1.5 + Math.abs(valence) * 2; // Downward gravity
                this.speed = 0.5 + intensity * 0.5;
                noise *= 0.2;
                break;
            case 'SERENE': // Peace (Floating)
                targetVx = Math.cos(time * 0.5) * 0.5;
                this.speed = 1;
                this.angle += 0.01;
                break;
            case 'EXPLOSIVE': // Joy (Ascending)
                targetVy = - (2 + intensity * 4); // Upward lift
                jitter = (Math.random() - 0.5) * 2;
                this.speed = 3 + intensity * 3 + typing * 5;
                break;
        }

        const moveAngle = this.angle + noise;
        this.vx += (Math.cos(moveAngle) * this.speed + targetVx + jitter - this.vx) * 0.1;
        this.vy += (Math.sin(moveAngle) * this.speed + targetVy + jitter - this.vy) * 0.1;

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around
        if (this.x < 0) this.x = w;
        if (this.x > w) this.x = 0;
        if (this.y < 0) this.y = h;
        if (this.y > h) this.y = 0;

        this.history.push({ x: this.x, y: this.y });
        const dynamicLen = this.mode === 'JAGGED' ? 5 : (this.mode === 'VISCOUS' ? 30 : 15);
        if (this.history.length > dynamicLen) this.history.shift();

        if (this.age > this.lifeSpan) this.reset(w, h);
    }
}

const LivingCanvas: React.FC<{
    emotion: EmotionAnalysis;
    typingActivity: number;
    isGenerating: boolean;
}> = ({ emotion, typingActivity, isGenerating }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<DynamicParticle[]>([]);
    const requestRef = useRef<number>(0);
    const timeRef = useRef<number>(0);

    useEffect(() => {
        const init = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particlesRef.current = Array.from({ length: 400 }, () => new DynamicParticle(canvas.width, canvas.height));
        };
        init();
        window.addEventListener('resize', init);
        return () => window.removeEventListener('resize', init);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const animate = () => {
            const w = canvas.width;
            const h = canvas.height;
            timeRef.current += 0.01 + (typingActivity * 0.02);

            // Trails
            ctx.fillStyle = `rgba(0, 0, 0, ${emotion.valence < 0 && emotion.intensity < 0.5 ? 0.05 : 0.12})`; 
            ctx.fillRect(0, 0, w, h);

            ctx.globalCompositeOperation = 'lighter';
            particlesRef.current.forEach(p => {
                p.update(w, h, emotion, typingActivity, timeRef.current);
                
                ctx.beginPath();
                ctx.strokeStyle = emotion.color + (p.mode === 'JAGGED' ? 'AA' : '66');
                ctx.lineWidth = p.mode === 'JAGGED' ? 2 : 1.5;
                ctx.lineCap = 'round';
                
                if (p.history.length > 1) {
                    const last = p.history[p.history.length - 2];
                    ctx.moveTo(last.x, last.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                }

                // Add "Beams of Light" if moving from negative to positive
                if (emotion.valence > -0.2 && emotion.valence < 0.2 && Math.random() > 0.995) {
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#ffffff';
                    ctx.strokeStyle = '#ffffff44';
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            });
            
            ctx.globalCompositeOperation = 'source-over';
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [emotion, typingActivity]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 bg-black" />;
};

const InnerMuse: React.FC = () => {
  const [text, setText] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  const [emotionData, setEmotionData] = useState<EmotionAnalysis>({ label: 'Silêncio', color: '#6b7280', intensity: 0.1, valence: 0 });
  const [typingActivity, setTypingActivity] = useState(0);
  const [savedEntries, setSavedEntries] = useState<MuseEntry[]>([]);
  const [showJournal, setShowJournal] = useState(false);
  const [hasSavedCurrent, setHasSavedCurrent] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('muse_journal');
      if (saved) setSavedEntries(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setTypingActivity(prev => Math.min(prev + 0.2, 1.5));
  };

  useEffect(() => {
    const interval = setInterval(() => setTypingActivity(prev => Math.max(prev * 0.92, 0)), 50); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isSessionActive || text.length < 5) return;
    const timeout = setTimeout(async () => {
      const analysis = await analyzeEmotionalState(text);
      setEmotionData(analysis);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [text, isSessionActive]);

  const handleFinishSession = async () => {
    if (text.trim().length > 3) {
        setIsSessionActive(false);
        setIsGeneratingImage(true);
        setHasSavedCurrent(false);
        try {
            const newImage = await generateMuseImage(text, emotionData);
            setCurrentImage(newImage);
        } catch(e) { console.error(e); }
        finally { setIsGeneratingImage(false); }
    }
  };

  const handleSaveToJournal = () => {
    setIsSaving(true);
    const newEntry: MuseEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        text: text,
        emotion: emotionData,
        imageUrl: currentImage
    };
    const updated = [newEntry, ...savedEntries];
    setSavedEntries(updated);
    localStorage.setItem('muse_journal', JSON.stringify(updated));
    setHasSavedCurrent(true);
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleDownloadImage = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `Soul-Reflex-${emotionData.label}-${Date.now()}.png`;
    link.click();
  };

  const handleDeleteEntry = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedEntries.filter(entry => entry.id !== id);
    setSavedEntries(updated);
    localStorage.setItem('muse_journal', JSON.stringify(updated));
  };

  const loadEntry = (entry: MuseEntry) => {
      setText(entry.text);
      setEmotionData(entry.emotion);
      setCurrentImage(entry.imageUrl);
      setIsSessionActive(false);
      setShowJournal(false);
      setHasSavedCurrent(true);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black font-sans">
      
      {/* FLASH EFFECT */}
      <div className={`absolute inset-0 z-[100] bg-white pointer-events-none transition-opacity duration-700 ${isSaving ? 'opacity-20' : 'opacity-0'}`} />

      {/* BACKGROUND REFLECTION */}
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-[2000ms]"
           style={{ 
             backgroundImage: currentImage ? `url(${currentImage})` : 'none',
             opacity: (!isSessionActive && currentImage) ? 0.7 : 0, 
             filter: 'blur(30px) brightness(0.5)'
           }} />

      <LivingCanvas emotion={emotionData} typingActivity={typingActivity} isGenerating={isGeneratingImage} />
      
      {/* Ambient Radial Vignette */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-1000" 
           style={{ background: `radial-gradient(circle at center, transparent 0%, #000000 ${isGeneratingImage ? '40%' : '90%'})` }} />

      <div className="relative z-20 w-full h-full flex flex-col">
        
        {/* TOP BAR */}
        <div className="w-full p-6 flex justify-between items-center">
             <button onClick={() => setShowJournal(true)} className="p-3 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all backdrop-blur-md group">
                <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {savedEntries.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">{savedEntries.length}</span>}
             </button>
             <div className="flex flex-col items-center">
                <span className="text-[10px] font-display tracking-[0.5em] uppercase transition-all duration-1000" style={{ color: emotionData.color, textShadow: `0 0 20px ${emotionData.color}` }}>
                    {emotionData.label}
                </span>
                <div className="w-24 h-[1px] mt-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
             </div>
             <div className="w-10" />
        </div>

        {/* INTERACTIVE AREA */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {isSessionActive ? (
            <div className="w-full max-w-2xl text-center space-y-12 animate-fade-in">
               <div className="relative w-full backdrop-blur-md rounded-[3rem] border border-white/5 p-12 bg-black/30 transition-all duration-700"
                    style={{ borderColor: emotionData.color + '33', boxShadow: `0 0 40px ${emotionData.color}11` }}>
                   <textarea
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Como sua alma se sente agora? Descreva o peso ou a leveza..."
                    className="w-full h-48 bg-transparent text-white text-3xl font-light font-sans text-center outline-none resize-none placeholder:text-zinc-800 transition-colors"
                    autoFocus
                   />
               </div>
               <div className={`transition-all duration-700 ${text.trim().length > 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                   <button onClick={handleFinishSession} className="group flex items-center gap-4 px-14 py-5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-all hover:scale-110 backdrop-blur-2xl">
                     <StopCircle className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                     <span className="text-xs uppercase tracking-[0.4em] text-zinc-400 group-hover:text-white font-semibold">Cristalizar</span>
                   </button>
               </div>
            </div>
          ) : (
            <div className="relative max-w-xl w-full text-center p-12 rounded-[3rem] bg-black/90 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all duration-1000 animate-fade-in-up">
                <div className="mb-10 inline-block px-4 py-1 rounded-full border border-white/10 text-[9px] uppercase tracking-widest text-zinc-500">Cristalização de Pensamento</div>
                <h2 className="text-4xl font-display font-light italic mb-8 tracking-widest" style={{ color: emotionData.color }}>{emotionData.label}</h2>
                <p className="text-2xl text-white font-light italic leading-relaxed mb-12">"{text}"</p>
                <div className="flex flex-wrap justify-center gap-6">
                    <button onClick={handleSaveToJournal} disabled={hasSavedCurrent} className={`flex items-center gap-3 px-8 py-4 rounded-full border transition-all ${hasSavedCurrent ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        {hasSavedCurrent ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        <span className="text-[10px] uppercase tracking-widest font-bold">{hasSavedCurrent ? 'Arquivado' : 'Arquivar'}</span>
                    </button>
                    {currentImage && (
                        <button onClick={handleDownloadImage} className="flex items-center gap-3 px-8 py-4 rounded-full border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
                            <Download className="w-4 h-4" />
                            <span className="text-[10px] uppercase tracking-widest font-bold">Salvar Arte</span>
                        </button>
                    )}
                    <button onClick={() => setIsSessionActive(true)} className="p-4 rounded-full border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-all group" title="Editar">
                        <Edit3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
                {isGeneratingImage && (
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-white/40 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
                        </div>
                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest animate-pulse">Tecendo Reflexo Visual da Alma...</span>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* SOUL JOURNAL DRAWER */}
      {showJournal && (
          <div className="absolute inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowJournal(false)} />
              <div className="relative w-full max-w-lg h-full bg-[#050505] border-l border-white/5 flex flex-col p-10 shadow-2xl animate-fade-in-right">
                  <div className="flex justify-between items-center mb-12">
                      <div className="space-y-1">
                        <h3 className="text-4xl font-display text-white font-light tracking-wide">Arquivos da Alma</h3>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-600">Seu histórico de reflexos cristalizados</p>
                      </div>
                      <button onClick={() => setShowJournal(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors"><X className="w-7 h-7 text-zinc-600" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pb-10 pr-2">
                      {savedEntries.map((entry) => (
                          <div 
                            key={entry.id} 
                            className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden group p-7 space-y-5 hover:border-white/20 transition-all cursor-pointer relative"
                            onClick={() => loadEntry(entry)}
                          >
                              <button 
                                onClick={(e) => handleDeleteEntry(e, entry.id)} 
                                className="absolute top-8 right-8 p-2.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 text-zinc-500 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              
                              <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-zinc-900/50 border border-white/5 flex items-center justify-center">
                                  {entry.imageUrl ? (
                                      <img src={entry.imageUrl} alt="Reflexo" className="w-full h-full object-cover transition-transform duration-[6000ms] group-hover:scale-110" />
                                  ) : (
                                      <div className="flex flex-col items-center gap-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                          <Activity className="w-12 h-12" />
                                          <span className="text-[9px] uppercase tracking-widest">Sem Reflexo Visual</span>
                                      </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
                                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                    <span className="text-[10px] text-white/50 font-mono tracking-tighter">ID_{entry.id.slice(0, 8)}</span>
                                  </div>
                              </div>

                              <p className="text-zinc-300 italic text-lg line-clamp-3 leading-relaxed font-light">"{entry.text}"</p>
                              
                              <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold border-t border-white/5 pt-5">
                                  <div className="flex items-center gap-2.5"><Calendar className="w-4 h-4 opacity-50" /> {new Date(entry.timestamp).toLocaleDateString('pt-BR')}</div>
                                  <span className="px-3 py-1 rounded-full bg-white/5" style={{color: entry.emotion.color, borderColor: entry.emotion.color + '44'}}>{entry.emotion.label}</span>
                              </div>
                          </div>
                      ))}
                      {savedEntries.length === 0 && (
                        <div className="h-64 flex flex-col items-center justify-center text-zinc-700 py-20 border border-dashed border-white/5 rounded-[3rem]">
                            <Activity className="w-16 h-16 mb-6 opacity-10" />
                            <p className="font-display tracking-[0.5em] uppercase text-[10px]">Silêncio Arquivado</p>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default InnerMuse;
