export interface AiExampleSettings {
  apiKey: string;
  enabled: boolean;
  autoGenerate: boolean;
}

const AI_SETTINGS_STORAGE_KEY = 'zenkanji_ai_example_settings';
const defaultAiExampleSettings: AiExampleSettings = {
  apiKey: '',
  enabled: false,
  autoGenerate: false,
};

const isBrowser = typeof window !== 'undefined';

const getUserScopedStorageKey = (userId: string) => `${AI_SETTINGS_STORAGE_KEY}_${userId}`;

const normalizeAiExampleSettings = (value: Partial<AiExampleSettings> | null | undefined): AiExampleSettings => ({
  apiKey: value?.apiKey?.trim() || '',
  enabled: Boolean(value?.enabled),
  autoGenerate: Boolean(value?.autoGenerate),
});

const readStoredSettings = (storageKey: string) => {
  if (!isBrowser) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    return normalizeAiExampleSettings(JSON.parse(rawValue) as Partial<AiExampleSettings>);
  } catch (error) {
    console.warn('[AiSettings] Failed to read settings', error);
    return null;
  }
};

export const getAiExampleSettings = (userId?: string): AiExampleSettings => {
  if (!isBrowser) {
    return defaultAiExampleSettings;
  }

  if (userId) {
    const userScopedSettings = readStoredSettings(getUserScopedStorageKey(userId));
    if (userScopedSettings) {
      return userScopedSettings;
    }

    // Migrate a legacy device-wide key into the signed-in user's local settings.
    const legacySettings = readStoredSettings(AI_SETTINGS_STORAGE_KEY);
    if (legacySettings) {
      try {
        window.localStorage.setItem(
          getUserScopedStorageKey(userId),
          JSON.stringify(legacySettings)
        );
        window.localStorage.removeItem(AI_SETTINGS_STORAGE_KEY);
      } catch (error) {
        console.warn('[AiSettings] Failed to migrate legacy settings', error);
      }

      return legacySettings;
    }

    return defaultAiExampleSettings;
  }

  return readStoredSettings(AI_SETTINGS_STORAGE_KEY) || defaultAiExampleSettings;
};

export const saveAiExampleSettings = (settings: Partial<AiExampleSettings>, userId?: string) => {
  if (!isBrowser) {
    return normalizeAiExampleSettings(settings);
  }

  const normalizedSettings = normalizeAiExampleSettings(settings);

  try {
    if (userId) {
      window.localStorage.setItem(
        getUserScopedStorageKey(userId),
        JSON.stringify(normalizedSettings)
      );
      window.localStorage.removeItem(AI_SETTINGS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        AI_SETTINGS_STORAGE_KEY,
        JSON.stringify(normalizedSettings)
      );
    }
  } catch (error) {
    console.warn('[AiSettings] Failed to save settings', error);
  }

  window.dispatchEvent(new Event('aiExampleSettingsUpdated'));
  return normalizedSettings;
};

export const getActiveGeminiApiKey = (userId?: string) => getAiExampleSettings(userId).apiKey;

export const hasAiExampleKey = (userId?: string) => Boolean(getActiveGeminiApiKey(userId).trim());

export const isAiExamplesEnabled = (userId?: string) => getAiExampleSettings(userId).enabled;

export const canUseAiExamples = (userId?: string) =>
  isAiExamplesEnabled(userId) && hasAiExampleKey(userId);

export const shouldAutoGenerateAiExamples = (userId?: string) => {
  const settings = getAiExampleSettings(userId);
  return settings.enabled && settings.autoGenerate && hasAiExampleKey(userId);
};
