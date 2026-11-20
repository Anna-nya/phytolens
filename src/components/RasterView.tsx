import { useEffect, useRef } from 'react';
import type { Raster } from '../lib/imageProcessing';

export default function RasterView({ raster, label, className }: { raster: Raster; label: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = raster.width;
    c.height = raster.height;
    const ctx = c.getContext('2d');
    ctx?.putImageData(new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height), 0, 0);
  }, [raster]);
  return <canvas ref={ref} role="img" aria-label={label} className={className} />;
}
