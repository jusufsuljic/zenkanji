import { VerbGroup, Vocabulary, VocabularyKind } from '../types';

export interface VocabularyGrammarAnalysis {
  kind: Exclude<VocabularyKind, 'verb-te-form'>;
  baseForm?: string;
  baseFurigana?: string;
  baseRomaji?: string;
  grammarNote?: string;
  verbGroup?: VerbGroup;
}

const trimValue = (value?: string | null) => value?.trim() || undefined;

const normalizeRomaji = (value?: string | null) =>
  value?.trim().toLowerCase().replace(/[^a-z]/g, '') || '';

const normalizeLookupValue = (value?: string | null) =>
  value?.trim().toLowerCase().replace(/\s+/g, '') || '';

const replaceTrailing = (value: string, from: string, to: string) =>
  value.endsWith(from) ? `${value.slice(0, -from.length)}${to}` : value;

const stripNaAdjectiveCopula = (value?: string) => {
  if (!value) {
    return undefined;
  }

  if (value.endsWith('だ')) {
    return value.slice(0, -1);
  }

  return value;
};

const GODAN_RU_EXCEPTIONS = new Set([
  'ある',
  'はいる',
  '入る',
  'かえる',
  '帰る',
  'きる',
  '切る',
  'しる',
  '知る',
  'はしる',
  '走る',
  'いる',
  '要る',
  'へる',
  '減る',
  'しゃべる',
  '喋る',
  'すべる',
  '滑る',
  'にぎる',
  '握る',
  'まじる',
  '交じる',
  '混じる',
  'かぎる',
  '限る',
  'あせる',
  '焦る',
  'まいる',
  '参る',
  'いじる',
  '弄る',
]);

const GODAN_RU_ROMAJI_EXCEPTIONS = new Set([
  'aru',
  'hairu',
  'kaeru',
  'kiru',
  'shiru',
  'hashiru',
  'iru',
  'heru',
  'shaberu',
  'suberu',
  'nigiru',
  'majiru',
  'kagiru',
  'aseru',
  'mairu',
  'ijiru',
]);

const NA_ADJECTIVE_LOOKUP = new Set([
  'きれい',
  '綺麗',
  'kirei',
  'げんき',
  '元気',
  'genki',
  'しずか',
  '静か',
  'shizuka',
  'ゆうめい',
  '有名',
  'yuumei',
  'べんり',
  '便利',
  'benri',
  'にぎやか',
  '賑やか',
  'nigiyaka',
  'かんたん',
  '簡単',
  'kantan',
  'しんせつ',
  '親切',
  'shinsetsu',
  'すてき',
  '素敵',
  'suteki',
  'たいへん',
  '大変',
  'taihen',
  'ひま',
  '暇',
  'hima',
  'すき',
  '好き',
  'suki',
  'きらい',
  '嫌い',
  'kirai',
  'じょうず',
  '上手',
  'jouzu',
  'へた',
  '下手',
  'heta',
  'だいじょうぶ',
  '大丈夫',
  'daijoubu',
  'たいせつ',
  '大切',
  'taisetsu',
  'あんぜん',
  '安全',
  'anzen',
  'ふべん',
  '不便',
  'fuben',
  'たいくつ',
  '退屈',
  'taikutsu',
  'らく',
  '楽',
  'raku',
  'まじめ',
  '真面目',
  'majime',
]);

const isVerbMeaning = (meaning?: string) => {
  const normalizedMeaning = meaning?.trim().toLowerCase() || '';
  return (
    normalizedMeaning.startsWith('to ') ||
    normalizedMeaning.includes(', to ') ||
    normalizedMeaning.includes('; to ')
  );
};

const isNaAdjectiveLookupMatch = (word?: string, furigana?: string, romaji?: string) =>
  [normalizeLookupValue(word), normalizeLookupValue(furigana), normalizeRomaji(romaji)].some(
    (value) => value && NA_ADJECTIVE_LOOKUP.has(value)
  );

const isGodanRuException = (word?: string, furigana?: string, romaji?: string) =>
  [normalizeLookupValue(word), normalizeLookupValue(furigana)].some(
    (value) => value && GODAN_RU_EXCEPTIONS.has(value)
  ) || GODAN_RU_ROMAJI_EXCEPTIONS.has(normalizeRomaji(romaji));

const inferVerbGroup = (
  word?: string,
  furigana?: string,
  romaji?: string
): VerbGroup | undefined => {
  const normalizedWord = trimValue(word);
  const normalizedFurigana = trimValue(furigana);
  const normalizedRomaji = normalizeRomaji(romaji);
  const reading = normalizedFurigana || normalizedWord || '';

  if (
    reading.endsWith('する') ||
    normalizedRomaji.endsWith('suru')
  ) {
    return 'irregular';
  }

  if (
    reading.endsWith('くる') ||
    reading.endsWith('来る') ||
    normalizedRomaji.endsWith('kuru')
  ) {
    return 'irregular';
  }

  if (reading.endsWith('つ') || normalizedRomaji.endsWith('tsu')) {
    return 'godan-tsu-ru';
  }

  if (reading.endsWith('る') || normalizedRomaji.endsWith('ru')) {
    if (
      (normalizedRomaji.endsWith('eru') || normalizedRomaji.endsWith('iru')) &&
      !isGodanRuException(normalizedWord, normalizedFurigana, normalizedRomaji)
    ) {
      return 'ichidan';
    }

    return 'godan-tsu-ru';
  }

  if (
    reading.endsWith('む') ||
    reading.endsWith('ぶ') ||
    reading.endsWith('ぬ') ||
    normalizedRomaji.endsWith('mu') ||
    normalizedRomaji.endsWith('bu') ||
    normalizedRomaji.endsWith('nu')
  ) {
    return 'godan-mu-bu-nu';
  }

  if (reading.endsWith('く') || normalizedRomaji.endsWith('ku')) {
    return 'godan-ku';
  }

  if (reading.endsWith('ぐ') || normalizedRomaji.endsWith('gu')) {
    return 'godan-gu';
  }

  if (reading.endsWith('す') || normalizedRomaji.endsWith('su')) {
    return 'godan-su';
  }

  if (reading.endsWith('う') || normalizedRomaji.endsWith('u')) {
    return 'godan-u';
  }

  return undefined;
};

const getVerbGrammarNote = (verbGroup?: VerbGroup) => {
  switch (verbGroup) {
    case 'ichidan':
      return 'Ichidan verb. Replace る with て for the te-form.';
    case 'godan-u':
    case 'godan-tsu-ru':
      return 'Godan verb. The ending changes to って in te-form.';
    case 'godan-mu-bu-nu':
      return 'Godan verb. The ending changes to んで in te-form.';
    case 'godan-ku':
      return 'Godan verb. The ending changes to いて in te-form.';
    case 'godan-gu':
      return 'Godan verb. The ending changes to いで in te-form.';
    case 'godan-su':
      return 'Godan verb. The ending changes to して in te-form.';
    case 'irregular':
      return 'Irregular verb. Memorize this te-form pattern separately.';
    default:
      return 'Verb in dictionary form.';
  }
};

const getAdjectiveGrammarNote = (kind: VocabularyGrammarAnalysis['kind']) => {
  if (kind === 'i-adjective') {
    return 'I-adjective. Replace い with endings like くない or かった.';
  }

  if (kind === 'na-adjective') {
    return 'Na-adjective. Add forms like じゃない and だった to the stem.';
  }

  return undefined;
};

const buildVerbTeForm = (baseForm: string, verbGroup?: VerbGroup) => {
  switch (verbGroup) {
    case 'ichidan':
      return replaceTrailing(baseForm, 'る', 'て');
    case 'godan-u':
      return replaceTrailing(baseForm, 'う', 'って');
    case 'godan-tsu-ru':
      return baseForm.endsWith('つ')
        ? replaceTrailing(baseForm, 'つ', 'って')
        : replaceTrailing(baseForm, 'る', 'って');
    case 'godan-mu-bu-nu':
      if (baseForm.endsWith('む')) {
        return replaceTrailing(baseForm, 'む', 'んで');
      }
      if (baseForm.endsWith('ぶ')) {
        return replaceTrailing(baseForm, 'ぶ', 'んで');
      }
      return replaceTrailing(baseForm, 'ぬ', 'んで');
    case 'godan-ku':
      return baseForm === '行く' || baseForm === 'いく'
        ? replaceTrailing(baseForm, 'く', 'って')
        : replaceTrailing(baseForm, 'く', 'いて');
    case 'godan-gu':
      return replaceTrailing(baseForm, 'ぐ', 'いで');
    case 'godan-su':
      return replaceTrailing(baseForm, 'す', 'して');
    case 'irregular':
      if (baseForm.endsWith('する')) {
        return replaceTrailing(baseForm, 'する', 'して');
      }
      if (baseForm.endsWith('くる')) {
        return replaceTrailing(baseForm, 'くる', 'きて');
      }
      if (baseForm.endsWith('来る')) {
        return replaceTrailing(baseForm, '来る', '来て');
      }
      return baseForm;
    default:
      return undefined;
  }
};

const buildIAdjectiveForm = (baseForm: string, suffix: string) => {
  if (baseForm === 'いい' || baseForm === '良い') {
    if (suffix === 'くない') {
      return 'よくない';
    }
    if (suffix === 'かった') {
      return 'よかった';
    }
    if (suffix === 'くなかった') {
      return 'よくなかった';
    }
  }

  return baseForm.endsWith('い') ? `${baseForm.slice(0, -1)}${suffix}` : undefined;
};

export const inferVocabularyGrammarAnalysis = (
  vocabulary: Pick<Vocabulary, 'word' | 'furigana' | 'romaji' | 'meaning'>
): VocabularyGrammarAnalysis => {
  const word = trimValue(vocabulary.word);
  const furigana = trimValue(vocabulary.furigana);
  const romaji = trimValue(vocabulary.romaji);
  const baseWord = stripNaAdjectiveCopula(word) || word;
  const baseFurigana = stripNaAdjectiveCopula(furigana) || furigana;
  const baseRomaji = trimValue(romaji);

  if (isVerbMeaning(vocabulary.meaning)) {
    const verbGroup = inferVerbGroup(word, furigana, romaji);
    if (verbGroup) {
      return {
        kind: 'verb',
        baseForm: word,
        baseFurigana: furigana,
        baseRomaji: baseRomaji,
        grammarNote: getVerbGrammarNote(verbGroup),
        verbGroup,
      };
    }
  }

  if (isNaAdjectiveLookupMatch(baseWord, baseFurigana, baseRomaji)) {
    return {
      kind: 'na-adjective',
      baseForm: baseWord,
      baseFurigana,
      baseRomaji,
      grammarNote: getAdjectiveGrammarNote('na-adjective'),
    };
  }

  if ((baseFurigana || baseWord || '').endsWith('い')) {
    return {
      kind: 'i-adjective',
      baseForm: baseWord,
      baseFurigana,
      baseRomaji,
      grammarNote: getAdjectiveGrammarNote('i-adjective'),
    };
  }

  return {
    kind: 'standard',
  };
};

export const buildVocabularyGrammarFields = (
  vocabulary: Pick<Vocabulary, 'word' | 'furigana' | 'romaji'>,
  analysis: VocabularyGrammarAnalysis
): Partial<Vocabulary> => {
  const kind = analysis.kind || 'standard';

  if (kind === 'standard') {
    return {
      kind: 'standard',
    };
  }

  const baseForm =
    trimValue(analysis.baseForm) ||
    (kind === 'na-adjective'
      ? stripNaAdjectiveCopula(vocabulary.word)
      : trimValue(vocabulary.word));
  const baseFurigana =
    trimValue(analysis.baseFurigana) ||
    (kind === 'na-adjective'
      ? stripNaAdjectiveCopula(vocabulary.furigana)
      : trimValue(vocabulary.furigana));
  const baseRomaji =
    trimValue(analysis.baseRomaji) ||
    (kind === 'na-adjective'
      ? stripNaAdjectiveCopula(vocabulary.romaji)
      : trimValue(vocabulary.romaji));

  const normalized: Partial<Vocabulary> = {
    kind,
    baseForm,
    baseFurigana,
    baseRomaji,
    grammarNote: trimValue(analysis.grammarNote) || getAdjectiveGrammarNote(kind),
    verbGroup: analysis.verbGroup,
  };

  if (kind === 'verb') {
    normalized.grammarNote =
      trimValue(analysis.grammarNote) || getVerbGrammarNote(analysis.verbGroup);
  }

  if (kind === 'verb' && baseForm) {
    normalized.teForm = buildVerbTeForm(baseForm, analysis.verbGroup);

    if (baseFurigana) {
      normalized.teFormFurigana = buildVerbTeForm(baseFurigana, analysis.verbGroup);
    }
  }

  if (kind === 'i-adjective' && baseForm) {
    normalized.negativeForm = buildIAdjectiveForm(baseForm, 'くない');
    normalized.pastForm = buildIAdjectiveForm(baseForm, 'かった');
    normalized.pastNegativeForm = buildIAdjectiveForm(baseForm, 'くなかった');

    if (baseFurigana) {
      normalized.negativeFurigana = buildIAdjectiveForm(baseFurigana, 'くない');
      normalized.pastFurigana = buildIAdjectiveForm(baseFurigana, 'かった');
      normalized.pastNegativeFurigana = buildIAdjectiveForm(baseFurigana, 'くなかった');
    }
  }

  if (kind === 'na-adjective' && baseForm) {
    normalized.negativeForm = `${baseForm}じゃない`;
    normalized.pastForm = `${baseForm}だった`;
    normalized.pastNegativeForm = `${baseForm}じゃなかった`;

    if (baseFurigana) {
      normalized.negativeFurigana = `${baseFurigana}じゃない`;
      normalized.pastFurigana = `${baseFurigana}だった`;
      normalized.pastNegativeFurigana = `${baseFurigana}じゃなかった`;
    }
  }

  return normalized;
};

export const hasVocabularyGrammarData = (vocabulary: Vocabulary) =>
  Boolean(
    vocabulary.teForm ||
      vocabulary.negativeForm ||
      vocabulary.pastForm ||
      vocabulary.pastNegativeForm
  );
