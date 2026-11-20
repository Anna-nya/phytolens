import { CROPS, type CropId } from '../data/diseases';
import type { PreprocessingOptions } from '../lib/imageProcessing';
import { MODELS, type ModelId } from '../lib/models';

interface Props {
  crop: CropId | 'auto';
  model: ModelId;
  preprocessing: PreprocessingOptions;
  disabled?: boolean;
  onChange: (patch: { crop?: CropId | 'auto'; model?: ModelId; preprocessing?: PreprocessingOptions }) => void;
}

const STEPS: { key: keyof Omit<PreprocessingOptions, 'resize'>; label: string }[] = [
  { key: 'denoise', label: 'Фільтр Гаусса' },
  { key: 'equalize', label: 'Вирівнювання гістограми' },
  { key: 'segment', label: 'Сегментація листка' },
];

export default function OptionsPanel({ crop, model, preprocessing, disabled, onChange }: Props) {
  return (
    <fieldset className="options" disabled={disabled}>
      <legend className="sr-only">Параметри діагностики</legend>
      <div className="field">
        <label htmlFor="crop">Культура</label>
        <select id="crop" value={crop} onChange={(e) => onChange({ crop: e.target.value as CropId | 'auto' })}>
          <option value="auto">Автоматично</option>
          {CROPS.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="field__label" id="model-label">Метод</span>
        <div className="segmented" role="radiogroup" aria-labelledby="model-label">
          {MODELS.map((m) => (
            <label key={m.id} className={`segmented__item ${model === m.id ? 'segmented__item--active' : ''}`}>
              <input
                type="radio"
                name="model"
                value={m.id}
                checked={model === m.id}
                onChange={() => onChange({ model: m.id })}
              />
              <span className="segmented__title">{m.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">Попередня обробка</span>
        <div className="checks">
          <label className="field field--inline">
            <span>Розмір входу</span>
            <select
              value={preprocessing.resize}
              onChange={(e) => onChange({ preprocessing: { ...preprocessing, resize: Number(e.target.value) } })}
            >
              <option value={0}>Без масштабування</option>
              <option value={128}>128 × 128</option>
              <option value={224}>224 × 224</option>
              <option value={256}>256 × 256</option>
            </select>
          </label>
          {STEPS.map((s) => (
            <label key={s.key} className="check">
              <input
                type="checkbox"
                checked={preprocessing[s.key]}
                onChange={(e) => onChange({ preprocessing: { ...preprocessing, [s.key]: e.target.checked } })}
              />
              <span className="check__label">{s.label}</span>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
