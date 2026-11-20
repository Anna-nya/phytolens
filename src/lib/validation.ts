export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MIN_IMAGE_SIDE = 64;
export const MAX_BATCH_FILES = 50;
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ImageKind = 'jpeg' | 'png' | 'webp';

export function sniffImageType(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'png';
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'webp';
  return null;
}

export interface FileCheck {
  ok: boolean;
  error?: string;
}

export function checkFileMeta(file: { name: string; size: number; type: string }): FileCheck {
  if (file.size === 0) return { ok: false, error: `Файл «${shortName(file.name)}» порожній.` };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Файл «${shortName(file.name)}» більший за 10 МБ.` };
  }
  if (file.type && !(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: `Формат «${shortName(file.name)}» не підтримується. Використовуйте JPG, PNG або WebP.` };
  }
  return { ok: true };
}

export async function validateImageFile(file: File): Promise<FileCheck> {
  const meta = checkFileMeta(file);
  if (!meta.ok) return meta;
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!sniffImageType(head)) {
    return { ok: false, error: `Вміст файлу «${shortName(file.name)}» не є зображенням JPG, PNG або WebP.` };
  }
  return { ok: true };
}

export function shortName(name: string, max = 40): string {
  const clean = sanitizeText(name, 200);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function sanitizeText(input: string, maxLength = 200): string {
  return input.replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g, '').trim().slice(0, maxLength);
}

export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",;\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(email) && email.length <= 254;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  problems: string[];
}

export function passwordStrength(pw: string): PasswordStrength {
  const problems: string[] = [];
  if (pw.length < 8) problems.push('щонайменше 8 символів');
  if (!/[a-zа-яіїєґ]/.test(pw)) problems.push('малу літеру');
  if (!/[A-ZА-ЯІЇЄҐ]/.test(pw)) problems.push('велику літеру');
  if (!/\d/.test(pw)) problems.push('цифру');
  const score = Math.max(0, 4 - problems.length) as PasswordStrength['score'];
  const labels = ['Дуже слабкий', 'Слабкий', 'Середній', 'Добрий', 'Надійний'];
  return { score, label: labels[score], problems };
}

export function isSafeApiUrl(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password;
  } catch {
    return false;
  }
}
