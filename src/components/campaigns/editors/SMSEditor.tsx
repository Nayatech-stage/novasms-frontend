import type { FC } from 'react';
import { useMemo } from 'react';
import { useCampaignStore } from '@/store/campaign.store';
import { calculateSMSSegments, calculateSMSCost, CONTACT_VARIABLES } from '@/types/campaign.types';

/**
 * SMS Editor Component
 * Features:
 * - Character counter (160 chars = 1 segment)
 * - Live cost estimation with dynamic recipient count
 * - Variable insertion ({{firstName}}, {{phone}}, etc.)
 * - Link shortener preview
 * - Mandatory STOP block with real stop code (RG-22)
 * - Message validation
 */

export const SMSEditor: FC = () => {
  const { draft, setDraftSMSContent } = useCampaignStore();
  const senderName = draft.smsContent?.senderName || 'NOVA_PRECISION';
  const message = draft.smsContent?.message || '';
  const shortLink = draft.smsContent?.shortLinks?.default || '';

  // RG-22: STOP code is generated once per draft and persisted
  const stopCode = draft.stopCode || 'STOP';

  // RG-22: STOP block is mandatory and included in character count
  const STOP_BLOCK = `STOP au ${stopCode}\n`;
  const totalMessageLength = message.length + STOP_BLOCK.length;

  const updateSmsContent = (updates: {
    message?: string;
    senderName?: string;
    shortLink?: string;
  }) => {
    const nextMessage = updates.message ?? message;
    const nextSenderName = updates.senderName ?? senderName;
    const nextShortLink = updates.shortLink ?? shortLink;

    setDraftSMSContent({
      message: nextMessage,
      senderName: nextSenderName,
      shortLinks: nextShortLink ? { default: nextShortLink } : undefined,
      variables: Object.values(CONTACT_VARIABLES.sms),
    });
  };

  // Calculate segments and cost - WITH DYNAMIC RECIPIENT COUNT
  const recipientCount = draft.segmentId ? draft.estimatedRecipients || 0 : 0;
  const segments = useMemo(() => calculateSMSSegments(totalMessageLength), [totalMessageLength]);
  const estimatedCost = useMemo(
    () => calculateSMSCost(totalMessageLength, recipientCount),
    [totalMessageLength, recipientCount],
  );

  const handleSave = () => {
    updateSmsContent({});
  };

  const handleInsertVariable = (variable: string) => {
    updateSmsContent({ message: message + variable });
  };

  const handleInsertShortLink = () => {
    const url = shortLink.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      return;
    }
    const separator = message && !message.endsWith(' ') && !message.endsWith('\n') ? ' ' : '';
    updateSmsContent({ message: message + separator + url });
  };

  const isTooLong = totalMessageLength > 160;

  return (
    <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-7 gap-12">
      {/* Left: Editor */}
      <div className="lg:col-span-5 space-y-8">
        {/* Sender Name */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/10">
          <label className="block font-headline font-bold text-sm text-on-surface mb-4">
            Nom de l'expéditeur
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={senderName}
              onChange={(e) => updateSmsContent({ senderName: e.target.value })}
              maxLength={11}
              className="flex-1 bg-surface-container-lowest border-none ring-1 ring-outline-variant focus:ring-2 focus:ring-primary rounded-xl px-4 py-3.5 font-semibold text-on-surface transition-all"
            />
            <button className="px-6 py-3.5 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-colors">
              Suggestions
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            11 caractères max • Affiche votre marque aux destinataires
          </p>
        </div>

        {/* Message Composer */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/10 space-y-6">
          <div className="flex justify-between items-center">
            <label className="block font-headline font-bold text-sm text-on-surface">
              Message SMS
            </label>
            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tighter ${
                  isTooLong ? 'bg-error/20 text-error' : 'bg-secondary-container/30 text-secondary'
                }`}
              >
                {segments} SMS{segments > 1 ? 's' : ''}
              </span>
              <span
                className={`text-xs font-medium ${
                  isTooLong ? 'text-error' : 'text-on-surface-variant'
                }`}
              >
                {totalMessageLength} / 160 caractères (+ STOP)
              </span>
            </div>
          </div>

          <textarea
            value={message}
            onChange={(e) => updateSmsContent({ message: e.target.value })}
            placeholder="Rédigez votre message ici..."
            rows={6}
            className={`w-full bg-surface-container-lowest border-none ring-1 focus:ring-2 rounded-2xl px-5 py-5 font-body text-base text-on-surface resize-none leading-relaxed transition-all ${
              isTooLong ? 'ring-error focus:ring-error' : 'ring-outline-variant focus:ring-primary'
            }`}
          />

          {isTooLong && (
            <div className="flex items-center gap-2 text-error text-sm font-medium">
              <span className="material-symbols-outlined text-base">error</span>
              Limite de caractères dépassée (160 max pour un SMS standard)
            </div>
          )}

          <div className="mt-6 pt-6 border-t-2 border-outline-variant/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Lien de désabonnement obligatoire
                </p>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Ce bloc est automatiquement ajouté à chaque SMS
                </p>
              </div>
              <div className="px-2.5 py-1 bg-warning/20 text-warning text-[10px] font-bold rounded uppercase">
                Non-supprimable
              </div>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border-2 border-warning/40">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-warning text-xl">lock</span>
                <div className="flex-1">
                  <p className="font-mono font-semibold text-on-surface text-sm">STOP au [CODE]</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Permet aux destinataires de se désabonner en répondant STOP
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant mt-3">
              💡 Les {Math.ceil('STOP au [CODE]'.length / 160)} caractères du STOP sont inclus dans
              le décompte total
            </p>
          </div>

          {/* Variables */}
          <div className="pt-4 border-t border-outline-variant/10">
            <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">
              Insérer une variable
            </span>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(CONTACT_VARIABLES.sms).map(([key, variable]) => (
                <button
                  key={key}
                  onClick={() => handleInsertVariable(variable)}
                  className="px-4 py-2 bg-surface-container-low hover:bg-primary-container/30 hover:text-on-primary-container text-xs font-bold rounded-full transition-all flex items-center gap-2 border border-outline-variant/20"
                >
                  <span className="material-symbols-outlined text-base">
                    {key === 'firstName' ? 'person' : key === 'phone' ? 'phone' : 'text_fields'}
                  </span>
                  {variable}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Link Shortener */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/10">
          <label className="block font-headline font-bold text-sm text-on-surface mb-4">
            Raccourcisseur de lien (optionnel)
          </label>
          <div className="flex gap-4">
            <input
              type="url"
              value={shortLink}
              onChange={(e) => updateSmsContent({ shortLink: e.target.value })}
              placeholder="https://votre-boutique.com/promo"
              className="flex-1 bg-surface-container-lowest border-none ring-1 ring-outline-variant focus:ring-2 focus:ring-primary rounded-xl px-4 py-3.5 font-body text-sm transition-all"
            />
            <button
              onClick={handleInsertShortLink}
              disabled={!shortLink.trim()}
              className="bg-primary text-white font-bold py-3.5 px-8 rounded-xl hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">auto_fix_normal</span>
              Insérer
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            Suivi du CTR • Réduit les dépenses SMS
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-primary text-on-primary font-bold rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
        >
          Enregistrer le message
        </button>
      </div>

      {/* Right: Preview & Cost */}
      <div className="lg:col-span-2 space-y-8 sticky top-20 h-fit">
        {/* Cost Card */}
        <div
          className={`bg-gradient-to-br from-secondary to-secondary-container rounded-3xl p-8 text-white shadow-lg ${recipientCount === 0 ? 'opacity-60' : ''}`}
        >
          <div className="space-y-1 mb-8">
            <p className="text-secondary-fixed-dim text-xs font-bold uppercase tracking-tighter opacity-80">
              Coût unitaire
            </p>
            <h3 className="text-3xl font-black font-headline">0.08 FCFA/SMS</h3>
          </div>
          <div className="pt-8 border-t border-white/10 flex justify-between items-end">
            <div>
              <p className="text-secondary-fixed-dim text-xs font-bold uppercase tracking-tighter opacity-80">
                Total ({recipientCount.toLocaleString('fr-FR')} destinataire
                {recipientCount !== 1 ? 's' : ''})
              </p>
              <p className="text-3xl font-black font-headline mt-2">
                {recipientCount > 0 ? estimatedCost.toFixed(2) : '0.00'} FCFA
              </p>
              {recipientCount === 0 && (
                <p className="text-xs text-white/70 mt-2">💡 Sélectionnez un segment à l'étape 3</p>
              )}
            </div>
            <span
              className={`material-symbols-outlined text-5xl ${recipientCount > 0 ? 'text-secondary-fixed-dim' : 'text-white/30'}`}
            >
              {recipientCount > 0 ? 'check_circle' : 'pending'}
            </span>
          </div>
        </div>

        {/* Phone Preview */}
        <div className="relative mx-auto w-full aspect-[9/19] bg-black rounded-[3rem] p-3 shadow-lg ring-[12px] ring-surface-variant/40 border-[2px] border-white/5">
          <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
            {/* Status Bar */}
            <div className="flex justify-between px-6 pt-3 pb-2 items-center bg-gray-100">
              <span className="text-xs font-bold text-black">9:41</span>
              <div className="flex gap-1 items-center">
                <div className="w-1 h-3 bg-black rounded-xs" />
                <div className="w-1 h-3 bg-black rounded-xs" />
                <div className="w-1 h-3 bg-black rounded-xs" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
              {/* Received Message */}
              <div className="flex justify-start">
                <div className="max-w-xs bg-gray-200 text-black rounded-2xl px-4 py-2 text-sm">
                  <p className="font-semibold text-primary mb-1">{senderName}</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">
                    {message || 'Votre message apparaît ici...'}
                  </p>
                  {/* RG-22: STOP block displayed in preview */}
                  <p className="text-xs text-gray-600 border-t border-gray-300 mt-2 pt-2 whitespace-pre-wrap font-mono">
                    {STOP_BLOCK.trim()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 text-right">9:42</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
