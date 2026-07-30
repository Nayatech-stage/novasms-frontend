import type { FC } from 'react';
import { useMemo, useState, useCallback } from 'react';
import { EMAIL_TEMPLATES, type EmailTemplate } from '@/types/email-templates';
import { blocksToHtml } from '@/lib/blocksToHtml';

interface TemplatePreviewLibraryProps {
  onUseTemplate: (template: EmailTemplate) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Tous',
  bienvenue: 'Bienvenue',
  promo: 'Promotions',
  newsletter: 'Newsletter',
  panier: 'Panier abandonné',
  reengagement: 'Réengagement',
  anniversaire: 'Anniversaire',
  seasonal: 'Saisonnier',
  service: 'Service',
};

const CATEGORY_ICONS: Record<string, string> = {
  all: 'apps',
  bienvenue: 'waving_hand',
  promo: 'local_offer',
  newsletter: 'newspaper',
  panier: 'shopping_cart',
  reengagement: 'favorite',
  anniversaire: 'cake',
  seasonal: 'wb_sunny',
  service: 'support_agent',
};

const TemplateThumbnail: FC<{ template: EmailTemplate; size?: 'sm' | 'lg' }> = ({
  template,
  size = 'sm',
}) => {
  const html = useMemo(
    () => blocksToHtml(template.content.blocks, template.content.subject),
    [template],
  );
  const scale = size === 'sm' ? 0.22 : 0.52;
  const iframeW = 600;
  const iframeH = size === 'sm' ? 340 : 620;
  const containerH = Math.round(iframeH * scale);

  return (
    <div
      style={{
        width: '100%',
        height: containerH,
        overflow: 'hidden',
        borderRadius: 8,
        background: '#f7f9f6',
        position: 'relative',
      }}
    >
      <iframe
        title={`Aperçu ${template.name}`}
        srcDoc={html}
        sandbox="allow-same-origin"
        scrolling="no"
        style={{
          width: `${iframeW}px`,
          height: `${iframeH}px`,
          border: 'none',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export const TemplatePreviewLibrary: FC<TemplatePreviewLibraryProps> = ({ onUseTemplate }) => {
  const [selectedId, setSelectedId] = useState<string>(EMAIL_TEMPLATES[0]?.id ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(EMAIL_TEMPLATES.map((t) => t.category)));
    return ['all', ...cats];
  }, []);

  const filteredTemplates = useMemo(
    () =>
      EMAIL_TEMPLATES.filter((t) => {
        const matchesSearch =
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.content.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
        return matchesSearch && matchesCategory;
      }),
    [searchTerm, activeCategory],
  );

  const selectedTemplate = useMemo(
    () => EMAIL_TEMPLATES.find((t) => t.id === selectedId) ?? filteredTemplates[0],
    [selectedId, filteredTemplates],
  );

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  return (
    <div className="space-y-6">
      <div className="space-y-1 px-8">
        <h2 className="font-headline font-black text-2xl text-on-surface">
          Bibliothèque de modèles ({EMAIL_TEMPLATES.length})
        </h2>
        <p className="text-on-surface-variant text-sm">
          Choisissez un modèle prêt à l'emploi. Les variables <code>{'{{prénom}}'}</code>,{' '}
          <code>{'{{boutique}}'}</code>, <code>{'{{code_promo}}'}</code> sont remplacées
          automatiquement.
        </p>
      </div>

      {/* Search */}
      <div className="px-8">
        <div className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/20">
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 20 }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Chercher un modèle ou objet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-8 flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeCategory === cat
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              {CATEGORY_ICONS[cat] ?? 'label'}
            </span>
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Grid + preview */}
      <div className="px-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Cards */}
        <div>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl">search_off</span>
              <p className="mt-2 text-sm">Aucun modèle trouvé</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-primary text-sm font-bold"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const isSelected = template.id === selectedTemplate?.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template.id)}
                    className={`text-left rounded-2xl border-2 overflow-hidden transition-all group ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10'
                        : 'border-outline-variant/20 hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative">
                      <TemplateThumbnail template={template} size="sm" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <span
                              className="material-symbols-outlined text-on-primary"
                              style={{ fontSize: 18 }}
                            >
                              check
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3 bg-surface-container-lowest">
                      <div className="flex items-center gap-1 mb-1">
                        <span
                          className="material-symbols-outlined text-primary"
                          style={{ fontSize: 11 }}
                        >
                          {CATEGORY_ICONS[template.category] ?? 'label'}
                        </span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                          {CATEGORY_LABELS[template.category] ?? template.category}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-on-surface leading-tight">
                        {template.name}
                      </p>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                        {template.content.subject}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {selectedTemplate && (
          <div className="sticky top-4 space-y-3">
            <div className="rounded-2xl border border-outline-variant/20 overflow-hidden bg-surface-container-lowest">
              <div className="p-4 flex items-start justify-between gap-3 border-b border-outline-variant/10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                    Aperçu en direct
                  </p>
                  <h3 className="font-bold text-base text-on-surface mt-0.5">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                    {selectedTemplate.content.subject}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUseTemplate(selectedTemplate)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all shadow-sm shadow-primary/20"
                >
                  Utiliser →
                </button>
              </div>

              <div className="p-3 bg-surface-container">
                <TemplateThumbnail template={selectedTemplate} size="lg" />
              </div>

              <div className="p-4 border-t border-outline-variant/10 space-y-2">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Variables
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['{{prénom}}', '{{boutique}}', '{{code_promo}}'].map((v) => (
                    <code
                      key={v}
                      className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono"
                    >
                      {v}
                    </code>
                  ))}
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {selectedTemplate.content.blocks.length} bloc
                  {selectedTemplate.content.blocks.length > 1 ? 's' : ''} · Catégorie :{' '}
                  {CATEGORY_LABELS[selectedTemplate.category] ?? selectedTemplate.category}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUseTemplate(selectedTemplate)}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 transition-all shadow-md shadow-primary/20"
            >
              Utiliser ce modèle
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
