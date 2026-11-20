import { readJson, removeKey, safeSession, writeJson } from './storage';
import { isValidEmail, passwordStrength, sanitizeText } from './validation';

export interface User {
  email: string;
  name: string;
}

interface StoredUser extends User {
  salt: string;
  hash: string;
  createdAt: string;
}

interface Session extends User {
  expiresAt: number;
}

const USERS_KEY = 'users';
const SESSION_KEY = 'session';
const ATTEMPTS_KEY = 'login-attempts';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 60 * 1000;

export class AuthError extends Error {}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: 100_000 },
    key,
    256,
  );
  return toHex(bits);
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function users(): Record<string, StoredUser> {
  return readJson<Record<string, StoredUser>>(USERS_KEY, {});
}

export async function register(nameRaw: string, emailRaw: string, password: string): Promise<User> {
  const name = sanitizeText(nameRaw, 60);
  const email = sanitizeText(emailRaw, 254).toLowerCase();
  if (name.length < 2) throw new AuthError('Вкажіть ім\'я (щонайменше 2 символи).');
  if (!isValidEmail(email)) throw new AuthError('Некоректна адреса електронної пошти.');
  const strength = passwordStrength(password);
  if (strength.problems.length) throw new AuthError(`Пароль має містити ${strength.problems.join(', ')}.`);
  const all = users();
  if (all[email]) throw new AuthError('Користувач з такою поштою вже існує.');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt);
  all[email] = { email, name, salt, hash, createdAt: new Date().toISOString() };
  if (!writeJson(USERS_KEY, all)) throw new AuthError('Не вдалося зберегти обліковий запис: сховище браузера недоступне.');
  return startSession({ email, name });
}

interface Attempts {
  count: number;
  lockedUntil: number;
}

export function lockRemainingMs(now = Date.now()): number {
  const a = readJson<Attempts>(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 }, safeSession());
  return Math.max(0, a.lockedUntil - now);
}

export async function login(emailRaw: string, password: string): Promise<User> {
  const remaining = lockRemainingMs();
  if (remaining > 0) {
    throw new AuthError(`Забагато невдалих спроб. Спробуйте через ${Math.ceil(remaining / 1000)} с.`);
  }
  const email = sanitizeText(emailRaw, 254).toLowerCase();
  const u = users()[email];

  const hash = await hashPassword(password, u?.salt ?? '00'.repeat(16));
  if (!u || !safeEqual(hash, u.hash)) {
    const a = readJson<Attempts>(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 }, safeSession());
    const count = a.count + 1;
    writeJson(
      ATTEMPTS_KEY,
      count >= MAX_ATTEMPTS ? { count: 0, lockedUntil: Date.now() + LOCK_MS } : { count, lockedUntil: 0 },
      safeSession(),
    );

    throw new AuthError('Невірна пошта або пароль.');
  }
  removeKey(ATTEMPTS_KEY, safeSession());
  return startSession({ email: u.email, name: u.name });
}

function startSession(user: User): User {
  writeJson(SESSION_KEY, { ...user, expiresAt: Date.now() + SESSION_TTL_MS } satisfies Session, safeSession());
  return user;
}

export function currentUser(): User | null {
  const s = readJson<Session | null>(SESSION_KEY, null, safeSession());
  if (!s || typeof s.email !== 'string' || s.expiresAt < Date.now()) {
    if (s) removeKey(SESSION_KEY, safeSession());
    return null;
  }
  return { email: s.email, name: s.name };
}

export function logout(): void {
  removeKey(SESSION_KEY, safeSession());
}
