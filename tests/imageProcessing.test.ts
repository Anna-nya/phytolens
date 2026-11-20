import { describe, expect, it } from 'vitest';
import {
  applyMask, createRaster, equalizeHistogram, extractFeatures, gaussianBlur, lesionMask,
  otsuThreshold, resizeSquare, runPipeline, segmentLeafMask, type Raster,
} from '../src/lib/imageProcessing';

function leafRaster(size = 64, spots = 0): Raster {
  const r = createRaster(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inLeaf = (x - c) ** 2 + (y - c) ** 2 < (size * 0.4) ** 2;
      let rgb = inLeaf ? [60, 140, 50] : [150, 148, 145];
      if (inLeaf && spots && x > c && x < c + spots && y > c - spots / 2 && y < c + spots / 2) rgb = [120, 75, 30];
      r.data.set([...rgb, 255], i);
    }
  }
  return r;
}

describe('попередня обробка', () => {
  it('resizeSquare повертає квадрат заданого розміру', () => {
    const out = resizeSquare(createRaster(100, 60), 32);
    expect(out.width).toBe(32);
    expect(out.height).toBe(32);
    expect(out.data.length).toBe(32 * 32 * 4);
  });

  it('gaussianBlur не змінює однорідне зображення і не мутує вхід', () => {
    const src = createRaster(8, 8);
    src.data.fill(100);
    const copy = new Uint8ClampedArray(src.data);
    const out = gaussianBlur(src);
    expect(Array.from(out.data.filter((_, i) => i % 4 !== 3)).every((v) => v === 100)).toBe(true);
    expect(src.data).toEqual(copy);
  });

  it('gaussianBlur згладжує імпульсний шум', () => {
    const src = createRaster(9, 9);
    src.data.set([255, 255, 255, 255], (4 * 9 + 4) * 4);
    const out = gaussianBlur(src);
    expect(out.data[(4 * 9 + 4) * 4]).toBeLessThan(255);
    expect(out.data[(4 * 9 + 5) * 4]).toBeGreaterThan(0);
  });

  it('equalizeHistogram розтягує діапазон яскравості', () => {
    const src = createRaster(16, 1);
    for (let x = 0; x < 16; x++) src.data.set([100 + x, 100 + x, 100 + x, 255], x * 4);
    const out = equalizeHistogram(src);
    expect(out.data[15 * 4] - out.data[0]).toBeGreaterThan(45);
  });

  it('otsuThreshold розділяє бімодальний розподіл', () => {
    const values = [...Array(50).fill(10), ...Array(50).fill(200)];
    const t = otsuThreshold(values, 0, 255);

    expect(t).toBeGreaterThanOrEqual(10);
    expect(t).toBeLessThan(200);
    expect(values.filter((v) => v > t)).toHaveLength(50);
  });

  it('segmentLeafMask виділяє листок і відкидає сірий фон', () => {
    const mask = segmentLeafMask(leafRaster(64));
    expect(mask[32 * 64 + 32]).toBe(1);
    expect(mask[0]).toBe(0);
    const area = mask.reduce((a, b) => a + b, 0) / mask.length;
    expect(area).toBeGreaterThan(0.4);
    expect(area).toBeLessThan(0.6);
  });

  it('applyMask зафарбовує фон чорним', () => {
    const src = leafRaster(32);
    const out = applyMask(src, segmentLeafMask(src));
    expect(Array.from(out.data.slice(0, 3))).toEqual([0, 0, 0]);
  });

  it('частка уражень зростає за наявності бурих плям', () => {
    const healthy = leafRaster(64, 0);
    const sick = leafRaster(64, 16);
    const leafH = segmentLeafMask(healthy);
    const leafS = segmentLeafMask(sick);
    const fh = extractFeatures(healthy, leafH, lesionMask(healthy, leafH));
    const fs = extractFeatures(sick, leafS, lesionMask(sick, leafS));
    expect(fh.lesionRatio).toBeLessThan(0.01);
    expect(fs.lesionRatio).toBeGreaterThan(0.05);
    expect(fs.brownRatio).toBeGreaterThan(fs.yellowRatio);
  });

  it('runPipeline формує етапи згідно з налаштуваннями', () => {
    const src = leafRaster(64, 8);
    const all = runPipeline(src, { resize: 32, denoise: true, equalize: true, segment: true });
    expect(all.stages.map((s) => s.key)).toEqual(['original', 'resize', 'denoise', 'equalize', 'segment', 'mask']);
    const none = runPipeline(src, { resize: 0, denoise: false, equalize: false, segment: false });
    expect(none.stages.map((s) => s.key)).toEqual(['original', 'mask']);
    expect(all.output.width).toBe(32);
  });
});
