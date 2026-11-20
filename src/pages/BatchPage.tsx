import { useMemo, useRef, useState } from 'react';
import DemoBanner from '../components/DemoBanner';
import Dropzone from '../components/Dropzone';
import OptionsPanel from '../components/OptionsPanel';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { CLASS_BY_ID, CROP_BY_ID, type CropId } from '../data/diseases';
import type { DiagnosisRecord } from '../lib/classifier';
import { isSafeImageDataUrl } from '../lib/imageIO';
import type { PreprocessingOptions } from '../lib/imageProcessing';
import type { ModelId } from '../lib/models';
import { downloadText } from '../lib/storage';
import { MAX_BATCH_FILES, checkFileMeta, shortName } from '../lib/validation';
import { batchToCsv } from '../lib/report';
import { processFile } from '../lib/workflow';

interface Row {
  file: File;
  record?: DiagnosisRecord;
  error?: string;
}

type Filter = 'all' | 'diseased' | 'healthy' | 'uncertain' | 'error';

export default function BatchPage() {
  const { settings, saveRecord, notify } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [crop, setCrop] = useState<CropId | 'auto'>('auto');
  const [model, setModel] = useState<ModelId>(settings.defaultModel);
  const [prep, setPrep] = useState<PreprocessingOptions>(settings.preprocessing);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const cancelRef = useRef(false);

  const addFiles = (files: File[]) => {
    const accepted: Row[] = [];
    const rejected: string[] = [];
    for (const f of files) {
      const m = checkFileMeta(f);
      if (m.ok) accepted.push({ file: f });
      else rejected.push(m.error ?? f.name);
    }
    setRows((prev) => {
      const room = MAX_BATCH_FILES - prev.length;
      if (accepted.length > room) notify(`Максимум ${MAX_BATCH_FILES} файлів у пакеті — зайві пропущено.`, 'error');
      return [...prev, ...accepted.slice(0, Math.max(0, room))];
    });
    if (rejected.length) notify(rejected[0] + (rejected.length > 1 ? ` (і ще ${rejected.length - 1})` : ''), 'error');
  };

  const run = async () => {
    setRunning(true);
    cancelRef.current = false;
    setDone(0);
    const fresh: Row[] = rows.map((r) => ({ file: r.file }));
    setRows(fresh);
    for (let i = 0; i < fresh.length; i++) {
      if (cancelRef.current) break;
      try {
        const { record } = await processFile(fresh[i].file, {
          crop, model, preprocessing: prep, apiUrl: settings.apiUrl, threshold: settings.threshold,
        });
        fresh[i] = { file: fresh[i].file, record };
        saveRecord(record);
      } catch (e) {
        fresh[i] = { file: fresh[i].file, error: (e as Error).message };
      }
      setRows([...fresh]);
      setDone(i + 1);
    }
    setRunning(false);
    notify(cancelRef.current ? 'Обробку зупинено.' : 'Пакетну діагностику завершено.', 'success');
  };

  const records = rows.filter((r) => r.record).map((r) => r.record as DiagnosisRecord);
  const stats = useMemo(() => ({
    total: rows.length,
    diseased: records.filter((r) => r.status === 'diseased').length,
    healthy: records.filter((r) => r.status === 'healthy').length,
    uncertain: records.filter((r) => r.status === 'uncertain').length,
    errors: rows.filter((r) => r.error).length,
  }), [rows, records]);

  const visible = rows.filter((r) => {
    if (filter === 'error' && !r.error) return false;
    if (filter !== 'all' && filter !== 'error' && r.record?.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      const name = r.record ? CLASS_BY_ID[r.record.topClassId].name.toLowerCase() : '';
      if (!r.file.name.toLowerCase().includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  const progress = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <div className="page__head">
        <h1>Пакетна діагностика</h1>
      </div>
      <DemoBanner />

      <div className="layout-2 layout-2--narrow-right">
        <section className="card">
          <Dropzone multiple onFiles={addFiles} disabled={running} hint={`JPG, PNG, WebP · до ${MAX_BATCH_FILES} файлів`} />
          {rows.length > 0 && (
            <div className="batch-bar">
              <span>У черзі: <strong>{rows.length}</strong></span>
              <div className="btn-row">
                {!running && <button className="btn btn--ghost btn--sm" onClick={() => { setRows([]); setDone(0); }}>Очистити</button>}
                {running ? (
                  <button className="btn btn--danger-outline" onClick={() => { cancelRef.current = true; }}>Зупинити</button>
                ) : (
                  <button className="btn btn--primary" onClick={run}>Запустити</button>
                )}
              </div>
            </div>
          )}
          {(running || done > 0) && (
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Хід пакетної обробки">
              <span style={{ width: `${progress}%` }} />
              <em>{done} / {rows.length}</em>
            </div>
          )}
        </section>
        <section className="card">
          <h2 className="h3">Параметри</h2>
          <OptionsPanel
            crop={crop} model={model} preprocessing={prep} disabled={running}
            onChange={(p) => { if (p.crop) setCrop(p.crop); if (p.model) setModel(p.model); if (p.preprocessing) setPrep(p.preprocessing); }}
          />
        </section>
      </div>

      {rows.length > 0 && (
        <section className="card" aria-labelledby="batch-results">
          <div className="card__head card__head--wrap">
            <h2 id="batch-results" className="h3">
              Результати: {records.length} з {stats.total}
            </h2>
            <div className="btn-row">
              <button className="btn btn--outline btn--sm" disabled={!records.length} onClick={() => downloadText(`phytolens-batch-${stamp}.csv`, batchToCsv(records), 'text/csv;charset=utf-8')}>CSV</button>
              <button className="btn btn--outline btn--sm" disabled={!records.length} onClick={() => downloadText(`phytolens-batch-${stamp}.json`, JSON.stringify(records.map(({ thumbnail: _t, ...r }) => r), null, 2), 'application/json')}>JSON</button>
            </div>
          </div>

          <div className="summary">
            <div className="summary__item summary__item--diseased"><strong>{stats.diseased}</strong> з хворобою</div>
            <div className="summary__item summary__item--healthy"><strong>{stats.healthy}</strong> здорових</div>
            <div className="summary__item summary__item--uncertain"><strong>{stats.uncertain}</strong> ненадійних</div>
            <div className="summary__item"><strong>{stats.errors}</strong> помилок</div>
          </div>

          <div className="toolbar">
            <input type="search" className="input" placeholder="Пошук…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Пошук у результатах" />
            <div className="chips" role="group" aria-label="Фільтр за статусом">
              {([['all', 'Усі'], ['diseased', 'Хворі'], ['healthy', 'Здорові'], ['uncertain', 'Ненадійні'], ['error', 'Помилки']] as [Filter, string][]).map(([k, l]) => (
                <button key={k} className={`chip ${filter === k ? 'chip--active' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th scope="col">#</th><th scope="col">Фото</th><th scope="col">Файл</th><th scope="col">Діагноз</th><th scope="col">Впевненість</th><th scope="col">Ураження</th><th scope="col">Статус</th></tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const idx = rows.indexOf(r) + 1;
                  const c = r.record ? CLASS_BY_ID[r.record.topClassId] : null;
                  return (
                    <tr key={idx}>
                      <td>{idx}</td>
                      <td>{r.record && isSafeImageDataUrl(r.record.thumbnail) ? <img className="thumb" src={r.record.thumbnail} alt="" /> : <span className="thumb thumb--empty" />}</td>
                      <td className="truncate" title={r.file.name}>{shortName(r.file.name, 28)}</td>
                      <td>{c ? <>{CROP_BY_ID[c.crop].emoji} {c.name}</> : r.error ? <span className="text-error">{r.error}</span> : <span className="muted">очікує…</span>}</td>
                      <td>{r.record ? `${(r.record.confidence * 100).toFixed(1)}%` : '—'}</td>
                      <td>{r.record && !c?.healthy ? `${(r.record.severity * 100).toFixed(1)}%` : '—'}</td>
                      <td>{r.record ? <StatusBadge status={r.record.status} /> : r.error ? <span className="badge badge--error">Помилка</span> : null}</td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={7} className="muted center">Немає записів за обраним фільтром.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
