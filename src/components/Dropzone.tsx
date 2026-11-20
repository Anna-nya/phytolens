import { useEffect, useId, useRef, useState, type DragEvent } from 'react';

interface Props {
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  hint?: string;
}

export default function Dropzone({ multiple, disabled, onFiles, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const hintId = useId();

  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        e.preventDefault();
        onFiles(multiple ? files : files.slice(0, 1));
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled, multiple, onFiles]);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={`dropzone ${over ? 'dropzone--over' : ''} ${disabled ? 'dropzone--disabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={hintId}
      aria-label={multiple ? 'Завантажити зображення листя' : 'Завантажити зображення листка'}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <svg className="dropzone__icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 32V12m0 0l-8 8m8-8l8 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 30v6a4 4 0 004 4h24a4 4 0 004-4v-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="dropzone__title">
        Перетягніть фото або <span className="link">оберіть файл</span>
      </p>
      <p id={hintId} className="dropzone__hint">
        {hint ?? 'JPG, PNG, WebP · до 10 МБ'}
      </p>
      <div className="dropzone__actions">
        <button
          type="button"
          className="btn btn--outline btn--sm"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            cameraRef.current?.click();
          }}
        >
          📷 Камера
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
