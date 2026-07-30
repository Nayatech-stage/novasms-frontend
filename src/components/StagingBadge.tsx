const IS_STAGING = import.meta.env.VITE_IS_STAGING === 'true';

type Props = {
  label?: string;
  style?: React.CSSProperties;
};

/**
 * Badge visible uniquement quand VITE_IS_STAGING=true.
 * Indique que le provider actif est en mode simulation (pas d'envoi réel).
 */
export function StagingBadge({ label = 'Simulation', style }: Props) {
  if (!IS_STAGING) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        background: 'rgba(124,58,237,0.12)',
        color: '#7c3aed',
        border: '1px solid rgba(124,58,237,0.25)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
        <circle cx="3.5" cy="3.5" r="3.5" fill="#7c3aed" />
      </svg>
      {label}
    </span>
  );
}
