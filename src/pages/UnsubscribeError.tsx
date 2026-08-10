export default function UnsubscribeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-red-500">error</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--text-1)]">Lien invalide ou expiré</h1>
          <p className="text-[var(--text-2)]">
            Le lien de désabonnement est invalide ou a déjà été utilisé.
          </p>
        </div>
        <p className="text-sm text-[var(--text-2)]">
          Si vous souhaitez vous désabonner, contactez notre support.
        </p>
      </div>
    </div>
  );
}
