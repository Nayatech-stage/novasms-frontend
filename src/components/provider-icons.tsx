type IconProps = { size?: number; className?: string };

/**
 * Logos officiels des opérateurs Mobile Money (fichiers dans /public/assets).
 * Sources : marques déposées de leurs propriétaires respectifs — usage à des
 * fins d'identification du moyen de paiement uniquement.
 */
function LogoImg({
  src,
  alt,
  size = 32,
  className,
}: IconProps & { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}

export function WaveIcon({ size = 32, className }: IconProps) {
  return <LogoImg src="/assets/wave-icon.png" alt="Wave" size={size} className={className} />;
}

export function OrangeMoneyIcon({ size = 32, className }: IconProps) {
  return (
    <LogoImg
      src="/assets/orange-money-logo.svg"
      alt="Orange Money"
      size={size}
      className={className}
    />
  );
}

export function MomoIcon({ size = 32, className }: IconProps) {
  return (
    <LogoImg src="/assets/mtn-momo-logo.svg" alt="MTN MoMo" size={size} className={className} />
  );
}

export function MoovIcon({ size = 32, className }: IconProps) {
  return (
    <LogoImg src="/assets/moov-money-logo.png" alt="Moov Money" size={size} className={className} />
  );
}

export function NovaSendIcon({ size = 32, className }: IconProps) {
  return (
    <LogoImg src="/assets/novasend-logo.png" alt="NovaSend" size={size} className={className} />
  );
}

export function VisaIcon({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.63)}
      viewBox="0 0 78 50"
      fill="none"
      className={className}
    >
      <rect width="78" height="50" rx="7" fill="#1a1f71" />
      <text
        x="39"
        y="34"
        textAnchor="middle"
        fill="white"
        fontSize="22"
        fontWeight="900"
        fontFamily="Arial"
        letterSpacing="-1"
        fontStyle="italic"
      >
        VISA
      </text>
    </svg>
  );
}

export function StripeIcon({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="10" fill="#635bff" />
      <path
        d="M22 18c0-1.5 1.2-2.4 3-2.4 2.6 0 5.1 1 6.9 2.5l1.5-4.5C31.6 12.3 28.6 11 25 11c-5.2 0-8.8 2.8-8.8 7.2 0 7.8 10.6 5.8 10.6 9.8 0 1.6-1.4 2.5-3.4 2.5-2.8 0-5.6-1.2-7.6-3l-1.6 4.5C16.2 34.3 19.7 36 24 36c5.5 0 9.2-2.8 9.2-7.3C33.2 20.4 22 22.3 22 18z"
        fill="white"
      />
    </svg>
  );
}

export function SimulationBadgeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="#7c3aed" />
      <path
        d="M4 7l1.5 1.5L10 5"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
