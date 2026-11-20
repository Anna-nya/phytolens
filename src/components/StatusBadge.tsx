import { STATUS_LABEL, type DiagnosisStatus } from '../lib/classifier';

export default function StatusBadge({ status }: { status: DiagnosisStatus }) {
  const icon = status === 'healthy' ? '✓' : status === 'diseased' ? '!' : '?';
  return (
    <span className={`badge badge--${status}`}>
      <span aria-hidden="true">{icon}</span> {STATUS_LABEL[status]}
    </span>
  );
}
