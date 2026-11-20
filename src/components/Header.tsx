import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Logo from './Logo';

const NAV = [
  { to: '/diagnose', label: 'Діагностика' },
  { to: '/batch', label: 'Пакетна' },
  { to: '/experiments', label: 'Порівняння' },
  { to: '/library', label: 'Довідник' },
  { to: '/history', label: 'Історія' },
  { to: '/settings', label: 'Налаштування' },
];

export default function Header() {
  const { user, logout, settings, updateSettings, notify } = useApp();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="brand" aria-label="PhytoLens — на головну">
          <Logo />
          <span className="brand__name">PhytoLens</span>
        </Link>

        <button
          className="icon-btn header__burger"
          aria-label={open ? 'Закрити меню' : 'Відкрити меню'}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>

        <nav id="main-nav" className={`nav ${open ? 'nav--open' : ''}`} aria-label="Головне меню">
          <ul className="nav__list">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="nav__actions">
            <button
              className="icon-btn"
              onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
              aria-label={isDark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
              title={isDark ? 'Світла тема' : 'Темна тема'}
            >
              <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
            </button>
            {user ? (
              <div className="user-chip">
                <span className="user-chip__avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="user-chip__name">{user.name}</span>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    logout();
                    notify('Ви вийшли з облікового запису.');
                    navigate('/');
                  }}
                >
                  Вийти
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn--outline btn--sm">Увійти</Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
