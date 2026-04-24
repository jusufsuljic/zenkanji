import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import { Vocabulary } from '../types';
import { getVocabularyDetails, localSearch, searchVocabulary } from '../services/vocabularyService';

interface VocabularySearchProps {
  onAdd: (vocabulary: Vocabulary) => Promise<void> | void;
  existingVocabularyWords: string[];
}

export const VocabularySearch: React.FC<VocabularySearchProps> = ({
  onAdd,
  existingVocabularyWords,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Partial<Vocabulary>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingWord, setAddingWord] = useState<string | null>(null);
  const latestSearchId = useRef(0);

  const canAddDirectly = (vocabulary: Partial<Vocabulary>) =>
    Boolean(
      vocabulary.word &&
      vocabulary.meaning &&
      typeof vocabulary.furigana === 'string' &&
      typeof vocabulary.romaji === 'string' &&
      Array.isArray(vocabulary.examples)
    );

  const toVocabulary = (vocabulary: Partial<Vocabulary>): Vocabulary | null => {
    if (!vocabulary.word || !vocabulary.meaning) {
      return null;
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      type: 'vocabulary',
      word: vocabulary.word,
      meaning: vocabulary.meaning,
      furigana: vocabulary.furigana || '',
      romaji: vocabulary.romaji || '',
      jlptLevel: vocabulary.jlptLevel,
      examples: vocabulary.examples || [],
      addedAt: Date.now(),
    };
  };

  const mergeSearchResults = (
    localResults: Partial<Vocabulary>[],
    remoteResults: Partial<Vocabulary>[]
  ) => {
    const merged = new Map<string, Partial<Vocabulary>>();

    [...localResults, ...remoteResults].forEach((result) => {
      if (!result.word) {
        return;
      }

      merged.set(result.word, {
        ...merged.get(result.word),
        ...result,
        type: 'vocabulary',
        examples: result.examples || merged.get(result.word)?.examples || [],
      });
    });

    return Array.from(merged.values());
  };

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const searchId = latestSearchId.current + 1;
    latestSearchId.current = searchId;

    const localResults = localSearch(searchTerm);
    setResults(localResults);
    setIsLoading(true);
    setError(null);

    try {
      const remoteResults = await searchVocabulary(searchTerm);

      if (searchId !== latestSearchId.current) {
        return;
      }

      setResults(mergeSearchResults(localResults, remoteResults));
    } catch (searchError: any) {
      console.error('Vocabulary search failed', searchError);

      if (searchId !== latestSearchId.current) {
        return;
      }

      if (localResults.length === 0) {
        setError(searchError.message || 'Search failed. Please try again.');
      }
    } finally {
      if (searchId === latestSearchId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      latestSearchId.current += 1;
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      performSearch(query);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [performSearch, query]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    performSearch(query);
  };

  const handleAdd = async (vocabulary: Partial<Vocabulary>) => {
    if (!vocabulary.word) {
      return;
    }

    setAddingWord(vocabulary.word);

    try {
      if (canAddDirectly(vocabulary)) {
        const fullVocabulary = toVocabulary(vocabulary);
        if (fullVocabulary) {
          await onAdd(fullVocabulary);
        }
        return;
      }

      const details = await getVocabularyDetails(vocabulary.word);
      const fullVocabulary = details ? toVocabulary(details) : null;
      if (fullVocabulary) {
        await onAdd(fullVocabulary);
      }
    } catch (addError) {
      console.error('Failed to add vocabulary', addError);
    } finally {
      setAddingWord(null);
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
            placeholder="Search by word, furigana, romaji, or meaning..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
          Search for a word, reading, or meaning.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AnimatePresence>
          {results.map((result, index) => {
            const isAdded = existingVocabularyWords.includes(result.word || '');
            return (
              <motion.div
                key={result.word || index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="h-full"
              >
                <Card className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
                  <CardContent className="flex h-full flex-col p-0 sm:flex-row">
                    <div className="flex min-h-28 items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 text-left dark:border-slate-800 dark:bg-slate-900/70 sm:w-40 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:text-center">
                      <div className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                        {result.word}
                      </div>
                      <div className="text-right sm:mt-3 sm:text-center">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {result.jlptLevel ? `JLPT N${result.jlptLevel}` : '—'}
                        </div>
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
                              Furigana
                            </div>
                            <div className="mt-2 text-sm font-medium leading-6 text-slate-700 whitespace-normal break-words dark:text-slate-200">
                              {result.furigana || '—'}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              Romaji
                            </div>
                            <div className="mt-2 text-sm font-medium leading-6 text-slate-700 whitespace-normal break-words dark:text-slate-200">
                              {result.romaji || '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <p className="text-sm text-slate-500 dark:text-slate-400">{isAdded ? 'Already added' : ''}</p>
                        <Button
                          size="icon"
                          variant={isAdded ? 'ghost' : 'outline'}
                          disabled={isAdded || addingWord === result.word}
                          onClick={() => handleAdd(result)}
                          className={`h-12 w-12 shrink-0 rounded-2xl transition-all ${
                            isAdded
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15'
                              : 'border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                          }`}
                        >
                          {isAdded ? (
                            <Check className="h-5 w-5" />
                          ) : addingWord === result.word ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
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
