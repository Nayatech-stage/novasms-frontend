import { describe, expect, it } from 'vitest';
import { blocksToHtml, blocksToThumbnailHtml } from './blocksToHtml';
import type { CampaignBlock } from '@/store/campaign.store';

const textBlock = (text: string): CampaignBlock =>
  ({
    id: 'b1',
    type: 'text',
    content: { text },
  }) as CampaignBlock;

describe('blocksToHtml — conversion blocs → HTML email (US-007)', () => {
  it('interpole les variables {{prénom}} et {{boutique}}', () => {
    const html = blocksToHtml([textBlock('Bonjour {{prénom}} de {{boutique}}')], 'Sujet', {
      prénom: 'Awa',
      boutique: 'Ma Boutique',
      nom: '',
      code_promo: '',
    });

    expect(html).toContain('Bonjour Awa de Ma Boutique');
    expect(html).not.toContain('{{prénom}}');
  });

  it('laisse intactes les variables inconnues', () => {
    const html = blocksToHtml([textBlock('Code: {{variable_inconnue}}')]);

    expect(html).toContain('{{variable_inconnue}}');
  });

  it('produit un document HTML email complet', () => {
    const html = blocksToHtml([textBlock('Contenu')], 'Mon sujet');

    expect(html).toContain('<html');
    expect(html).toContain('Contenu');
    // Lien de désabonnement présent (RGPD)
    expect(html.toLowerCase()).toContain('désabonner');
  });

  it('rend un bouton avec URL et libellé interpolé', () => {
    const html = blocksToHtml([
      {
        id: 'b2',
        type: 'button',
        content: { text: 'Voir {{boutique}}', url: 'https://x.ci' },
      } as CampaignBlock,
    ]);

    expect(html).toContain('https://x.ci');
    expect(html).toContain('Voir NovaSMS');
  });

  it('rend un placeholder pour une image sans src', () => {
    const html = blocksToHtml([{ id: 'b3', type: 'image', content: {} } as CampaignBlock]);

    expect(html).toContain('Image');
  });

  it('blocksToThumbnailHtml délègue à blocksToHtml', () => {
    const html = blocksToThumbnailHtml([textBlock('Mini')]);

    expect(html).toContain('Mini');
  });
});
