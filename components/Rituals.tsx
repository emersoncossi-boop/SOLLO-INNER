import React, { useState } from 'react';
import { MapPin, Eye, ZapOff, ArrowRight, RefreshCw } from 'lucide-react';
import { Ritual } from '../types';
import { generateRitualSuggestion } from '../services/geminiService';

const Rituals: React.FC = () => {
  const [activeRitual, setActiveRitual] = useState<string | null>(null);
  const [generatedMission, setGeneratedMission] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const rituals: Ritual[] = [
    {
      id: 'geo',
      title: 'Geolocalização de Solidão',
      description: 'Localizando espaços seguros e silenciosos perto de você com base em dados de densidade em tempo real.',
      duration: 'Mapa',
      type: 'movement'
    },
    {
      id: 'flight',
      title: 'Modo Voo Cognitivo',
      description: 'Bloqueie todo o ruído externo. Apenas a câmera e o bloco de notas permanecem ativos.',
      duration: 'Até desativar',
      type: 'disconnection'
    },
    {
      id: 'observe',
      title: 'Missão de Observação',
      description: 'Treine sua atenção plena com tarefas visuais geradas por IA.',
      duration: '5 min',
      type: 'observation'
    }
  ];

  const handleGenerateMission = async () => {
    setIsGenerating(true);
    const mission = await generateRitualSuggestion();
    setGeneratedMission(mission);
    setIsGenerating(false);
  };

  return (
    <div className="w-full h-full overflow-y-auto p-8 bg-void">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="space-y-4">
            <h2 className="text-4xl font-display font-light text-starlight">Rituais de Desconexão</h2>
            <p className="text-ash font-light max-w-lg">
                O mundo é muito barulhento. Use essas ferramentas para recuperar sua atenção e encontrar glória em estar sozinho.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rituals.map((ritual) => (
                <div 
                    key={ritual.id}
                    onClick={() => setActiveRitual(activeRitual === ritual.id ? null : ritual.id)}
                    className={`group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                        activeRitual === ritual.id 
                        ? 'bg-surface border-ash shadow-2xl' 
                        : 'bg-surface/50 border-mist hover:border-ash'
                    }`}
                >
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-void border border-mist flex items-center justify-center text-starlight group-hover:scale-110 transition-transform duration-500">
                            {ritual.id === 'geo' && <MapPin className="w-5 h-5" />}
                            {ritual.id === 'flight' && <ZapOff className="w-5 h-5" />}
                            {ritual.id === 'observe' && <Eye className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-starlight">{ritual.title}</h3>
                            <p className="text-sm text-ash mt-2 leading-relaxed">{ritual.description}</p>
                        </div>
                        <div className="pt-4 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-ash">{ritual.type}</span>
                            <span className="text-xs text-ash border border-mist px-2 py-1 rounded-full">{ritual.duration}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Dynamic Content Area based on selection */}
        {activeRitual === 'observe' && (
            <div className="mt-8 p-8 border border-mist rounded-2xl bg-gradient-to-br from-surface to-void animate-fade-in shadow-lg">
                <div className="flex justify-between items-start mb-6">
                     <h3 className="text-xl text-starlight font-display">Missão Atual</h3>
                     <button 
                        onClick={handleGenerateMission} 
                        disabled={isGenerating}
                        className="flex items-center gap-2 text-xs uppercase tracking-wider text-ash hover:text-starlight disabled:opacity-50"
                     >
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        Nova Missão
                     </button>
                </div>
                
                <div className="min-h-[100px] flex items-center justify-center text-center">
                    {generatedMission ? (
                        <p className="text-2xl font-light text-starlight leading-relaxed italic">
                            "{generatedMission}"
                        </p>
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-ash">Nenhuma missão ativa.</p>
                            <button onClick={handleGenerateMission} className="px-6 py-2 bg-starlight text-void rounded-full text-sm hover:scale-105 transition-transform">
                                Gerar com IA
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeRitual === 'geo' && (
            <div className="mt-8 p-8 border border-mist rounded-2xl bg-surface text-center animate-fade-in shadow-lg">
                 <div className="w-full h-64 bg-void rounded-lg flex items-center justify-center border border-mist mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        {/* Fake Map Pattern */}
                        <div className="w-full h-full bg-[radial-gradient(var(--color-ash)_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    </div>
                    <p className="text-ash z-10">Simulador de Mapa (Geolocalização necessária)</p>
                    <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-starlight rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] transform -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-emerald-500/50 rounded-full animate-ping"></div>
                 </div>
                 <p className="text-sm text-ash">Encontrado: "Canto Silencioso da Biblioteca" (300m de distância) - Silêncio Moderado</p>
            </div>
        )}

        {activeRitual === 'flight' && (
            <div className="mt-8 p-8 border border-red-900/30 rounded-2xl bg-surface text-center animate-fade-in shadow-lg">
                 <ZapOff className="w-12 h-12 text-red-900/50 mx-auto mb-4" />
                 <h3 className="text-xl text-starlight mb-2">Modo Voo Cognitivo Ativo</h3>
                 <p className="text-ash mb-6">As notificações foram silenciadas. O mundo pode esperar.</p>
                 <button 
                    onClick={() => setActiveRitual(null)}
                    className="px-8 py-3 border border-mist text-ash rounded-lg hover:bg-void hover:text-starlight transition-colors"
                 >
                    Desativar
                 </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default Rituals;