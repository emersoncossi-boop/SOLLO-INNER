import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { EmotionAnalysis } from '../types';

const apiKey = process.env.API_KEY || '';

let genAI: GoogleGenAI | null = null;

if (apiKey) {
  genAI = new GoogleGenAI({ apiKey });
}

export const getGeminiChat = (): Chat | null => {
  if (!genAI) return null;
  
  return genAI.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      temperature: 0.7,
      systemInstruction: `Você é o "Espelho Socrático". Sua função é refletir a consciência do usuário.
      
      DIRETRIZES:
      - Respostas curtas e incisivas.
      - Uma única pergunta poderosa por vez.
      - Use a técnica da Maiêutica para extrair verdades ocultas.
      - Tom: Filosófico, calmo, atemporal.`,
    },
  });
};

export const generateRitualSuggestion = async (): Promise<string> => {
  if (!genAI) return "Observe o ritmo da sua respiração por um minuto.";

  try {
    const response: GenerateContentResponse = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Crie uma tarefa curta de mindfulness (uma frase) focada no mundo físico. Sem introduções.',
    });
    return response.text || "Sinta a temperatura do ar entrando pelas suas narinas.";
  } catch (error) {
    console.error("Error generating ritual:", error);
    return "Feche os olhos e identifique três sons distantes no ambiente.";
  }
}

export const analyzeEmotionalState = async (text: string): Promise<EmotionAnalysis> => {
  if (!genAI) {
    return { label: 'Silêncio', color: '#71717a', intensity: 0.1, valence: 0 };
  }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise a arquitetura emocional deste pensamento: "${text}".
      Determine a Valência (-1 a 1) e a Intensidade/Arousal (0 a 1).

      MAPEAMENTO PARA O "DIÁRIO GENERATIVO":
      - ALTA INTENSIDADE / VALÊNCIA NEGATIVA (Ansiedade/Raiva): Cores quentes saturadas (#FF4500, #FF0000), alto contraste.
      - BAIXA INTENSIDADE / VALÊNCIA NEGATIVA (Tristeza/Melancolia): Cores frias escuras (#191970, #2F4F4F), tons abissais.
      - BAIXA INTENSIDADE / VALÊNCIA POSITIVA (Calma/Paz): Tons pastéis, luminosos (#BFFFB1, #E6E6FA), harmonia orgânica.
      - ALTA INTENSIDADE / VALÊNCIA POSITIVA (Alegria/Entusiasmo): Explosão de luz, cores vibrantes (#FFD700, #FF00FF), brilho estelar.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING, description: "Rótulo poético de 1-2 palavras." },
            color: { type: Type.STRING, description: "Hex code rigorosamente extraído da matriz sugerida." },
            intensity: { type: Type.NUMBER, description: "Intensidade/Arousal de 0.0 a 1.0." },
            valence: { type: Type.NUMBER, description: "Valência de -1.0 a 1.0." },
          },
          required: ['label', 'color', 'intensity', 'valence'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      label: result.label || 'Pensamento',
      color: result.color || '#6b7280',
      intensity: result.intensity ?? 0.5,
      valence: result.valence ?? 0,
    };
  } catch (error) {
    console.error("Error in emotion analysis:", error);
    return { label: 'Estática', color: '#6b7280', intensity: 0.1, valence: 0 };
  }
};

export const generateMuseImage = async (text: string, emotion: EmotionAnalysis): Promise<string | null> => {
  if (!genAI) return null;

  const { valence, intensity, label, color } = emotion;
  const isPositive = valence >= 0;

  const baseStyle = "Fluid abstract digital art, volumetric textures, cinematic atmosphere, strictly non-representational, no figures, no text.";
  
  const chromaticTheme = isPositive 
    ? `Radiant solar explosion of ${color}, massive light flares, blinding golden highlights, vibrant pulses of energy, warm cinematic bloom, beautiful harmonic particles, expansive and glorious.`
    : `Dark somber void, obscure textures, oppressive shadows of ${color}, murky and somber gray-brown undertones, heavy atmospheric pressure, decayed light, visceral and intentionally "ugly" somber crystalline grain.`;

  const flowDynamics = intensity > 0.6 
    ? "High-kinetic turbulence, explosive shards of color, sharp jagged transitions, visceral chaotic energy."
    : "Slow viscous flow, gravitational sinking, horizontal stillness, misty diffusion, quiet desaturated layers.";

  try {
    const prompt = `Masterpiece abstract visual of "${label}" representing: "${text}". 
                    Visual Core: ${chromaticTheme}. 
                    Style: ${baseStyle}. 
                    Dynamics: ${flowDynamics}. 
                    Technical: Sub-surface scattering, ray-traced shadows, 8k resolution, fine-art canvas texture.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("Error in generateMuseImage:", error);
    return null;
  }
};
