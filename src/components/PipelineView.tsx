import type { PipelineResult } from '../lib/imageProcessing';
import RasterView from './RasterView';

export default function PipelineView({ pipeline }: { pipeline: PipelineResult }) {
  const f = pipeline.features;
  return (
    <section className="card" aria-labelledby="pipeline-title">
      <div className="card__head">
        <h2 id="pipeline-title" className="h3">Попередня обробка</h2>
        <span className="muted">{pipeline.durationMs} мс</span>
      </div>
      <ol className="pipeline">
        {pipeline.stages.map((s, i) => (
          <li key={s.key} className="pipeline__step">
            <RasterView raster={s.raster} label={s.label} className="pipeline__img" />
            <span className="pipeline__label">
              <span className="pipeline__num">{i + 1}</span> {s.label}
            </span>
          </li>
        ))}
      </ol>
      <dl className="features">
        <div><dt>Листок у кадрі</dt><dd>{Math.round(f.leafRatio * 100)}%</dd></div>
        <div><dt>Уражені ділянки</dt><dd>{(f.lesionRatio * 100).toFixed(1)}%</dd></div>
        <div><dt>Жовті / бурі / наліт</dt><dd>{(f.yellowRatio * 100).toFixed(1)} / {(f.brownRatio * 100).toFixed(1)} / {(f.whiteRatio * 100).toFixed(1)}%</dd></div>
        <div><dt>Яскравість / контраст</dt><dd>{f.meanBrightness.toFixed(2)} / {f.contrast.toFixed(2)}</dd></div>
      </dl>
      {f.leafRatio < 0.08 && (
        <p className="banner banner--warn" role="alert">
          Листок не розпізнано — наблизьте камеру.
        </p>
      )}
    </section>
  );
}
