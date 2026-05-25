import { useState, useCallback } from 'react';
import type { AppSettings } from '../types';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    const savedMode = (localStorage.getItem('gemini_mode') as 'demo' | 'live') || 'demo';
    return { apiKey: savedKey, mode: savedMode };
  });

  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('gemini_api_key', newSettings.apiKey);
    localStorage.setItem('gemini_mode', newSettings.mode);
  }, []);

  return {
    settings,
    saveSettings
  };
}
