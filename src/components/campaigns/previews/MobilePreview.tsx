import type { CSSProperties, FC } from 'react';
import type { CampaignBlock, EmailContent, SMSContent } from '@/store/campaign.store';
import { imageUploadService } from '@/services/imageUpload';

interface MobilePreviewProps {
  type: 'sms' | 'email';
  emailContent?: EmailContent;
  smsContent?: SMSContent;
}

export const MobilePreview: FC<MobilePreviewProps> = ({ type, emailContent, smsContent }) => {
  const renderCompactBlock = (block: CampaignBlock, key: string) => {
    if (block.type === 'text') {
      return (
        <p
          key={key}
          className="text-xs text-on-surface leading-relaxed"
          style={getTextStyle(block.content)}
        >
          {typeof block.content.text === 'string' ? block.content.text : 'Texte'}
        </p>
      );
    }

    if (block.type === 'image') {
      return (
        <div
          key={key}
          className="w-full h-20 bg-surface-container rounded flex items-center justify-center text-on-surface-variant overflow-hidden"
        >
          {typeof block.content.src === 'string' && block.content.src ? (
            <img
              src={imageUploadService.getThumbnail(block.content.src)}
              alt={typeof block.content.alt === 'string' ? block.content.alt : 'Image'}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="material-symbols-outlined text-sm">image</span>
          )}
        </div>
      );
    }

    if (block.type === 'button') {
      const label =
        typeof block.content.text === 'string' && block.content.text.trim().length > 0
          ? block.content.text
          : 'Bouton';
      const url = typeof block.content.url === 'string' ? block.content.url : '';

      const buttonNode = (
        <span className="inline-flex w-full justify-center px-3 py-2 bg-primary text-on-primary font-bold rounded text-xs">
          {label}
        </span>
      );

      return url ? (
        <a key={key} href={url} target="_blank" rel="noreferrer" className="block w-full">
          {buttonNode}
        </a>
      ) : (
        <div key={key} className="space-y-1">
          {buttonNode}
          <p className="text-[10px] text-on-surface-variant text-center">Aucun lien défini</p>
        </div>
      );
    }

    if (block.type === 'product') {
      const product = block.content as Record<string, unknown>;
      const title =
        typeof product.title === 'string' && product.title.trim() ? product.title : 'Produit';
      const description = typeof product.description === 'string' ? product.description : '';
      const price = typeof product.price === 'string' ? product.price : '';
      const image = typeof product.image === 'string' ? product.image : '';
      const url = typeof product.url === 'string' ? product.url : '';

      const card = (
        <div className="overflow-hidden rounded-lg border border-outline-variant/30 bg-white">
          <div className="h-20 bg-surface-container flex items-center justify-center overflow-hidden">
            {image ? (
              <img
                src={imageUploadService.getThumbnail(image)}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-lg text-on-surface-variant">
                shopping_bag
              </span>
            )}
          </div>
          <div className="p-2 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold text-on-surface line-clamp-1">{title}</p>
              {price && (
                <span className="text-[10px] font-bold text-primary whitespace-nowrap">
                  {price}
                </span>
              )}
            </div>
            {description && (
              <p className="text-[10px] text-on-surface-variant line-clamp-2">{description}</p>
            )}
          </div>
        </div>
      );

      return url ? (
        <a key={key} href={url} target="_blank" rel="noreferrer" className="block">
          {card}
        </a>
      ) : (
        <div key={key}>{card}</div>
      );
    }

    if (block.type === 'divider') {
      return <div key={key} className="h-px bg-outline-variant my-1" />;
    }

    if (block.type === 'social') {
      return (
        <div key={key} className="flex gap-2 justify-center py-2">
          {[
            { id: 'facebook', icon: 'f', color: '#1877F2' },
            { id: 'instagram', icon: '📷', color: '#E4405F' },
            { id: 'tiktok', icon: '♪', color: '#000000' },
            { id: 'linkedin', icon: '🔗', color: '#0A66C2' },
          ]
            .map((network) => {
              const url =
                ((block.content as Record<string, unknown>)?.[network.id] as string) || '';
              if (!url) return null;
              return (
                <a
                  key={network.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: network.color }}
                  title={network.id}
                >
                  {network.icon}
                </a>
              );
            })
            .filter(Boolean)}
        </div>
      );
    }

    if (block.type === 'columns') {
      const rawLayout = Number((block.content as Record<string, unknown>)?.layout || 2);
      const layout = [1, 2, 3].includes(rawLayout) ? rawLayout : 2;
      const rawColumns = Array.isArray((block.content as Record<string, unknown>)?.columns)
        ? ((block.content as Record<string, unknown>)?.columns as Record<string, unknown>[])
        : [];

      return (
        <div
          key={key}
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${layout}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: layout }).map((_, idx) => {
            const col = rawColumns[idx];
            const nestedBlocks = Array.isArray(col?.blocks) ? (col.blocks as CampaignBlock[]) : [];
            return (
              <div
                key={`${key}-col-${idx}`}
                className="rounded border border-outline-variant/30 p-1 space-y-1"
              >
                {nestedBlocks.length === 0 ? (
                  <div className="h-8 bg-surface-container rounded" />
                ) : (
                  nestedBlocks.map((nested, nestedIdx) =>
                    renderCompactBlock(nested, `${key}-nested-${idx}-${nestedIdx}`),
                  )
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (block.type === 'spacing') {
      return (
        <div
          key={key}
          style={{
            height: getSpacingHeight(
              (block.content as Record<string, unknown>)?.size as string | undefined,
            ),
          }}
        />
      );
    }

    if (block.type === 'html') {
      return (
        <div
          key={key}
          className="rounded border border-outline-variant/30 p-2 text-[10px]"
          dangerouslySetInnerHTML={{
            __html:
              ((block.content as Record<string, unknown>)?.html as string) ||
              '<p style="color:#9ca3af">HTML vide</p>',
          }}
        />
      );
    }

    return null;
  };

  const getTextStyle = (content: Record<string, unknown>): CSSProperties => {
    const fontSizeRaw = content.fontSize;
    const fontWeightRaw = content.fontWeight;
    const textAlignRaw = content.textAlign;
    const textAlign: CSSProperties['textAlign'] =
      textAlignRaw === 'center' || textAlignRaw === 'right' || textAlignRaw === 'justify'
        ? textAlignRaw
        : 'left';

    return {
      fontSize: typeof fontSizeRaw === 'number' ? `${fontSizeRaw}px` : '12px',
      fontFamily:
        typeof content.fontFamily === 'string'
          ? content.fontFamily
          : 'Inter, system-ui, sans-serif',
      fontWeight: typeof fontWeightRaw === 'number' ? fontWeightRaw : 400,
      textAlign,
      color: typeof content.color === 'string' ? content.color : '#111827',
      lineHeight: 1.5,
    };
  };

  const getSpacingHeight = (size: string | undefined) => {
    if (size === 'small') return '8px';
    if (size === 'large') return '24px';
    if (size === 'extra-large') return '32px';
    return '16px';
  };

  return (
    <div className="flex flex-col items-center">
      {/* iPhone 16 Pro Frame — taille fixe via aspect-ratio + overflow-hidden */}
      <div className="relative w-full aspect-[9/19.5] bg-black rounded-[48px] shadow-2xl border border-gray-700 mx-auto max-w-[340px] overflow-hidden">
        {/* Bordure interne noire (bezel) */}
        <div className="absolute inset-0 border-[6px] border-black rounded-[48px] pointer-events-none z-30" />

        {/* Dynamic Island */}
        <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-40 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#121212] ml-1 border border-[#333]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#121212] flex items-center justify-center border border-[#333]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2a2a2a]" />
          </div>
        </div>

        {/* Écran — positionné en absolu pour ne jamais agrandir le cadre */}
        <div className="absolute inset-[6px] bg-white rounded-[42px] overflow-hidden flex flex-col z-20">
          {/* Status Bar */}
          <div className="flex justify-between items-center px-6 pt-10 pb-2 text-black text-[13px] font-semibold shrink-0">
            <span>9:41</span>
            <div className="flex gap-1 items-center">
              <span className="material-symbols-outlined text-[15px]">signal_cellular_4_bar</span>
              <span className="material-symbols-outlined text-[15px]">wifi</span>
              <span className="material-symbols-outlined text-[15px] rotate-90">battery_full</span>
            </div>
          </div>

          {type === 'sms' && smsContent && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 flex flex-col justify-end gap-2 min-h-full">
                <div className="flex justify-end">
                  <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-4 py-3 max-w-[200px] shadow-sm">
                    <p className="text-[13px] leading-relaxed break-words">{smsContent.message}</p>
                  </div>
                </div>
                <div className="flex justify-end text-[10px] text-secondary">
                  {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )}

          {type === 'email' && emailContent && (
            <>
              {/* En-tête email — hauteur fixe */}
              <div className="bg-surface-container-low px-5 py-4 border-b border-outline-variant shrink-0">
                <div className="text-[11px] text-secondary mb-1">DE: noreply@novamessenger.ci</div>
                <div className="font-bold text-[13px] truncate">
                  {emailContent.subject || "Ligne d'objet"}
                </div>
                {emailContent.preheader && (
                  <div className="text-[12px] text-secondary truncate">
                    {emailContent.preheader}
                  </div>
                )}
              </div>
              {/* Corps email — zone scrollable, séparée du layout flex */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 flex flex-col gap-3 text-[13px] leading-relaxed text-on-surface">
                  {emailContent.blocks.length === 0 ? (
                    <p className="text-secondary text-xs">Aucun bloc ajouté</p>
                  ) : (
                    emailContent.blocks.map((block: CampaignBlock) =>
                      renderCompactBlock(block, block.id),
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 font-label-caps text-label-caps text-secondary">
        IPHONE 16 PRO · 393×852PX
      </p>
    </div>
  );
};

export default MobilePreview;
