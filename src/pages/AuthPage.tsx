import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';
import { isValidEmail, passwordStrength } from '../lib/validation';

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register, notify } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/diagnose';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const isReg = mode === 'register';
  const strength = passwordStrength(password);

  if (user) return <Navigate to={from} replace />;

  const validate = (): Errors => {
    const e: Errors = {};
    if (isReg && name.trim().length < 2) e.name = 'Вкажіть ім\'я (щонайменше 2 символи).';
    if (!isValidEmail(email.trim())) e.email = 'Некоректна адреса пошти.';
    if (!password) e.password = 'Введіть пароль.';
    else if (isReg && strength.problems.length) e.password = `Пароль має містити ${strength.problems.join(', ')}.`;
    if (isReg && confirm !== password) e.confirm = 'Паролі не збігаються.';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`f-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    setLoading(true);
    try {
      if (isReg) await register(name, email, password);
      else await login(email, password);
      notify(isReg ? 'Обліковий запис створено. Ласкаво просимо!' : 'Вхід виконано.', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const err = (k: keyof Errors) => errors[k] && <small id={`e-${k}`} className="text-error" role="alert">{errors[k]}</small>;
  const aria = (k: keyof Errors) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `e-${k}` : undefined });

  return (
    <div className="auth">
      <form className="card auth__card" onSubmit={submit} noValidate>
        <div className="auth__logo"><Logo size={40} /></div>
        <h1 className="h2 center">{isReg ? 'Реєстрація' : 'Вхід'}</h1>

        {errors.form && <p className="banner banner--error" role="alert">{errors.form}</p>}

        {isReg && (
          <div className="field">
            <label htmlFor="f-name">Ім'я</label>
            <input id="f-name" className="input" autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} {...aria('name')} />
            {err('name')}
          </div>
        )}
        <div className="field">
          <label htmlFor="f-email">Електронна пошта</label>
          <input id="f-email" className="input" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} {...aria('email')} />
          {err('email')}
        </div>
        <div className="field">
          <label htmlFor="f-password">Пароль</label>
          <div className="input-group">
            <input id="f-password" className="input" type={show ? 'text' : 'password'} autoComplete={isReg ? 'new-password' : 'current-password'} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} {...aria('password')} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? 'Приховати пароль' : 'Показати пароль'}>
              {show ? 'Сховати' : 'Показати'}
            </button>
          </div>
          {isReg && password && (
            <div className={`strength strength--${strength.score}`} aria-live="polite">
              <span className="strength__bar"><i /></span>
              <small>Надійність: {strength.label}</small>
            </div>
          )}
          {err('password')}
        </div>
        {isReg && (
          <div className="field">
            <label htmlFor="f-confirm">Повторіть пароль</label>
            <input id="f-confirm" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} {...aria('confirm')} />
            {err('confirm')}
          </div>
        )}

        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? <><span className="spinner" aria-hidden="true" /> Зачекайте…</> : isReg ? 'Зареєструватися' : 'Увійти'}
        </button>

        <p className="center small">
          {isReg ? <>Вже маєте обліковий запис? <Link to="/login" state={location.state}>Увійти</Link></> : <>Немає облікового запису? <Link to="/register" state={location.state}>Зареєструватися</Link></>}
        </p>
        <p className="center small"><Link to="/diagnose">Продовжити як гість</Link></p>
      </form>
    </div>
  );
}
