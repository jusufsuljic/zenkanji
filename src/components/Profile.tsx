import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, LogOut, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { SettingRow } from './shared/SettingRow';
import { getAiExampleSettings, saveAiExampleSettings } from '../services/aiSettingsService';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [nickname, setNickname] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiExamplesEnabled, setAiExamplesEnabled] = useState(false);
  const [autoGenerateExamples, setAutoGenerateExamples] = useState(false);

  useEffect(() => {
    if (user) {
      const savedProfile = localStorage.getItem(`mykanji_profile_${user.uid}`);
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        setNickname(profile.nickname || user.displayName || '');
      } else {
        setNickname(user.displayName || '');
      }

      const aiSettings = getAiExampleSettings(user.uid);
      setGeminiApiKey(aiSettings.apiKey);
      setAiExamplesEnabled(aiSettings.enabled);
      setAutoGenerateExamples(aiSettings.autoGenerate);
    }
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    const profile = { nickname, email: user.email };
    localStorage.setItem(`mykanji_profile_${user.uid}`, JSON.stringify(profile));
    // Also update the global profile for sharing
    localStorage.setItem('mykanji_profile', JSON.stringify(profile));
    saveAiExampleSettings(
      {
        apiKey: geminiApiKey,
        enabled: aiExamplesEnabled,
        autoGenerate:
          aiExamplesEnabled && geminiApiKey.trim().length > 0 ? autoGenerateExamples : false,
      },
      user.uid
    );
    toast.success('Profile updated!');
    window.dispatchEvent(new Event('profileUpdated'));
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="app-panel overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-slate-100 bg-[linear-gradient(145deg,rgba(79,70,229,0.96),rgba(99,102,241,0.82))] px-6 py-8 text-white dark:border-slate-800 lg:border-b-0 lg:border-r sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-100/80">
              Profile
            </p>
            <div className="mt-5 flex items-center gap-4">
              {user.photoURL ? (
                <img src={user.photoURL} alt={nickname} className="h-16 w-16 rounded-2xl border-2 border-white/20" referrerPolicy="no-referrer" />
              ) : (
                <div className="rounded-2xl bg-white/20 p-3">
                  <User className="h-8 w-8" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  {nickname || 'Your Profile'}
                </h1>
                <p className="text-sm text-indigo-100">{user.email}</p>
              </div>
            </div>

            <div className="mt-8 rounded-[22px] border border-white/12 bg-white/10 p-4 text-sm leading-7 text-indigo-50">
              Authenticated with Google. Collections sync to your account and your nickname
              appears when you share study sets.
            </div>
          </div>

          <Card className="border-none bg-transparent py-0 shadow-none ring-0">
            <CardContent className="space-y-8 p-6 sm:p-8">
              <div className="space-y-2">
                <p className="app-kicker">Account Settings</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                  Manage your shared identity
                </h2>
              </div>

              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={user.email || ''}
                    disabled
                    className="h-12 cursor-not-allowed rounded-2xl border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nickname" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nickname
                  </Label>
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="How should we call you?"
                    className="h-12 rounded-2xl border-slate-200 bg-white focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                    This name is shown when you share collections with other learners.
                  </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="space-y-2">
                    <p className="app-kicker">AI Examples</p>
                    <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-slate-50">
                      Bring your own Gemini key
                    </h3>
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Your key stays on this device and is used only for generating examples.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="grid gap-2">
                      <Label
                        htmlFor="gemini-api-key"
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Gemini API Key
                      </Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="gemini-api-key"
                          type="password"
                          value={geminiApiKey}
                          onChange={(event) => setGeminiApiKey(event.target.value)}
                          placeholder="Paste your Gemini key"
                          className="h-12 rounded-2xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl border-slate-200 px-4 font-semibold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                          onClick={() => {
                            setGeminiApiKey('');
                            setAutoGenerateExamples(false);
                          }}
                        >
                          Clear Key
                        </Button>
                      </div>
                      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                        It is never added to shared links, imports, or synced profile data.
                      </p>
                    </div>

                    <SettingRow
                      label="Enable AI examples"
                      description="Allow manual example generation with your local Gemini key"
                      control={
                        <Switch
                          checked={aiExamplesEnabled}
                          onCheckedChange={setAiExamplesEnabled}
                        />
                      }
                    />

                    <SettingRow
                      label="Auto-generate in background"
                      description="Attempt examples automatically when you add or import items"
                      control={
                        <Switch
                          checked={autoGenerateExamples}
                          disabled={!aiExamplesEnabled || geminiApiKey.trim().length === 0}
                          onCheckedChange={setAutoGenerateExamples}
                        />
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  onClick={handleSave}
                  className="h-12 w-full shrink-0 rounded-2xl bg-indigo-600 px-5 font-bold shadow-[0_20px_38px_-24px_rgba(79,70,229,0.95)] hover:bg-indigo-700 sm:w-auto sm:flex-1"
                >
                  <Save className="mr-2 h-5 w-5" /> Save Changes
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full shrink-0 rounded-2xl border-slate-200 px-5 font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 sm:w-auto"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-5 w-5" /> Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};
