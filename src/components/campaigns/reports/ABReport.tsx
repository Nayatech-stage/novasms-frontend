import type { FC } from 'react';
import type { ABReportData } from '@/types/advanced-scheduling';

interface ABReportProps {
  data: ABReportData;
  showDetails?: boolean;
}

/**
 * A/B Test Report Component
 * Affiche les résultats comparatifs détaillés
 */
export const ABReport: FC<ABReportProps> = ({ data, showDetails = true }) => {
  const isVictorySignificant = data.confidenceLevel >= 85;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variant A Card */}
        <div
          className={`rounded-2xl p-6 border-2 transition-all ${
            data.winner === 'A'
              ? 'bg-primary/5 border-primary'
              : 'bg-surface-container-low border-outline-variant/20'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Variante A
              </p>
              <p className="font-headline font-bold text-on-surface mt-1">
                {data.variantA.version}
              </p>
            </div>
            {data.winner === 'A' && (
              <span className="material-symbols-outlined text-green-600 text-2xl">verified</span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Envoyés</span>
              <strong className="text-on-surface">{data.variantA.sent.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Ouvertures</span>
              <strong className="text-on-surface">{data.variantA.opened}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Clics</span>
              <strong className="text-on-surface">{data.variantA.clicked}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Désinscription</span>
              <strong className="text-on-surface">{data.variantA.unsubscribed}</strong>
            </div>

            <div className="pt-4 border-t border-outline-variant/20 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-on-surface">Taux d'ouverture</span>
                <span className="text-sm font-bold text-primary">
                  {data.variantA.openRate.toFixed(2)}%
                </span>
              </div>
              <div className="w-full h-2 bg-outline-variant/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (data.variantA.openRate / 50) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-on-surface">Taux de clic</span>
                <span className="text-sm font-bold text-secondary">
                  {data.variantA.clickRate.toFixed(2)}%
                </span>
              </div>
              <div className="w-full h-2 bg-outline-variant/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all"
                  style={{
                    width: `${Math.min(100, (data.variantA.clickRate / 10) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Variant B Card */}
        <div
          className={`rounded-2xl p-6 border-2 transition-all ${
            data.winner === 'B'
              ? 'bg-primary/5 border-primary'
              : 'bg-surface-container-low border-outline-variant/20'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Variante B
              </p>
              <p className="font-headline font-bold text-on-surface mt-1">
                {data.variantB.version}
              </p>
            </div>
            {data.winner === 'B' && (
              <span className="material-symbols-outlined text-green-600 text-2xl">verified</span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Envoyés</span>
              <strong className="text-on-surface">{data.variantB.sent.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Ouvertures</span>
              <strong className="text-on-surface">{data.variantB.opened}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Clics</span>
              <strong className="text-on-surface">{data.variantB.clicked}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Désinscription</span>
              <strong className="text-on-surface">{data.variantB.unsubscribed}</strong>
            </div>

            <div className="pt-4 border-t border-outline-variant/20 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-on-surface">Taux d'ouverture</span>
                <span className="text-sm font-bold text-primary">
                  {data.variantB.openRate.toFixed(2)}%
                </span>
              </div>
              <div className="w-full h-2 bg-outline-variant/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (data.variantB.openRate / 50) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-on-surface">Taux de clic</span>
                <span className="text-sm font-bold text-secondary">
                  {data.variantB.clickRate.toFixed(2)}%
                </span>
              </div>
              <div className="w-full h-2 bg-outline-variant/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all"
                  style={{
                    width: `${Math.min(100, (data.variantB.clickRate / 10) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Winner & Significance */}
      {data.winner !== 'pending' && (
        <div
          className={`rounded-2xl p-6 border-2 ${
            isVictorySignificant ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <span
              className={`material-symbols-outlined text-2xl ${
                isVictorySignificant ? 'text-green-600' : 'text-yellow-600'
              }`}
            >
              {isVictorySignificant ? 'thumb_up' : 'info'}
            </span>
            <div>
              <p
                className={`font-headline font-bold ${
                  isVictorySignificant ? 'text-green-900' : 'text-yellow-900'
                }`}
              >
                La Variante {data.winner} est{' '}
                {isVictorySignificant ? 'gagnante' : 'légèrement meilleure'}
              </p>
              <p
                className={`text-sm mt-1 ${
                  isVictorySignificant ? 'text-green-700' : 'text-yellow-700'
                }`}
              >
                Basé sur le critère:{' '}
                <strong>
                  {data.winningCriteria === 'open-rate' ? "Taux d'ouverture" : 'Taux de clic'}
                </strong>{' '}
                • Confiance: {data.confidenceLevel.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sent to Remaining */}
      {data.sentToRemaining && data.sentToRemainingCount && (
        <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">check</span>
            <div>
              <p className="font-semibold text-on-surface">
                Version gagnante envoyée au reste de l'audience
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                <strong>{data.sentToRemainingCount.toLocaleString()}</strong> destinataires
                supplémentaires ont reçu la variante gagnante
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              📊 Insights
            </p>
            <p className="text-sm text-on-surface">
              La variante {data.winner} a{' '}
              {data.winningCriteria === 'open-rate'
                ? `généré ${Math.abs(data.variantA.openRate - data.variantB.openRate).toFixed(
                    1,
                  )}% de différence`
                : `généré ${Math.abs(data.variantA.clickRate - data.variantB.clickRate).toFixed(
                    1,
                  )}% de différence`}{' '}
              en performance.
            </p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              💡 Recommandation
            </p>
            <p className="text-sm text-on-surface">
              Utilisez la structure de la variante {data.winner} pour vos prochaines campagnes
              similaires.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ABReport;
