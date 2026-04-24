import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Download, Layers, X } from 'lucide-react';
import { AppDialogShell } from './shared/AppDialogShell';

interface ImportDialogProps {
  data: {
    n: string;
    d: string;
    i?: {
      t: 'k' | 'v';
      c?: string;
      w?: string;
      m: string;
      f?: string;
      r?: string;
      l?: number;
      vk?: string;
      b?: string;
      bf?: string;
      br?: string;
      gn?: string;
      vg?: string;
      tf?: string;
      tff?: string;
      nf?: string;
      nff?: string;
      pf?: string;
      pff?: string;
      pnf?: string;
      pnff?: string;
    }[];
    k?: { c: string; m: string }[];
    u: string;
  } | null;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  data,
  open,
  onConfirm,
  onCancel,
}) => {
  if (!data) {
    return null;
  }

  const sharedItems = Array.isArray(data.i)
    ? data.i
    : Array.isArray(data.k)
      ? data.k.map((item) => ({ t: 'k' as const, ...item }))
      : [];

  const kanjiCount = sharedItems.filter((item) => item.t === 'k').length;
  const vocabularyCount = sharedItems.filter((item) => item.t === 'v').length;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AppDialogShell
        title="Import Collection"
        description={`Shared by ${data.u}`}
        icon={<Download className="h-5 w-5" />}
        bodyClassName="space-y-4"
        footer={
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={onConfirm}
              className="h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800"
            >
              <BookOpen className="mr-2 h-5 w-5" /> Add to My Hub
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="h-12 w-full rounded-2xl border-slate-200 bg-white font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <X className="mr-2 h-5 w-5" /> No thanks
            </Button>
          </div>
        }
      >
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700">
              <Layers className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                {data.n}
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {data.d || 'No description'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
            {sharedItems.length} items
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
            {kanjiCount} kanji
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
            {vocabularyCount} vocabulary
          </span>
        </div>
      </AppDialogShell>
    </Dialog>
  );
};
