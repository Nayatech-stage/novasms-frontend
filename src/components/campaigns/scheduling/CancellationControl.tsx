import type { FC } from 'react';
import { useState, useEffect } from 'react';

interface CancellationControlProps {
  scheduledAt?: Date;
  onCancel?: () => void;
  isSending?: boolean;
}

/**
 * Cancellation Control Component
 * Permet d'annuler une campagne planifiée jusqu'à 5 minutes avant l'envoi
 */
export const CancellationControl: FC<CancellationControlProps> = ({
  scheduledAt,
  onCancel,
  isSending = false,
}) => {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [canCancel, setCanCancel] = useState(false);

  useEffect(() => {
    if (!scheduledAt || isSending) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = scheduledAt.getTime() - now.getTime();
      const minutes = Math.floor(diff / 60000);

      setMinutesLeft(minutes);
      setCanCancel(minutes >= 1 && minutes <= 5);
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledAt, isSending]);

  if (!scheduledAt || !canCancel) return null;

  return (
    <div className="fixed bottom-8 right-8 max-w-sm">
      <div className="bg-white rounded-2xl p-6 shadow-2xl border-2 border-warning space-y-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-warning text-2xl mt-1">schedule</span>
          <div>
            <p className="font-headline font-bold text-on-surface">Annuler l'envoi?</p>
            <p className="text-sm text-on-surface-variant mt-1">
              Envoi dans{' '}
              <strong>
                {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-error text-on-error font-bold rounded-lg text-sm hover:brightness-110 transition-all"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">block</span>
              Annuler
            </span>
          </button>
          <button className="flex-1 px-4 py-2 bg-surface-container text-on-surface font-bold rounded-lg text-sm hover:bg-surface-container-high transition-colors">
            Fermer
          </button>
        </div>

        <div className="pt-4 border-t border-outline-variant/20">
          <p className="text-xs text-on-surface-variant">
            ⏰ Délai d'annulation: <strong>jusqu'à 5 minutes avant</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CancellationControl;
