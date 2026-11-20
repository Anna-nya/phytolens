import type { CropId } from '../data/diseases';
import { diagnose, type DiagnosisRecord } from './classifier';
import { imageToRaster, loadImage, makeThumbnail } from './imageIO';
import { runPipeline, type PipelineResult, type PreprocessingOptions } from './imageProcessing';
import type { ModelId } from './models';
import { MIN_IMAGE_SIDE, validateImageFile } from './validation';

export class UserFacingError extends Error {}

export interface ProcessOptions {
  crop: CropId | 'auto';
  model: ModelId;
  preprocessing: PreprocessingOptions;
  apiUrl: string;
  threshold: number;
}

export interface ProcessResult {
  record: DiagnosisRecord;
  pipeline: PipelineResult;
}

const nextFrame = () => new Promise((r) => setTimeout(r, 16));

export async function prepareImage(file: File) {
  const check = await validateImageFile(file);
  if (!check.ok) throw new UserFacingError(check.error);
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new UserFacingError('Не вдалося прочитати зображення — файл пошкоджений.');
  }
  if (img.naturalWidth < MIN_IMAGE_SIDE || img.naturalHeight < MIN_IMAGE_SIDE) {
    throw new UserFacingError(`Зображення замале: мінімум ${MIN_IMAGE_SIDE}×${MIN_IMAGE_SIDE} пікселів.`);
  }
  return imageToRaster(img);
}

export async function processFile(
  file: File,
  opts: ProcessOptions,
  onStage?: (stage: 'preprocess' | 'classify') => void,
): Promise<ProcessResult> {
  const raster = await prepareImage(file);
  onStage?.('preprocess');
  await nextFrame();
  const pipeline = runPipeline(raster, opts.preprocessing);
  onStage?.('classify');
  const record = await diagnose(
    {
      pixels: pipeline.output.data,
      features: pipeline.features,
      crop: opts.crop,
      model: opts.model,
      preprocessing: opts.preprocessing,
      file,
      fileName: file.name,
    },
    { apiUrl: opts.apiUrl, threshold: opts.threshold },
  );
  record.preprocessingMs = pipeline.durationMs;
  record.thumbnail = makeThumbnail(pipeline.stages[1]?.raster ?? raster);
  return { record, pipeline };
}
