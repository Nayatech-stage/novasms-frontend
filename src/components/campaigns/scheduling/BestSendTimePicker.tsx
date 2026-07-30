import type { FC } from 'react';
import { useState, useCallback } from 'react';
import {
  analyzeBestSendTime,
  formatBestTime,
  type BestTimeData,
} from '@/types/advanced-scheduling';

interface BestSendTimePickerProps {
  onTimeSelect: (isOptimal: boolean, data?: BestTimeData) => void;
}

export const BestSendTimePicker: FC<BestSendTimePickerProps> = ({ onTimeSelect }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [bestTime, setBestTime] = useState<BestTimeData | null>(null);
  const [useOptimal, setUseOptimal] = useState(false);

  const runAnalysis = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const data = analyzeBestSendTime();
      setBestTime(data);
      onTimeSelect(true, data);
    } finally {
      setIsLoading(false);
    }
  }, [onTimeSelect]);

  const handleToggle = (checked: boolean) => {
    setUseOptimal(checked);
    if (checked && !bestTime && !isLoading) {
      void runAnalysis();
    } else {
      onTimeSelect(checked, bestTime || undefined);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={useOptimal}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-5 h-5 rounded border-outline-variant accent-primary"
        />
        <div>
          <p className="font-semibold text-on-surface">Meilleur moment optimal</p>
          <p className="text-xs text-on-surface-variant">
            Basé sur vos données d'engagement historiques
          </p>
        </div>
      </label>

      {useOptimal && (
        <div className="ml-8 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
          {isLoading ? (
            <div className="flex items-center gap-3 text-on-surface-variant">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-sm">Analyse de vos données d'engagement...</span>
            </div>
          ) : bestTime ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-on-surface">{formatBestTime(bestTime)}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Taux d'ouverture estimé:{' '}
                    <strong>{bestTime.estimatedOpenRate.toFixed(1)}%</strong>
                  </p>
                </div>
                <span className="material-symbols-outlined text-green-600">check_circle</span>
              </div>

              <button
                onClick={() => void runAnalysis()}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Réanalyser
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default BestSendTimePicker;
