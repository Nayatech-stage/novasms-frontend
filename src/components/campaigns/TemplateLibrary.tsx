import type { FC } from 'react';
import { useState } from 'react';
import { EMAIL_TEMPLATES, type EmailTemplate } from '@/types/email-templates';

interface TemplateLibraryProps {
  onTemplateSelect: (template: EmailTemplate) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Tous les modèles' },
  { id: 'bienvenue', label: 'Bienvenue' },
  { id: 'promo', label: 'Promotions' },
  { id: 'newsletter', label: 'Newsletters' },
  { id: 'panier', label: 'Panier Abandonné' },
  { id: 'reengagement', label: 'Réengagement' },
  { id: 'anniversaire', label: 'Anniversaire' },
  { id: 'seasonal', label: 'Saisonnier' },
  { id: 'service', label: 'Service' },
];

/**
 * Template Library Component
 * Affiche 14+ templates prêts à l'emploi pour les emails
 */
export const TemplateLibrary: FC<TemplateLibraryProps> = ({ onTemplateSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = EMAIL_TEMPLATES.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-8 py-12 space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-headline font-black text-3xl text-on-surface mb-2">
          Bibliothèque de Templates
        </h2>
        <p className="text-on-surface-variant">
          {filteredTemplates.length} modèles prêts à l'emploi - Personnalisez et utilisez
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/20">
        <span className="material-symbols-outlined text-on-surface-variant">search</span>
        <input
          type="text"
          placeholder="Chercher un modèle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => onTemplateSelect(template)}
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 hover:border-primary/50 transition-all overflow-hidden cursor-pointer group hover:shadow-lg hover:scale-105"
          >
            {/* Thumbnail / Preview */}
            <div className="h-40 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                <div className="w-full h-full bg-[linear-gradient(45deg,#transparent_25%,#fff_25%,#fff_50%,#transparent_50%,#transparent_75%,#fff_75%,#fff)] bg-[length:20px_20px]" />
              </div>
              <span className="material-symbols-outlined text-4xl text-primary/40 group-hover:scale-110 transition-transform">
                {template.category === 'bienvenue'
                  ? 'favorite'
                  : template.category === 'promo'
                    ? 'local_offer'
                    : template.category === 'panier'
                      ? 'shopping_cart'
                      : template.category === 'newsletter'
                        ? 'mail'
                        : template.category === 'reengagement'
                          ? 'person_add'
                          : template.category === 'anniversaire'
                            ? 'cake'
                            : template.category === 'seasonal'
                              ? 'celebration'
                              : 'done'}
              </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
                  {CATEGORIES.find((c) => c.id === template.category)?.label}
                </p>
                <h3 className="font-headline font-bold text-sm text-on-surface mt-1">
                  {template.name}
                </h3>
              </div>

              {/* Subject Preview */}
              <p className="text-xs text-on-surface-variant line-clamp-2 font-mono bg-surface-container rounded px-2 py-1.5">
                {template.content.subject}
              </p>

              {/* Action Button */}
              <button className="w-full py-2 px-3 bg-primary/10 text-primary font-bold rounded-lg text-sm hover:bg-primary hover:text-on-primary transition-colors group-hover:opacity-100 opacity-75">
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">add</span>
                  Utiliser ce modèle
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-4">
            mail_outline
          </span>
          <p className="text-on-surface-variant">Aucun modèle trouvé</p>
        </div>
      )}

      {/* Stats */}
      <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20 text-center">
        <p className="text-sm text-on-surface-variant">
          Total: <strong className="text-on-surface">{EMAIL_TEMPLATES.length} templates</strong> •
          Catégorisés • Adaptés mobile
        </p>
      </div>
    </div>
  );
};

export default TemplateLibrary;
