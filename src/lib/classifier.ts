import { CLASSES, CLASS_BY_ID, classesOfCrop, type CropId, type PlantClass } from '../data/diseases';
import type { ImageFeatures, PreprocessingOptions } from './imageProcessing';
import { isModelId, type ModelId } from './models';
import { fnv1a, mulberry32, softmax } from './random';

export interface Prediction {
  classId: string;
  probability: number;
}

export type DiagnosisStatus = 'healthy' | 'diseased' | 'uncertain';

export interface ClassifierOutput {
  predictions: Prediction[];
  inferenceMs: number;
  source: 'demo' | 'api';
}

export interface DiagnosisRecord {
  id: string;
  createdAt: string;
  fileName: string;
  crop: CropId | 'auto';
  model: ModelId;
  preprocessing: PreprocessingOptions;
  predictions: Prediction[];
  topClassId: string;
  confidence: number;
  status: DiagnosisStatus;

  severity: number;
  inferenceMs: number;
  preprocessingMs: number;
  source: 'demo' | 'api';

  thumbnail?: string;
}

export interface DiagnoseInput {
  pixels: Uint8ClampedArray;
  features: ImageFeatures;
  crop: CropId | 'auto';
  model: ModelId;
  preprocessing: PreprocessingOptions;

  file?: Blob;
  fileName: string;
}

type Affinity = 'brown' | 'yellow' | 'white';

function affinityOf(c: PlantClass): Affinity {
  if (/Powdery/i.test(c.id)) return 'white';
  if (/Yellow|mosaic|Haunglongbing|Leaf_Mold|Spider|Esca/i.test(c.id)) return 'yellow';
  return 'brown';
}

const MODEL_TEMPERATURE: Record<ModelId, number> = {
  svm: 1.45,
  mobilenetv2: 1.0,
  efficientnetb0: 0.85,
};

const MODEL_LATENCY: Record<ModelId, number> = {
  svm: 90,
  mobilenetv2: 260,
  efficientnetb0: 420,
};

export function demoClassify(input: Omit<DiagnoseInput, 'file' | 'fileName'>): ClassifierOutput {
  const { features: f, crop, model, preprocessing } = input;
  const candidates = crop === 'auto' ? CLASSES : classesOfCrop(crop);
  const seed = fnv1a(input.pixels, 97) ^ fnv1a(model);
  const rnd = mulberry32(seed);

  const s = Math.min(1, Math.max(0, (f.lesionRatio - 0.03) / 0.08));
  const total = f.yellowRatio + f.brownRatio + f.whiteRatio || 1;
  const share: Record<Affinity, number> = {
    yellow: f.yellowRatio / total,
    brown: f.brownRatio / total,
    white: f.whiteRatio / total,
  };

  const cropIds = Array.from(new Set(candidates.map((c) => c.crop)));
  const guessedCrop = cropIds[Math.floor(rnd() * cropIds.length)];
  const logits = candidates.map((c) => {
    const noise = rnd() * 1.6;
    const cropBias = crop === 'auto' && c.crop === guessedCrop ? 3 : 0;
    if (c.healthy) return 4 * (1 - s) + noise * 0.5 + cropBias;
    return 4 * s - 1 + 2.5 * share[affinityOf(c)] * s + noise * 3 * s + cropBias;
  });

  const steps = Number(preprocessing.denoise) + Number(preprocessing.equalize) + Number(preprocessing.segment);
  const temperature = MODEL_TEMPERATURE[model] * (1 - 0.06 * steps);
  const probs = softmax(logits, temperature);
  const predictions = candidates
    .map((c, i) => ({ classId: c.id, probability: probs[i] }))
    .sort((a, b) => b.probability - a.probability);
  return {
    predictions,
    inferenceMs: Math.round(MODEL_LATENCY[model] * (0.85 + rnd() * 0.3)),
    source: 'demo',
  };
}

export class ApiError extends Error {}

export function parseApiResponse(json: unknown): ClassifierOutput {
  if (!json || typeof json !== 'object') throw new ApiError('Сервер повернув некоректну відповідь.');
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.predictions) || obj.predictions.length === 0) {
    throw new ApiError('Відповідь сервера не містить прогнозів.');
  }
  const predictions: Prediction[] = obj.predictions.map((p) => {
    const item = p as Record<string, unknown>;
    const classId = item.class_id ?? item.classId;
    const probability = Number(item.probability);
    if (typeof classId !== 'string' || !CLASS_BY_ID[classId]) throw new ApiError(`Невідомий клас у відповіді: ${String(classId).slice(0, 60)}`);
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new ApiError('Некоректне значення ймовірності.');
    return { classId, probability };
  });
  predictions.sort((a, b) => b.probability - a.probability);
  const ms = Number(obj.inference_ms ?? obj.inferenceMs ?? 0);
  return { predictions, inferenceMs: Number.isFinite(ms) ? Math.round(ms) : 0, source: 'api' };
}

export async function apiClassify(apiUrl: string, input: DiagnoseInput, timeoutMs = 20000): Promise<ClassifierOutput> {
  if (!input.file) throw new ApiError('Немає файлу для надсилання.');
  if (!isModelId(input.model)) throw new ApiError('Невідома модель.');
  const form = new FormData();
  form.append('image', input.file, 'leaf');
  form.append('model', input.model);
  form.append('crop', input.crop);
  form.append('preprocessing', JSON.stringify(input.preprocessing));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/v1/predict`, {
      method: 'POST',
      body: form,
      signal: ctrl.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) throw new ApiError(`Сервер моделі відповів з кодом ${res.status}.`);
    return parseApiResponse(await res.json());
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError('Перевищено час очікування відповіді сервера.');
    throw new ApiError('Не вдалося з\'єднатися із сервером моделі. Перевірте адресу API в налаштуваннях.');
  } finally {
    clearTimeout(timer);
  }
}

export function statusOf(top: Prediction, threshold: number): DiagnosisStatus {
  if (top.probability < threshold) return 'uncertain';
  return CLASS_BY_ID[top.classId]?.healthy ? 'healthy' : 'diseased';
}

export const STATUS_LABEL: Record<DiagnosisStatus, string> = {
  healthy: 'Здорова',
  diseased: 'Виявлено хворобу',
  uncertain: 'Низька впевненість',
};

export function severityLabel(severity: number): string {
  if (severity < 0.05) return 'незначне';
  if (severity < 0.15) return 'слабке';
  if (severity < 0.35) return 'помірне';
  return 'сильне';
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface DiagnoseOptions {
  apiUrl: string;
  threshold: number;
}

export async function diagnose(input: DiagnoseInput, opts: DiagnoseOptions): Promise<DiagnosisRecord> {
  let out: ClassifierOutput;
  if (opts.apiUrl) {
    out = await apiClassify(opts.apiUrl, input);
  } else {
    out = demoClassify(input);
    await wait(out.inferenceMs);
  }
  const top = out.predictions[0];
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    fileName: input.fileName,
    crop: input.crop,
    model: input.model,
    preprocessing: input.preprocessing,
    predictions: out.predictions.slice(0, 5),
    topClassId: top.classId,
    confidence: top.probability,
    status: statusOf(top, opts.threshold),
    severity: CLASS_BY_ID[top.classId]?.healthy ? 0 : input.features.lesionRatio,
    inferenceMs: out.inferenceMs,
    preprocessingMs: 0,
    source: out.source,
  };
}
