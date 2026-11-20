import { mulberry32 } from './random';

export type SampleKind = 'healthy' | 'spots' | 'yellow' | 'mildew';

export const SAMPLES: { kind: SampleKind; label: string }[] = [
  { kind: 'healthy', label: 'Здоровий листок' },
  { kind: 'spots', label: 'Листок з бурими плямами' },
  { kind: 'yellow', label: 'Листок з хлорозом' },
  { kind: 'mildew', label: 'Листок з нальотом' },
];

function leafPath(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.08);
  ctx.bezierCurveTo(w * 0.9, h * 0.25, w * 0.88, h * 0.7, w * 0.5, h * 0.9);
  ctx.bezierCurveTo(w * 0.12, h * 0.7, w * 0.1, h * 0.25, w * 0.5, h * 0.08);
  ctx.closePath();
}

export function drawSample(kind: SampleKind, size = 512): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const rnd = mulberry32(kind.length * 7919 + size);

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#c9c6c0');
  bg.addColorStop(1, '#9d9a94');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size * 0.03, size * 0.03);
  leafPath(ctx, size, size);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  ctx.restore();

  leafPath(ctx, size, size);
  const g = ctx.createRadialGradient(size * 0.45, size * 0.4, size * 0.05, size * 0.5, size * 0.5, size * 0.5);
  g.addColorStop(0, kind === 'yellow' ? '#8fb83c' : '#4f9a3a');
  g.addColorStop(1, kind === 'yellow' ? '#5e8a26' : '#2d6b26');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  leafPath(ctx, size, size);
  ctx.clip();

  ctx.strokeStyle = 'rgba(190,230,160,0.55)';
  ctx.lineWidth = size * 0.008;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.1);
  ctx.lineTo(size * 0.5, size * 0.9);
  for (let i = 1; i < 7; i++) {
    const y = size * (0.15 + i * 0.1);
    ctx.moveTo(size * 0.5, y);
    ctx.quadraticCurveTo(size * 0.62, y - size * 0.05, size * 0.8, y - size * 0.1);
    ctx.moveTo(size * 0.5, y);
    ctx.quadraticCurveTo(size * 0.38, y - size * 0.05, size * 0.2, y - size * 0.1);
  }
  ctx.stroke();
  const spot = (x: number, y: number, r: number, inner: string, outer: string) => {
    const sg = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    sg.addColorStop(0, inner);
    sg.addColorStop(0.7, outer);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (kind === 'spots') {
    for (let i = 0; i < 18; i++) {
      spot(size * (0.28 + rnd() * 0.44), size * (0.2 + rnd() * 0.6), size * (0.025 + rnd() * 0.045), '#3b2414', '#8a5a2b');
    }
  }
  if (kind === 'yellow') {
    for (let i = 0; i < 10; i++) {
      spot(size * (0.25 + rnd() * 0.5), size * (0.2 + rnd() * 0.6), size * (0.06 + rnd() * 0.07), '#e3d24a', 'rgba(214,196,60,0.7)');
    }
  }
  if (kind === 'mildew') {
    for (let i = 0; i < 14; i++) {
      spot(size * (0.25 + rnd() * 0.5), size * (0.2 + rnd() * 0.6), size * (0.04 + rnd() * 0.05), '#f4f4ef', 'rgba(235,235,228,0.75)');
    }
  }
  ctx.restore();
  return c;
}

export async function sampleFile(kind: SampleKind): Promise<File> {
  const canvas = drawSample(kind);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92),
  );
  return new File([blob], `sample-${kind}.jpg`, { type: 'image/jpeg' });
}
