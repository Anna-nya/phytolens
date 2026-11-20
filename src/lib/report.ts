import { CLASS_BY_ID, CROP_BY_ID } from '../data/diseases';
import { STATUS_LABEL, type DiagnosisRecord } from './classifier';
import { MODEL_BY_ID, describePreprocessing } from './models';
import { toCsv } from './validation';

export function batchToCsv(rows: DiagnosisRecord[]): string {
  return toCsv([
    ['Файл', 'Культура', 'Діагноз', 'Статус', 'Впевненість, %', 'Площа ураження, %', 'Модель', 'Обробка', 'Дата'],
    ...rows.map((r) => {
      const c = CLASS_BY_ID[r.topClassId];
      return [
        r.fileName,
        CROP_BY_ID[c.crop].name,
        c.name,
        STATUS_LABEL[r.status],
        (r.confidence * 100).toFixed(1),
        (r.severity * 100).toFixed(1),
        MODEL_BY_ID[r.model].name,
        describePreprocessing(r.preprocessing),
        new Date(r.createdAt).toLocaleString('uk-UA'),
      ];
    }),
  ]);
}
