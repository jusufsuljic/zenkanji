import { GoogleGenAI, Type } from "@google/genai";
import { Kanji, KanjiExample, Vocabulary, VocabularyExample } from "../types";
import { getActiveGeminiApiKey } from "./aiSettingsService";

const getAiClient = (userId?: string) => {
  const geminiApiKey = getActiveGeminiApiKey(userId);
  return geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMessage: string, timeoutMs = 12000) => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

export const generateKanjiExamples = async (
  kanji: Pick<Kanji, 'character' | 'meaning' | 'onReadings' | 'kunReadings'>,
  userId?: string
) => {
  const ai = getAiClient(userId);
  if (!ai) {
    return [] as KanjiExample[];
  }

  const response = await withTimeout(
    ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate exactly 3 common Japanese example words for the kanji "${kanji.character}". Meaning: "${kanji.meaning}". On-readings: ${kanji.onReadings.join(', ') || 'none'}. Kun-readings: ${kanji.kunReadings.join(', ') || 'none'}. Return JSON only with objects containing word, reading, and meaning.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              reading: { type: Type.STRING },
              meaning: { type: Type.STRING },
            },
            required: ["word", "reading", "meaning"],
          },
        },
      },
    }),
    "Generating example words timed out."
  );

  const parsed = JSON.parse(response.text) as KanjiExample[];
  return parsed
    .filter((example) => example.word && example.reading && example.meaning)
    .slice(0, 3);
};

export const generateVocabularyExamples = async (
  vocabulary: Pick<Vocabulary, 'word' | 'meaning' | 'furigana' | 'romaji'>,
  userId?: string
) => {
  const ai = getAiClient(userId);
  if (!ai) {
    return [] as VocabularyExample[];
  }

  const response = await withTimeout(
    ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate exactly 3 common Japanese example sentences or phrases that use the vocabulary word "${vocabulary.word}". Meaning: "${vocabulary.meaning}". Furigana: "${vocabulary.furigana || 'none'}". Romaji: "${vocabulary.romaji || 'none'}". Return JSON only with objects containing word, reading, and meaning.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              reading: { type: Type.STRING },
              meaning: { type: Type.STRING },
            },
            required: ["word", "reading", "meaning"],
          },
        },
      },
    }),
    "Generating vocabulary examples timed out."
  );

  const parsed = JSON.parse(response.text) as VocabularyExample[];
  return parsed
    .filter((example) => example.word && example.reading && example.meaning)
    .slice(0, 3);
};
