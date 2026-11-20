import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function DemoBanner() {
  const { settings } = useApp();
  if (settings.apiUrl) {
    return (
      <div className="banner banner--ok" role="note">
        Сервер моделі: <code>{settings.apiUrl}</code>
      </div>
    );
  }
  return (
    <div className="banner banner--warn" role="note">
      <strong>Демо-режим</strong> — сервер моделі не підключено. <Link to="/settings">Підключити</Link>
    </div>
  );
}
