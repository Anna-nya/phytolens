import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page center">
      <p className="eyebrow">Помилка 404</p>
      <h1>Сторінку не знайдено</h1>
      <Link to="/" className="btn btn--primary">На головну</Link>
    </div>
  );
}
