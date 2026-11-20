import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CLASSES, CROPS, CROP_BY_ID, DANGER_LABEL, type CropId } from '../data/diseases';
import { sanitizeText } from '../lib/validation';

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const [crop, setCrop] = useState<CropId | 'all'>('all');
  const [showHealthy, setShowHealthy] = useState(false);
  const q = sanitizeText(params.get('q') ?? '', 80);

  const list = useMemo(() => {
    const ql = q.toLowerCase();
    return CLASSES.filter((c) => (showHealthy ? true : !c.healthy))
      .filter((c) => crop === 'all' || c.crop === crop)
      .filter((c) => !ql || `${c.name} ${c.latin ?? ''} ${c.symptoms} ${CROP_BY_ID[c.crop].name}`.toLowerCase().includes(ql));
  }, [q, crop, showHealthy]);

  return (
    <div className="page">
      <div className="page__head">
        <h1>Довідник хвороб</h1>
      </div>
      <div className="toolbar card">
        <input
          type="search"
          className="input"
          placeholder="Пошук…"
          value={q}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          aria-label="Пошук у довіднику"
        />
        <select className="input input--auto" value={crop} onChange={(e) => setCrop(e.target.value as CropId | 'all')} aria-label="Фільтр за культурою">
          <option value="all">Усі культури</option>
          {CROPS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <label className="check check--inline">
          <input type="checkbox" checked={showHealthy} onChange={(e) => setShowHealthy(e.target.checked)} />
          <span>Здорові класи</span>
        </label>
      </div>
      <p className="muted" aria-live="polite">Знайдено: {list.length}</p>
      <div className="cards-grid">
        {list.map((c) => (
          <article key={c.id} className="card disease">
            <header>
              <p className="eyebrow">{CROP_BY_ID[c.crop].emoji} {CROP_BY_ID[c.crop].name}</p>
              <h2 className="h4">{c.name}</h2>
              {c.latin && <p className="muted"><i>{c.latin}</i></p>}
            </header>
            <div className="tags">
              <span className="tag">{c.pathogenType}</span>
              <span className={`tag tag--danger-${c.danger}`}>Небезпечність: {DANGER_LABEL[c.danger].toLowerCase()}</span>
            </div>
            <p>{c.symptoms}</p>
            <details className="details">
              <summary>Заходи захисту</summary>
              <ul className="list">{[...c.treatment, ...c.prevention].map((t) => <li key={t}>{t}</li>)}</ul>
            </details>
          </article>
        ))}
      </div>
      {list.length === 0 && <div className="card placeholder"><p>Нічого не знайдено</p></div>}
    </div>
  );
}
