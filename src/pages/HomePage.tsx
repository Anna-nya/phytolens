import { Link } from 'react-router-dom';
import { CLASSES, CROPS } from '../data/diseases';
import { MODELS } from '../lib/models';

const STEPS = [
  { n: 1, title: 'Завантажте фото листка' },
  { n: 2, title: 'Оберіть метод і обробку' },
  { n: 3, title: 'Отримайте діагноз і поради' },
];

export default function HomePage() {
  const diseases = CLASSES.filter((c) => !c.healthy).length;
  return (
    <div className="page">
      <section className="hero">
        <div className="hero__text">
          <h1 className="hero__title">Діагностика хвороб рослин за фото листка</h1>
          <div className="btn-row">
            <Link to="/diagnose" className="btn btn--primary btn--lg">Почати</Link>
            <Link to="/experiments" className="btn btn--outline btn--lg">Порівняння методів</Link>
          </div>
        </div>
        <div className="hero__visual" aria-hidden="true">
          <svg viewBox="0 0 240 240">
            <defs>
              <radialGradient id="hl" cx="45%" cy="40%" r="60%">
                <stop offset="0" stopColor="#6fb552" />
                <stop offset="1" stopColor="#2d6b26" />
              </radialGradient>
            </defs>
            <rect x="20" y="20" width="200" height="200" rx="24" className="hero__frame" />
            <path d="M120 40c45 22 44 100 0 150-44-50-45-128 0-150z" fill="url(#hl)" />
            <path d="M120 44v142" stroke="#b9e3a0" strokeWidth="2" opacity=".7" />
            <circle cx="102" cy="100" r="9" fill="#7b4a22" />
            <circle cx="138" cy="128" r="12" fill="#7b4a22" />
            <circle cx="110" cy="150" r="6" fill="#7b4a22" />
            <rect x="88" y="86" width="64" height="80" rx="4" className="hero__scan" />
            <line x1="20" x2="220" y1="120" y2="120" className="hero__beam" />
          </svg>
        </div>
      </section>

      <section className="stats" aria-label="Можливості системи">
        <div className="stat-inline"><strong>{CROPS.length}</strong><span>культур</span></div>
        <div className="stat-inline"><strong>{diseases}</strong><span>хвороб</span></div>
        <div className="stat-inline"><strong>{CLASSES.length}</strong><span>класів PlantVillage</span></div>
        <div className="stat-inline"><strong>{MODELS.length}</strong><span>методи класифікації</span></div>
      </section>

      <ol className="grid-3 steps" aria-label="Як це працює">
        {STEPS.map((s) => (
          <li key={s.n} className="card step">
            <span className="step__n">{s.n}</span>
            <h2 className="h4">{s.title}</h2>
          </li>
        ))}
      </ol>
    </div>
  );
}
