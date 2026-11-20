import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MODELS, type ModelId } from '../lib/models';
import { DEFAULT_SETTINGS, type Theme } from '../lib/storage';
import { isSafeApiUrl, sanitizeText } from '../lib/validation';

export default function SettingsPage() {
  const { settings, updateSettings, notify } = useApp();
  const [apiDraft, setApiDraft] = useState(settings.apiUrl);
  const [apiError, setApiError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const saveApi = () => {
    const url = sanitizeText(apiDraft, 200);
    if (!isSafeApiUrl(url)) {
      setApiError('Формат: http(s)://хост[:порт]');
      return;
    }
    setApiError(null);
    updateSettings({ apiUrl: url });
    notify(url ? 'Адресу API збережено. Діагностика виконуватиметься на сервері моделі.' : 'Увімкнено демо-режим.', 'success');
  };

  const checkApi = async () => {
    if (!isSafeApiUrl(apiDraft) || !apiDraft) return;
    setChecking(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${apiDraft.replace(/\/+$/, '')}/api/v1/health`, { signal: ctrl.signal, credentials: 'omit' });
      clearTimeout(t);
      notify(res.ok ? 'Сервер моделі доступний.' : `Сервер відповів з кодом ${res.status}.`, res.ok ? 'success' : 'error');
    } catch {
      notify('Сервер моделі недоступний.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const p = settings.preprocessing;

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1>Налаштування</h1>
      </div>

      <section className="card form-section">
        <h2 className="h3">Інтерфейс</h2>
        <div className="field">
          <span className="field__label" id="theme-label">Тема</span>
          <div className="chips" role="radiogroup" aria-labelledby="theme-label">
            {([['system', 'Як у системі'], ['light', 'Світла'], ['dark', 'Темна']] as [Theme, string][]).map(([v, l]) => (
              <button key={v} role="radio" aria-checked={settings.theme === v} className={`chip ${settings.theme === v ? 'chip--active' : ''}`} onClick={() => updateSettings({ theme: v })}>{l}</button>
            ))}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.saveHistory} onChange={(e) => updateSettings({ saveHistory: e.target.checked })} />
          <span className="check__label">Зберігати історію</span>
        </label>
      </section>

      <section className="card form-section">
        <h2 className="h3">Діагностика</h2>
        <div className="field">
          <label htmlFor="def-model">Метод за замовчуванням</label>
          <select id="def-model" value={settings.defaultModel} onChange={(e) => updateSettings({ defaultModel: e.target.value as ModelId })}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="threshold">Поріг впевненості: <strong>{Math.round(settings.threshold * 100)}%</strong></label>
          <input id="threshold" type="range" min={30} max={95} step={5} value={Math.round(settings.threshold * 100)} onChange={(e) => updateSettings({ threshold: Number(e.target.value) / 100 })} />
        </div>
        <fieldset className="field">
          <legend className="field__label">Попередня обробка</legend>
          {([['denoise', 'Фільтр Гаусса'], ['equalize', 'Вирівнювання гістограми'], ['segment', 'Сегментація листка']] as const).map(([k, l]) => (
            <label key={k} className="check">
              <input type="checkbox" checked={p[k]} onChange={(e) => updateSettings({ preprocessing: { ...p, [k]: e.target.checked } })} />
              <span className="check__label">{l}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="card form-section">
        <h2 className="h3">Сервер моделі</h2>
        <div className="field">
          <label htmlFor="api">Адреса API (порожньо — демо-режим)</label>
          <input
            id="api"
            className="input"
            type="url"
            inputMode="url"
            placeholder="http://localhost:8000"
            value={apiDraft}
            maxLength={200}
            aria-invalid={Boolean(apiError)}
            aria-describedby={apiError ? 'api-error' : undefined}
            onChange={(e) => setApiDraft(e.target.value)}
          />
          {apiError && <small id="api-error" className="text-error" role="alert">{apiError}</small>}
        </div>
        <div className="btn-row">
          <button className="btn btn--primary" onClick={saveApi}>Зберегти</button>
          <button className="btn btn--outline" onClick={checkApi} disabled={!apiDraft || checking}>{checking ? 'Перевірка…' : 'Перевірити'}</button>
        </div>
      </section>

      <button className="btn btn--ghost" onClick={() => { updateSettings(DEFAULT_SETTINGS); setApiDraft(''); notify('Налаштування скинуто.', 'success'); }}>
        Скинути налаштування
      </button>
    </div>
  );
}
