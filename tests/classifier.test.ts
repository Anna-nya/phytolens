import { describe, expect, it } from 'vitest';
import { CLASSES, CLASS_BY_ID, classesOfCrop } from '../src/data/diseases';
import { ApiError, demoClassify, parseApiResponse, statusOf } from '../src/lib/classifier';
import type { ImageFeatures } from '../src/lib/imageProcessing';

const base: ImageFeatures = { leafRatio: 0.5, lesionRatio: 0, yellowRatio: 0, brownRatio: 0, whiteRatio: 0, meanBrightness: 0.5, contrast: 0.2 };
const prep = { resize: 256, denoise: true, equalize: true, segment: true };
const pixels = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]);

describe('довідник класів', () => {
  it('містить 38 класів PlantVillage, 14 культур і 26 хвороб', () => {
    expect(CLASSES).toHaveLength(38);
    expect(new Set(CLASSES.map((c) => c.crop)).size).toBe(14);
    expect(CLASSES.filter((c) => !c.healthy)).toHaveLength(26);
  });
});

describe('демонстраційний класифікатор', () => {
  it('ймовірності утворюють розподіл і відсортовані за спаданням', () => {
    const out = demoClassify({ pixels, features: base, crop: 'tomato', model: 'mobilenetv2', preprocessing: prep });
    expect(out.predictions.reduce((a, p) => a + p.probability, 0)).toBeCloseTo(1, 6);
    expect(out.predictions).toHaveLength(classesOfCrop('tomato').length);
    for (let i = 1; i < out.predictions.length; i++) {
      expect(out.predictions[i - 1].probability).toBeGreaterThanOrEqual(out.predictions[i].probability);
    }
  });

  it('листок без уражень класифікується як здоровий', () => {
    const out = demoClassify({ pixels, features: base, crop: 'potato', model: 'efficientnetb0', preprocessing: prep });
    expect(CLASS_BY_ID[out.predictions[0].classId].healthy).toBe(true);
  });

  it('листок з великою площею уражень класифікується як хворий', () => {
    const f = { ...base, lesionRatio: 0.3, brownRatio: 0.28, yellowRatio: 0.02 };
    const out = demoClassify({ pixels, features: f, crop: 'potato', model: 'mobilenetv2', preprocessing: prep });
    expect(CLASS_BY_ID[out.predictions[0].classId].healthy).toBe(false);
  });

  it('результат детермінований для того самого зображення', () => {
    const a = demoClassify({ pixels, features: base, crop: 'auto', model: 'svm', preprocessing: prep });
    const b = demoClassify({ pixels, features: base, crop: 'auto', model: 'svm', preprocessing: prep });
    expect(a.predictions).toEqual(b.predictions);
  });

  it('поріг впевненості визначає статус', () => {
    expect(statusOf({ classId: 'Tomato___healthy', probability: 0.5 }, 0.6)).toBe('uncertain');
    expect(statusOf({ classId: 'Tomato___healthy', probability: 0.9 }, 0.6)).toBe('healthy');
    expect(statusOf({ classId: 'Tomato___Late_blight', probability: 0.9 }, 0.6)).toBe('diseased');
  });
});

describe('валідація відповіді API', () => {
  it('приймає коректну відповідь і сортує прогнози', () => {
    const out = parseApiResponse({
      predictions: [{ class_id: 'Tomato___healthy', probability: 0.2 }, { class_id: 'Tomato___Late_blight', probability: 0.8 }],
      inference_ms: 42,
    });
    expect(out.predictions[0].classId).toBe('Tomato___Late_blight');
    expect(out.inferenceMs).toBe(42);
    expect(out.source).toBe('api');
  });

  it('відхиляє невідомий клас та некоректну ймовірність', () => {
    expect(() => parseApiResponse({ predictions: [{ class_id: '<script>', probability: 0.5 }] })).toThrow(ApiError);
    expect(() => parseApiResponse({ predictions: [{ class_id: 'Tomato___healthy', probability: 3 }] })).toThrow(ApiError);
    expect(() => parseApiResponse(null)).toThrow(ApiError);
  });
});
