import React from 'react';
import { Dataset, StudyItem } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronRight, Layers, Plus, Sparkles, Trash2, Type } from 'lucide-react';
import { motion } from 'motion/react';
import { getDatasetItemIds, isKanji, isVocabulary } from '../lib/studyItems';
import { AppStat } from './shared/AppStat';

interface DatasetManagerProps {
  datasets: Dataset[];
  allItems: StudyItem[];
  onSelect: (dataset: Dataset) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export const DatasetManager: React.FC<DatasetManagerProps> = ({
  datasets,
  allItems,
  onSelect,
  onCreate,
  onDelete,
}) => {
  const totalKanji = allItems.filter(isKanji).length;
  const totalVocabulary = allItems.filter(isVocabulary).length;

  return (
    <div className="space-y-6">
      <section className="app-panel overflow-hidden px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
              Collections
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Organize items and start studying.
            </p>
          </div>

          <Button
            onClick={onCreate}
            className="h-11 rounded-2xl bg-slate-950 px-5 font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="mr-2 h-4 w-4" /> New Collection
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <AppStat label="Collections" value={datasets.length} />
          <AppStat label="Kanji Saved" value={totalKanji} />
          <AppStat label="Vocabulary Saved" value={totalVocabulary} />
        </div>
      </section>

      <section className="app-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-slate-50">Your Collections</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Open one to manage items or study.</p>
          </div>
          {datasets.length > 0 && (
            <div className="app-pill">
              <Sparkles className="h-3.5 w-3.5" />
              {datasets.length} active
            </div>
          )}
        </div>

        {datasets.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {datasets.map((dataset, index) => {
              const datasetItems = allItems.filter((item) =>
                getDatasetItemIds(dataset).includes(item.id)
              );
              const kanjiCount = datasetItems.filter(isKanji).length;
              const vocabularyCount = datasetItems.filter(isVocabulary).length;

              return (
                <motion.div
                  key={dataset.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <div className="group px-5 py-5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/60 sm:px-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 cursor-pointer items-start gap-4 text-left"
                        onClick={() => onSelect(dataset)}
                      >
                        <div className="rounded-[18px] border border-slate-200 bg-white p-3 text-indigo-600 shadow-sm transition-transform group-hover:scale-[1.03] dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-300">
                          <Layers className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="space-y-1">
                            <div className="text-xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                              {dataset.name}
                            </div>
                            <div className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {dataset.description || 'No description yet.'}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="app-pill">
                              <BookOpen className="h-3.5 w-3.5" />
                              {datasetItems.length} items
                            </span>
                            <span className="app-pill">{kanjiCount} kanji</span>
                            <span className="app-pill">
                              <Type className="h-3.5 w-3.5" />
                              {vocabularyCount} vocabulary
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <Button
                          variant="outline"
                          className="h-11 rounded-2xl border-slate-200 bg-white px-4 font-semibold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          onClick={() => onSelect(dataset)}
                        >
                          Open
                        </Button>
                        <Button
                          className="h-11 rounded-2xl bg-slate-950 px-4 font-semibold text-white hover:bg-slate-900"
                          onClick={() => onSelect(dataset)}
                        >
                          Study <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          onClick={() => onDelete(dataset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-16 sm:px-6 sm:py-20">
            <Card className="app-panel-muted border-dashed bg-transparent py-0 shadow-none ring-0">
              <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:px-10">
                <div className="rounded-full border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <Layers className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                  Start with your first collection
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Add a collection, fill it with items, and study from there.
                </p>
                <Button
                  onClick={onCreate}
                  className="mt-6 h-11 rounded-2xl bg-slate-950 px-5 font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Collection
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
};
