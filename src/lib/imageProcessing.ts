export interface Raster {
  width: number;
  height: number;

  data: Uint8ClampedArray;
}

export type PreprocessingStep = 'denoise' | 'equalize' | 'segment';

export interface PreprocessingOptions {
  resize: number;
  denoise: boolean;
  equalize: boolean;
  segment: boolean;
}

export const DEFAULT_PREPROCESSING: PreprocessingOptions = {
  resize: 256,
  denoise: true,
  equalize: true,
  segment: true,
};

export const STEP_LABELS: Record<PreprocessingStep | 'original' | 'resize' | 'mask', string> = {
  original: 'Оригінал',
  resize: 'Масштабування',
  denoise: 'Фільтр Гаусса',
  equalize: 'Вирівнювання гістограми',
  segment: 'Сегментація листка',
  mask: 'Маска уражень',
};

export function createRaster(width: number, height: number): Raster {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function cloneRaster(src: Raster): Raster {
  return { width: src.width, height: src.height, data: new Uint8ClampedArray(src.data) };
}

export function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function resizeSquare(src: Raster, size: number): Raster {
  const side = Math.min(src.width, src.height);
  const ox = Math.floor((src.width - side) / 2);
  const oy = Math.floor((src.height - side) / 2);
  const out = createRaster(size, size);
  for (let y = 0; y < size; y++) {
    const sy = oy + Math.min(side - 1, Math.floor(((y + 0.5) * side) / size));
    for (let x = 0; x < size; x++) {
      const sx = ox + Math.min(side - 1, Math.floor(((x + 0.5) * side) / size));
      const si = (sy * src.width + sx) * 4;
      const di = (y * size + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  return out;
}

export function gaussianBlur(src: Raster): Raster {
  const kernel = [1, 4, 6, 4, 1];
  const norm = 16;
  const { width: w, height: h } = src;
  const tmp = new Float32Array(w * h * 3);
  const out = createRaster(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let k = -2; k <= 2; k++) {
          const xx = Math.min(w - 1, Math.max(0, x + k));
          acc += src.data[(y * w + xx) * 4 + c] * kernel[k + 2];
        }
        tmp[(y * w + x) * 3 + c] = acc / norm;
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let k = -2; k <= 2; k++) {
          const yy = Math.min(h - 1, Math.max(0, y + k));
          acc += tmp[(yy * w + x) * 3 + c] * kernel[k + 2];
        }
        out.data[(y * w + x) * 4 + c] = Math.round(acc / norm);
      }
      out.data[(y * w + x) * 4 + 3] = 255;
    }
  }
  return out;
}

export function equalizeHistogram(src: Raster): Raster {
  const n = src.width * src.height;
  const hist = new Uint32Array(256);
  const lum = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const l = Math.round(luminance(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]));
    lum[i] = l;
    hist[l]++;
  }
  const cdf = new Uint32Array(256);
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    cdf[v] = acc;
  }
  let cdfMin = 0;
  for (let v = 0; v < 256; v++) {
    if (cdf[v] > 0) {
      cdfMin = cdf[v];
      break;
    }
  }
  const lut = new Uint8Array(256);
  const denom = Math.max(1, n - cdfMin);
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.round(Math.max(0, ((cdf[v] - cdfMin) / denom) * 255));
  }
  const out = createRaster(src.width, src.height);
  for (let i = 0; i < n; i++) {
    const l = lum[i];
    const scale = l === 0 ? 1 : lut[l] / l;

    const s = Math.min(2.2, Math.max(0.8, scale));
    out.data[i * 4] = src.data[i * 4] * s;
    out.data[i * 4 + 1] = src.data[i * 4 + 1] * s;
    out.data[i * 4 + 2] = src.data[i * 4 + 2] * s;
    out.data[i * 4 + 3] = 255;
  }
  return out;
}

export function otsuThreshold(values: ArrayLike<number>, min: number, max: number, bins = 256): number {
  if (max <= min) return min;
  const hist = new Float64Array(bins);
  const step = (max - min) / (bins - 1);
  for (let i = 0; i < values.length; i++) {
    const b = Math.min(bins - 1, Math.max(0, Math.round((values[i] - min) / step)));
    hist[b]++;
  }
  const total = values.length;
  let sum = 0;
  for (let b = 0; b < bins; b++) sum += b * hist[b];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVar = -1;
  for (let b = 0; b < bins; b++) {
    wB += hist[b];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += b * hist[b];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) {
      bestVar = between;
      best = b;
    }
  }
  return min + best * step;
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

export function segmentLeafMask(src: Raster): Uint8Array {
  const n = src.width * src.height;
  const exg = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = src.data[i * 4];
    const g = src.data[i * 4 + 1];
    const b = src.data[i * 4 + 2];
    const s = r + g + b || 1;
    exg[i] = (2 * g - r - b) / s;
  }
  const t = Math.max(0.02, otsuThreshold(exg, -1, 2));
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const [h, s, v] = rgbToHsv(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]);

    const isGreen = exg[i] > t || (h >= 60 && h <= 170 && s > 0.2 && v > 0.15);

    const isDiseasedTissue = h >= 15 && h <= 70 && s > 0.3 && v > 0.15 && v < 0.95;
    mask[i] = isGreen || isDiseasedTissue ? 1 : 0;
  }
  const closed = erode(dilate(mask, src.width, src.height), src.width, src.height);
  return largestComponentFill(closed, src.width, src.height);
}

export function dilate(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -1; dy <= 1 && !v; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < w && mask[yy * w + xx]) {
            v = 1;
            break;
          }
        }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

export function erode(mask: Uint8Array, w: number, h: number): Uint8Array {
  const inv = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) inv[i] = mask[i] ? 0 : 1;
  const d = dilate(inv, w, h);
  for (let i = 0; i < d.length; i++) d[i] = d[i] ? 0 : 1;
  return d;
}

export function largestComponentFill(mask: Uint8Array, w: number, h: number): Uint8Array {
  const labels = new Int32Array(w * h).fill(-1);
  let bestLabel = -1;
  let bestSize = 0;
  let label = 0;
  const stack: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || labels[i] !== -1) continue;
    let size = 0;
    stack.push(i);
    labels[i] = label;
    while (stack.length) {
      const p = stack.pop() as number;
      size++;
      const x = p % w;
      const y = (p - x) / w;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) {
        if (q >= 0 && mask[q] && labels[q] === -1) {
          labels[q] = label;
          stack.push(q);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = label;
    }
    label++;
  }
  const out = new Uint8Array(w * h);
  if (bestLabel < 0) return out;
  for (let i = 0; i < out.length; i++) out[i] = labels[i] === bestLabel ? 1 : 0;

  const outside = new Uint8Array(w * h);
  const q: number[] = [];
  const push = (p: number) => {
    if (!out[p] && !outside[p]) {
      outside[p] = 1;
      q.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (q.length) {
    const p = q.pop() as number;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  for (let i = 0; i < out.length; i++) if (!outside[i]) out[i] = 1;
  return out;
}

export function applyMask(src: Raster, mask: Uint8Array): Raster {
  const out = cloneRaster(src);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) {
      out.data[i * 4] = 0;
      out.data[i * 4 + 1] = 0;
      out.data[i * 4 + 2] = 0;
    }
  }
  return out;
}

export function lesionMask(src: Raster, leaf: Uint8Array): Uint8Array {
  const out = new Uint8Array(leaf.length);
  for (let i = 0; i < leaf.length; i++) {
    if (!leaf[i]) continue;
    const [h, s, v] = rgbToHsv(src.data[i * 4], src.data[i * 4 + 1], src.data[i * 4 + 2]);
    const healthyGreen = h >= 70 && h <= 170 && s > 0.18 && v > 0.12;
    out[i] = healthyGreen ? 0 : 1;
  }
  return out;
}

export function overlayMask(src: Raster, mask: Uint8Array, leaf?: Uint8Array): Raster {
  const out = cloneRaster(src);
  for (let i = 0; i < mask.length; i++) {
    if (leaf && !leaf[i]) {
      out.data[i * 4] *= 0.35;
      out.data[i * 4 + 1] *= 0.35;
      out.data[i * 4 + 2] *= 0.35;
    } else if (mask[i]) {
      out.data[i * 4] = Math.round(out.data[i * 4] * 0.4 + 230 * 0.6);
      out.data[i * 4 + 1] = Math.round(out.data[i * 4 + 1] * 0.4 + 40 * 0.6);
      out.data[i * 4 + 2] = Math.round(out.data[i * 4 + 2] * 0.4 + 40 * 0.6);
    }
  }
  return out;
}

export interface ImageFeatures {
  leafRatio: number;

  lesionRatio: number;

  yellowRatio: number;
  brownRatio: number;
  whiteRatio: number;

  meanBrightness: number;
  contrast: number;
}

export function extractFeatures(src: Raster, leaf: Uint8Array, lesions: Uint8Array): ImageFeatures {
  let leafPx = 0;
  let lesionPx = 0;
  let yellow = 0;
  let brown = 0;
  let white = 0;
  let sum = 0;
  let sumSq = 0;
  const n = leaf.length;
  for (let i = 0; i < n; i++) {
    const r = src.data[i * 4];
    const g = src.data[i * 4 + 1];
    const b = src.data[i * 4 + 2];
    const l = luminance(r, g, b);
    sum += l;
    sumSq += l * l;
    if (!leaf[i]) continue;
    leafPx++;
    if (!lesions[i]) continue;
    lesionPx++;
    const [h, s, v] = rgbToHsv(r, g, b);
    if (s < 0.18 && v > 0.7) white++;
    else if (h >= 40 && h < 70) yellow++;
    else brown++;
  }
  const mean = sum / n;
  const leafDen = Math.max(1, leafPx);
  const lesDen = Math.max(1, lesionPx);
  return {
    leafRatio: leafPx / n,
    lesionRatio: lesionPx / leafDen,
    yellowRatio: (yellow / lesDen) * (lesionPx / leafDen),
    brownRatio: (brown / lesDen) * (lesionPx / leafDen),
    whiteRatio: (white / lesDen) * (lesionPx / leafDen),
    meanBrightness: mean / 255,
    contrast: Math.sqrt(Math.max(0, sumSq / n - mean * mean)) / 255,
  };
}

export interface PipelineStage {
  key: keyof typeof STEP_LABELS;
  label: string;
  raster: Raster;
}

export interface PipelineResult {
  stages: PipelineStage[];

  output: Raster;
  features: ImageFeatures;
  durationMs: number;
}

export function runPipeline(input: Raster, opts: PreprocessingOptions): PipelineResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const stages: PipelineStage[] = [{ key: 'original', label: STEP_LABELS.original, raster: input }];
  let cur = input;
  if (opts.resize > 0) {
    cur = resizeSquare(cur, opts.resize);
    stages.push({ key: 'resize', label: `${STEP_LABELS.resize} ${opts.resize}×${opts.resize}`, raster: cur });
  }
  if (opts.denoise) {
    cur = gaussianBlur(cur);
    stages.push({ key: 'denoise', label: STEP_LABELS.denoise, raster: cur });
  }
  if (opts.equalize) {
    cur = equalizeHistogram(cur);
    stages.push({ key: 'equalize', label: STEP_LABELS.equalize, raster: cur });
  }

  const leaf = segmentLeafMask(cur);
  if (opts.segment) {
    cur = applyMask(cur, leaf);
    stages.push({ key: 'segment', label: STEP_LABELS.segment, raster: cur });
  }
  const lesions = lesionMask(cur, leaf);
  stages.push({ key: 'mask', label: STEP_LABELS.mask, raster: overlayMask(cur, lesions, leaf) });
  const features = extractFeatures(cur, leaf, lesions);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { stages, output: cur, features, durationMs: Math.round(t1 - t0) };
}
