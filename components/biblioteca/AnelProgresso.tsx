export function AnelProgresso({ valor, tamanho = 56 }: { valor: number; tamanho?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, valor));
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 56 56" role="img" aria-label={`${v}% lido`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-superficie)" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--color-primaria)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (v / 100) * c}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-texto)">
        {v}%
      </text>
    </svg>
  );
}
