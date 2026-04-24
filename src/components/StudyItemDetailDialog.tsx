import React, { useState } from 'react';
import { StudyItem } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Hash, Loader2, Sparkles } from 'lucide-react';
import {
  getStudyItemTypeLabel,
  getVocabularyBaseLabel,
  isAdjectiveVocabulary,
  isKanji,
  isVerbVocabulary,
} from '../lib/studyItems';
import { DetailField } from './shared/DetailField';
import { Button } from '@/components/ui/button';
import { useAuth } from '../lib/AuthContext';
import { canUseAiExamples, hasAiExampleKey, isAiExamplesEnabled } from '../services/aiSettingsService';

interface StudyItemDetailDialogProps {
  item: StudyItem | null;
  open: boolean;
  onGenerateExamples?: (item: StudyItem) => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
}

export const StudyItemDetailDialog: React.FC<StudyItemDetailDialogProps> = ({
  item,
  open,
  onGenerateExamples,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);

  if (!item) {
    return null;
  }

  const isVerbItem = isVerbVocabulary(item);
  const isAdjectiveItem = isAdjectiveVocabulary(item);
  const detailsTitle = isKanji(item)
    ? item.character
    : item.word;
  const aiExamplesEnabled = user ? isAiExamplesEnabled(user.uid) : false;
  const hasAiKey = user ? hasAiExampleKey(user.uid) : false;
  const canGenerateExamples = Boolean(user && onGenerateExamples && canUseAiExamples(user.uid));

  const handleGenerateExamples = async () => {
    if (!onGenerateExamples || !canGenerateExamples || isGeneratingExamples) {
      return;
    }

    setIsGeneratingExamples(true);
    try {
      await onGenerateExamples(item);
    } finally {
      setIsGeneratingExamples(false);
    }
  };

  const grammarFields = isKanji(item)
    ? [
        {
          label: 'On readings',
          value: item.onReadings.join('、 ') || '—',
        },
        {
          label: 'Kun readings',
          value: item.kunReadings.join('、 ') || '—',
        },
        {
          label: 'Stroke count',
          value: item.strokeCount || '—',
        },
      ]
    : isVerbItem
      ? [
          {
            label: 'Te-form',
            value: item.teForm || '—',
            hint:
              item.teFormFurigana && item.teFormFurigana !== item.teForm
                ? item.teFormFurigana
                : undefined,
          },
          {
            label: 'Verb group',
            value: item.verbGroup?.replace(/-/g, ' ') || '—',
          },
        ]
      : isAdjectiveItem
        ? [
            {
              label: 'Negative',
              value: item.negativeForm || '—',
              hint:
                item.negativeFurigana && item.negativeFurigana !== item.negativeForm
                  ? item.negativeFurigana
                  : undefined,
            },
            {
              label: 'Past',
              value: item.pastForm || '—',
              hint:
                item.pastFurigana && item.pastFurigana !== item.pastForm
                  ? item.pastFurigana
                  : undefined,
            },
            {
              label: 'Past negative',
              value: item.pastNegativeForm || '—',
              hint:
                item.pastNegativeFurigana &&
                item.pastNegativeFurigana !== item.pastNegativeForm
                  ? item.pastNegativeFurigana
                  : undefined,
            },
          ]
        : [
            {
              label: 'Furigana',
              value: item.furigana || '—',
            },
            {
              label: 'Romaji',
              value: item.romaji || '—',
            },
          ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white/96 p-0 shadow-[0_36px_120px_rgba(15,23,42,0.16)] dark:border-slate-800/80 dark:bg-slate-950/96 sm:w-full sm:max-w-[min(68rem,calc(100vw-2rem))]">
        <DialogHeader className="border-b border-slate-100 bg-slate-50/90 px-4 pb-5 pt-4 dark:border-slate-800 dark:bg-slate-900/70 sm:px-6 sm:pt-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              <div className="flex min-h-24 min-w-24 items-center justify-center rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-5xl font-black tracking-tight text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 sm:min-h-28 sm:min-w-28 sm:text-6xl lg:min-h-32 lg:min-w-32 lg:text-7xl">
                {detailsTitle}
              </div>

              <div className="min-w-0 space-y-3">
                {!isKanji(item) && item.furigana && (
                  <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-300 sm:text-base">
                    {item.furigana}
                  </div>
                )}
                <DialogTitle className="text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl lg:text-4xl">
                  {item.meaning}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {getStudyItemTypeLabel(item)}
                  </Badge>
                  {item.jlptLevel && (
                    <Badge className="rounded-full bg-indigo-600 px-2.5 py-1 text-white hover:bg-indigo-600 dark:bg-indigo-500">
                      JLPT N{item.jlptLevel}
                    </Badge>
                  )}
                  {isKanji(item) && item.grade && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    >
                      Grade {item.grade}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {!isKanji(item) && (isVerbItem || isAdjectiveItem) && (
              <div className="rounded-[22px] border border-slate-200 bg-white/88 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/80">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Base Form
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {getVocabularyBaseLabel(item, true) || '—'}
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Details
              </div>
              <div
                className={`grid gap-4 ${
                  grammarFields.length === 2
                    ? 'md:grid-cols-2'
                    : grammarFields.length === 3
                      ? 'md:grid-cols-3'
                      : 'md:grid-cols-2 xl:grid-cols-4'
                }`}
              >
                {grammarFields.map((field) => (
                  <DetailField
                    key={field.label}
                    label={field.label}
                    value={field.value}
                    hint={field.hint}
                    valueClassName="whitespace-normal break-words"
                  />
                ))}
              </div>
            </section>

            {!isKanji(item) && item.grammarNote && (
              <section className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Grammar Note
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  {item.grammarNote}
                </p>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <BookOpen className="h-4 w-4" />
                Examples
              </div>
              {item.examples.length > 0 ? (
                <div className="grid gap-3">
                  {item.examples.map((example, index) => (
                    <div
                      key={`${example.word}-${index}`}
                      className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                        <div className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-2xl">
                          {example.word}
                        </div>
                        <div className="text-sm font-medium text-indigo-600 dark:text-indigo-300">
                          {example.reading}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {example.meaning}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50/90 px-4 py-8 text-center text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  <div>
                    No examples available yet for this {getStudyItemTypeLabel(item).toLowerCase()}.
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-3">
                    <Button
                      onClick={handleGenerateExamples}
                      disabled={!canGenerateExamples || isGeneratingExamples}
                      className="h-11 rounded-2xl bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                    >
                      {isGeneratingExamples ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Generate Examples
                    </Button>
                    <p className="max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">
                      {canGenerateExamples
                        ? 'Uses your Gemini key stored locally on this device.'
                        : !aiExamplesEnabled
                          ? 'Enable AI examples in Profile to generate examples for this item.'
                          : !hasAiKey
                            ? 'Add your Gemini API key in Profile to generate examples.'
                            : 'Example generation is unavailable right now.'}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-950 px-5 py-4 text-white dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <Hash className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Internal ID
                  </p>
                  <p className="mt-1 font-mono text-sm text-indigo-100">{item.id}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Added On
                </p>
                <p className="mt-1 text-sm font-medium text-slate-100">
                  {new Date(item.addedAt).toLocaleDateString()}
                </p>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
