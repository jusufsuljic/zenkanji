import React from 'react';
import { StudyItem } from '../types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  getStudyItemTypeLabel,
  isAdjectiveVocabulary,
  isKanji,
  isVerbVocabulary,
} from '../lib/studyItems';

interface StudyItemCardProps {
  item: StudyItem;
  onClick?: () => void;
  className?: string;
}

export const StudyItemCard: React.FC<StudyItemCardProps> = ({ item, onClick, className }) => {
  const isVerbItem = isVerbVocabulary(item);
  const isAdjectiveItem = isAdjectiveVocabulary(item);

  return (
    <Card
      className={`group cursor-pointer border-none bg-white/86 py-0 shadow-[0_16px_42px_-32px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_56px_-36px_rgba(15,23,42,0.4)] dark:bg-slate-950/88 dark:ring-slate-800 dark:hover:shadow-[0_28px_56px_-36px_rgba(2,6,23,0.9)] ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-slate-100 pb-4 pt-5 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            {getStudyItemTypeLabel(item)}
          </Badge>
          {item.jlptLevel && (
            <Badge variant="secondary" className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/20">
              N{item.jlptLevel}
            </Badge>
          )}
          {isKanji(item) && item.grade && (
            <Badge variant="outline" className="rounded-full text-muted-foreground">
              Grade {item.grade}
            </Badge>
          )}
        </div>
        {isKanji(item) && (
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {item.strokeCount} strokes
          </span>
        )}
      </CardHeader>

      <CardContent className="flex flex-col items-center px-5 pb-5 pt-5">
        <div
          className={`mb-3 text-center font-black tracking-tight text-slate-950 transition-transform duration-300 group-hover:scale-[1.03] dark:text-slate-50 ${
            isKanji(item) ? 'text-6xl sm:text-7xl' : isVerbItem ? 'text-3xl sm:text-4xl' : 'text-4xl'
          }`}
        >
          {isKanji(item) ? item.character : item.word}
        </div>

        {!isKanji(item) && item.furigana && (
          <div className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">{item.furigana}</div>
        )}

        <div className="mb-4 text-center text-base leading-7 font-medium text-slate-700 dark:text-slate-300">
          {item.meaning}
        </div>
        <Separator className="my-1 bg-slate-100 dark:bg-slate-800" />

        {isKanji(item) ? (
          <div className="w-full space-y-2 pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">On</span>
              <span className="text-right leading-6 text-slate-700 dark:text-slate-300">{item.onReadings.join('、 ') || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Kun</span>
              <span className="text-right leading-6 text-slate-700 dark:text-slate-300">{item.kunReadings.join('、 ') || '—'}</span>
            </div>
          </div>
        ) : isVerbItem ? (
          <div className="w-full space-y-2 pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Te-form</span>
              <span className="text-right leading-6 text-slate-700 dark:text-slate-300">{item.teForm || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Group</span>
              <span className="text-right capitalize leading-6 text-slate-700 dark:text-slate-300">
                {item.verbGroup?.replace(/-/g, ' ') || '—'}
              </span>
            </div>
          </div>
        ) : isAdjectiveItem ? (
          <div className="w-full space-y-2 pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Negative</span>
              <span className="text-right leading-6 text-slate-700 dark:text-slate-300">{item.negativeForm || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Past</span>
              <span className="text-right leading-6 text-slate-700 dark:text-slate-300">{item.pastForm || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Past Neg.</span>
              <span className="text-right leading-6 text-slate-700 dark:text-slate-300">{item.pastNegativeForm || '—'}</span>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-2 pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Furigana</span>
              <span className="text-right leading-6 text-slate-700 dark:text-slate-300">{item.furigana || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Romaji</span>
              <span className="text-right leading-6 text-slate-700 dark:text-slate-300">{item.romaji || '—'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
