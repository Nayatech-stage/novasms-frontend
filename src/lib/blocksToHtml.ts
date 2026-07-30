/**
 * blocksToHtml.ts
 * Convertit des CampaignBlock[] en HTML email valide.
 * Utilisé pour la prévisualisation et l'export final.
 */
import type { CampaignBlock } from '@/store/campaign.store';

type Vars = Record<string, string>;

const DEFAULT_VARS: Vars = {
  prénom: 'Awa',
  nom: 'Diallo',
  boutique: 'NovaSMS',
  code_promo: 'PROMO10',
};

function interpolate(text: string, vars: Vars): string {
  return text.replace(
    /\{\{([^}]+)\}\}/g,
    (_, key: string) => vars[key.trim()] ?? `{{${key.trim()}}}`,
  );
}

function renderBlock(block: CampaignBlock, vars: Vars): string {
  const c = block.content as Record<string, unknown>;

  switch (block.type) {
    case 'text': {
      const text = interpolate(String(c.text ?? ''), vars);
      const fs = Number(c.fontSize ?? 14);
      const fw = Number(c.fontWeight ?? 400);
      const ta = String(c.textAlign ?? 'left');
      const color = String(c.color ?? '#111827');
      const ff = String(c.fontFamily ?? 'Inter, system-ui, sans-serif');
      return `<p style="margin:0 0 12px;font-size:${fs}px;font-weight:${fw};text-align:${ta};color:${color};font-family:${ff};line-height:1.6;">${text.replace(/\n/g, '<br/>')}</p>`;
    }

    case 'image': {
      const src = String(c.src ?? '');
      const alt = interpolate(String(c.alt ?? ''), vars);
      if (!src)
        return `<div style="width:100%;height:160px;background:#f0f4ef;display:flex;align-items:center;justify-content:center;border-radius:8px;margin:0 0 12px;"><span style="color:#9ca3af;font-size:13px;">Image</span></div>`;
      return `<img src="${src}" alt="${alt}" style="width:100%;max-width:100%;height:auto;display:block;border-radius:8px;margin:0 0 12px;" />`;
    }

    case 'button': {
      const text = interpolate(String(c.text ?? 'Cliquez ici'), vars);
      const url = String(c.url ?? '#');
      const bg = String(c.bg ?? '#2ec80a');
      const textColor = String(c.textColor ?? '#ffffff');
      return `<div style="text-align:center;margin:16px 0;">
        <a href="${url}" style="display:inline-block;background:${bg};color:${textColor};padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;font-family:Inter,sans-serif;">${text}</a>
      </div>`;
    }

    case 'divider': {
      const thickness = Number(c.thickness ?? 1);
      const color = String(c.color ?? '#e5e7eb');
      const width = String(c.width ?? '100%');
      return `<div style="width:${width};border-top:${thickness}px solid ${color};margin:16px auto;"></div>`;
    }

    case 'product': {
      const title = interpolate(String(c.title ?? 'Produit'), vars);
      const desc = interpolate(String(c.description ?? ''), vars);
      const price = String(c.price ?? '');
      const img = String(c.image ?? '');
      const url = String(c.url ?? '#');
      return `<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:0 0 12px;">
        ${img ? `<img src="${img}" alt="${title}" style="width:100%;height:160px;object-fit:cover;display:block;" />` : `<div style="width:100%;height:120px;background:#f0f4ef;display:flex;align-items:center;justify-content:center;"><span style="color:#9ca3af;font-size:13px;">Image produit</span></div>`}
        <div style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <strong style="font-size:15px;color:#111827;font-family:Inter,sans-serif;">${title}</strong>
            ${price ? `<span style="font-size:14px;font-weight:700;color:#2ec80a;">${price}</span>` : ''}
          </div>
          ${desc ? `<p style="margin:8px 0 12px;font-size:13px;color:#6b7280;font-family:Inter,sans-serif;">${desc}</p>` : ''}
          <a href="${url}" style="display:block;text-align:center;background:#2ec80a;color:#fff;padding:10px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;">Voir le produit</a>
        </div>
      </div>`;
    }

    case 'spacing': {
      const size = String(c.size ?? 'medium');
      const h =
        size === 'small'
          ? '8px'
          : size === 'large'
            ? '24px'
            : size === 'extra-large'
              ? '40px'
              : '16px';
      return `<div style="height:${h};"></div>`;
    }

    case 'social': {
      const links = [
        { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'f' },
        { id: 'instagram', label: 'Instagram', color: '#E4405F', icon: '📷' },
        { id: 'tiktok', label: 'TikTok', color: '#000000', icon: '♪' },
        { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'in' },
      ]
        .filter((n) => c[n.id])
        .map(
          (n) =>
            `<a href="${String(c[n.id])}" style="display:inline-block;width:36px;height:36px;border-radius:50%;background:${n.color};color:#fff;text-align:center;line-height:36px;font-size:12px;font-weight:700;margin:0 4px;text-decoration:none;">${n.icon}</a>`,
        )
        .join('');
      return `<div style="text-align:center;margin:12px 0;">${links}</div>`;
    }

    case 'columns': {
      const cols = Array.isArray(c.columns)
        ? (c.columns as Array<{ blocks: CampaignBlock[] }>)
        : [];
      const layout = Number(c.layout ?? 2);
      const pct = Math.floor(100 / layout);
      const colsHtml = cols
        .slice(0, layout)
        .map(
          (col) =>
            `<td style="width:${pct}%;vertical-align:top;padding:0 8px;">${col.blocks.map((b) => renderBlock(b, vars)).join('')}</td>`,
        )
        .join('');
      return `<table style="width:100%;border-collapse:collapse;margin:0 0 12px;"><tr>${colsHtml}</tr></table>`;
    }

    case 'html': {
      return String(c.html ?? '');
    }

    default:
      return '';
  }
}

/**
 * Génère un document HTML email complet à partir de blocs.
 * @param blocks  Blocs du contenu
 * @param subject Objet de l'email (affiché en header)
 * @param vars    Variables à interpoler (prénom, boutique, code_promo…)
 */
export function blocksToHtml(
  blocks: CampaignBlock[],
  subject?: string,
  vars: Vars = DEFAULT_VARS,
): string {
  const body = blocks.map((b) => renderBlock(b, vars)).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject ?? 'Email'}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #f7f9f6; font-family: Inter, system-ui, sans-serif; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <!-- Header Brand -->
          <tr>
            <td style="background:linear-gradient(135deg,#2ec80a,#aaee22);padding:24px 32px;text-align:center;">
              <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">NovaSMS</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f7f9f6;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Inter,sans-serif;">
                Vous recevez cet email car vous êtes inscrit chez <strong>{{boutique}}</strong>. 
                <a href="#" style="color:#6b7280;">Se désabonner</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Version allégée (inline) pour les miniatures dans la bibliothèque.
 * Rendu dans un iframe 600x400 scalé à 0.28.
 */
export function blocksToThumbnailHtml(blocks: CampaignBlock[], vars: Vars = DEFAULT_VARS): string {
  return blocksToHtml(blocks, undefined, vars);
}
