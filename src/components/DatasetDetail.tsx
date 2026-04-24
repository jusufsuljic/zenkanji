import React, { useEffect, useState } from 'react';
import { Dataset, StudyItem } from '../types';
import { Button } from '@/components/ui/button';
import { Flashcard } from './Flashcard';
import { KanjiSearch } from './KanjiSearch';
import { Quiz } from './Quiz';
import { ShareDialog } from './ShareDialog';
import { StudyItemCard } from './StudyItemCard';
import { StudyItemDetailDialog } from './StudyItemDetailDialog';
import { VocabularySearch } from './VocabularySearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Layers,
  PenTool,
  Plus,
  Search,
  Share2,
  Type,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { clampQuizTimeLimit, MIN_QUIZ_ITEMS } from '../lib/study';
import { getDatasetItemIds, hasGrammarStudyData, isKanji, isVocabulary } from '../lib/studyItems';
import { warmVocabularyIndex } from '../services/vocabularyService';
import { SegmentedControl } from './shared/SegmentedControl';
import { SettingRow } from './shared/SettingRow';

interface DatasetDetailProps {
  dataset: Dataset;
  allItems: StudyItem[];
  onBack: () => void;
  onAddItem: (item: StudyItem) => Promise<void> | void;
  onGenerateExamples: (item: StudyItem) => Promise<boolean>;
  onRemoveItem: (itemId: string) => void;
}

type ItemFilter = 'all' | 'kanji' | 'vocabulary';

const filterStudyItems = (items: StudyItem[], filter: ItemFilter) => {
  if (filter === 'kanji') {
    return items.filter(isKanji);
  }

  if (filter === 'vocabulary') {
    return items.filter(isVocabulary);
  }

  return items;
};

const getFilterLabel = (filter: ItemFilter) => {
  if (filter === 'kanji') {
    return 'kanji';
  }

  if (filter === 'vocabulary') {
    return 'vocabulary';
  }

  return 'items';
};

export const DatasetDetail: React.FC<DatasetDetailProps> = ({
  dataset,
  allItems,
  onBack,
  onAddItem,
  onGenerateExamples,
  onRemoveItem,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<
    'none' | 'flashcards' | 'quiz-meaning' | 'quiz-reverse' | 'quiz-writing' | 'quiz-grammar'
  >('none');
  const [shuffleStudyOrder, setShuffleStudyOrder] = useState(true);
  const [quizTimeLimit, setQuizTimeLimit] = useState(30);
  const [searchMode, setSearchMode] = useState<'kanji' | 'vocabulary'>('kanji');
  const [collectionFilter, setCollectionFilter] = useState<ItemFilter>('all');
  const [studyScope, setStudyScope] = useState<ItemFilter>('all');
  const [showVocabularyFuriganaInQuiz, setShowVocabularyFuriganaInQuiz] = useState(true);

  const datasetItemIds = new Set(getDatasetItemIds(dataset));
  const datasetItems = allItems.filter((item) => datasetItemIds.has(item.id));
  const datasetKanji = datasetItems.filter(isKanji);
  const datasetVocabulary = datasetItems.filter(isVocabulary);
  const selectedItem = selectedItemId
    ? datasetItems.find((item) => item.id === selectedItemId) || null
    : null;
  const collectionItems = filterStudyItems(datasetItems, collectionFilter);
  const studyItems = filterStudyItems(datasetItems, studyScope);
  const studyKanji = studyItems.filter(isKanji);
  const studyVocabulary = studyItems.filter(isVocabulary);
  const grammarReadyItems = studyItems.filter(hasGrammarStudyData);
  const normalizedQuizTimeLimit = clampQuizTimeLimit(quizTimeLimit);
  const canStartChoiceQuiz = studyItems.length >= MIN_QUIZ_ITEMS;
  const canStartWritingQuiz = studyKanji.length >= MIN_QUIZ_ITEMS;
  const canStartGrammarQuiz = grammarReadyItems.length >= MIN_QUIZ_ITEMS;
  const selectedStudyLabel =
    studyScope === 'all'
      ? 'kanji and vocabulary items'
      : studyScope === 'kanji'
        ? 'kanji items'
        : 'vocabulary items';

  useEffect(() => {
    if (!isSearchOpen || searchMode !== 'vocabulary') {
      return;
    }

    void warmVocabularyIndex();
  }, [isSearchOpen, searchMode]);

  if (studyMode !== 'none') {
    if (studyMode === 'flashcards') {
      return (
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setStudyMode('none')} className="h-11 rounded-full px-4 font-semibold text-slate-600 dark:text-slate-300">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dataset
          </Button>
          <div className="app-panel px-6 py-5 sm:px-8">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">{dataset.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Flashcards for {selectedStudyLabel}.</p>
          </div>
          <Flashcard itemList={studyItems} shuffleOnStart={shuffleStudyOrder} />
        </div>
      );
    }

    const quizType =
      studyMode === 'quiz-writing'
        ? 'writing'
        : studyMode === 'quiz-grammar'
          ? 'grammar-choice'
        : studyMode === 'quiz-reverse'
          ? 'reverse-choice'
          : 'multiple-choice';

    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setStudyMode('none')} className="h-11 rounded-full px-4 font-semibold text-slate-600 dark:text-slate-300">
          <ArrowLeft className="mr-2 h-4 w-4" /> Exit Study Mode
        </Button>
        <Quiz
          datasetName={dataset.name}
          itemList={studyMode === 'quiz-writing' ? studyKanji : studyMode === 'quiz-grammar' ? grammarReadyItems : studyItems}
          type={quizType}
          shuffleQuestions={shuffleStudyOrder}
          timeLimit={normalizedQuizTimeLimit}
          showFuriganaInReverseChoices={showVocabularyFuriganaInQuiz}
          onComplete={(score) => console.log('Quiz completed with score:', score)}
          onExit={() => setStudyMode('none')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="app-panel overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="outline" size="icon" onClick={onBack} className="mt-1 h-11 w-11 rounded-2xl border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                  {dataset.name}
                </h1>
                {dataset.description && (
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{dataset.description}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="app-pill">{datasetItems.length} total items</span>
                <span className="app-pill">{datasetKanji.length} kanji</span>
                <span className="app-pill">{datasetVocabulary.length} vocabulary</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              onClick={() => setIsShareOpen(true)}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>

            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <DialogTrigger
                render={
                  <Button className="h-11 rounded-2xl bg-slate-950 px-4 font-semibold text-white hover:bg-slate-800">
                    <Plus className="mr-2 h-4 w-4" /> Add Items
                  </Button>
                }
              />
              <DialogContent className="flex h-[85vh] w-full flex-col overflow-hidden rounded-[28px] border-none p-0 shadow-2xl dark:bg-slate-950 sm:max-w-[92vw] lg:max-w-[1080px]">
                <DialogHeader className="border-b border-slate-100 p-5 pb-4 dark:border-slate-800 sm:px-6 sm:pt-6">
                  <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                    Add Items
                  </DialogTitle>
                </DialogHeader>
                <div className="border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
                  <SegmentedControl
                    value={searchMode}
                    onChange={setSearchMode}
                    fullWidth
                    options={[
                      { value: 'kanji', label: 'Kanji', icon: <Layers className="h-4 w-4" /> },
                      { value: 'vocabulary', label: 'Vocabulary', icon: <Type className="h-4 w-4" /> },
                    ]}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-5 sm:p-6">
                      {searchMode === 'kanji' ? (
                        <KanjiSearch
                          onAdd={async (kanji) => {
                            await onAddItem(kanji);
                          }}
                          existingKanjiIds={datasetKanji.map((kanji) => kanji.character)}
                        />
                      ) : (
                        <VocabularySearch
                          onAdd={async (vocabulary) => {
                            await onAddItem(vocabulary);
                          }}
                          existingVocabularyWords={datasetVocabulary.map((vocabulary) => vocabulary.word)}
                        />
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <Tabs defaultValue="collection" className="w-full">
        <TabsList className="mb-5 grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="collection">
            <BookOpen className="mr-2 h-4 w-4" /> Collection
          </TabsTrigger>
          <TabsTrigger value="study">
            <Brain className="mr-2 h-4 w-4" /> Study Modes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collection">
          <div className="mb-5 flex flex-wrap gap-2 text-sm">
            {[
              { value: 'all' as const, label: `${datasetItems.length} total items` },
              { value: 'kanji' as const, label: `${datasetKanji.length} kanji` },
              { value: 'vocabulary' as const, label: `${datasetVocabulary.length} vocabulary` },
            ].map((filterOption) => (
              <Button
                key={filterOption.value}
                variant="ghost"
                className={cn(
                  'h-10 rounded-full border px-4 text-sm font-semibold transition-all',
                  collectionFilter === filterOption.value
                    ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                    : 'border-slate-200 bg-white/92 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900'
                )}
                onClick={() => setCollectionFilter(filterOption.value)}
              >
                {filterOption.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {collectionItems.map((item) => (
              <div key={item.id} className="group relative">
                <StudyItemCard item={item} onClick={() => setSelectedItemId(item.id)} />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 z-10 h-8 w-8 rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
            ))}
            {datasetItems.length === 0 && (
              <div className="app-panel-muted col-span-full border-dashed py-20 text-center">
                <p className="text-muted-foreground">
                  This dataset is empty. Click "Add Items" to start building it.
                </p>
              </div>
            )}
            {datasetItems.length > 0 && collectionItems.length === 0 && (
              <div className="app-panel-muted col-span-full border-dashed py-20 text-center">
                <p className="text-muted-foreground">
                  No {getFilterLabel(collectionFilter)} match the current filter.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="study">
          <Card className="app-panel mb-6 border-none py-0 shadow-none ring-0">
            <CardContent className="p-5 sm:p-6">
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">Study Settings</h3>
                  <p className="text-sm text-muted-foreground">Used for flashcards and quizzes.</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 lg:col-span-2">
                    <Label className="font-semibold text-slate-900 dark:text-slate-100">Practice scope</Label>
                    <SegmentedControl
                      value={studyScope}
                      onChange={setStudyScope}
                      options={[
                        { value: 'all', label: 'Both' },
                        { value: 'kanji', label: 'Kanji only' },
                        { value: 'vocabulary', label: 'Vocabulary only' },
                      ]}
                    />
                  </div>

                  <SettingRow
                    label="Shuffle order"
                    description="Randomize card and question order"
                    control={
                      <Switch
                        checked={shuffleStudyOrder}
                        onCheckedChange={setShuffleStudyOrder}
                      />
                    }
                  />

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="space-y-2">
                      <Label htmlFor="quiz-time-limit" className="font-semibold text-slate-900 dark:text-slate-100">
                        Quiz timer (seconds)
                      </Label>
                      <Input
                        id="quiz-time-limit"
                        type="number"
                        min={5}
                        max={300}
                        step={5}
                        value={quizTimeLimit}
                        onChange={(event) => setQuizTimeLimit(Number(event.target.value) || 30)}
                        className="h-11 rounded-xl bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <SettingRow
                    className="lg:col-span-2"
                    label="Furigana in reverse-choice answers"
                    description="Show readings in answer options"
                    control={
                      <Switch
                        checked={showVocabularyFuriganaInQuiz}
                        onCheckedChange={setShowVocabularyFuriganaInQuiz}
                      />
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <StudyModeCard
              title="Flashcards"
              description={selectedStudyLabel}
              icon={<Layers className="h-8 w-8" />}
              onClick={() => setStudyMode('flashcards')}
              disabled={studyItems.length === 0}
            />
            <StudyModeCard
              title="Multiple Choice"
              description={`${normalizedQuizTimeLimit}s per question`}
              icon={<Brain className="h-8 w-8" />}
              onClick={() => setStudyMode('quiz-meaning')}
              disabled={!canStartChoiceQuiz}
            />
            <StudyModeCard
              title="Reverse Choice"
              description={`${normalizedQuizTimeLimit}s per question`}
              icon={<Search className="h-8 w-8" />}
              onClick={() => setStudyMode('quiz-reverse')}
              disabled={!canStartChoiceQuiz}
            />
            <StudyModeCard
              title="Writing Practice"
              description="Kanji only"
              icon={<PenTool className="h-8 w-8" />}
              onClick={() => setStudyMode('quiz-writing')}
              disabled={!canStartWritingQuiz}
            />
            <StudyModeCard
              title="Grammar Drill"
              description="Verbs and adjectives"
              icon={<Type className="h-8 w-8" />}
              onClick={() => setStudyMode('quiz-grammar')}
              disabled={!canStartGrammarQuiz}
            />
          </div>

          {studyItems.length === 0 && datasetItems.length > 0 && (
            <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              No {selectedStudyLabel} available.
            </p>
          )}

          {studyItems.length > 0 && !canStartChoiceQuiz && (
            <p className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              Multiple-choice modes need at least {MIN_QUIZ_ITEMS} items in the selected practice scope.
            </p>
          )}

          {studyItems.length > 0 && studyKanji.length === 0 && (
            <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
              Writing practice needs kanji items.
            </p>
          )}

          {studyKanji.length > 0 && !canStartWritingQuiz && (
            <p className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
              Writing practice needs at least {MIN_QUIZ_ITEMS} kanji items in the selected practice scope.
            </p>
          )}

          {studyVocabulary.length > 0 && grammarReadyItems.length === 0 && (
            <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              Grammar drill needs verbs or adjectives with grammar data.
            </p>
          )}

          {grammarReadyItems.length > 0 && !canStartGrammarQuiz && (
            <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              Grammar drill needs at least {MIN_QUIZ_ITEMS} grammar-ready vocabulary items.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <StudyItemDetailDialog
        item={selectedItem}
        open={!!selectedItem}
        onGenerateExamples={onGenerateExamples}
        onOpenChange={(open) => !open && setSelectedItemId(null)}
      />

      <ShareDialog
        dataset={dataset}
        itemList={datasetItems}
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
      />
    </div>
  );
};

interface StudyModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

const StudyModeCard: React.FC<StudyModeCardProps> = ({
  title,
  description,
  icon,
  onClick,
  disabled,
}) => (
  <Card
    className={`group border-none bg-white/88 py-0 shadow-[0_16px_42px_-32px_rgba(15,23,42,0.32)] ring-1 ring-slate-200/80 transition-all duration-200 dark:bg-slate-950/88 dark:ring-slate-800 ${
      disabled
        ? 'cursor-not-allowed opacity-50'
        : 'cursor-pointer hover:-translate-y-0.5 hover:ring-slate-300 dark:hover:ring-slate-700'
    }`}
    onClick={disabled ? undefined : onClick}
  >
    <CardContent className="flex items-center gap-4 p-5 sm:p-6">
      <div className="rounded-[20px] border border-indigo-100 bg-indigo-50 p-3 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </CardContent>
  </Card>
);
