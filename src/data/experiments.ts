import type { ModelId } from '../lib/models';

export type PipelineId = 'raw' | 'denoise' | 'denoise_eq' | 'full';

export const PIPELINES: { id: PipelineId; name: string; short: string }[] = [
  { id: 'raw', name: 'Без попередньої обробки', short: 'Без обробки' },
  { id: 'denoise', name: 'Фільтр Гаусса', short: 'Гаусс' },
  { id: 'denoise_eq', name: 'Гаусс + вирівнювання гістограми', short: 'Гаусс + гіст.' },
  { id: 'full', name: 'Гаусс + гістограма + сегментація', short: 'Повний' },
];

export interface ExperimentRow {
  model: ModelId;
  pipeline: PipelineId;

  accuracy: number;

  f1: number;

  inferenceMs: number;
}

export interface ExperimentFile {
  title: string;
  dataset: string;
  demo: boolean;
  rows: ExperimentRow[];
}

export const DEMO_EXPERIMENTS: ExperimentFile = {
  title: 'Демонстраційний набір (заглушка)',
  dataset: 'PlantVillage, 38 класів (умовні значення)',
  demo: true,
  rows: [
    { model: 'svm', pipeline: 'raw', accuracy: 0.71, f1: 0.68, inferenceMs: 35 },
    { model: 'svm', pipeline: 'denoise', accuracy: 0.74, f1: 0.71, inferenceMs: 38 },
    { model: 'svm', pipeline: 'denoise_eq', accuracy: 0.78, f1: 0.75, inferenceMs: 40 },
    { model: 'svm', pipeline: 'full', accuracy: 0.83, f1: 0.81, inferenceMs: 55 },
    { model: 'mobilenetv2', pipeline: 'raw', accuracy: 0.9, f1: 0.89, inferenceMs: 48 },
    { model: 'mobilenetv2', pipeline: 'denoise', accuracy: 0.91, f1: 0.9, inferenceMs: 50 },
    { model: 'mobilenetv2', pipeline: 'denoise_eq', accuracy: 0.92, f1: 0.91, inferenceMs: 52 },
    { model: 'mobilenetv2', pipeline: 'full', accuracy: 0.93, f1: 0.92, inferenceMs: 66 },
    { model: 'efficientnetb0', pipeline: 'raw', accuracy: 0.92, f1: 0.91, inferenceMs: 74 },
    { model: 'efficientnetb0', pipeline: 'denoise', accuracy: 0.93, f1: 0.92, inferenceMs: 76 },
    { model: 'efficientnetb0', pipeline: 'denoise_eq', accuracy: 0.93, f1: 0.93, inferenceMs: 79 },
    { model: 'efficientnetb0', pipeline: 'full', accuracy: 0.94, f1: 0.93, inferenceMs: 92 },
  ],
};

const PIPELINE_IDS = new Set(PIPELINES.map((p) => p.id));
const MODEL_IDS = new Set<ModelId>(['svm', 'mobilenetv2', 'efficientnetb0']);

export function parseExperimentFile(json: unknown): ExperimentFile | string {
  if (!json || typeof json !== 'object') return 'Файл не містить JSON-об\'єкта.';
  const o = json as Record<string, unknown>;
  if (!Array.isArray(o.rows) || o.rows.length === 0) return 'У файлі немає масиву rows з результатами.';
  if (o.rows.length > 500) return 'Забагато рядків (максимум 500).';
  const rows: ExperimentRow[] = [];
  for (const [i, r] of o.rows.entries()) {
    const x = r as Record<string, unknown>;
    const accuracy = Number(x.accuracy);
    const f1 = Number(x.f1);
    const inferenceMs = Number(x.inferenceMs ?? x.inference_ms);
    if (!MODEL_IDS.has(x.model as ModelId)) return `Рядок ${i + 1}: невідома модель.`;
    if (!PIPELINE_IDS.has(x.pipeline as PipelineId)) return `Рядок ${i + 1}: невідомий варіант обробки.`;
    if (!(accuracy >= 0 && accuracy <= 1) || !(f1 >= 0 && f1 <= 1)) return `Рядок ${i + 1}: метрики мають бути в межах 0..1.`;
    if (!(inferenceMs >= 0)) return `Рядок ${i + 1}: некоректний час інференсу.`;
    rows.push({ model: x.model as ModelId, pipeline: x.pipeline as PipelineId, accuracy, f1, inferenceMs });
  }
  return {
    title: typeof o.title === 'string' ? o.title.slice(0, 120) : 'Імпортовані результати',
    dataset: typeof o.dataset === 'string' ? o.dataset.slice(0, 120) : '—',
    demo: false,
    rows,
  };
}
