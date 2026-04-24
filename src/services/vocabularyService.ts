import { Vocabulary } from '../types';

const VOCAB_API_BASE_URL = 'https://jlpt-vocab-api.vercel.app/api/words';
const VOCAB_INDEX_STORAGE_KEY = 'kanjihub_vocabulary_index_v1';
const VOCAB_SEARCH_CACHE_KEY = 'kanjihub_vocabulary_search_cache_v1';

interface VocabApiWord {
  word: string;
  meaning: string;
  furigana: string;
  romaji: string;
  level: number;
}

const commonVocabulary: Partial<Vocabulary>[] = [
  {
    type: 'vocabulary',
    word: '食べる',
    meaning: 'to eat',
    furigana: 'たべる',
    romaji: 'taberu',
    jlptLevel: 5,
    examples: [],
  },
  {
    type: 'vocabulary',
    word: '学校',
    meaning: 'school',
    furigana: 'がっこう',
    romaji: 'gakkou',
    jlptLevel: 5,
    examples: [],
  },
  {
    type: 'vocabulary',
    word: '先生',
    meaning: 'teacher',
    furigana: 'せんせい',
    romaji: 'sensei',
    jlptLevel: 5,
    examples: [],
  },
  {
    type: 'vocabulary',
    word: '日本語',
    meaning: 'Japanese language',
    furigana: 'にほんご',
    romaji: 'nihongo',
    jlptLevel: 5,
    examples: [],
  },
  {
    type: 'vocabulary',
    word: '友達',
    meaning: 'friend',
    furigana: 'ともだち',
    romaji: 'tomodachi',
    jlptLevel: 5,
    examples: [],
  },
];

const searchCache = new Map<string, Partial<Vocabulary>[]>();
const detailCache = new Map<string, Partial<Vocabulary>>();
let vocabularyIndex: Partial<Vocabulary>[] | null = null;
let vocabularyIndexPromise: Promise<Partial<Vocabulary>[]> | null = null;

const isBrowser = typeof window !== 'undefined';

const normalizeVocabulary = (vocabulary: Partial<Vocabulary>): Partial<Vocabulary> => ({
  ...vocabulary,
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
  jlptLevel: typeof vocabulary.jlptLevel === 'number' ? vocabulary.jlptLevel : undefined,
  examples: Array.isArray(vocabulary.examples) ? vocabulary.examples : [],
});

const hydrateCaches = () => {
  if (!isBrowser) {
    return;
  }

  commonVocabulary.forEach((entry) => {
    if (entry.word) {
      detailCache.set(entry.word, entry);
    }
  });

  try {
    const storedIndex = window.localStorage.getItem(VOCAB_INDEX_STORAGE_KEY);
    const storedSearchCache = window.localStorage.getItem(VOCAB_SEARCH_CACHE_KEY);

    if (storedIndex) {
      vocabularyIndex = (JSON.parse(storedIndex) as Partial<Vocabulary>[]).map(normalizeVocabulary);
      vocabularyIndex.forEach((entry) => {
        if (entry.word) {
          detailCache.set(entry.word, entry);
        }
      });
    }

    if (storedSearchCache) {
      const parsedSearchCache = JSON.parse(storedSearchCache) as Record<string, Partial<Vocabulary>[]>;
      Object.entries(parsedSearchCache).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          searchCache.set(key, value.map(normalizeVocabulary));
        }
      });
    }
  } catch (error) {
    console.warn('[VocabularyService] Failed to hydrate cache', error);
  }
};

const persistCaches = () => {
  if (!isBrowser) {
    return;
  }

  try {
    if (vocabularyIndex) {
      window.localStorage.setItem(VOCAB_INDEX_STORAGE_KEY, JSON.stringify(vocabularyIndex));
    }

    window.localStorage.setItem(
      VOCAB_SEARCH_CACHE_KEY,
      JSON.stringify(Object.fromEntries(searchCache.entries()))
    );
  } catch (error) {
    console.warn('[VocabularyService] Failed to persist cache', error);
  }
};

const mapApiWordToVocabulary = (word: VocabApiWord): Partial<Vocabulary> => ({
  type: 'vocabulary',
  word: word.word,
  meaning: word.meaning,
  furigana: word.furigana,
  romaji: word.romaji,
  jlptLevel: word.level,
  examples: [],
});

const fetchVocabularyIndex = async () => {
  const response = await fetch(`${VOCAB_API_BASE_URL}/all`);

  if (!response.ok) {
    throw new Error(`Vocabulary API request failed with status ${response.status}`);
  }

  const words = (await response.json()) as VocabApiWord[];
  return words.map(mapApiWordToVocabulary);
};

const ensureVocabularyIndex = async () => {
  if (vocabularyIndex) {
    return vocabularyIndex;
  }

  if (vocabularyIndexPromise) {
    return vocabularyIndexPromise;
  }

  vocabularyIndexPromise = (async () => {
    try {
      vocabularyIndex = await fetchVocabularyIndex();
      vocabularyIndex.forEach((entry) => {
        if (entry.word) {
          detailCache.set(entry.word, entry);
        }
      });
      persistCaches();
      return vocabularyIndex;
    } finally {
      vocabularyIndexPromise = null;
    }
  })();

  return vocabularyIndexPromise;
};

export const warmVocabularyIndex = async () => {
  await ensureVocabularyIndex();
};

const getSearchScore = (entry: Partial<Vocabulary>, query: string) => {
  const normalizedQuery = query.toLowerCase();
  const normalizedWord = (entry.word || '').toLowerCase();
  const normalizedFurigana = (entry.furigana || '').toLowerCase();
  const normalizedRomaji = (entry.romaji || '').toLowerCase();
  const normalizedMeaning = (entry.meaning || '').toLowerCase();

  if (normalizedWord === normalizedQuery || normalizedFurigana === normalizedQuery || normalizedRomaji === normalizedQuery) {
    return 0;
  }

  if (normalizedWord.startsWith(normalizedQuery) || normalizedFurigana.startsWith(normalizedQuery) || normalizedRomaji.startsWith(normalizedQuery)) {
    return 1;
  }

  if (normalizedMeaning.startsWith(normalizedQuery)) {
    return 2;
  }

  if (normalizedWord.includes(normalizedQuery) || normalizedFurigana.includes(normalizedQuery) || normalizedRomaji.includes(normalizedQuery)) {
    return 3;
  }

  if (normalizedMeaning.includes(normalizedQuery)) {
    return 4;
  }

  return 10;
};

const searchPool = (pool: Partial<Vocabulary>[], query: string) => {
  const trimmedQuery = query.trim();
  const deduped = new Map<string, Partial<Vocabulary>>();

  pool.forEach((entry) => {
    if (!entry.word) {
      return;
    }

    const score = getSearchScore(entry, trimmedQuery);
    if (score >= 10) {
      return;
    }

    const existing = deduped.get(entry.word);
    if (!existing || getSearchScore(existing, trimmedQuery) > score) {
      deduped.set(entry.word, normalizeVocabulary(entry));
    }
  });

  return Array.from(deduped.values())
    .sort((left, right) => {
      const scoreDifference = getSearchScore(left, trimmedQuery) - getSearchScore(right, trimmedQuery);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const leftLevel = left.jlptLevel ?? 99;
      const rightLevel = right.jlptLevel ?? 99;
      if (leftLevel !== rightLevel) {
        return leftLevel - rightLevel;
      }

      return (left.word || '').localeCompare(right.word || '', 'ja');
    })
    .slice(0, 20);
};

hydrateCaches();

export function localSearch(query: string): Partial<Vocabulary>[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const localPool = vocabularyIndex
    ? vocabularyIndex
    : [
        ...commonVocabulary,
        ...Array.from(detailCache.values()),
      ];

  return searchPool(localPool, trimmedQuery);
}

export async function searchVocabulary(query: string): Promise<Partial<Vocabulary>[]> {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  if (!trimmedQuery) {
    return [];
  }

  if (searchCache.has(normalizedQuery)) {
    return searchCache.get(normalizedQuery)!;
  }

  const index = await ensureVocabularyIndex();
  const results = searchPool(index, trimmedQuery);
  searchCache.set(normalizedQuery, results);
  persistCaches();
  return results;
}

export async function getVocabularyDetails(word: string): Promise<Partial<Vocabulary> | null> {
  const trimmedWord = word.trim();
  if (!trimmedWord) {
    return null;
  }

  if (detailCache.has(trimmedWord)) {
    return detailCache.get(trimmedWord)!;
  }

  const exactResponse = await fetch(`${VOCAB_API_BASE_URL}?word=${encodeURIComponent(trimmedWord)}`);
  if (!exactResponse.ok) {
    throw new Error(`Vocabulary lookup failed with status ${exactResponse.status}`);
  }

  const payload = (await exactResponse.json()) as { words?: VocabApiWord[] };
  const entry = payload.words?.[0];

  if (!entry) {
    return null;
  }

  const details = mapApiWordToVocabulary(entry);
  if (details.word) {
    detailCache.set(details.word, details);
  }
  return details;
}
