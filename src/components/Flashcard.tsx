import React, { useEffect, useState } from 'react';
import { StudyItem } from '../types';
import { shuffleArray } from '../lib/study';
import {
  getStudyItemTypeLabel,
  getVocabularyBaseLabel,
  isAdjectiveVocabulary,
  isKanji,
  isVerbVocabulary,
} from '../lib/studyItems';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

interface FlashcardProps {
  itemList: StudyItem[];
  shuffleOnStart?: boolean;
}

export const Flashcard: React.FC<FlashcardProps> = ({ itemList, shuffleOnStart = false }) => {
  const [deck, setDeck] = useState<StudyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setDeck(shuffleOnStart ? shuffleArray(itemList) : [...itemList]);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [itemList, shuffleOnStart]);

  const currentItem = deck[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    window.setTimeout(() => {
      setCurrentIndex((previous) => (previous + 1) % deck.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    window.setTimeout(() => {
      setCurrentIndex((previous) => (previous - 1 + deck.length) % deck.length);
    }, 150);
  };

  const handleShuffle = () => {
    setDeck((currentDeck) => shuffleArray(currentDeck));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (!currentItem) {
    return <div>No study items in this dataset.</div>;
  }

  const isVerbItem = isVerbVocabulary(currentItem);
  const isAdjectiveItem = isAdjectiveVocabulary(currentItem);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8">
      <div className="app-pill">
        {currentIndex + 1} / {deck.length} in review
      </div>

      <div className="relative w-full perspective-1000 aspect-[3/4]">
        <motion.div
          className="relative h-full w-full cursor-pointer preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <Card className="absolute inset-0 flex backface-hidden flex-col items-center justify-center border-none bg-white/92 shadow-[0_36px_70px_-36px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/80 dark:bg-slate-950/92 dark:ring-slate-800 dark:shadow-[0_36px_70px_-36px_rgba(2,6,23,0.9)]">
            <CardContent className="flex h-full w-full flex-col items-center justify-center p-8 text-center sm:p-10">
              <div className="app-kicker mb-6">Front</div>
              <span
                className={`font-black tracking-tight text-slate-950 dark:text-slate-50 ${
                  isKanji(currentItem)
                    ? 'text-8xl sm:text-9xl'
                    : isVerbItem
                      ? 'text-4xl sm:text-5xl'
                      : 'text-5xl'
                }`}
              >
                {isKanji(currentItem)
                  ? currentItem.character
                  : currentItem.word}
              </span>
              {!isKanji(currentItem) &&
                currentItem.furigana && (
                <span className="mt-4 text-lg font-semibold text-indigo-600 dark:text-indigo-300">
                  {currentItem.furigana}
                </span>
              )}
              <span className="mt-10 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Click to flip
              </span>
            </CardContent>
          </Card>

          <Card
            className="absolute inset-0 flex backface-hidden flex-col items-center justify-center border-none bg-[linear-gradient(180deg,rgba(238,242,255,0.98),rgba(248,250,252,0.98))] shadow-[0_36px_70px_-36px_rgba(15,23,42,0.42)] ring-1 ring-indigo-100/80 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(15,23,42,0.98))] dark:ring-indigo-500/20 dark:shadow-[0_36px_70px_-36px_rgba(2,6,23,0.9)]"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <CardContent className="flex w-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 dark:bg-slate-900/80 dark:text-indigo-300">
                {getStudyItemTypeLabel(currentItem)}
              </div>
              <h2 className="mb-6 text-3xl font-black tracking-tight text-indigo-950 dark:text-slate-50">
                {currentItem.meaning}
              </h2>

              {isKanji(currentItem) ? (
                <div className="w-full space-y-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      On-reading
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">{currentItem.onReadings.join('、 ') || '—'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Kun-reading
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">{currentItem.kunReadings.join('、 ') || '—'}</p>
                  </div>
                </div>
              ) : isVerbItem ? (
                <div className="w-full space-y-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Te-Form
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">
                      {currentItem.teForm || '—'}
                    </p>
                    {currentItem.teFormFurigana && currentItem.teFormFurigana !== currentItem.teForm && (
                      <p className="text-sm text-indigo-600 dark:text-indigo-300">{currentItem.teFormFurigana}</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Base Form
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">{getVocabularyBaseLabel(currentItem, true)}</p>
                  </div>
                  {currentItem.grammarNote && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                        Rule
                      </p>
                      <p className="text-base leading-relaxed text-indigo-900 dark:text-slate-100">{currentItem.grammarNote}</p>
                    </div>
                  )}
                </div>
              ) : isAdjectiveItem ? (
                <div className="w-full space-y-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Negative
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">{currentItem.negativeForm || '—'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Past
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">{currentItem.pastForm || '—'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Past Negative
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">{currentItem.pastNegativeForm || '—'}</p>
                  </div>
                  {currentItem.grammarNote && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                        Rule
                      </p>
                      <p className="text-base leading-relaxed text-indigo-900 dark:text-slate-100">{currentItem.grammarNote}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Furigana
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">{currentItem.furigana || '—'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Romaji
                    </p>
                    <p className="text-lg text-indigo-900 dark:text-slate-100">{currentItem.romaji || '—'}</p>
                  </div>
                </div>
              )}

              {currentItem.examples.length > 0 && (
                <div className="mt-8 w-full border-t border-indigo-100 pt-6 text-left dark:border-indigo-500/20">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Examples
                  </p>
                  <div className="space-y-2">
                    {currentItem.examples.slice(0, 2).map((example, index) => (
                      <div key={`${example.word}-${index}`} className="text-sm">
                        <span className="font-bold text-indigo-900 dark:text-slate-100">{example.word}</span>
                        <span className="ml-2 text-indigo-600 dark:text-indigo-300">({example.reading})</span>
                        <p className="text-xs text-indigo-700/70 dark:text-slate-400">{example.meaning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          className="h-12 w-12 rounded-full border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          onClick={handleShuffle}
          className="h-12 rounded-full border-slate-200 bg-white/90 px-4 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <RotateCw className="mr-2 h-4 w-4" /> Shuffle
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="h-12 w-12 rounded-full border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};
