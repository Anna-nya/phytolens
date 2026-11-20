import { useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}

export default function ConfirmButton({ label, confirmLabel = 'Так, підтверджую', onConfirm, className = 'btn btn--danger-outline', disabled }: Props) {
  const [asking, setAsking] = useState(false);
  const yesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (asking) yesRef.current?.focus();
  }, [asking]);
  if (!asking) {
    return (
      <button className={className} onClick={() => setAsking(true)} disabled={disabled}>
        {label}
      </button>
    );
  }
  return (
    <span className="confirm" role="group" aria-label="Підтвердження дії">
      <span className="confirm__q">Впевнені?</span>
      <button ref={yesRef} className="btn btn--danger btn--sm" onClick={() => { setAsking(false); onConfirm(); }}>
        {confirmLabel}
      </button>
      <button className="btn btn--ghost btn--sm" onClick={() => setAsking(false)}>Скасувати</button>
    </span>
  );
}
