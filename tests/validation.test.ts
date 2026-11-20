import { describe, expect, it } from 'vitest';
import { parseExperimentFile } from '../src/data/experiments';
import { hashPassword, safeEqual } from '../src/lib/auth';
import { normalizeSettings } from '../src/lib/storage';
import {
  checkFileMeta, csvCell, isSafeApiUrl, isValidEmail, passwordStrength, sanitizeText, sniffImageType, toCsv,
} from '../src/lib/validation';

describe('перевірка файлів', () => {
  it('розпізнає формат за сигнатурою вмісту', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('webp');
    expect(sniffImageType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
  });

  it('відхиляє завеликі, порожні та непідтримувані файли', () => {
    expect(checkFileMeta({ name: 'a.jpg', size: 11 * 1024 * 1024, type: 'image/jpeg' }).ok).toBe(false);
    expect(checkFileMeta({ name: 'a.jpg', size: 0, type: 'image/jpeg' }).ok).toBe(false);
    expect(checkFileMeta({ name: 'a.svg', size: 100, type: 'image/svg+xml' }).ok).toBe(false);
    expect(checkFileMeta({ name: 'a.png', size: 100, type: 'image/png' }).ok).toBe(true);
  });
});

describe('санітизація та експорт', () => {
  it('видаляє керівні символи та обмежує довжину', () => {
    expect(sanitizeText('ab\u0000c‮', 10)).toBe('abc');
    expect(sanitizeText('x'.repeat(50), 5)).toBe('xxxxx');
  });

  it('захищає CSV від формул-ін’єкцій', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('+1')).toBe(`'+1`);
    expect(csvCell('Фітофтороз')).toBe('Фітофтороз');
    expect(toCsv([['a', 'b;c']])).toBe('a;"b;c"');
  });

  it('перевіряє адресу API', () => {
    expect(isSafeApiUrl('')).toBe(true);
    expect(isSafeApiUrl('http://localhost:8000')).toBe(true);
    expect(isSafeApiUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeApiUrl('https://user:pass@host')).toBe(false);
  });

  it('нормалізує пошкоджені налаштування зі сховища', () => {
    const s = normalizeSettings({ threshold: 7, defaultModel: 'evil' as never, apiUrl: 'javascript:1', theme: 'x' as never });
    expect(s.threshold).toBe(0.95);
    expect(s.defaultModel).toBe('mobilenetv2');
    expect(s.apiUrl).toBe('');
    expect(s.theme).toBe('system');
  });

  it('перевіряє імпортований файл результатів експериментів', () => {
    expect(typeof parseExperimentFile({ rows: [] })).toBe('string');
    expect(typeof parseExperimentFile({ rows: [{ model: 'svm', pipeline: 'raw', accuracy: 2, f1: 0.5, inferenceMs: 1 }] })).toBe('string');
    expect(typeof parseExperimentFile({ rows: [{ model: 'svm', pipeline: 'raw', accuracy: 0.8, f1: 0.7, inferenceMs: 10 }] })).toBe('object');
  });
});

describe('автентифікація', () => {
  it('валідує пошту та надійність пароля', () => {
    expect(isValidEmail('agro@example.com')).toBe(true);
    expect(isValidEmail('bad@')).toBe(false);
    expect(passwordStrength('abc').score).toBeLessThan(2);
    expect(passwordStrength('Leaf2026secure').problems).toHaveLength(0);
  });

  it('PBKDF2-хеш детермінований для тієї ж солі та різний для різних солей', async () => {
    const a = await hashPassword('Leaf2026', '00112233445566778899aabbccddeeff');
    const b = await hashPassword('Leaf2026', '00112233445566778899aabbccddeeff');
    const c = await hashPassword('Leaf2026', 'ffeeddccbbaa99887766554433221100');
    expect(a).toHaveLength(64);
    expect(safeEqual(a, b)).toBe(true);
    expect(safeEqual(a, c)).toBe(false);
  });
});
