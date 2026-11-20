import { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEMO_EXPERIMENTS, PIPELINES, parseExperimentFile, type ExperimentFile, type ExperimentRow } from '../data/experiments';
import { MODELS, MODEL_BY_ID, type ModelId } from '../lib/models';
import { downloadText } from '../lib/storage';
import { toCsv } from '../lib/validation';

type Metric = 'accuracy' | 'f1' | 'inferenceMs';

const METRICS: { id: Metric; label: string; unit: string; higherBetter: boolean }[] = [
  { id: 'accuracy', label: 'Accuracy', unit: '%', higherBetter: true },
  { id: 'f1', label: 'Macro F1', unit: '%', higherBetter: true },
  { id: 'inferenceMs', label: 'Час інференсу', unit: 'мс', higherBetter: false },
];

const MODEL_COLORS: Record<ModelId, string> = {
  svm: 'var(--series-1)',
  mobilenetv2: 'var(--series-2)',
  efficientnetb0: 'var(--series-3)',
};

const fmt = (m: Metric, v: number) => (m === 'inferenceMs' ? `${Math.round(v)} мс` : `${(v * 100).toFixed(1)}%`);

function GroupedBars({ rows, metric }: { rows: ExperimentRow[]; metric: Metric }) {
  const W = 720;
  const H = 300;
  const pad = { l: 52, r: 12, t: 16, b: 46 };
  const groupW = (W - pad.l - pad.r) / PIPELINES.length;
  const barW = Math.min(34, (groupW - 24) / MODELS.length);
  const values = rows.map((r) => r[metric]);
  const isPct = metric !== 'inferenceMs';
  const minV = isPct ? Math.max(0, Math.floor((Math.min(...values) - 0.05) * 10) / 10) : 0;
  const maxV = isPct ? 1 : Math.ceil(Math.max(...values) / 20) * 20 || 1;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - minV) / (maxV - minV));
  const ticks = Array.from({ length: 5 }, (_, i) => minV + ((maxV - minV) * i) / 4);
  const [hover, setHover] = useState<string | null>(null);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Діаграма: ${METRICS.find((m) => m.id === metric)?.label} за моделями та варіантами обробки`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="chart__tick">
              {isPct ? `${Math.round(t * 100)}%` : Math.round(t)}
            </text>
          </g>
        ))}
        {PIPELINES.map((p, gi) => {
          const gx = pad.l + gi * groupW + (groupW - barW * MODELS.length - 4 * (MODELS.length - 1)) / 2;
          return (
            <g key={p.id}>
              {MODELS.map((m, mi) => {
                const row = rows.find((r) => r.model === m.id && r.pipeline === p.id);
                if (!row) return null;
                const v = row[metric];
                const x = gx + mi * (barW + 4);
                const key = `${m.id}-${p.id}`;
                return (
                  <g key={key} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}>
                    <rect x={x} y={y(v)} width={barW} height={Math.max(0, y(minV) - y(v))} rx="3" fill={MODEL_COLORS[m.id]} opacity={hover && hover !== key ? 0.45 : 1}>
                      <title>{`${m.name}, ${p.name}: ${fmt(metric, v)}`}</title>
                    </rect>
                    {hover === key && (
                      <text x={x + barW / 2} y={y(v) - 6} textAnchor="middle" className="chart__value">{fmt(metric, v)}</text>
                    )}
                  </g>
                );
              })}
              <text x={pad.l + gi * groupW + groupW / 2} y={H - pad.b + 20} textAnchor="middle" className="chart__label">{p.short}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        {MODELS.map((m) => (
          <span key={m.id} className="legend__item"><i style={{ background: MODEL_COLORS[m.id] }} />{m.name}</span>
        ))}
      </figcaption>
    </figure>
  );
}

export default function ExperimentsPage() {
  const { notify } = useApp();
  const [data, setData] = useState<ExperimentFile>(DEMO_EXPERIMENTS);
  const [metric, setMetric] = useState<Metric>('accuracy');
  const fileRef = useRef<HTMLInputElement>(null);

  const best = useMemo(() => {
    const m = METRICS.find((x) => x.id === metric)!;
    return [...data.rows].sort((a, b) => (m.higherBetter ? b[metric] - a[metric] : a[metric] - b[metric]))[0];
  }, [data, metric]);

  
  const gains = MODELS.map((m) => {
    const raw = data.rows.find((r) => r.model === m.id && r.pipeline === 'raw');
    const full = data.rows.find((r) => r.model === m.id && r.pipeline === 'full');
    return { model: m, gain: raw && full ? full.accuracy - raw.accuracy : null };
  });

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 512 * 1024) return notify('Файл результатів завеликий (максимум 512 КБ).', 'error');
    try {
      const parsed = parseExperimentFile(JSON.parse(await f.text()));
      if (typeof parsed === 'string') return notify(parsed, 'error');
      setData(parsed);
      notify(`Імпортовано ${parsed.rows.length} результатів.`, 'success');
    } catch {
      notify('Файл не є коректним JSON.', 'error');
    }
  };

  const exportCsv = () =>
    downloadText(
      'phytolens-experiments.csv',
      toCsv([
        ['Модель', 'Попередня обробка', 'Accuracy', 'Macro F1', 'Інференс, мс'],
        ...data.rows.map((r) => [MODEL_BY_ID[r.model].name, PIPELINES.find((p) => p.id === r.pipeline)?.name, r.accuracy, r.f1, r.inferenceMs]),
      ]),
      'text/csv;charset=utf-8',
    );

  return (
    <div className="page">
      <div className="page__head">
        <h1>Порівняння методів</h1>
      </div>

      {data.demo ? (
        <div className="banner banner--warn" role="note">
          <strong>Демонстраційні дані</strong> — імпортуйте JSON з результатами експериментів.
        </div>
      ) : (
        <div className="banner banner--ok" role="note"><strong>{data.title}</strong> · {data.dataset}</div>
      )}

      <section className="card">
        <div className="card__head card__head--wrap">
          <div className="chips" role="group" aria-label="Метрика">
            {METRICS.map((m) => (
              <button key={m.id} className={`chip ${metric === m.id ? 'chip--active' : ''}`} aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>{m.label}</button>
            ))}
          </div>
          <div className="btn-row">
            <button className="btn btn--outline btn--sm" onClick={() => fileRef.current?.click()}>Імпорт JSON</button>
            <button className="btn btn--outline btn--sm" onClick={exportCsv}>Експорт CSV</button>
            {!data.demo && <button className="btn btn--ghost btn--sm" onClick={() => setData(DEMO_EXPERIMENTS)}>Скинути</button>}
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>
        <GroupedBars rows={data.rows} metric={metric} />
      </section>

      <div className="grid-4">
        <div className="card stat">
          <span className="stat__label">Найкращий результат</span>
          <strong className="stat__value">{fmt(metric, best[metric])}</strong>
          <span className="muted">{MODEL_BY_ID[best.model].name} · {PIPELINES.find((p) => p.id === best.pipeline)?.short}</span>
        </div>
        {gains.map(({ model, gain }) => (
          <div key={model.id} className="card stat">
            <span className="stat__label">Приріст від обробки</span>
            <strong className="stat__value">{gain === null ? '—' : `${gain >= 0 ? '+' : ''}${(gain * 100).toFixed(1)} п.п.`}</strong>
            <span className="muted">{model.name}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="h3">Таблиця</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Модель</th>{PIPELINES.map((p) => <th key={p.id} scope="col">{p.short}</th>)}</tr>
            </thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.id}>
                  <th scope="row">{m.name}<br /><small className="muted">{m.family}</small></th>
                  {PIPELINES.map((p) => {
                    const r = data.rows.find((x) => x.model === m.id && x.pipeline === p.id);
                    const isBest = r === best;
                    return <td key={p.id} className={isBest ? 'cell--best' : ''}>{r ? fmt(metric, r[metric]) : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
