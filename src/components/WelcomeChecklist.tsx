import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';
import { CheckCircle2, Circle } from 'lucide-react';

export default function WelcomeChecklist() {
  const { items, completionPercentage } = useOnboardingChecklist();

  if (items.length === 0) return null;

  const completedCount = items.filter((item) => item.completed).length;

  return (
    <div className="bg-surface rounded-xl shadow-sm p-6 border border-outline-variant/30 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-on-surface">Bienvenue 👋</h2>
        <span className="text-sm font-semibold text-primary">
          {completedCount}/{items.length} étapes
        </span>
      </div>

      <div className="w-full bg-outline-variant/20 rounded-full h-2 mb-6">
        <div
          className="bg-gradient-to-r from-primary to-primary-container h-2 rounded-full transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
              item.completed
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-outline-variant/10 border border-outline-variant/30'
            }`}
          >
            <div className="flex-shrink-0">
              {item.completed ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <Circle className="w-6 h-6 text-on-surface-variant" />
              )}
            </div>

            <div className="flex-1">
              <p
                className={`font-semibold ${
                  item.completed ? 'text-on-surface line-through opacity-75' : 'text-on-surface'
                }`}
              >
                {item.label}
              </p>
              <p className="text-sm text-on-surface-variant">{item.description}</p>
            </div>

            <span className="text-2xl">{item.icon}</span>
          </div>
        ))}
      </div>

      {completionPercentage === 100 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded-lg text-center">
          <p className="text-green-600 font-semibold">
            🎉 Félicitations! Votre onboarding est complet
          </p>
          <p className="text-sm text-on-surface-variant mt-1">
            Vous pouvez maintenant gérer l'intégralité de vos campagnes
          </p>
        </div>
      )}
    </div>
  );
}
