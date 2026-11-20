import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as auth from '../lib/auth';
import type { DiagnosisRecord } from '../lib/classifier';
import {
  addToHistory, historyKey, normalizeSettings, readJson, writeJson,
  type Settings,
} from '../lib/storage';

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

interface AppState {
  user: auth.User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  history: DiagnosisRecord[];
  saveRecord: (rec: DiagnosisRecord) => void;
  removeRecord: (id: string) => void;
  clearHistory: () => void;
  toasts: Toast[];
  notify: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<auth.User | null>(() => auth.currentUser());
  const [settings, setSettings] = useState<Settings>(() => normalizeSettings(readJson('settings', null)));
  const [history, setHistory] = useState<DiagnosisRecord[]>(() => readJson(historyKey(auth.currentUser()?.email ?? null), []));
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setHistory(readJson(historyKey(user?.email ?? null), []));
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const notify = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = normalizeSettings({ ...prev, ...patch });
      writeJson('settings', next);
      return next;
    });
  }, []);

  const persistHistory = useCallback(
    (next: DiagnosisRecord[]) => {
      if (!writeJson(historyKey(user?.email ?? null), next)) {
        notify('Не вдалося зберегти історію: сховище браузера переповнене або недоступне.', 'error');
      }
    },
    [user, notify],
  );

  const saveRecord = useCallback(
    (rec: DiagnosisRecord) => {
      if (!settings.saveHistory) return;
      setHistory((h) => {
        const next = addToHistory(h, rec);
        persistHistory(next);
        return next;
      });
    },
    [settings.saveHistory, persistHistory],
  );

  const removeRecord = useCallback(
    (id: string) => {
      setHistory((h) => {
        const next = h.filter((r) => r.id !== id);
        persistHistory(next);
        return next;
      });
    },
    [persistHistory],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    persistHistory([]);
  }, [persistHistory]);

  const value = useMemo<AppState>(
    () => ({
      user,
      login: async (email, password) => setUser(await auth.login(email, password)),
      register: async (name, email, password) => setUser(await auth.register(name, email, password)),
      logout: () => {
        auth.logout();
        setUser(null);
      },
      settings,
      updateSettings,
      history,
      saveRecord,
      removeRecord,
      clearHistory,
      toasts,
      notify,
      dismissToast,
    }),
    [user, settings, updateSettings, history, saveRecord, removeRecord, clearHistory, toasts, notify, dismissToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
