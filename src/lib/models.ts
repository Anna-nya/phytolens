import type { PreprocessingOptions } from './imageProcessing';

export type ModelId = 'svm' | 'mobilenetv2' | 'efficientnetb0';

export interface ModelInfo {
  id: ModelId;
  name: string;
  family: 'Класичний ML' | 'Легка CNN';
  description: string;
  inputSize: number;
  params: string;
}

export const MODELS: ModelInfo[] = [
  {
    id: 'svm',
    name: 'SVM + HOG',
    family: 'Класичний ML',
    description:
      'Ручне видобування ознак (гістограма орієнтованих градієнтів, колірні гістограми HSV, текстурні ознаки) та класифікатор SVM з RBF-ядром.',
    inputSize: 128,
    params: '≈ 0,1 млн опорних векторів',
  },
  {
    id: 'mobilenetv2',
    name: 'MobileNetV2',
    family: 'Легка CNN',
    description:
      'Згорткова мережа з інвертованими залишковими блоками та depthwise-згортками; transfer learning з ImageNet.',
    inputSize: 224,
    params: '3,4 млн параметрів',
  },
  {
    id: 'efficientnetb0',
    name: 'EfficientNet-B0',
    family: 'Легка CNN',
    description:
      'Мережа зі збалансованим масштабуванням глибини, ширини та роздільної здатності; transfer learning з ImageNet.',
    inputSize: 224,
    params: '5,3 млн параметрів',
  },
];

export const MODEL_BY_ID: Record<ModelId, ModelInfo> = Object.fromEntries(
  MODELS.map((m) => [m.id, m]),
) as Record<ModelId, ModelInfo>;

export function isModelId(v: unknown): v is ModelId {
  return typeof v === 'string' && v in MODEL_BY_ID;
}

export function describePreprocessing(p: PreprocessingOptions): string {
  const parts: string[] = [];
  if (p.resize) parts.push(`${p.resize}px`);
  if (p.denoise) parts.push('Гаусс');
  if (p.equalize) parts.push('гістограма');
  if (p.segment) parts.push('сегментація');
  return parts.length ? parts.join(' + ') : 'без обробки';
}
