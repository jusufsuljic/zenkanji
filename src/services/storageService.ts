import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dataset, Kanji, StudyItem, Vocabulary } from '../types';
import {
  buildVocabularyGrammarFields,
  inferVocabularyGrammarAnalysis,
} from './grammarService';

const DATASETS_KEY = 'kanjihub_datasets';
const KANJI_KEY = 'kanjihub_all_kanji';
const VOCABULARY_KEY = 'kanjihub_all_vocabulary';

const stripUndefinedFields = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedFields(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .map(([key, nestedValue]) => [key, stripUndefinedFields(nestedValue)])
    ) as T;
  }

  return value;
};

const normalizeDataset = (dataset: Partial<Dataset>): Dataset => ({
  id: dataset.id || Math.random().toString(36).substr(2, 9),
  name: dataset.name || 'Untitled Collection',
  description: dataset.description || '',
  itemIds: Array.isArray(dataset.itemIds)
    ? dataset.itemIds
    : Array.isArray(dataset.kanjiIds)
      ? dataset.kanjiIds
      : [],
  createdAt: typeof dataset.createdAt === 'number' ? dataset.createdAt : Date.now(),
  updatedAt: typeof dataset.updatedAt === 'number'
    ? dataset.updatedAt
    : typeof dataset.createdAt === 'number'
      ? dataset.createdAt
      : Date.now(),
});

const normalizeKanji = (kanji: Partial<Kanji>): Kanji => ({
  id: kanji.id || Math.random().toString(36).substr(2, 9),
  type: 'kanji',
  character: kanji.character || '',
  meaning: kanji.meaning || '',
  onReadings: Array.isArray(kanji.onReadings) ? kanji.onReadings : [],
  kunReadings: Array.isArray(kanji.kunReadings) ? kanji.kunReadings : [],
  examples: Array.isArray(kanji.examples) ? kanji.examples : [],
  strokeCount: typeof kanji.strokeCount === 'number' ? kanji.strokeCount : 0,
  jlptLevel: kanji.jlptLevel,
  grade: kanji.grade,
  addedAt: typeof kanji.addedAt === 'number' ? kanji.addedAt : Date.now(),
});

const normalizeVocabulary = (vocabulary: Partial<Vocabulary>): Vocabulary => {
  const baseVocabulary: Vocabulary = {
    id: vocabulary.id || Math.random().toString(36).substr(2, 9),
    type: 'vocabulary',
    word: vocabulary.word || '',
    meaning: vocabulary.meaning || '',
    furigana: vocabulary.furigana || '',
    romaji: vocabulary.romaji || '',
    kind: vocabulary.kind || 'standard',
    baseForm: vocabulary.baseForm || undefined,
    baseFurigana: vocabulary.baseFurigana || undefined,
    baseRomaji: vocabulary.baseRomaji || undefined,
    grammarNote: vocabulary.grammarNote || undefined,
    verbGroup: vocabulary.verbGroup || undefined,
    teForm: vocabulary.teForm || undefined,
    teFormFurigana: vocabulary.teFormFurigana || undefined,
    negativeForm: vocabulary.negativeForm || undefined,
    negativeFurigana: vocabulary.negativeFurigana || undefined,
    pastForm: vocabulary.pastForm || undefined,
    pastFurigana: vocabulary.pastFurigana || undefined,
    pastNegativeForm: vocabulary.pastNegativeForm || undefined,
    pastNegativeFurigana: vocabulary.pastNegativeFurigana || undefined,
    examples: Array.isArray(vocabulary.examples) ? vocabulary.examples : [],
    jlptLevel: vocabulary.jlptLevel,
    addedAt: typeof vocabulary.addedAt === 'number' ? vocabulary.addedAt : Date.now(),
  };

  const inferredGrammar = buildVocabularyGrammarFields(
    baseVocabulary,
    inferVocabularyGrammarAnalysis(baseVocabulary)
  );

  return {
    ...baseVocabulary,
    kind:
      baseVocabulary.kind && baseVocabulary.kind !== 'standard'
        ? baseVocabulary.kind
        : inferredGrammar.kind || 'standard',
    baseForm: baseVocabulary.baseForm || inferredGrammar.baseForm,
    baseFurigana: baseVocabulary.baseFurigana || inferredGrammar.baseFurigana,
    baseRomaji: baseVocabulary.baseRomaji || inferredGrammar.baseRomaji,
    grammarNote: baseVocabulary.grammarNote || inferredGrammar.grammarNote,
    verbGroup: baseVocabulary.verbGroup || inferredGrammar.verbGroup,
    teForm: baseVocabulary.teForm || inferredGrammar.teForm,
    teFormFurigana: baseVocabulary.teFormFurigana || inferredGrammar.teFormFurigana,
    negativeForm: baseVocabulary.negativeForm || inferredGrammar.negativeForm,
    negativeFurigana: baseVocabulary.negativeFurigana || inferredGrammar.negativeFurigana,
    pastForm: baseVocabulary.pastForm || inferredGrammar.pastForm,
    pastFurigana: baseVocabulary.pastFurigana || inferredGrammar.pastFurigana,
    pastNegativeForm:
      baseVocabulary.pastNegativeForm || inferredGrammar.pastNegativeForm,
    pastNegativeFurigana:
      baseVocabulary.pastNegativeFurigana || inferredGrammar.pastNegativeFurigana,
  };
};

export const storageService = {
  getDatasets: (): Dataset[] => {
    const data = localStorage.getItem(DATASETS_KEY);
    const datasets = data ? (JSON.parse(data) as Partial<Dataset>[]) : [];
    return datasets.map(normalizeDataset);
  },

  saveDatasets: (datasets: Dataset[]) => {
    localStorage.setItem(
      DATASETS_KEY,
      JSON.stringify(datasets.map((dataset) => normalizeDataset(dataset)))
    );
  },

  getAllKanji: (): Kanji[] => {
    const data = localStorage.getItem(KANJI_KEY);
    const kanji = data ? (JSON.parse(data) as Partial<Kanji>[]) : [];
    return kanji.map(normalizeKanji);
  },

  saveAllKanji: (kanji: Kanji[]) => {
    localStorage.setItem(
      KANJI_KEY,
      JSON.stringify(kanji.map((entry) => normalizeKanji(entry)))
    );
  },

  getAllVocabulary: (): Vocabulary[] => {
    const data = localStorage.getItem(VOCABULARY_KEY);
    const vocabulary = data ? (JSON.parse(data) as Partial<Vocabulary>[]) : [];
    return vocabulary.map(normalizeVocabulary);
  },

  saveAllVocabulary: (vocabulary: Vocabulary[]) => {
    localStorage.setItem(
      VOCABULARY_KEY,
      JSON.stringify(vocabulary.map((entry) => normalizeVocabulary(entry)))
    );
  },

  getAllStudyItems: (): StudyItem[] => [
    ...storageService.getAllKanji(),
    ...storageService.getAllVocabulary(),
  ],

  getFirestoreDatasets: async (userId: string): Promise<Dataset[]> => {
    const snapshot = await getDocs(collection(db, 'users', userId, 'datasets'));
    return snapshot.docs.map((entry) => normalizeDataset(entry.data() as Partial<Dataset>));
  },

  saveFirestoreDataset: async (userId: string, dataset: Dataset) => {
    await setDoc(
      doc(db, 'users', userId, 'datasets', dataset.id),
      stripUndefinedFields(normalizeDataset(dataset))
    );
  },

  deleteFirestoreDataset: async (userId: string, datasetId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'datasets', datasetId));
  },

  getFirestoreKanji: async (userId: string): Promise<Kanji[]> => {
    const snapshot = await getDocs(collection(db, 'users', userId, 'kanji'));
    return snapshot.docs.map((entry) => normalizeKanji(entry.data() as Partial<Kanji>));
  },

  saveFirestoreKanji: async (userId: string, kanji: Kanji) => {
    await setDoc(
      doc(db, 'users', userId, 'kanji', kanji.id),
      stripUndefinedFields(normalizeKanji(kanji))
    );
  },

  getFirestoreVocabulary: async (userId: string): Promise<Vocabulary[]> => {
    const snapshot = await getDocs(collection(db, 'users', userId, 'vocabulary'));
    return snapshot.docs.map((entry) =>
      normalizeVocabulary(entry.data() as Partial<Vocabulary>)
    );
  },

  saveFirestoreVocabulary: async (userId: string, vocabulary: Vocabulary) => {
    await setDoc(
      doc(db, 'users', userId, 'vocabulary', vocabulary.id),
      stripUndefinedFields(normalizeVocabulary(vocabulary))
    );
  },

  updateKanji: (kanji: Kanji) => {
    const allKanji = storageService.getAllKanji();
    const normalizedKanji = normalizeKanji(kanji);
    const existingIndex = allKanji.findIndex(
      (existingKanji) =>
        existingKanji.id === normalizedKanji.id ||
        existingKanji.character === normalizedKanji.character
    );

    if (existingIndex === -1) {
      storageService.saveAllKanji([...allKanji, normalizedKanji]);
      return normalizedKanji;
    }

    const existingKanji = allKanji[existingIndex];
    const updatedKanji = normalizeKanji({
      ...existingKanji,
      ...normalizedKanji,
      id: existingKanji.id,
      addedAt: existingKanji.addedAt,
      meaning: normalizedKanji.meaning || existingKanji.meaning,
      onReadings: normalizedKanji.onReadings.length
        ? normalizedKanji.onReadings
        : existingKanji.onReadings,
      kunReadings: normalizedKanji.kunReadings.length
        ? normalizedKanji.kunReadings
        : existingKanji.kunReadings,
      examples: normalizedKanji.examples.length
        ? normalizedKanji.examples
        : existingKanji.examples,
      strokeCount: normalizedKanji.strokeCount || existingKanji.strokeCount,
      jlptLevel: normalizedKanji.jlptLevel ?? existingKanji.jlptLevel,
      grade: normalizedKanji.grade ?? existingKanji.grade,
    });

    const updatedAllKanji = [...allKanji];
    updatedAllKanji[existingIndex] = updatedKanji;
    storageService.saveAllKanji(updatedAllKanji);
    return updatedKanji;
  },

  updateVocabulary: (vocabulary: Vocabulary) => {
    const allVocabulary = storageService.getAllVocabulary();
    const normalizedVocabulary = normalizeVocabulary(vocabulary);
    const existingIndex = allVocabulary.findIndex(
      (existingVocabulary) =>
        existingVocabulary.id === normalizedVocabulary.id ||
        existingVocabulary.word === normalizedVocabulary.word
    );

    if (existingIndex === -1) {
      storageService.saveAllVocabulary([...allVocabulary, normalizedVocabulary]);
      return normalizedVocabulary;
    }

    const existingVocabulary = allVocabulary[existingIndex];
    const updatedVocabulary = normalizeVocabulary({
      ...existingVocabulary,
      ...normalizedVocabulary,
      id: existingVocabulary.id,
      addedAt: existingVocabulary.addedAt,
      meaning: normalizedVocabulary.meaning || existingVocabulary.meaning,
      furigana: normalizedVocabulary.furigana || existingVocabulary.furigana,
      romaji: normalizedVocabulary.romaji || existingVocabulary.romaji,
      kind:
        normalizedVocabulary.kind && normalizedVocabulary.kind !== 'standard'
          ? normalizedVocabulary.kind
          : existingVocabulary.kind || normalizedVocabulary.kind || 'standard',
      baseForm: normalizedVocabulary.baseForm || existingVocabulary.baseForm,
      baseFurigana: normalizedVocabulary.baseFurigana || existingVocabulary.baseFurigana,
      baseRomaji: normalizedVocabulary.baseRomaji || existingVocabulary.baseRomaji,
      grammarNote: normalizedVocabulary.grammarNote || existingVocabulary.grammarNote,
      verbGroup: normalizedVocabulary.verbGroup || existingVocabulary.verbGroup,
      teForm: normalizedVocabulary.teForm || existingVocabulary.teForm,
      teFormFurigana:
        normalizedVocabulary.teFormFurigana || existingVocabulary.teFormFurigana,
      negativeForm: normalizedVocabulary.negativeForm || existingVocabulary.negativeForm,
      negativeFurigana:
        normalizedVocabulary.negativeFurigana || existingVocabulary.negativeFurigana,
      pastForm: normalizedVocabulary.pastForm || existingVocabulary.pastForm,
      pastFurigana: normalizedVocabulary.pastFurigana || existingVocabulary.pastFurigana,
      pastNegativeForm:
        normalizedVocabulary.pastNegativeForm || existingVocabulary.pastNegativeForm,
      pastNegativeFurigana:
        normalizedVocabulary.pastNegativeFurigana || existingVocabulary.pastNegativeFurigana,
      examples: normalizedVocabulary.examples.length
        ? normalizedVocabulary.examples
        : existingVocabulary.examples,
      jlptLevel: normalizedVocabulary.jlptLevel ?? existingVocabulary.jlptLevel,
    });

    const updatedAllVocabulary = [...allVocabulary];
    updatedAllVocabulary[existingIndex] = updatedVocabulary;
    storageService.saveAllVocabulary(updatedAllVocabulary);
    return updatedVocabulary;
  },

  createDataset: (name: string, description: string): Dataset => {
    const newDataset = normalizeDataset({
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      itemIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const datasets = storageService.getDatasets();
    storageService.saveDatasets([...datasets, newDataset]);
    return newDataset;
  },

  deleteDataset: (id: string) => {
    const datasets = storageService.getDatasets();
    storageService.saveDatasets(datasets.filter((dataset) => dataset.id !== id));
  },

  updateDataset: (dataset: Dataset) => {
    const datasets = storageService.getDatasets();
    const normalizedDataset = normalizeDataset(dataset);

    storageService.saveDatasets(
      datasets.map((entry) =>
        entry.id === normalizedDataset.id
          ? normalizeDataset({ ...normalizedDataset, updatedAt: Date.now() })
          : entry
      )
    );
  },
};
