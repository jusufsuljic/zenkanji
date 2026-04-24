import React from 'react';
import { Kanji } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Info, Hash, GraduationCap } from 'lucide-react';

interface KanjiDetailDialogProps {
  kanji: Kanji | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KanjiDetailDialog: React.FC<KanjiDetailDialogProps> = ({
  kanji,
  open,
  onOpenChange,
}) => {
  if (!kanji) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden border-none bg-white p-0 shadow-2xl dark:bg-slate-950">
        <DialogHeader className="border-b bg-slate-50 p-8 pb-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 text-8xl font-bold text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
                {kanji.character}
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-4xl font-black text-slate-900 dark:text-slate-50">
                  {kanji.meaning}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {kanji.jlptLevel && (
                    <Badge className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                      JLPT N{kanji.jlptLevel}
                    </Badge>
                  )}
                  {kanji.grade && (
                    <Badge variant="outline" className="border-slate-300 dark:border-slate-700 dark:text-slate-300">
                      Grade {kanji.grade}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {kanji.strokeCount} Strokes
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-0">
          <div className="space-y-10">
            {/* Readings Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                  <Info className="h-4 w-4" />
                  On-Readings (Kunyomi)
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <p className="text-2xl font-medium text-indigo-900 dark:text-indigo-100">
                    {(kanji.onReadings || []).join('、 ') || 'None'}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                  <GraduationCap className="h-4 w-4" />
                  Kun-Readings (Onyomi)
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-2xl font-medium text-emerald-900 dark:text-emerald-100">
                    {(kanji.kunReadings || []).join('、 ') || 'None'}
                  </p>
                </div>
              </div>
            </section>

            <Separator className="bg-slate-100 dark:bg-slate-800" />

            {/* Examples Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <BookOpen className="h-4 w-4" />
                Common Examples
              </div>
              <div className="grid grid-cols-1 gap-4">
                {(kanji.examples || []).length > 0 ? (
                  kanji.examples.map((ex, i) => (
                    <div 
                      key={i} 
                      className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-5 transition-all hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-500/20 dark:hover:bg-indigo-500/5"
                    >
                      <div className="flex items-center gap-6">
                        <div className="text-3xl font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-50 dark:group-hover:text-indigo-300">
                          {ex.word}
                        </div>
                        <div className="space-y-1">
                          <div className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-sm font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {ex.reading}
                          </div>
                          <div className="font-medium text-slate-600 dark:text-slate-300">
                            {ex.meaning}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed bg-slate-50 py-8 text-center italic text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500">
                    No examples available for this Kanji.
                  </div>
                )}
              </div>
            </section>

            {/* Additional Info */}
            <section className="bg-slate-900 rounded-2xl p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <Hash className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Internal ID</p>
                  <p className="font-mono text-sm text-indigo-200">{kanji.id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Added On</p>
                <p className="text-sm font-medium">
                  {new Date(kanji.addedAt).toLocaleDateString()}
                </p>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
