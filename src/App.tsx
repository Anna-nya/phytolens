import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Toasts from './components/Toasts';
import { useApp } from './context/AppContext';
import HomePage from './pages/HomePage';
import DiagnosePage from './pages/DiagnosePage';
import BatchPage from './pages/BatchPage';
import ExperimentsPage from './pages/ExperimentsPage';
import LibraryPage from './pages/LibraryPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';

const TITLES: Record<string, string> = {
  '/': 'Головна',
  '/diagnose': 'Діагностика',
  '/batch': 'Пакетна діагностика',
  '/experiments': 'Порівняння методів',
  '/library': 'Довідник хвороб',
  '/history': 'Історія',
  '/settings': 'Налаштування',
  '/login': 'Вхід',
  '/register': 'Реєстрація',
};

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useApp();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  const { pathname } = useLocation();

  
  useEffect(() => {
    document.title = `${TITLES[pathname] ?? 'Сторінку не знайдено'} · PhytoLens`;
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Перейти до основного вмісту
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="container main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/diagnose" element={<DiagnosePage />} />
          <Route path="/batch" element={<BatchPage />} />
          <Route path="/experiments" element={<ExperimentsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Toasts />
    </>
  );
}
