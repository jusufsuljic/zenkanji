export interface StudyExample {
  word: string;
  reading: string;
  meaning: string;
}

export type KanjiExample = StudyExample;
export type VocabularyExample = StudyExample;
export type VocabularyKind =
  | 'standard'
  | 'i-adjective'
  | 'na-adjective'
  | 'verb'
  | 'verb-te-form';
export type VerbGroup =
  | 'ichidan'
  | 'godan-u'
  | 'godan-tsu-ru'
  | 'godan-mu-bu-nu'
  | 'godan-ku'
  | 'godan-gu'
  | 'godan-su'
  | 'irregular';

interface BaseStudyItem {
  id: string;
  type: 'kanji' | 'vocabulary';
  meaning: string;
  jlptLevel?: number;
  addedAt: number;
}

export interface Kanji extends BaseStudyItem {
  type: 'kanji';
  character: string;
  onReadings: string[];
  kunReadings: string[];
  examples: KanjiExample[];
  strokeCount: number;
  grade?: number;
}

export interface Vocabulary extends BaseStudyItem {
  type: 'vocabulary';
  word: string;
  furigana: string;
  romaji: string;
  kind?: VocabularyKind;
  baseForm?: string;
  baseFurigana?: string;
  baseRomaji?: string;
  grammarNote?: string;
  verbGroup?: VerbGroup;
  teForm?: string;
  teFormFurigana?: string;
  negativeForm?: string;
  negativeFurigana?: string;
  pastForm?: string;
  pastFurigana?: string;
  pastNegativeForm?: string;
  pastNegativeFurigana?: string;
  examples: VocabularyExample[];
}

export type StudyItem = Kanji | Vocabulary;

export interface Dataset {
  id: string;
  name: string;
  description: string;
  itemIds: string[];
  kanjiIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface QuizSession {
  id: string;
  datasetId: string;
  type: 'writing' | 'multiple-choice' | 'reverse-choice' | 'grammar-choice';
  timed: boolean;
  timeLimit?: number; // in seconds
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  startTime: number;
  endTime?: number;
}

export interface QuizQuestion {
  itemId: string;
  type: 'writing' | 'meaning' | 'reading' | 'te-form' | 'base-form' | 'conjugation';
  options?: string[];
  correctAnswer: string;
  prompt?: string;
  userAnswer?: string;
  isCorrect?: boolean;
}
