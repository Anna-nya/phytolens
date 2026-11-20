import { useApp } from '../context/AppContext';

export default function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <span>{t.text}</span>
          <button className="toast__close" onClick={() => dismissToast(t.id)} aria-label="Закрити сповіщення">✕</button>
        </div>
      ))}
    </div>
  );
}
