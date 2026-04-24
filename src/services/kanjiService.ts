import { Kanji } from "../types";

const KANJI_API_BASE_URL = 'https://kanjiapi.dev/v1';
const KANJI_MEANING_INDEX_URL = '/data/kanji-meaning-index.v1.json';
const SEARCH_CACHE_STORAGE_KEY = 'kanjihub_kanjiapi_search_cache_v2';
const DETAIL_CACHE_STORAGE_KEY = 'kanjihub_kanjiapi_detail_cache_v1';

interface KanjiApiKanjiResponse {
  grade: number | null;
  jlpt: number | null;
  kanji: string;
  kun_readings: string[];
  meanings: string[];
  notes: string[];
  on_readings: string[];
  stroke_count: number;
  unicode: string;
}

interface KanjiApiReadingResponse {
  main_kanji: string[];
  name_kanji: string[];
  reading: string;
}

interface KanjiMeaningIndexEntry {
  c: string;
  m: string[];
  h?: string;
  j?: number;
  g?: number;
}

const searchCache = new Map<string, Partial<Kanji>[]>();
const detailCache = new Map<string, Partial<Kanji>>();
const inFlightSearches = new Map<string, Promise<Partial<Kanji>[]>>();
const inFlightDetails = new Map<string, Promise<Partial<Kanji> | null>>();
let meaningIndex: KanjiMeaningIndexEntry[] | null = null;
let meaningIndexPromise: Promise<KanjiMeaningIndexEntry[]> | null = null;

const commonKanji: Partial<Kanji>[] = [
  {
    type: 'kanji',
    character: '日',
    meaning: 'day, sun',
    onReadings: ['ニチ', 'ジツ'],
    kunReadings: ['ひ', 'び', 'か'],
    strokeCount: 4,
    jlptLevel: 5,
    examples: [],
  },
  {
    type: 'kanji',
    character: '一',
    meaning: 'one',
    onReadings: ['イチ', 'イツ'],
    kunReadings: ['ひと', 'ひと.つ'],
    strokeCount: 1,
    jlptLevel: 5,
    examples: [],
  },
  {
    type: 'kanji',
    character: '国',
    meaning: 'country',
    onReadings: ['コク'],
    kunReadings: ['くに'],
    strokeCount: 8,
    jlptLevel: 5,
    examples: [],
  },
  {
    type: 'kanji',
    character: '会',
    meaning: 'meeting, meet',
    onReadings: ['カイ', 'エ'],
    kunReadings: ['あ.う'],
    strokeCount: 6,
    jlptLevel: 5,
    examples: [],
  },
  {
    type: 'kanji',
    character: '人',
    meaning: 'person',
    onReadings: ['ジン', 'ニン'],
    kunReadings: ['ひと', '-り', '-と'],
    strokeCount: 2,
    jlptLevel: 5,
    examples: [],
  },
];

commonKanji.forEach((kanji) => {
  if (kanji.character) {
    detailCache.set(kanji.character, kanji);
  }
});

const isBrowser = typeof window !== 'undefined';

const fetchJson = async <T,>(path: string, timeoutMs = 8000): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${KANJI_API_BASE_URL}${path}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`KanjiAPI request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const normalizeKanjiResult = (kanji: Partial<Kanji>): Partial<Kanji> => ({
  ...kanji,
  onReadings: kanji.onReadings || [],
  kunReadings: kanji.kunReadings || [],
  examples: kanji.examples || [],
  strokeCount: typeof kanji.strokeCount === 'number' ? kanji.strokeCount : undefined,
  jlptLevel: typeof kanji.jlptLevel === 'number' ? kanji.jlptLevel : undefined,
  grade: typeof kanji.grade === 'number' ? kanji.grade : undefined,
});

const saveCachesToStorage = () => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(
      SEARCH_CACHE_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(searchCache.entries()))
    );
    window.localStorage.setItem(
      DETAIL_CACHE_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(detailCache.entries()))
    );
  } catch (error) {
    console.warn('[KanjiService] Failed to persist caches', error);
  }
};

const hydrateCachesFromStorage = () => {
  if (!isBrowser) {
    return;
  }

  try {
    const storedSearchCache = window.localStorage.getItem(SEARCH_CACHE_STORAGE_KEY);
    const storedDetailCache = window.localStorage.getItem(DETAIL_CACHE_STORAGE_KEY);

    if (storedSearchCache) {
      const parsedSearchCache = JSON.parse(storedSearchCache) as Record<string, Partial<Kanji>[]>;
      Object.entries(parsedSearchCache).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          searchCache.set(key, value.map(normalizeKanjiResult));
        }
      });
    }

    if (storedDetailCache) {
      const parsedDetailCache = JSON.parse(storedDetailCache) as Record<string, Partial<Kanji>>;
      Object.entries(parsedDetailCache).forEach(([key, value]) => {
        detailCache.set(key, normalizeKanjiResult(value));
      });
    }
  } catch (error) {
    console.warn('[KanjiService] Failed to load persisted caches', error);
  }
};

const cacheKanjiResults = (query: string, results: Partial<Kanji>[]) => {
  searchCache.set(query, results);

  results.forEach((result) => {
    if (result.character) {
      detailCache.set(result.character, result);
    }
  });

  saveCachesToStorage();
};

const meaningPriority = (meaning: string) => {
  let score = meaning.length;

  if (meaning.startsWith('counter for')) {
    score += 100;
  }

  if (meaning.includes('(') || meaning.includes('"')) {
    score += 25;
  }

  if (meaning.includes('Japan')) {
    score += 10;
  }

  return score;
};

const formatMeaning = (meanings: string[]) =>
  [...new Set(meanings.map((meaning) => meaning.trim()).filter(Boolean))]
    .sort((left, right) => meaningPriority(left) - meaningPriority(right))
    .slice(0, 3)
    .join(', ');

const mapKanjiApiToKanji = (kanji: KanjiApiKanjiResponse): Partial<Kanji> => ({
  type: 'kanji',
  character: kanji.kanji,
  meaning: formatMeaning(kanji.meanings),
  onReadings: kanji.on_readings,
  kunReadings: kanji.kun_readings,
  examples: [],
  strokeCount: kanji.stroke_count,
  jlptLevel: kanji.jlpt ?? undefined,
  grade: kanji.grade ?? undefined,
});

const isSingleKanjiQuery = (query: string) => /^[\p{Script=Han}々ヶヵ]$/u.test(query.trim());
const isKanaQuery = (query: string) => /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(query.trim());
const extractKanjiCharacters = (query: string) => [...new Set(query.match(/[\p{Script=Han}々ヶヵ]/gu) || [])];
const normalizeMeaningSearch = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const tokenizeMeaning = (value: string) =>
  normalizeMeaningSearch(value)
    .split(/[\s-]+/)
    .filter(Boolean);

const fetchKanjiApiDetails = async (character: string) => {
  try {
    const response = await fetchJson<KanjiApiKanjiResponse>(`/kanji/${encodeURIComponent(character)}`);
    return mapKanjiApiToKanji(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }

    throw error;
  }
};

const fetchDetailsForCharacters = async (characters: string[]) => {
  const uniqueCharacters = [...new Set(characters)].filter(Boolean).slice(0, 8);

  const results = await Promise.all(
    uniqueCharacters.map(async (character) => {
      try {
        return await getKanjiDetails(character);
      } catch (error) {
        console.error(`[KanjiService] Failed to fetch details for ${character}`, error);
        return null;
      }
    })
  );

  return results.filter(Boolean) as Partial<Kanji>[];
};

const fetchMeaningIndex = async () => {
  const response = await fetch(KANJI_MEANING_INDEX_URL);

  if (!response.ok) {
    throw new Error(`Kanji meaning index request failed with status ${response.status}`);
  }

  return (await response.json()) as KanjiMeaningIndexEntry[];
};

const ensureMeaningIndex = async () => {
  if (meaningIndex) {
    return meaningIndex;
  }

  if (meaningIndexPromise) {
    return meaningIndexPromise;
  }

  meaningIndexPromise = (async () => {
    try {
      meaningIndex = await fetchMeaningIndex();
      return meaningIndex;
    } finally {
      meaningIndexPromise = null;
    }
  })();

  return meaningIndexPromise;
};

const getMeaningCandidates = (entry: KanjiMeaningIndexEntry) => [
  ...entry.m.map((value, index) => ({
    value: normalizeMeaningSearch(value),
    index,
    isHeisig: false,
  })),
  ...(entry.h
    ? [
        {
          value: normalizeMeaningSearch(entry.h),
          index: entry.m.length,
          isHeisig: true,
        },
      ]
    : []),
].filter((candidate) => candidate.value);

const getMeaningSearchScore = (entry: KanjiMeaningIndexEntry, normalizedQuery: string, queryTokens: string[]) => {
  const candidates = getMeaningCandidates(entry);
  if (!candidates.length) {
    return Number.POSITIVE_INFINITY;
  }

  const rankCandidate = (baseScore: number, candidateIndex: number, candidateLength: number, isHeisig: boolean) =>
    baseScore + candidateIndex * 10 + Math.max(candidateLength - normalizedQuery.length, 0) + (isHeisig ? 5 : 0);

  const exactMatch = candidates.find((candidate) => candidate.value === normalizedQuery);
  if (exactMatch) {
    return exactMatch.isHeisig ? 5 : 0;
  }

  if (queryTokens.length === 1) {
    const tokenMatch = candidates.find((candidate) => tokenizeMeaning(candidate.value).includes(normalizedQuery));
    if (tokenMatch) {
      return rankCandidate(100, tokenMatch.index, tokenMatch.value.length, tokenMatch.isHeisig);
    }
  }

  if (queryTokens.length > 1) {
    const phraseTokenMatch = candidates.find((candidate) => {
      const candidateTokens = tokenizeMeaning(candidate.value);
      return queryTokens.every((token) => candidateTokens.includes(token));
    });
    if (phraseTokenMatch) {
      return rankCandidate(200, phraseTokenMatch.index, phraseTokenMatch.value.length, phraseTokenMatch.isHeisig);
    }
  }

  if (normalizedQuery.length >= 4) {
    const containsMatch = candidates.find((candidate) => candidate.value.includes(normalizedQuery));
    if (containsMatch) {
      return rankCandidate(300, containsMatch.index, containsMatch.value.length, containsMatch.isHeisig);
    }

    const fuzzyTokenMatch = candidates.find((candidate) => queryTokens.every((token) => candidate.value.includes(token)));
    if (fuzzyTokenMatch) {
      return rankCandidate(400, fuzzyTokenMatch.index, fuzzyTokenMatch.value.length, fuzzyTokenMatch.isHeisig);
    }
  }

  return Number.POSITIVE_INFINITY;
};

const searchKanjiByMeaningIndex = async (query: string) => {
  const normalizedQuery = normalizeMeaningSearch(query);
  if (!normalizedQuery) {
    return [];
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  try {
    const index = await ensureMeaningIndex();
    const characters = index
      .map((entry) => ({
        character: entry.c,
        jlptLevel: entry.j ?? 99,
        grade: entry.g ?? 99,
        score: getMeaningSearchScore(entry, normalizedQuery, queryTokens),
      }))
      .filter((entry) => Number.isFinite(entry.score))
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score;
        }

        if (left.grade !== right.grade) {
          return left.grade - right.grade;
        }

        if (left.jlptLevel !== right.jlptLevel) {
          return left.jlptLevel - right.jlptLevel;
        }

        return left.character.localeCompare(right.character);
      })
      .slice(0, 12)
      .map((entry) => entry.character);

    if (!characters.length) {
      return [];
    }

    return fetchDetailsForCharacters(characters);
  } catch (error) {
    console.warn('[KanjiService] Falling back to local meaning search only', error);
    return localSearch(query);
  }
};

const searchKanjiByReading = async (reading: string) => {
  try {
    const response = await fetchJson<KanjiApiReadingResponse>(`/reading/${encodeURIComponent(reading)}`);
    return fetchDetailsForCharacters([...response.main_kanji, ...response.name_kanji]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return [];
    }

    throw error;
  }
};

hydrateCachesFromStorage();

export function localSearch(query: string): Partial<Kanji>[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results = new Map<string, Partial<Kanji>>();

  commonKanji.forEach((kanji) => {
    if (
      kanji.character?.includes(normalizedQuery) ||
      kanji.meaning?.toLowerCase().includes(normalizedQuery) ||
      kanji.onReadings?.some((reading) => reading.includes(normalizedQuery)) ||
      kanji.kunReadings?.some((reading) => reading.includes(normalizedQuery))
    ) {
      results.set(kanji.character!, kanji);
    }
  });

  detailCache.forEach((kanji) => {
    if (
      kanji.character?.includes(normalizedQuery) ||
      kanji.meaning?.toLowerCase().includes(normalizedQuery) ||
      kanji.onReadings?.some((reading) => reading.includes(normalizedQuery)) ||
      kanji.kunReadings?.some((reading) => reading.includes(normalizedQuery))
    ) {
      results.set(kanji.character!, kanji);
    }
  });

  return Array.from(results.values());
}

export async function searchKanji(query: string): Promise<Partial<Kanji>[]> {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  if (!trimmedQuery) {
    return [];
  }

  if (searchCache.has(normalizedQuery)) {
    return searchCache.get(normalizedQuery)!;
  }

  const existingSearch = inFlightSearches.get(normalizedQuery);
  if (existingSearch) {
    return existingSearch;
  }

  const searchRequest = (async () => {
    try {
      let results: Partial<Kanji>[] = [];
      const kanjiCharacters = extractKanjiCharacters(trimmedQuery);

      if (isSingleKanjiQuery(trimmedQuery)) {
        const details = await getKanjiDetails(trimmedQuery);
        results = details ? [details] : [];
      } else if (kanjiCharacters.length > 0) {
        results = await fetchDetailsForCharacters(kanjiCharacters);
      } else if (isKanaQuery(trimmedQuery)) {
        results = await searchKanjiByReading(trimmedQuery);
      } else {
        results = await searchKanjiByMeaningIndex(trimmedQuery);
      }

      cacheKanjiResults(normalizedQuery, results);
      return results;
    } finally {
      inFlightSearches.delete(normalizedQuery);
    }
  })();

  inFlightSearches.set(normalizedQuery, searchRequest);
  return searchRequest;
}

export async function getKanjiDetails(character: string): Promise<Partial<Kanji> | null> {
  const normalizedCharacter = character.trim();

  if (!normalizedCharacter) {
    return null;
  }

  if (detailCache.has(normalizedCharacter)) {
    return detailCache.get(normalizedCharacter)!;
  }

  const existingDetail = inFlightDetails.get(normalizedCharacter);
  if (existingDetail) {
    return existingDetail;
  }

  const detailRequest = (async () => {
    try {
      const details = await fetchKanjiApiDetails(normalizedCharacter);

      if (details?.character) {
        detailCache.set(details.character, details);
        searchCache.set(details.character.toLowerCase(), [details]);
        saveCachesToStorage();
      }

      return details;
    } finally {
      inFlightDetails.delete(normalizedCharacter);
    }
  })();

  inFlightDetails.set(normalizedCharacter, detailRequest);
  return detailRequest;
}
