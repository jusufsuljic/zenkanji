/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Dataset, Kanji, StudyItem, Vocabulary } from './types';
import {
  generateKanjiExamples,
  generateVocabularyExamples,
} from './services/geminiService';
import { storageService } from './services/storageService';
import { DatasetManager } from './components/DatasetManager';
import { DatasetDetail } from './components/DatasetDetail';
import { Profile } from './components/Profile';
import { ImportDialog } from './components/ImportDialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as LucideUser, Home, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from './lib/AuthContext';
import { getDatasetItemIds, getStudyItemDisplay, isKanji } from './lib/studyItems';
import { Login } from './components/Login';
import { decodeSharePayload } from './lib/share';
import {
  buildVocabularyGrammarFields,
  hasVocabularyGrammarData,
  inferVocabularyGrammarAnalysis,
} from './services/grammarService';
import { canUseAiExamples, shouldAutoGenerateAiExamples } from './services/aiSettingsService';
import { getKanjiDetails } from './services/kanjiService';
import { getVocabularyDetails } from './services/vocabularyService';
import { ThemeToggle } from './components/ThemeToggle';
import { AppDialogShell } from './components/shared/AppDialogShell';
import {
  segmentedControlOptionActiveClass,
  segmentedControlOptionBaseClass,
  segmentedControlOptionInactiveClass,
  segmentedControlShellClass,
} from './components/shared/SegmentedControl';

export default function App() {
  const { user, loading } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [allItems, setAllItems] = useState<StudyItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [view, setView] = useState<'hub' | 'profile'>('hub');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDesc, setNewDatasetDesc] = useState('');
  const [importData, setImportData] = useState<any | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadData = async () => {
      const [datasetsResult, kanjiResult, vocabularyResult] = await Promise.allSettled([
        storageService.getFirestoreDatasets(user.uid),
        storageService.getFirestoreKanji(user.uid),
        storageService.getFirestoreVocabulary(user.uid),
      ]);

      if (datasetsResult.status === 'fulfilled' && datasetsResult.value.length > 0) {
        setDatasets(datasetsResult.value);
        storageService.saveDatasets(datasetsResult.value);
      } else {
        if (datasetsResult.status === 'rejected') {
          console.error('Error loading datasets from Firestore', datasetsResult.reason);
        }
        setDatasets(storageService.getDatasets());
      }

      const firestoreKanji =
        kanjiResult.status === 'fulfilled' ? kanjiResult.value : storageService.getAllKanji();
      const firestoreVocabulary =
        vocabularyResult.status === 'fulfilled'
          ? vocabularyResult.value
          : storageService.getAllVocabulary();

      if (kanjiResult.status === 'rejected') {
        console.error('Error loading kanji from Firestore', kanjiResult.reason);
      }

      if (vocabularyResult.status === 'rejected') {
        console.error('Error loading vocabulary from Firestore', vocabularyResult.reason);
      }

      if (kanjiResult.status === 'fulfilled') {
        storageService.saveAllKanji(firestoreKanji);
      }

      if (vocabularyResult.status === 'fulfilled') {
        storageService.saveAllVocabulary(firestoreVocabulary);
      }

      setAllItems([...firestoreKanji, ...firestoreVocabulary]);
    };

    loadData();

    const urlParams = new URLSearchParams(window.location.search);
    const shareData = urlParams.get('share');
    if (shareData) {
      try {
        const decoded = decodeSharePayload<any>(shareData);
        setImportData(decoded);
        setIsImportDialogOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Failed to decode share link', error);
        toast.error('Invalid share link');
      }
    }
  }, [user]);

  if (loading) {
    return <Toaster position="bottom-right" />;
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toaster position="bottom-right" />
      </>
    );
  }

  const syncAllItems = () => {
    setAllItems(storageService.getAllStudyItems());
  };

  const saveStudyItem = async (item: StudyItem) => {
    if (isKanji(item)) {
      await storageService.saveFirestoreKanji(user.uid, item);
      return;
    }

    await storageService.saveFirestoreVocabulary(user.uid, item);
  };

  const updateStudyItem = (item: StudyItem) => {
    if (isKanji(item)) {
      return storageService.updateKanji(item);
    }

    return storageService.updateVocabulary(item);
  };

  const enrichKanjiInBackground = async (kanji: Kanji) => {
    if (!user || kanji.examples.length > 0) {
      return;
    }

    if (!shouldAutoGenerateAiExamples(user.uid)) {
      return;
    }

    try {
      const examples = await generateKanjiExamples(kanji, user.uid);
      if (!examples.length) {
        return;
      }

      const enrichedKanji = storageService.updateKanji({
        ...kanji,
        examples,
      });

      await storageService.saveFirestoreKanji(user.uid, enrichedKanji);
      syncAllItems();
    } catch (error) {
      console.error(`Failed to generate examples for ${kanji.character}`, error);
    }
  };

  const enrichVocabularyInBackground = async (vocabulary: Vocabulary) => {
    const hasGrammarData = hasVocabularyGrammarData(vocabulary);
    const shouldGenerateExamples = Boolean(user && shouldAutoGenerateAiExamples(user.uid));

    if (!user || (vocabulary.examples.length > 0 && hasGrammarData)) {
      return;
    }

    try {
      let examples = vocabulary.examples;
      if (!examples.length && shouldGenerateExamples) {
        try {
          examples = await generateVocabularyExamples(vocabulary, user.uid);
        } catch (error) {
          console.error(`Failed to generate examples for ${vocabulary.word}`, error);
        }
      }

      const grammarAnalysis = inferVocabularyGrammarAnalysis(vocabulary);
      const grammarFields = buildVocabularyGrammarFields(vocabulary, grammarAnalysis);
      const hasNewExamples = examples.length > vocabulary.examples.length;
      const hasNewGrammarData =
        !hasGrammarData &&
        (grammarFields.teForm ||
          grammarFields.negativeForm ||
          grammarFields.pastForm ||
          grammarFields.pastNegativeForm ||
          grammarFields.kind !== 'standard');

      if (!hasNewExamples && !hasNewGrammarData) {
        return;
      }

      const enrichedVocabulary = storageService.updateVocabulary({
        ...vocabulary,
        ...(examples.length ? { examples } : {}),
        ...grammarFields,
      });

      syncAllItems();
      await storageService.saveFirestoreVocabulary(user.uid, enrichedVocabulary);
    } catch (error) {
      console.error(`Failed to enrich vocabulary for ${vocabulary.word}`, error);
    }
  };

  const normalizeImportedItems = (data: any): StudyItem[] => {
    if (Array.isArray(data?.i)) {
      return data.i
        .map((item: any) => {
          if (item.t === 'v' && item.w && item.m) {
            return {
              id: `v-${item.b || item.w}`,
              type: 'vocabulary' as const,
              word: item.w,
              meaning: item.m,
              furigana: item.f || '',
              romaji: item.r || '',
              kind: item.vk || 'standard',
              baseForm: item.b || '',
              baseFurigana: item.bf || '',
              baseRomaji: item.br || '',
              grammarNote: item.gn || '',
              verbGroup: item.vg,
              teForm: item.tf || '',
              teFormFurigana: item.tff || '',
              negativeForm: item.nf || '',
              negativeFurigana: item.nff || '',
              pastForm: item.pf || '',
              pastFurigana: item.pff || '',
              pastNegativeForm: item.pnf || '',
              pastNegativeFurigana: item.pnff || '',
              jlptLevel: typeof item.l === 'number' ? item.l : undefined,
              examples: [],
              addedAt: Date.now(),
            } satisfies Vocabulary;
          }

          if (item.c && item.m) {
            return {
              id: `k-${item.c}`,
              type: 'kanji' as const,
              character: item.c,
              meaning: item.m,
              onReadings: [],
              kunReadings: [],
              examples: [],
              strokeCount: 0,
              addedAt: Date.now(),
            } satisfies Kanji;
          }

          return null;
        })
        .filter(Boolean) as StudyItem[];
    }

    return Array.isArray(data?.k)
      ? data.k
          .filter((item: any) => item.c && item.m)
          .map(
            (item: any) =>
              ({
                id: `k-${item.c}`,
                type: 'kanji',
                character: item.c,
                meaning: item.m,
                onReadings: [],
                kunReadings: [],
                examples: [],
                strokeCount: 0,
                addedAt: Date.now(),
              }) satisfies Kanji
          )
      : [];
  };

  const resolveImportedItemDetails = async (item: StudyItem): Promise<StudyItem> => {
    if (isKanji(item)) {
      try {
        const details = await getKanjiDetails(item.character);
        if (!details) {
          return item;
        }

        return {
          ...item,
          meaning: details.meaning || item.meaning,
          onReadings: details.onReadings || item.onReadings,
          kunReadings: details.kunReadings || item.kunReadings,
          strokeCount:
            typeof details.strokeCount === 'number' ? details.strokeCount : item.strokeCount,
          jlptLevel: details.jlptLevel ?? item.jlptLevel,
          grade: details.grade ?? item.grade,
          examples: details.examples || item.examples,
        } satisfies Kanji;
      } catch (error) {
        console.error(`Failed to resolve imported kanji details for ${item.character}`, error);
        return item;
      }
    }

    try {
      const details = await getVocabularyDetails(item.word);
      if (!details) {
        return item;
      }

      return {
        ...item,
        meaning: details.meaning || item.meaning,
        furigana: details.furigana || item.furigana,
        romaji: details.romaji || item.romaji,
        jlptLevel: details.jlptLevel ?? item.jlptLevel,
        examples: details.examples || item.examples,
      } satisfies Vocabulary;
    } catch (error) {
      console.error(`Failed to resolve imported vocabulary details for ${item.word}`, error);
      return item;
    }
  };

  const generateExamplesForItem = async (item: StudyItem) => {
    if (!user) {
      toast.error('Sign in to generate examples.');
      return false;
    }

    if (!canUseAiExamples(user.uid)) {
      toast.error('Enable AI examples and add your Gemini key in Profile first.');
      return false;
    }

    try {
      if (isKanji(item)) {
        const examples = await generateKanjiExamples(item, user.uid);
        if (!examples.length) {
          toast.error('No examples were generated right now.');
          return false;
        }

        const enrichedKanji = storageService.updateKanji({
          ...item,
          examples,
        });

        await storageService.saveFirestoreKanji(user.uid, enrichedKanji);
        syncAllItems();
        toast.success(`Examples generated for ${item.character}.`);
        return true;
      }

      const examples = await generateVocabularyExamples(item, user.uid);
      const grammarFields = buildVocabularyGrammarFields(item, inferVocabularyGrammarAnalysis(item));

      if (!examples.length) {
        toast.error('No examples were generated right now.');
        return false;
      }

      const enrichedVocabulary = storageService.updateVocabulary({
        ...item,
        examples,
        ...grammarFields,
      });

      await storageService.saveFirestoreVocabulary(user.uid, enrichedVocabulary);
      syncAllItems();
      toast.success(`Examples generated for ${item.word}.`);
      return true;
    } catch (error) {
      console.error(`Failed to generate examples for ${getStudyItemDisplay(item)}`, error);
      toast.error('Could not generate examples right now.');
      return false;
    }
  };

  const handleImport = async () => {
    if (!importData) {
      return;
    }

    const importedItemIds: string[] = [];
    const importedItems = normalizeImportedItems(importData);

    for (const item of importedItems) {
      const resolvedItem = await resolveImportedItemDetails(item);
      const canonicalItem = updateStudyItem(resolvedItem);
      await saveStudyItem(canonicalItem);
      importedItemIds.push(canonicalItem.id);

      if (isKanji(canonicalItem)) {
        void enrichKanjiInBackground(canonicalItem);
      } else {
        void enrichVocabularyInBackground(canonicalItem);
      }
    }

    syncAllItems();

    const newDataset = storageService.createDataset(
      importData.n,
      `${importData.d} (Shared by ${importData.u})`
    );

    const updatedDataset = {
      ...newDataset,
      itemIds: importedItemIds,
    };

    storageService.updateDataset(updatedDataset);
    await storageService.saveFirestoreDataset(user.uid, updatedDataset);
    setDatasets(storageService.getDatasets());
    setIsImportDialogOpen(false);
    setImportData(null);
    toast.success(`Successfully added "${importData.n}" to your hub!`);
  };

  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) {
      toast.error('Please enter a dataset name');
      return;
    }

    const newDataset = storageService.createDataset(newDatasetName, newDatasetDesc);
    await storageService.saveFirestoreDataset(user.uid, newDataset);
    setDatasets([...datasets, newDataset]);
    setIsCreateDialogOpen(false);
    setNewDatasetName('');
    setNewDatasetDesc('');
    toast.success('Dataset created successfully!');
  };

  const handleDeleteDataset = async (id: string) => {
    storageService.deleteDataset(id);
    await storageService.deleteFirestoreDataset(user.uid, id);
    setDatasets(datasets.filter((dataset) => dataset.id !== id));
    toast.success('Dataset deleted');
  };

  const handleAddItemToDataset = async (item: StudyItem) => {
    if (!selectedDatasetId) {
      return;
    }

    const canonicalItem = updateStudyItem(item);
    await saveStudyItem(canonicalItem);
    syncAllItems();

    const dataset = datasets.find((entry) => entry.id === selectedDatasetId);
    if (dataset && !getDatasetItemIds(dataset).includes(canonicalItem.id)) {
      const updatedDataset = {
        ...dataset,
        itemIds: [...getDatasetItemIds(dataset), canonicalItem.id],
      };

      storageService.updateDataset(updatedDataset);
      await storageService.saveFirestoreDataset(user.uid, updatedDataset);
      setDatasets(
        datasets.map((entry) => (entry.id === selectedDatasetId ? updatedDataset : entry))
      );
      toast.success(`Added ${getStudyItemDisplay(canonicalItem)} to ${dataset.name}`);
    }

    if (isKanji(canonicalItem)) {
      void enrichKanjiInBackground(canonicalItem);
    } else {
      void enrichVocabularyInBackground(canonicalItem);
    }
  };

  const handleRemoveItemFromDataset = async (itemId: string) => {
    if (!selectedDatasetId) {
      return;
    }

    const dataset = datasets.find((entry) => entry.id === selectedDatasetId);
    if (!dataset) {
      return;
    }

    const updatedDataset = {
      ...dataset,
      itemIds: getDatasetItemIds(dataset).filter((currentItemId) => currentItemId !== itemId),
    };

    storageService.updateDataset(updatedDataset);
    await storageService.saveFirestoreDataset(user.uid, updatedDataset);
    setDatasets(
      datasets.map((entry) => (entry.id === selectedDatasetId ? updatedDataset : entry))
    );
    toast.success('Removed item from dataset');
  };

  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId);

  return (
    <div className="min-h-screen font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-950 dark:text-slate-50">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-8rem] h-56 w-56 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-500/10 sm:h-72 sm:w-72" />
        <div className="absolute bottom-[-10rem] right-[-4rem] h-64 w-64 rounded-full bg-amber-100/50 blur-3xl dark:bg-cyan-400/10 sm:h-80 sm:w-80" />
      </div>

      <div className="relative px-3 pb-8 pt-3 sm:px-5 sm:pt-5">
        <header className="sticky top-3 z-50 sm:top-5">
          <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[26px] border border-white/70 bg-white/78 px-4 py-3 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/78 dark:shadow-[0_24px_70px_-42px_rgba(2,6,23,0.9)] sm:px-5">
            <div
              className="group flex min-w-0 cursor-pointer items-center gap-3"
              onClick={() => {
                setView('hub');
                setSelectedDatasetId(null);
              }}
            >
              <div className="rounded-[18px] bg-indigo-600 p-2.5 text-white shadow-[0_18px_30px_-18px_rgba(79,70,229,0.95)] transition-transform group-hover:scale-[1.04] dark:bg-indigo-500">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-xl">
                  ZenKanji
                </div>
              </div>
            </div>

            <div className="ml-4 flex items-center gap-2">
              <div className={cn(segmentedControlShellClass, 'hidden sm:grid sm:grid-cols-2')}>
                <Button
                  variant="ghost"
                  onClick={() => setView('hub')}
                  className={cn(
                    segmentedControlOptionBaseClass,
                    'h-9 min-w-[7.25rem] px-4',
                    view === 'hub'
                      ? segmentedControlOptionActiveClass
                      : segmentedControlOptionInactiveClass
                  )}
                >
                  <Home className="mr-2 h-4 w-4" /> Hub
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setView('profile')}
                  className={cn(
                    segmentedControlOptionBaseClass,
                    'h-9 min-w-[7.25rem] px-4',
                    view === 'profile'
                      ? segmentedControlOptionActiveClass
                      : segmentedControlOptionInactiveClass
                  )}
                >
                  <LucideUser className="mr-2 h-4 w-4" /> Profile
                </Button>
              </div>

              <div className={cn(segmentedControlShellClass, 'grid grid-cols-2 sm:hidden')}>
                <Button
                  variant="ghost"
                  onClick={() => setView('hub')}
                  className={cn(
                    segmentedControlOptionBaseClass,
                    'h-10 min-w-[2.75rem] px-3',
                    view === 'hub'
                      ? segmentedControlOptionActiveClass
                      : segmentedControlOptionInactiveClass
                  )}
                >
                  <Home className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setView('profile')}
                  className={cn(
                    segmentedControlOptionBaseClass,
                    'h-10 min-w-[2.75rem] px-3',
                    view === 'profile'
                      ? segmentedControlOptionActiveClass
                      : segmentedControlOptionInactiveClass
                  )}
                >
                  <LucideUser className="h-4 w-4" />
                </Button>
              </div>

              <ThemeToggle className="h-10 w-10 rounded-full border-slate-200 bg-white/90 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" />
            </div>
          </div>
        </header>

        <main className="mx-auto mt-5 max-w-7xl">
          <div className="pb-6">
            {view === 'profile' ? (
              <Profile />
            ) : selectedDataset ? (
              <DatasetDetail
                dataset={selectedDataset}
                allItems={allItems}
                onBack={() => setSelectedDatasetId(null)}
                onAddItem={handleAddItemToDataset}
                onGenerateExamples={generateExamplesForItem}
                onRemoveItem={handleRemoveItemFromDataset}
              />
            ) : (
              <DatasetManager
                datasets={datasets}
                allItems={allItems}
                onSelect={(dataset) => setSelectedDatasetId(dataset.id)}
                onCreate={() => setIsCreateDialogOpen(true)}
                onDelete={handleDeleteDataset}
              />
            )}
          </div>
        </main>
      </div>

      <ImportDialog
        data={importData}
        open={isImportDialogOpen}
        onConfirm={handleImport}
        onCancel={() => {
          setIsImportDialogOpen(false);
          setImportData(null);
        }}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <AppDialogShell
          title="New Collection"
          bodyClassName="grid gap-5"
          footer={
            <Button
              onClick={handleCreateDataset}
              className="h-12 w-full rounded-2xl bg-slate-950 text-base font-semibold text-white hover:bg-slate-800"
            >
              Create Collection
            </Button>
          }
        >
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Name
            </Label>
            <Input
              id="name"
              value={newDatasetName}
              onChange={(event) => setNewDatasetName(event.target.value)}
              placeholder="e.g. JLPT N5 Kanji + Vocab"
              className="h-12 rounded-xl border-slate-200 bg-white focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description
            </Label>
            <Input
              id="description"
              value={newDatasetDesc}
              onChange={(event) => setNewDatasetDesc(event.target.value)}
              placeholder="Optional description"
              className="h-12 rounded-xl border-slate-200 bg-white focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </AppDialogShell>
      </Dialog>

      <Toaster position="bottom-right" />
    </div>
  );
}
