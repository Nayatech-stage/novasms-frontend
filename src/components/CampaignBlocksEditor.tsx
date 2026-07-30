import React from 'react';

type BlockType = 'text' | 'image' | 'button' | 'product' | 'social' | 'separator' | 'html';
type BlockAlignment = 'left' | 'center' | 'right';
type Block = {
  id: string;
  type: BlockType;
  content?: string;
  alignment?: BlockAlignment;
  paddingY?: number;
  paddingX?: number;
};
type PreviewMode = 'desktop' | 'mobile';

const DEFAULT_ALIGNMENT: BlockAlignment = 'left';
const DEFAULT_PADDING_Y = 24;
const DEFAULT_PADDING_X = 24;

const TEMPLATE_LIBRARY = [
  'Promo Flash',
  'Nouveauté Produit',
  'Relance Panier',
  'Offre VIP',
  'Code Promo Week-end',
  'Lancement Collection',
  'Soldes Saison',
  'Retour en Stock',
  'Cross-sell',
  'Upsell Premium',
  'Réactivation Client',
  'Anniversaire Client',
  'Black Friday',
  'Cyber Monday',
  'Fête des Mères',
  'Fête des Pères',
  'Noël',
  'Nouvel An',
  'Invitation Événement',
  'Merci Après Achat',
];

function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 9);
}

function createBlock(type: BlockType): Block {
  return {
    id: uid(),
    type,
    alignment: DEFAULT_ALIGNMENT,
    paddingY: DEFAULT_PADDING_Y,
    paddingX: DEFAULT_PADDING_X,
    content:
      type === 'separator'
        ? undefined
        : type === 'product'
          ? 'Produit vedette | 189 FCFA'
          : type === 'social'
            ? 'Instagram · Facebook · WhatsApp'
            : type === 'html'
              ? '<div><h2>Mon HTML personnalisé</h2><p>Éditez ce code.</p></div>'
              : '',
  };
}

function createTemplateBlocks(templateName: string): Block[] {
  return [
    {
      ...createBlock('text'),
      content: `${templateName} · Bonjour {{prénom}},`,
    },
    {
      ...createBlock('product'),
      content: `${templateName} | Offre spéciale {{code_promo}}`,
    },
    {
      ...createBlock('button'),
      content: 'Découvrir maintenant',
    },
    {
      ...createBlock('social'),
      content: '{{boutique}} · Instagram · Facebook · WhatsApp',
    },
  ];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAlignmentClass(alignment: BlockAlignment) {
  if (alignment === 'center') return 'justify-center text-center';
  if (alignment === 'right') return 'justify-end text-right';
  return 'justify-start text-left';
}

function getPaddingStyle(block: Block) {
  return {
    padding: `${block.paddingY ?? DEFAULT_PADDING_Y}px ${block.paddingX ?? DEFAULT_PADDING_X}px`,
  };
}

export default function CampaignBlocksEditor({
  value,
  onChange,
}: {
  value?: Block[];
  onChange?: (blocks: Block[], html?: string) => void;
}) {
  const [blocks, setBlocks] = React.useState<Block[]>(
    value?.length ? value : [createBlock('text')],
  );
  const [selectedBlockId, setSelectedBlockId] = React.useState<string>(blocks[0]?.id || '');
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>('desktop');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>(TEMPLATE_LIBRARY[0]);
  const [customHtml, setCustomHtml] = React.useState('');

  React.useEffect(() => {
    const html = blocks
      .map((block) => {
        const alignment = block.alignment || DEFAULT_ALIGNMENT;
        const alignStyle =
          alignment === 'center' ? 'center' : alignment === 'right' ? 'right' : 'left';
        const paddingY = block.paddingY ?? DEFAULT_PADDING_Y;
        const paddingX = block.paddingX ?? DEFAULT_PADDING_X;
        const wrapperStyle = `padding:${paddingY}px ${paddingX}px;text-align:${alignStyle};`;

        if (block.type === 'text') {
          return `<div style="${wrapperStyle}"><p>${escapeHtml(block.content || '').replace(/\n/g, '<br/>')}</p></div>`;
        }

        if (block.type === 'image') {
          return `<div style="${wrapperStyle}"><img src="${escapeHtml(block.content || '')}" alt="image" style="max-width:100%;border-radius:12px;"/></div>`;
        }

        if (block.type === 'button') {
          return `<div style="${wrapperStyle}"><a href="#" style="display:inline-block;padding:12px 18px;border-radius:12px;text-decoration:none;background:#136e00;color:#fff;font-weight:700;">${escapeHtml(block.content || 'Bouton')}</a></div>`;
        }

        if (block.type === 'product') {
          return `<div style="${wrapperStyle}"><div style="border:1px solid #e5e7eb;border-radius:16px;padding:16px;background:#fff;text-align:${alignStyle};"><div style="height:180px;background:#f8faf7;border-radius:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;color:#6b7280;">Produit</div><strong style="display:block;margin-bottom:4px;">${escapeHtml(block.content || 'Produit vedette')}</strong><span style="color:#136e00;font-weight:700;">Découvrir</span></div></div>`;
        }

        if (block.type === 'social') {
          return `<div style="${wrapperStyle}"><p style="letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;font-size:12px;">${escapeHtml(block.content || 'Instagram · Facebook · WhatsApp')}</p></div>`;
        }

        if (block.type === 'html') {
          return `<div style="${wrapperStyle}">${block.content || ''}</div>`;
        }

        return `<div style="${wrapperStyle}"><hr style="border:none;border-top:1px solid #d1d5db;"/></div>`;
      })
      .join('\n');

    onChange?.(blocks, html);
  }, [blocks, onChange]);

  function addBlock(type: BlockType) {
    setBlocks((current) => [...current, createBlock(type)]);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    );
  }

  function updateSelectedBlock(patch: Partial<Block>) {
    if (!selectedBlockId) return;
    updateBlock(selectedBlockId, patch);
  }

  function removeBlock(id: string) {
    setBlocks((current) => {
      const next = current.filter((block) => block.id !== id);
      if (selectedBlockId === id) {
        setSelectedBlockId(next[0]?.id || '');
      }
      return next;
    });
  }

  function move(id: string, dir: 'up' | 'down') {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      if (index === -1) return current;
      const targetIndex =
        dir === 'up' ? Math.max(0, index - 1) : Math.min(current.length - 1, index + 1);
      const copy = current.slice();
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  }

  function insertVariable(id: string, variable: string) {
    const currentContent = blocks.find((block) => block.id === id)?.content || '';
    updateBlock(id, { content: `${currentContent}{{${variable}}}` });
  }

  function applyTemplate() {
    const next = createTemplateBlocks(selectedTemplate);
    setBlocks(next);
    setSelectedBlockId(next[0]?.id || '');
  }

  function importCustomHtml() {
    const trimmed = customHtml.trim();
    if (!trimmed) return;
    const htmlBlock: Block = {
      ...createBlock('html'),
      content: trimmed,
    };
    setBlocks([htmlBlock]);
    setSelectedBlockId(htmlBlock.id);
  }

  function renderBlockPreview(block: Block, isSelected: boolean, index: number) {
    const alignment = block.alignment || DEFAULT_ALIGNMENT;
    const isMobile = previewMode === 'mobile';
    const containerClass = `relative w-full rounded-xl border transition-colors ${isSelected ? 'border-[rgba(19,110,0,0.35)]' : 'border-transparent'}`;

    return (
      <button
        key={block.id}
        type="button"
        onClick={() => setSelectedBlockId(block.id)}
        className={`group block w-full border-b border-[var(--border)] text-left transition-colors ${isSelected ? 'bg-[rgba(46,200,10,0.08)]' : 'hover:bg-[rgba(46,200,10,0.04)]'}`}
      >
        <div className={`flex ${getAlignmentClass(alignment)}`} style={getPaddingStyle(block)}>
          <div
            className={`${containerClass} ${isMobile && block.type === 'product' ? 'max-w-[320px]' : ''}`}
          >
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px]"
                onClick={(event) => {
                  event.stopPropagation();
                  move(block.id, 'up');
                }}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px]"
                onClick={(event) => {
                  event.stopPropagation();
                  move(block.id, 'down');
                }}
                disabled={index === blocks.length - 1}
              >
                ↓
              </button>
            </div>

            <div className="px-1 py-1">
              {block.type === 'text' && (
                <p className="text-[15px] leading-7 text-[var(--text-1)] whitespace-pre-wrap">
                  {block.content || 'Votre texte ici'}
                </p>
              )}

              {block.type === 'image' && (
                <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]">
                  <div className="flex h-44 items-center justify-center text-sm text-muted">
                    {block.content || 'Image à renseigner'}
                  </div>
                </div>
              )}

              {block.type === 'button' && (
                <div className="inline-flex rounded-xl bg-gradient-to-br from-[#136e00] to-[#2ec80a] px-5 py-3 text-sm font-bold text-white shadow-sm">
                  {block.content || 'Bouton'}
                </div>
              )}

              {block.type === 'product' && (
                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                  <div className="mb-3 flex h-40 items-center justify-center rounded-xl bg-[var(--muted)] text-sm text-muted">
                    Visuel produit
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="text-sm font-semibold text-[var(--text-1)]">
                      {block.content || 'Produit vedette | 189 FCFA'}
                    </div>
                    <div className="text-sm font-bold text-[#136e00]">Découvrir</div>
                  </div>
                </div>
              )}

              {block.type === 'social' && (
                <div className="text-xs uppercase tracking-[0.2em] text-muted">
                  {block.content || 'Instagram · Facebook · WhatsApp'}
                </div>
              )}

              {block.type === 'html' && (
                <div
                  className="rounded-xl border border-[var(--border)] p-3 text-sm"
                  dangerouslySetInnerHTML={{
                    __html: block.content || '<p>HTML vide</p>',
                  }}
                />
              )}

              {block.type === 'separator' && <hr className="border-t border-[var(--border)]" />}
            </div>
          </div>
        </div>
      </button>
    );
  }

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) || null;

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="card space-y-4">
        <div>
          <h3 className="font-semibold">Blocs de contenu</h3>
          <p className="text-xs text-muted mt-1">Choisissez un bloc ou ajoutez-en un nouveau.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-outline" onClick={() => addBlock('text')}>
            Texte
          </button>
          <button type="button" className="btn-outline" onClick={() => addBlock('image')}>
            Image
          </button>
          <button type="button" className="btn-outline" onClick={() => addBlock('button')}>
            Bouton
          </button>
          <button type="button" className="btn-outline" onClick={() => addBlock('product')}>
            Produit
          </button>
          <button type="button" className="btn-outline" onClick={() => addBlock('social')}>
            Social
          </button>
          <button type="button" className="btn-outline" onClick={() => addBlock('separator')}>
            Séparateur
          </button>
          <button type="button" className="btn-outline" onClick={() => addBlock('html')}>
            HTML
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted">
            Templates (20+)
          </div>
          <select
            className="input"
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value)}
          >
            {TEMPLATE_LIBRARY.map((template) => (
              <option key={template} value={template}>
                {template}
              </option>
            ))}
          </select>
          <button type="button" className="btn-outline w-full" onClick={applyTemplate}>
            Appliquer le template
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted">
            Import HTML custom
          </div>
          <textarea
            className="textarea"
            rows={4}
            value={customHtml}
            onChange={(event) => setCustomHtml(event.target.value)}
            placeholder="Collez votre HTML ici"
          />
          <button type="button" className="btn-outline w-full" onClick={importCustomHtml}>
            Importer HTML
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-muted">
          Astuce: cliquez sur un bloc dans l’aperçu pour l’éditer dans le panneau de droite.
        </div>
      </aside>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <div className="text-sm font-semibold">Aperçu</div>
            <div className="text-xs text-muted">Basculez entre rendu desktop et mobile.</div>
          </div>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--muted)] p-1">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md ${previewMode === 'desktop' ? 'bg-[var(--surface)] shadow-sm text-[var(--text-1)]' : 'text-muted'}`}
              onClick={() => setPreviewMode('desktop')}
            >
              Desktop
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm rounded-md ${previewMode === 'mobile' ? 'bg-[var(--surface)] shadow-sm text-[var(--text-1)]' : 'text-muted'}`}
              onClick={() => setPreviewMode('mobile')}
            >
              Mobile
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface)_0%,#fbfdf8_100%)] p-4 shadow-sm">
          <div
            className={`mx-auto overflow-hidden rounded-2xl border border-[var(--border)] bg-white ${previewMode === 'mobile' ? 'max-w-[390px] shadow-lg' : 'max-w-[900px]'}`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-xs text-muted">
              <span>Prévisualisation {previewMode === 'mobile' ? 'mobile' : 'desktop'}</span>
              <span>
                {blocks.length} bloc{blocks.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="bg-white">
              {blocks.map((block, index) =>
                renderBlockPreview(block, block.id === selectedBlockId, index),
              )}

              {blocks.length === 0 && (
                <div className="p-8 text-center text-sm text-muted">
                  Aucun bloc. Ajoutez-en depuis la palette à gauche.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside className="card space-y-4">
        <div>
          <h3 className="font-semibold">Propriétés du bloc</h3>
          <p className="text-xs text-muted mt-1">
            {selectedBlock ? `Bloc ${selectedBlock.type}` : 'Sélectionnez un bloc pour l’éditer.'}
          </p>
        </div>

        {!selectedBlock && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-3 text-sm text-muted">
            Aucun bloc sélectionné.
          </div>
        )}

        {selectedBlock && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted">
                Alignement
              </label>
              <select
                className="input"
                value={selectedBlock.alignment || DEFAULT_ALIGNMENT}
                onChange={(event) =>
                  updateSelectedBlock({ alignment: event.target.value as BlockAlignment })
                }
              >
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted">
                Padding vertical: {selectedBlock.paddingY ?? DEFAULT_PADDING_Y}px
              </label>
              <input
                className="w-full"
                type="range"
                min="0"
                max="80"
                value={selectedBlock.paddingY ?? DEFAULT_PADDING_Y}
                onChange={(event) => updateSelectedBlock({ paddingY: Number(event.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted">
                Padding horizontal: {selectedBlock.paddingX ?? DEFAULT_PADDING_X}px
              </label>
              <input
                className="w-full"
                type="range"
                min="0"
                max="80"
                value={selectedBlock.paddingX ?? DEFAULT_PADDING_X}
                onChange={(event) => updateSelectedBlock({ paddingX: Number(event.target.value) })}
              />
            </div>

            {selectedBlock.type === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Contenu texte
                </label>
                <textarea
                  className="textarea"
                  rows={5}
                  value={selectedBlock.content || ''}
                  onChange={(event) => updateSelectedBlock({ content: event.target.value })}
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm">Variable</label>
                  <select
                    className="input"
                    onChange={(event) => insertVariable(selectedBlock.id, event.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      --
                    </option>
                    <option value="prénom">prénom</option>
                    <option value="boutique">boutique</option>
                    <option value="code_promo">code_promo</option>
                  </select>
                </div>
              </div>
            )}

            {(selectedBlock.type === 'image' ||
              selectedBlock.type === 'button' ||
              selectedBlock.type === 'product' ||
              selectedBlock.type === 'social' ||
              selectedBlock.type === 'html') && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {selectedBlock.type === 'html' ? 'Code HTML' : 'Contenu'}
                </label>
                {selectedBlock.type === 'html' ? (
                  <textarea
                    className="textarea"
                    rows={6}
                    value={selectedBlock.content || ''}
                    onChange={(event) => updateSelectedBlock({ content: event.target.value })}
                    placeholder="<div>Votre HTML</div>"
                  />
                ) : (
                  <input
                    className="input"
                    value={selectedBlock.content || ''}
                    onChange={(event) => updateSelectedBlock({ content: event.target.value })}
                    placeholder={
                      selectedBlock.type === 'image'
                        ? 'URL de l’image'
                        : selectedBlock.type === 'button'
                          ? 'Texte du bouton'
                          : selectedBlock.type === 'product'
                            ? 'Nom du produit et prix'
                            : 'Canaux sociaux'
                    }
                  />
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-sm btn-danger"
                onClick={() => removeBlock(selectedBlock.id)}
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </aside>

      <div className="xl:col-span-3">
        <div className="mt-4">
          <div className="font-semibold">Aperçu HTML</div>
          <div
            className="border p-3 mt-2 bg-white rounded-xl"
            dangerouslySetInnerHTML={{
              __html: blocks
                .map((block) => {
                  const alignment = block.alignment || DEFAULT_ALIGNMENT;
                  const alignStyle =
                    alignment === 'center' ? 'center' : alignment === 'right' ? 'right' : 'left';
                  const paddingY = block.paddingY ?? DEFAULT_PADDING_Y;
                  const paddingX = block.paddingX ?? DEFAULT_PADDING_X;
                  const wrapperStyle = `padding:${paddingY}px ${paddingX}px;text-align:${alignStyle};`;

                  if (block.type === 'text') {
                    return `<div style="${wrapperStyle}"><p>${escapeHtml(block.content || '').replace(/\n/g, '<br/>')}</p></div>`;
                  }

                  if (block.type === 'image') {
                    return `<div style="${wrapperStyle}"><img src="${escapeHtml(block.content || '')}" alt="image" style="max-width:100%;border-radius:12px;"/></div>`;
                  }

                  if (block.type === 'button') {
                    return `<div style="${wrapperStyle}"><a href="#" style="display:inline-block;padding:12px 18px;border-radius:12px;text-decoration:none;background:#136e00;color:#fff;font-weight:700;">${escapeHtml(block.content || 'Bouton')}</a></div>`;
                  }

                  if (block.type === 'product') {
                    return `<div style="${wrapperStyle}"><div style="border:1px solid #e5e7eb;border-radius:16px;padding:16px;background:#fff;text-align:${alignStyle};"><div style="height:180px;background:#f8faf7;border-radius:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;color:#6b7280;">Produit</div><strong style="display:block;margin-bottom:4px;">${escapeHtml(block.content || 'Produit vedette')}</strong><span style="color:#136e00;font-weight:700;">Découvrir</span></div></div>`;
                  }

                  if (block.type === 'social') {
                    return `<div style="${wrapperStyle}"><p style="letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;font-size:12px;">${escapeHtml(block.content || 'Instagram · Facebook · WhatsApp')}</p></div>`;
                  }

                  if (block.type === 'html') {
                    return `<div style="${wrapperStyle}">${block.content || ''}</div>`;
                  }

                  return `<div style="${wrapperStyle}"><hr style="border:none;border-top:1px solid #d1d5db;"/></div>`;
                })
                .join('\n'),
            }}
          />
        </div>
      </div>
    </div>
  );
}
