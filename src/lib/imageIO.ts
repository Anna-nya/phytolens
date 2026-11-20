import type { Raster } from './imageProcessing';

const MAX_SIDE = 1024;

export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function imageToRaster(img: HTMLImageElement | HTMLCanvasElement, maxSide = MAX_SIDE): Raster {
  const w0 = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const h0 = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const k = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k));
  const h = Math.max(1, Math.round(h0 * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D недоступний у цьому браузері.');
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  return { width: w, height: h, data: data.data };
}

export function rasterToCanvas(r: Raster): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = r.width;
  canvas.height = r.height;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.width, r.height), 0, 0);
  return canvas;
}

export function rasterToDataUrl(r: Raster, type = 'image/jpeg', quality = 0.85): string {
  return rasterToCanvas(r).toDataURL(type, quality);
}

export function makeThumbnail(r: Raster, size = 96): string {
  const k = size / Math.max(r.width, r.height);
  const src = rasterToCanvas(r);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(r.width * k));
  canvas.height = Math.max(1, Math.round(r.height * k));
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export function isSafeImageDataUrl(url: unknown): url is string {
  return typeof url === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(url);
}
