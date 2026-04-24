import { Dataset, Kanji, StudyItem, Vocabulary, VocabularyKind } from '../types';

export const isKanji = (item: StudyItem): item is Kanji => item.type === 'kanji';

export const isVocabulary = (item: StudyItem): item is Vocabulary => item.type === 'vocabulary';

export const getVocabularyKind = (item: Vocabulary): VocabularyKind => item.kind ?? 'standard';

export const isGrammarVocabulary = (item: StudyItem): item is Vocabulary =>
  isVocabulary(item) &&
  (getVocabularyKind(item) !== 'standard' ||
    Boolean(item.teForm || item.negativeForm || item.pastForm || item.pastNegativeForm));

export const isVerbVocabulary = (item: StudyItem): item is Vocabulary =>
  isVocabulary(item) &&
  (getVocabularyKind(item) === 'verb' ||
    getVocabularyKind(item) === 'verb-te-form' ||
    Boolean(item.teForm));

export const isLegacyTeFormVocabulary = (item: StudyItem): item is Vocabulary =>
  isVocabulary(item) && getVocabularyKind(item) === 'verb-te-form';

export const isAdjectiveVocabulary = (item: StudyItem): item is Vocabulary =>
  isVocabulary(item) &&
  (getVocabularyKind(item) === 'i-adjective' ||
    getVocabularyKind(item) === 'na-adjective' ||
    Boolean(item.negativeForm || item.pastForm || item.pastNegativeForm));

export const hasGrammarStudyData = (item: StudyItem): item is Vocabulary => {
  if (!isVocabulary(item)) {
    return false;
  }

  const kind = getVocabularyKind(item);

  if (item.teForm) {
    return true;
  }

  if (item.negativeForm || item.pastForm || item.pastNegativeForm) {
    return true;
  }

  if (kind === 'verb' || kind === 'verb-te-form') {
    return Boolean(item.teForm || item.baseForm);
  }

  if (kind === 'i-adjective' || kind === 'na-adjective') {
    return Boolean(item.negativeForm || item.pastForm || item.pastNegativeForm);
  }

  return false;
};

export const getVocabularyKindLabel = (item: Vocabulary) => {
  switch (getVocabularyKind(item)) {
    case 'i-adjective':
      return 'I-Adjective';
    case 'na-adjective':
      return 'Na-Adjective';
    case 'verb':
    case 'verb-te-form':
      return 'Verb';
    default:
      return 'Vocabulary';
  }
};

export const getDatasetItemIds = (dataset: Pick<Dataset, 'itemIds' | 'kanjiIds'>) =>
  dataset.itemIds ?? dataset.kanjiIds ?? [];

export const getStudyItemDisplay = (item: StudyItem) =>
  isKanji(item) ? item.character : item.word;

export const getStudyItemPrompt = (item: StudyItem) => {
  if (isKanji(item)) {
    return item.character;
  }

  if (isLegacyTeFormVocabulary(item) && item.baseForm) {
    if (item.baseFurigana && item.baseFurigana !== item.baseForm) {
      return `${item.baseForm} (${item.baseFurigana})`;
    }

    return item.baseForm;
  }

  if (item.furigana && item.furigana !== item.word) {
    return `${item.word} (${item.furigana})`;
  }

  return item.word;
};

export const getStudyItemTypeLabel = (item: StudyItem) =>
  isKanji(item) ? 'Kanji' : getVocabularyKindLabel(item);

export const getVocabularyBaseLabel = (item: Vocabulary, includeFurigana = false) => {
  const baseForm = item.baseForm || item.word;
  const baseFurigana = item.baseFurigana || item.furigana;

  if (includeFurigana && baseFurigana && baseFurigana !== baseForm) {
    return `${baseForm} (${baseFurigana})`;
  }

  return baseForm;
};

export const getVocabularyDisplayLabel = (item: Vocabulary, includeFurigana = false) => {
  if (includeFurigana && item.furigana && item.furigana !== item.word) {
    return `${item.word} (${item.furigana})`;
  }

  return item.word;
};

export const getVocabularyGrammarFormLabel = (
  text?: string,
  furigana?: string,
  includeFurigana = false
) => {
  if (!text) {
    return '';
  }

  if (includeFurigana && furigana && furigana !== text) {
    return `${text} (${furigana})`;
  }

  return text;
};

export const getStudyItemSearchKey = (item: StudyItem) =>
  isKanji(item) ? item.character : item.word;
