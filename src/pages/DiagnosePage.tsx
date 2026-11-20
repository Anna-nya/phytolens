import { useCallback, useEffect, useState } from 'react';
import DemoBanner from '../components/DemoBanner';
import Dropzone from '../components/Dropzone';
import OptionsPanel from '../components/OptionsPanel';
import PipelineView from '../components/PipelineView';
import ResultCard from '../components/ResultCard';
import { useApp } from '../context/AppContext';
import type { CropId } from '../data/diseases';
import type { DiagnosisRecord } from '../lib/classifier';
import type { PipelineResult, PreprocessingOptions } from '../lib/imageProcessing';
import type { ModelId } from '../lib/models';
import { SAMPLES, sampleFile, type SampleKind } from '../lib/samples';
import { checkFileMeta, shortName } from '../lib/validation';
import { processFile, UserFacingError } from '../lib/workflow';

type Phase = 'empty' | 'ready' | 'preprocess' | 'classify' | 'success' | 'error';

export default function DiagnosePage() {
  const { settings, saveRecord, notify } = useApp();
  const [phase, setPhase] = useState<Phase>('empty');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropId | 'auto'>('auto');
  const [model, setModel] = useState<ModelId>(settings.defaultModel);
  const [prep, setPrep] = useState<PreprocessingOptions>(settings.preprocessing);
  const [record, setRecord] = useState<DiagnosisRecord | null>(null);
  const [pipeline, setPipeline] = useState<PipelineResult | null>(null);

  
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const busy = phase === 'preprocess' || phase === 'classify';

  const selectFile = useCallback((files: File[]) => {
    const f = files[0];
    const meta = checkFileMeta(f);
    if (!meta.ok) {
      setError(meta.error ?? 'Некоректний файл.');
      setPhase('error');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setRecord(null);
    setPipeline(null);
    setError(null);
    setPhase('ready');
  }, []);

  const loadSample = async (kind: SampleKind) => {
    selectFile([await sampleFile(kind)]);
  };

  const run = async () => {
    if (!file) {
      setError('Спочатку завантажте фото листка.');
      setPhase('error');
      return;
    }
    setError(null);
    setPhase('preprocess');
    try {
      const res = await processFile(
        file,
        { crop, model, preprocessing: prep, apiUrl: settings.apiUrl, threshold: settings.threshold },
        (stage) => setPhase(stage),
      );
      setPipeline(res.pipeline);
      setRecord(res.record);
      saveRecord(res.record);
      setPhase('success');
    } catch (e) {
      setError(e instanceof UserFacingError || (e as Error).name === 'ApiError' ? (e as Error).message : 'Сталася непередбачена помилка під час обробки зображення.');
      setPhase('error');
      if (!(e instanceof UserFacingError)) notify('Діагностику не виконано', 'error');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setRecord(null);
    setPipeline(null);
    setError(null);
    setPhase('empty');
  };

  return (
    <div className="page">
      <div className="page__head">
        <h1>Діагностика</h1>
      </div>
      <DemoBanner />

      <div className="layout-2">
        <section className="card" aria-labelledby="input-title">
          <h2 id="input-title" className="h3">Фото листка</h2>
          {!preview ? (
            <>
              <Dropzone onFiles={selectFile} disabled={busy} />
              <div className="samples">
                <span className="muted">Або приклад:</span>
                <div className="chips">
                  {SAMPLES.map((s) => (
                    <button key={s.kind} className="chip" onClick={() => loadSample(s.kind)} disabled={busy}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <figure className="preview">
              <img src={preview} alt={`Завантажене фото: ${file ? shortName(file.name) : ''}`} />
              <figcaption>
                <span className="truncate">{file && shortName(file.name)}</span>
                <span className="muted">{file && `${(file.size / 1024).toFixed(0)} КБ`}</span>
                <button className="btn btn--ghost btn--sm" onClick={reset} disabled={busy}>Замінити</button>
              </figcaption>
            </figure>
          )}

          <h2 className="h3 mt">Параметри</h2>
          <OptionsPanel
            crop={crop}
            model={model}
            preprocessing={prep}
            disabled={busy}
            onChange={(p) => {
              if (p.crop) setCrop(p.crop);
              if (p.model) setModel(p.model);
              if (p.preprocessing) setPrep(p.preprocessing);
              if (phase === 'success') setPhase('ready');
            }}
          />

          {error && (
            <p className="banner banner--error" role="alert">{error}</p>
          )}

          <button className="btn btn--primary btn--lg btn--block" onClick={run} disabled={busy || !file} aria-busy={busy}>
            {busy ? (
              <><span className="spinner" aria-hidden="true" /> {phase === 'preprocess' ? 'Попередня обробка…' : 'Класифікація…'}</>
            ) : phase === 'success' ? 'Діагностувати ще раз' : 'Діагностувати'}
          </button>
        </section>

        <div className="stack">
          {busy && (
            <div className="card placeholder" aria-live="polite">
              <span className="spinner spinner--lg" aria-hidden="true" />
              <ol className="steps-progress">
                <li className="done">Перевірка</li>
                <li className={phase === 'preprocess' ? 'active' : 'done'}>Обробка</li>
                <li className={phase === 'classify' ? 'active' : ''}>Класифікація</li>
              </ol>
            </div>
          )}
          {!busy && record && <ResultCard record={record} onReset={reset} />}
          {!busy && !record && (
            <div className="card placeholder">
              <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
                <path d="M14 50c0-20 13-32 36-34 0 22-12 35-34 35" fill="none" stroke="currentColor" strokeWidth="3" />
                <path d="M14 50l20-20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p>Тут з'явиться результат</p>
            </div>
          )}
          {!busy && pipeline && <PipelineView pipeline={pipeline} />}
        </div>
      </div>
    </div>
  );
}
