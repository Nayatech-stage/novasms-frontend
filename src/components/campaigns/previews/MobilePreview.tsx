import type { CSSProperties, FC } from 'react';
import type { CampaignBlock, EmailContent, SMSContent } from '@/store/campaign.store';
import { imageUploadService } from '@/services/imageUpload';

interface MobilePreviewProps {
  type: 'sms' | 'email';
  emailContent?: EmailContent;
  smsContent?: SMSContent;
}

/**
 * Mobile Preview Component
 * Affiche une prévisualisation réaliste sur téléphone mobile
 */
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
    <div className="relative h-fit lg:self-start lg:sticky lg:top-20 lg:z-40">
      <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 space-y-4">
        <h3 className="font-headline font-bold text-sm text-on-surface">Aperçu Mobile</h3>

        {/* iPhone Frame */}
        <div
          className="bg-black rounded-[40px] p-3 shadow-2xl flex flex-col"
          style={{ aspectRatio: '9/16', width: '100%', maxWidth: '280px', margin: '0 auto' }}
        >
          {/* Status Bar */}
          <div className="shrink-0 bg-black rounded-[30px] text-white text-[10px] px-4 py-2 flex justify-between items-center mb-1">
            <span>9:41</span>
            <span>●●●●●</span>
          </div>

          {/* Content Area - overflow-clip preserve rounded corners while allowing inner scroll */}
          <div
            className="bg-white rounded-[30px] min-h-0 flex-1 flex flex-col"
            style={{ overflow: 'hidden', minHeight: 0 }}
          >
            {type === 'sms' && smsContent && (
              <div className="min-h-0 flex-1 p-4 flex flex-col justify-end space-y-2 overflow-auto">
                {/* SMS Message */}
                <div className="flex justify-end">
                  <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm p-3 max-w-[200px] shadow-sm">
                    <p className="text-sm leading-relaxed break-words">{smsContent.message}</p>
                  </div>
                </div>
                {/* Timestamp */}
                <div className="flex justify-end text-[10px] text-on-surface-variant">
                  {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}

            {type === 'email' && emailContent && (
              <div className="min-h-0 flex-1 flex flex-col" style={{ height: 0 }}>
                {/* Email Header - fixed */}
                <div className="shrink-0 bg-surface-container p-3 border-b border-outline-variant/20">
                  <p className="text-xs font-bold text-on-surface-variant mb-1">
                    DE: noreply@novasms.ci
                  </p>
                  <p className="text-xs font-bold text-on-surface truncate">
                    {emailContent.subject}
                  </p>
                  {emailContent.preheader && (
                    <p className="text-[10px] text-on-surface-variant truncate">
                      {emailContent.preheader}
                    </p>
                  )}
                </div>

                {/* Email Body - scrollable, height 0 forces flex to constrain to parent */}
                <div
                  className="min-h-0 flex-1 p-3 text-sm overflow-y-auto space-y-2 break-words"
                  style={{ height: 0 }}
                >
                  {emailContent.blocks.length === 0 ? (
                    <p className="text-on-surface-variant text-xs">Aucun bloc ajouté</p>
                  ) : (
                    emailContent.blocks.map((block: CampaignBlock) =>
                      renderCompactBlock(block, block.id),
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device Info */}
        <div className="pt-3 border-t border-outline-variant/20 text-center">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">
            iPhone 15 · 390×844px
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobilePreview;
