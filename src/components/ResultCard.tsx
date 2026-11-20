import { Link } from 'react-router-dom';
import { CLASS_BY_ID, CROP_BY_ID, DANGER_LABEL } from '../data/diseases';
import { severityLabel, type DiagnosisRecord } from '../lib/classifier';
import { MODEL_BY_ID, describePreprocessing } from '../lib/models';
import { downloadText } from '../lib/storage';
import { useApp } from '../context/AppContext';
import StatusBadge from './StatusBadge';

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function ProbabilityBars({ record }: { record: DiagnosisRecord }) {
  return (
    <ol className="probs" aria-label="Найімовірніші класи">
      {record.predictions.slice(0, 3).map((p, i) => {
        const c = CLASS_BY_ID[p.classId];
        const crop = CROP_BY_ID[c.crop];
        return (
          <li key={p.classId} className="probs__item">
            <div className="probs__row">
              <span className="probs__name">
                {crop.emoji} {crop.name}: {c.name}
              </span>
              <span className="probs__val">{(p.probability * 100).toFixed(1)}%</span>
            </div>
            <div
              className={`bar ${i === 0 ? 'bar--top' : ''} ${c.healthy ? 'bar--healthy' : ''}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(p.probability * 100)}
              aria-label={`${c.name}: ${pct(p.probability)}`}
            >
              <span style={{ width: `${Math.max(1.5, p.probability * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ResultCard({ record, onReset }: { record: DiagnosisRecord; onReset?: () => void }) {
  const { settings } = useApp();
  const cls = CLASS_BY_ID[record.topClassId];
  const crop = CROP_BY_ID[cls.crop];
  const exportJson = () => {
    const { thumbnail: _thumb, ...data } = record;
    void _thumb;
    const report = {
      ...data,
      diagnosis: { crop: crop.name, disease: cls.name, latin: cls.latin ?? null, healthy: cls.healthy },
      generator: 'PhytoLens 1.0',
    };
    downloadText(`phytolens-${record.id}.json`, JSON.stringify(report, null, 2), 'application/json');
  };

  return (
    <article className="card result" aria-live="polite" aria-labelledby="result-title">
      <header className="result__head">
        <div>
          <p className="eyebrow">{crop.emoji} {crop.name}</p>
          <h2 id="result-title" className="result__title">{cls.name}</h2>
          {cls.latin && <p className="result__latin"><i>{cls.latin}</i></p>}
        </div>
        <StatusBadge status={record.status} />
      </header>

      {record.status === 'uncertain' && (
        <div className="banner banner--warn" role="alert">
          Впевненість нижча за {pct(settings.threshold)} — спробуйте чіткіше фото на однорідному фоні.
        </div>
      )}

      <dl className="metrics">
        <div className="metric">
          <dt>Впевненість</dt>
          <dd>{pct(record.confidence)}</dd>
        </div>
        <div className="metric">
          <dt>Площа ураження</dt>
          <dd>
            {cls.healthy ? '—' : pct(record.severity)}
            {!cls.healthy && <small> ({severityLabel(record.severity)})</small>}
          </dd>
        </div>
        <div className="metric">
          <dt>Небезпечність</dt>
          <dd>{DANGER_LABEL[cls.danger]}</dd>
        </div>
        <div className="metric">
          <dt>Збудник</dt>
          <dd>{cls.pathogenType}</dd>
        </div>
      </dl>

      <h3 className="h4">Імовірності класів</h3>
      <ProbabilityBars record={record} />

      <div className="result__grid">
        <section>
          <h3 className="h4">Симптоми</h3>
          <p>{cls.symptoms}</p>
        </section>
        <section>
          <h3 className="h4">{cls.healthy ? 'Рекомендації' : 'Що робити'}</h3>
          <ul className="list">
            {cls.treatment.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
        <section>
          <h3 className="h4">Профілактика</h3>
          <ul className="list">
            {cls.prevention.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
      </div>

      <p className="result__meta muted">
        {MODEL_BY_ID[record.model].name} · {describePreprocessing(record.preprocessing)} · {record.inferenceMs + record.preprocessingMs} мс
      </p>

      <div className="result__actions">
        <button className="btn btn--primary" onClick={exportJson}>Звіт JSON</button>
        <button className="btn btn--outline" onClick={() => window.print()}>Друк / PDF</button>
        {!cls.healthy && (
          <Link className="btn btn--ghost" to={`/library?q=${encodeURIComponent(cls.name)}`}>У довідник</Link>
        )}
        {onReset && <button className="btn btn--ghost" onClick={onReset}>Нова діагностика</button>}
      </div>
    </article>
  );
}
