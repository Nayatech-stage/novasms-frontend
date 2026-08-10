export default function Unsubscribed() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-[rgba(46,200,10,0.12)] flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[#136e00]">check_circle</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--text-1)]">Désabonnement confirmé</h1>
          <p className="text-[var(--text-2)]">
            Vous avez été retiré de notre liste de diffusion. Vous ne recevrez plus d'emails de
            notre part.
          </p>
        </div>
        <p className="text-sm text-[var(--text-2)]">
          Si vous pensez que c'est une erreur, contactez notre support.
        </p>
      </div>
    </div>
  );
}
