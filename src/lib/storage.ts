import type { DiagnosisRecord } from './classifier';
import { DEFAULT_PREPROCESSING, type PreprocessingOptions } from './imageProcessing';
import { isModelId, type ModelId } from './models';
import { isSafeApiUrl } from './validation';

const PREFIX = 'phytolens:';
export const HISTORY_LIMIT = 100;

export function readJson<T>(key: string, fallback: T, store: Storage | undefined = safeLocal()): T {
  try {
    const raw = store?.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, store: Storage | undefined = safeLocal()): boolean {
  try {
    store?.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string, store: Storage | undefined = safeLocal()): void {
  try {
    store?.removeItem(PREFIX + key);
  } catch {
    return;
  }
}

export function safeLocal(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function safeSession(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : undefined;
  } catch {
    return undefined;
  }
}

export type Theme = 'light' | 'dark' | 'system';

export interface Settings {
  theme: Theme;
  defaultModel: ModelId;
  preprocessing: PreprocessingOptions;

  threshold: number;
  saveHistory: boolean;

  apiUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  defaultModel: 'mobilenetv2',
  preprocessing: DEFAULT_PREPROCESSING,
  threshold: 0.5,
  saveHistory: true,
  apiUrl: '',
};

export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  const p = { ...DEFAULT_PREPROCESSING, ...(raw?.preprocessing ?? {}) };
  return {
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    defaultModel: isModelId(s.defaultModel) ? s.defaultModel : DEFAULT_SETTINGS.defaultModel,
    preprocessing: {
      resize: [0, 128, 224, 256].includes(Number(p.resize)) ? Number(p.resize) : 256,
      denoise: Boolean(p.denoise),
      equalize: Boolean(p.equalize),
      segment: Boolean(p.segment),
    },
    threshold: Math.min(0.95, Math.max(0.3, Number(s.threshold) || DEFAULT_SETTINGS.threshold)),
    saveHistory: Boolean(s.saveHistory),
    apiUrl: typeof s.apiUrl === 'string' && isSafeApiUrl(s.apiUrl) ? s.apiUrl : '',
  };
}

export function historyKey(userEmail: string | null): string {
  return `history:${userEmail ?? 'guest'}`;
}

export function addToHistory(list: DiagnosisRecord[], rec: DiagnosisRecord): DiagnosisRecord[] {
  return [rec, ...list.filter((r) => r.id !== rec.id)].slice(0, HISTORY_LIMIT);
}

export function downloadText(filename: string, content: string, mime: string): void {
  const bom = mime.startsWith('text/csv') ? '﻿' : '';
  const blob = new Blob([bom + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
