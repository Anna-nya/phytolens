import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmButton from '../components/ConfirmButton';
import { ProbabilityBars } from '../components/ResultCard';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { CLASS_BY_ID, CROP_BY_ID } from '../data/diseases';
import type { DiagnosisStatus } from '../lib/classifier';
import { isSafeImageDataUrl } from '../lib/imageIO';
import { MODEL_BY_ID } from '../lib/models';
import { batchToCsv } from '../lib/report';
import { downloadText } from '../lib/storage';
import { shortName } from '../lib/validation';

export default function HistoryPage() {
  const { history, removeRecord, clearHistory, settings, notify } = useApp();
  const [filter, setFilter] = useState<DiagnosisStatus | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => history.filter((r) => filter === 'all' || r.status === filter), [history, filter]);

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <h1>Історія</h1>
        <div className="btn-row">
          <button className="btn btn--outline btn--sm" disabled={!history.length} onClick={() => downloadText('phytolens-history.csv', batchToCsv(history), 'text/csv;charset=utf-8')}>CSV</button>
          <ConfirmButton label="Очистити" confirmLabel="Видалити все" disabled={!history.length} onConfirm={() => { clearHistory(); notify('Історію очищено.', 'success'); }} />
        </div>
      </div>

      {!settings.saveHistory && (
        <div className="banner banner--warn">Збереження вимкнено в <Link to="/settings">налаштуваннях</Link></div>
      )}

      <div className="chips" role="group" aria-label="Фільтр за статусом">
        {([['all', 'Усі'], ['diseased', 'Хворі'], ['healthy', 'Здорові'], ['uncertain', 'Ненадійні']] as [DiagnosisStatus | 'all', string][]).map(([k, l]) => (
          <button key={k} className={`chip ${filter === k ? 'chip--active' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card placeholder">
          <p>{history.length ? 'Немає записів' : 'Історія порожня'}</p>
          <Link className="btn btn--primary" to="/diagnose">До діагностики</Link>
        </div>
      ) : (
        <ul className="history">
          {list.map((r) => {
            const c = CLASS_BY_ID[r.topClassId];
            const expanded = open === r.id;
            return (
              <li key={r.id} className="card history__item">
                <div className="history__row">
                  {isSafeImageDataUrl(r.thumbnail) ? <img className="thumb thumb--lg" src={r.thumbnail} alt="" /> : <span className="thumb thumb--lg thumb--empty" />}
                  <div className="history__main">
                    <p className="eyebrow">{CROP_BY_ID[c.crop].emoji} {CROP_BY_ID[c.crop].name} · {new Date(r.createdAt).toLocaleString('uk-UA')}</p>
                    <h2 className="h4">{c.name}</h2>
                    <p className="muted small">{shortName(r.fileName, 36)} · {MODEL_BY_ID[r.model].name} · {(r.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <StatusBadge status={r.status} />
                  <div className="history__actions">
                    <button className="btn btn--ghost btn--sm" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : r.id)}>
                      {expanded ? 'Згорнути' : 'Деталі'}
                    </button>
                    <button className="icon-btn" aria-label={`Видалити запис ${c.name}`} onClick={() => removeRecord(r.id)}>✕</button>
                  </div>
                </div>
                {expanded && <div className="history__details"><ProbabilityBars record={r} /></div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
