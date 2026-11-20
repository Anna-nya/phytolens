export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <path d="M9 23c0-9 6-14 15-14 0 9-5 15-14 15" fill="var(--brand-soft)" />
      <path d="M9 23l9-9" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
