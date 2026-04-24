import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { getGoogleAuthErrorMessage } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Layers, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';
import { AppStat } from './shared/AppStat';

export const Login: React.FC = () => {
  const { authError, clearAuthError, login } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!authError) {
      return;
    }

    toast.error(getGoogleAuthErrorMessage(authError));
    clearAuthError();
  }, [authError, clearAuthError]);

  const handleLogin = async () => {
    if (isSigningIn) {
      return;
    }

    setIsSigningIn(true);

    try {
      await login();
    } catch (error) {
      toast.error(getGoogleAuthErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-8rem] h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-500/10" />
        <div className="absolute bottom-[-12rem] right-[-6rem] h-80 w-80 rounded-full bg-amber-100/50 blur-3xl dark:bg-cyan-400/10" />
      </div>

      <div className="relative mx-auto flex max-w-6xl justify-end pb-4">
        <ThemeToggle className="h-10 w-10 rounded-full border-slate-200 bg-white/90 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="app-panel relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
          <div className="absolute right-[-2rem] top-[-2rem] text-[12rem] font-black leading-none text-indigo-100/70 dark:text-indigo-500/12 sm:text-[15rem]">
            字
          </div>
          <div className="relative max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-indigo-100 bg-indigo-50/80 px-4 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300">
              <div className="rounded-full bg-indigo-600 p-1.5 text-white dark:bg-indigo-500">
                <Layers className="h-4 w-4" />
              </div>
              ZenKanji
            </div>

            <div className="space-y-4">
              <p className="app-kicker">Japanese Study Workspace</p>
              <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl lg:text-6xl">
                Organize kanji, vocabulary, and beginner grammar in one place.
              </h1>
              <p className="max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                Build focused collections, share them instantly, and move into flashcards,
                quizzes, and grammar drills without changing context.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <AppStat label="Collections" value="Mixed sets" valueClassName="mt-2 text-2xl" />
              <AppStat label="Study Modes" value="Quiz + cards" valueClassName="mt-2 text-2xl" />
              <AppStat label="Sharing" value="Link import" valueClassName="mt-2 text-2xl" />
            </div>
          </div>
        </section>

        <section className="app-panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="space-y-8">
            <div className="space-y-3 text-center lg:text-left">
              <p className="app-kicker">Sign In</p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">Start studying</h2>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                Sign in to create, share, and study your own kanji and vocabulary collections.
              </p>
            </div>

            <div className="app-panel-muted space-y-5 p-5 sm:p-6">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Google account</div>
                <div className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Your collections sync to your account so you can continue across devices.
                </div>
              </div>

              <Button
                onClick={handleLogin}
                disabled={isSigningIn}
                className="h-14 w-full rounded-2xl bg-indigo-600 text-lg font-bold shadow-[0_20px_40px_-20px_rgba(79,70,229,0.95)] transition-transform hover:scale-[1.01] hover:bg-indigo-700 active:scale-[0.99] dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                <LogIn className="mr-2 h-6 w-6" />
                {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
              </Button>

              <p className="text-center text-xs leading-6 text-slate-400 dark:text-slate-500 lg:text-left">
                By signing in, you enable syncing and sharing for your collections.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
