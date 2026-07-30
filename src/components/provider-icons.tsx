type IconProps = { size?: number; className?: string };

export function WaveIcon({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="12" fill="#1DC5C9" />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fill="white"
        fontSize="20"
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        letterSpacing="-0.5"
      >
        W
      </text>
    </svg>
  );
}

export function OrangeMoneyIcon({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="12" fill="#FF6600" />
      <circle cx="24" cy="24" r="10" fill="white" opacity="0.2" />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fill="white"
        fontSize="13"
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        letterSpacing="0"
      >
        OM
      </text>
    </svg>
  );
}

export function MomoIcon({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="12" fill="#FFCC00" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fill="#333333"
        fontSize="10"
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.5"
      >
        MTN
      </text>
      <text
        x="24"
        y="33"
        textAnchor="middle"
        fill="#333333"
        fontSize="9"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        letterSpacing="0"
      >
        MoMo
      </text>
    </svg>
  );
}

export function MoovIcon({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="12" fill="#004B9E" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.5"
      >
        MOOV
      </text>
      <text
        x="24"
        y="33"
        textAnchor="middle"
        fill="#FFD700"
        fontSize="9"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        Money
      </text>
    </svg>
  );
}

export function NovaSendIcon({ size = 32, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="12" fill="#6366F1" />
      <path
        d="M14 32L20 16l10 12 4-8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="34" cy="16" r="3" fill="#A5F3FC" />
    </svg>
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
