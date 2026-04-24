import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Loader2, Check } from 'lucide-react';
import { searchKanji, getKanjiDetails, localSearch } from '../services/kanjiService';
import { Kanji } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';

interface KanjiSearchProps {
  onAdd: (kanji: Kanji) => Promise<void> | void;
  existingKanjiIds: string[];
}

export const KanjiSearch: React.FC<KanjiSearchProps> = ({ onAdd, existingKanjiIds }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Partial<Kanji>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const latestSearchId = useRef(0);

  const mergeSearchResults = (localResults: Partial<Kanji>[], remoteResults: Partial<Kanji>[]) => {
    const mergedResults = new Map<string, Partial<Kanji>>();

    [...localResults, ...remoteResults].forEach((result) => {
      if (!result.character) {
        return;
      }

      mergedResults.set(result.character, {
        ...mergedResults.get(result.character),
        ...result,
        onReadings: result.onReadings || mergedResults.get(result.character)?.onReadings || [],
        kunReadings: result.kunReadings || mergedResults.get(result.character)?.kunReadings || [],
        examples: result.examples || mergedResults.get(result.character)?.examples || [],
      });
    });

    return Array.from(mergedResults.values());
  };

  const canAddDirectly = (kanji: Partial<Kanji>) =>
    Boolean(
      kanji.character &&
      kanji.meaning &&
      Array.isArray(kanji.onReadings) &&
      Array.isArray(kanji.kunReadings) &&
      typeof kanji.strokeCount === 'number' &&
      Array.isArray(kanji.examples)
    );

  const toKanji = (kanji: Partial<Kanji>): Kanji | null => {
    if (!kanji.character || !kanji.meaning) {
      return null;
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      type: 'kanji',
      character: kanji.character,
      meaning: kanji.meaning,
      onReadings: kanji.onReadings || [],
      kunReadings: kanji.kunReadings || [],
      examples: kanji.examples || [],
      strokeCount: typeof kanji.strokeCount === 'number' ? kanji.strokeCount : 0,
      jlptLevel: kanji.jlptLevel,
      grade: kanji.grade,
      addedAt: Date.now(),
    };
  };

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const searchId = latestSearchId.current + 1;
    latestSearchId.current = searchId;

    // Show local results immediately
    const localResults = localSearch(searchTerm);
    setResults(localResults);

    setIsLoading(true);
    setError(null);
    try {
      const searchResults = await searchKanji(searchTerm);

      if (searchId !== latestSearchId.current) {
        return;
      }

      setResults(mergeSearchResults(localResults, searchResults));
    } catch (err: any) {
      console.error("Search failed", err);

      if (searchId !== latestSearchId.current) {
        return;
      }

      if (localResults.length === 0) {
        setError(err.message || "Search failed. Please try again.");
      }
    } finally {
      if (searchId === latestSearchId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      latestSearchId.current += 1;
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      if (query && query.length >= 1) {
        performSearch(query);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleAdd = async (kanji: Partial<Kanji>) => {
    if (!kanji.character) return;
    
    setAddingId(kanji.character);
    try {
      if (canAddDirectly(kanji)) {
        const fullKanji = toKanji(kanji);
        if (fullKanji) {
          await onAdd(fullKanji);
        }
        return;
      }

      const details = await getKanjiDetails(kanji.character);
      const fullKanji = details ? toKanji(details) : null;
      if (fullKanji) {
        await onAdd(fullKanji);
      }
    } catch (error) {
      console.error("Failed to get details", error);
    } finally {
      setAddingId(null);
    }
  };

  const hasQuery = query.trim().length > 0;
  const resultCountLabel = hasQuery
    ? `${results.length} result${results.length === 1 ? '' : 's'}`
    : 'Type to start searching';

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by kanji, reading, or meaning..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 rounded-2xl border-slate-200 bg-white pl-11 pr-4 text-base dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 rounded-2xl bg-slate-950 px-5 font-semibold text-white hover:bg-slate-800"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
        <div className="text-sm text-slate-500 dark:text-slate-400 sm:min-w-28 sm:text-right">{resultCountLabel}</div>
      </form>

      {error && (
        <div className="rounded-[24px] border border-red-200 bg-red-50/90 p-4 text-sm text-red-700 shadow-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => performSearch(query)}
              className="h-9 rounded-xl px-3 text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-500/15"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {!hasQuery && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          Search for a kanji, reading, or meaning.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AnimatePresence>
          {results.map((result, i) => {
            const isAdded = existingKanjiIds.includes(result.character || '');
            return (
              <motion.div
                key={result.character || i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="h-full"
              >
                <Card className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
                  <CardContent className="flex h-full flex-col p-0 sm:flex-row">
                    <div className="flex min-h-28 items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/70 sm:w-32 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r">
                      <div className="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                        {result.character}
                      </div>
                      <div className="text-right sm:mt-3 sm:text-center">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{result.strokeCount ?? '—'} strokes</div>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
                      <div className="space-y-4">
                        <div>
                          <div className="text-xl font-bold leading-snug text-slate-900 whitespace-normal break-words dark:text-slate-50">
                            {result.meaning}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              On-Yomi
                            </div>
                            <div className="mt-2 text-sm font-medium leading-6 text-slate-700 whitespace-normal break-words dark:text-slate-200">
                              {result.onReadings && result.onReadings.length > 0
                                ? result.onReadings.join(', ')
                                : '—'}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              Kun-Yomi
                            </div>
                            <div className="mt-2 text-sm font-medium leading-6 text-slate-700 whitespace-normal break-words dark:text-slate-200">
                              {result.kunReadings && result.kunReadings.length > 0
                                ? result.kunReadings.join(', ')
                                : '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <p className="text-sm text-slate-500 dark:text-slate-400">{isAdded ? 'Already added' : ''}</p>
                        <Button
                          size="icon"
                          variant={isAdded ? 'ghost' : 'outline'}
                          disabled={isAdded || addingId === result.character}
                          onClick={() => handleAdd(result)}
                          className={`h-12 w-12 shrink-0 rounded-2xl transition-all ${
                            isAdded
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15'
                              : 'border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                          }`}
                        >
                          {addingId === result.character ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : isAdded ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Plus className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!isLoading && results.length === 0 && hasQuery && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">No results for &ldquo;{query}&rdquo;</div>
        </div>
      )}
    </div>
  );
};
