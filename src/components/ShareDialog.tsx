import React, { useEffect, useMemo, useState } from 'react';
import { Dataset, StudyItem } from '../types';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { isKanji } from '../lib/studyItems';
import { encodeSharePayload } from '../lib/share';
import { AppDialogShell } from './shared/AppDialogShell';
import { Input } from '@/components/ui/input';

interface ShareDialogProps {
  dataset: Dataset;
  itemList: StudyItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  dataset,
  itemList,
  open,
  onOpenChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const kanjiCount = itemList.filter(isKanji).length;
  const vocabularyCount = itemList.length - kanjiCount;

  const shareLink = useMemo(() => {
    try {
      let profile: { nickname?: string } = {};

      try {
        profile = JSON.parse(localStorage.getItem('mykanji_profile') || '{}');
      } catch (error) {
        console.warn('Failed to parse profile for share metadata', error);
      }

      const shareData = {
        n: dataset.name,
        d: dataset.description,
        i: itemList.map((item) =>
          isKanji(item)
            ? {
                t: 'k',
                c: item.character,
                m: item.meaning,
              }
            : {
                t: 'v',
                w: item.word,
                m: item.meaning,
                f: item.furigana,
                r: item.romaji,
                l: item.jlptLevel,
                vk: item.kind,
                vg: item.verbGroup,
              }
        ),
        u: profile.nickname || 'A Kanji Learner',
      };

      const encodedPayload = encodeSharePayload(shareData);
      const shareUrl = new URL(window.location.origin + window.location.pathname);
      shareUrl.searchParams.set('share', encodedPayload);
      return shareUrl.toString();
    } catch (error) {
      console.error('Failed to generate share link', error);
      return '';
    }
  }, [dataset.description, dataset.name, itemList]);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  const handleCopy = async () => {
    if (!shareLink) {
      toast.error('Could not generate the share link.');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy share link', error);
      toast.error('Could not copy the link.');
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare || !shareLink) {
      if (!shareLink) {
        toast.error('Could not generate the share link.');
      }
      return;
    }

    try {
      await navigator.share({
        title: `${dataset.name} on ZenKanji`,
        text: `Add "${dataset.name}" to your ZenKanji collections.`,
        url: shareLink,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('Failed to open native share dialog', error);
      toast.error('Could not open the share sheet.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogShell
        title="Share Collection"
        description={dataset.name}
        icon={<Share2 className="h-5 w-5" />}
        bodyClassName="space-y-4"
        footer={
          <div
            className={`grid grid-cols-1 gap-3 ${
              canNativeShare ? 'sm:grid-cols-2' : 'sm:grid-cols-1'
            }`}
          >
            {canNativeShare && (
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white font-semibold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                onClick={handleNativeShare}
              >
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
            )}
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white font-semibold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              onClick={handleCopy}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy Link
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
            {itemList.length} items
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
            {kanjiCount} kanji
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
            {vocabularyCount} vocabulary
          </span>
        </div>

        <div className="space-y-2">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Share Link
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareLink || 'Share link unavailable'}
                className="h-11 border-none bg-transparent px-3 font-mono text-xs text-slate-500 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:text-slate-300 md:text-xs"
              />
              <Button
                size="sm"
                onClick={handleCopy}
                className={`shrink-0 rounded-xl px-3 ${
                  copied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </AppDialogShell>
    </Dialog>
  );
};
