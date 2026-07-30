import type { FC } from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  segmentsApi,
  type Segment,
  type SegmentCriteria,
  type SegmentFilter,
} from '@/api/segmentsApi';

const FIELD_LABELS: Record<string, string> = {
  tags: 'Tags',
  country: 'Pays',
  city: 'Ville',
  createdAt: "Date d'ajout",
  lastPurchase: 'Dernier achat',
  openRate: "Taux d'ouverture",
};

const OP_LABELS: Record<string, string> = {
  contains: 'contient',
  eq: '=',
  neq: '≠',
  gte: '≥',
  lte: '≤',
  in: 'dans',
};

const EMPTY_CRITERIA: SegmentCriteria = { operator: 'AND', filters: [] };

function ensureCriteria(criteria?: SegmentCriteria | null): SegmentCriteria {
  return {
    operator: criteria?.operator === 'OR' ? 'OR' : 'AND',
    filters: Array.isArray(criteria?.filters) ? criteria.filters : [],
  };
}

const FilterRow: FC<{
  filter: SegmentFilter;
  index: number;
  onChange: (index: number, f: SegmentFilter) => void;
  onRemove: (index: number) => void;
}> = ({ filter, index, onChange, onRemove }) => (
  <div className="flex items-center gap-3 bg-surface-container rounded-xl p-3">
    <select
      value={filter.field}
      onChange={(e) =>
        onChange(index, { ...filter, field: e.target.value as SegmentFilter['field'] })
      }
      className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface"
    >
      {Object.entries(FIELD_LABELS).map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
    <select
      value={filter.op}
      onChange={(e) => onChange(index, { ...filter, op: e.target.value as SegmentFilter['op'] })}
      className="w-24 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface"
    >
      {Object.entries(OP_LABELS).map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
    <input
      type="text"
      value={Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
      onChange={(e) => onChange(index, { ...filter, value: e.target.value })}
      placeholder="Valeur..."
      className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface"
    />
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="text-on-surface-variant hover:text-error transition-colors"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        delete
      </span>
    </button>
  </div>
);

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Builder state
  const [segName, setSegName] = useState('');
  const [criteria, setCriteria] = useState<SegmentCriteria>(EMPTY_CRITERIA);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSegments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await segmentsApi.list();
      setSegments(data);
    } catch {
      setError('Impossible de charger les segments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSegments();
  }, [loadSegments]);

  // Auto-preview quand les critères changent
  useEffect(() => {
    if (!showBuilder || criteria.filters.length === 0) {
      setPreviewCount(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const count = await segmentsApi.previewCount(criteria);
        setPreviewCount(count);
      } catch {
        setPreviewCount(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [criteria, showBuilder]);

  const addFilter = () => {
    setCriteria((prev) => ({
      ...prev,
      filters: [...prev.filters, { field: 'tags', op: 'contains', value: '' }],
    }));
  };

  const updateFilter = (index: number, f: SegmentFilter) => {
    setCriteria((prev) => {
      const next = [...prev.filters];
      next[index] = f;
      return { ...prev, filters: next };
    });
  };

  const removeFilter = (index: number) => {
    setCriteria((prev) => ({ ...prev, filters: prev.filters.filter((_, i) => i !== index) }));
  };

  const openNew = () => {
    setEditingId(null);
    setSegName('');
    setCriteria(EMPTY_CRITERIA);
    setPreviewCount(null);
    setError('');
    setShowBuilder(true);
  };

  const openEdit = (seg: Segment) => {
    setEditingId(seg.id);
    setSegName(seg.name);
    setCriteria(ensureCriteria(seg.criteria));
    setPreviewCount(seg.contactCount);
    setError('');
    setShowBuilder(true);
  };

  const handleSave = async () => {
    if (!segName.trim()) {
      setError('Le nom du segment est requis');
      return;
    }
    try {
      setSaving(true);
      setError('');
      if (editingId) {
        await segmentsApi.update(editingId, { name: segName.trim(), criteria });
      } else {
        await segmentsApi.create(segName.trim(), criteria);
      }
      setShowBuilder(false);
      await loadSegments();
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce segment ?')) return;
    try {
      await segmentsApi.remove(id);
      setSegments((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError('Impossible de supprimer le segment');
    }
  };

  return (
    <div className="content">
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline font-black text-3xl text-on-surface">
              Segments dynamiques
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Créez des groupes de contacts mis à jour automatiquement selon vos critères.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 transition-all shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Nouveau segment
          </button>
        </div>

        {error && (
          <div
            className="rounded-xl bg-error/10 border border-error/20 p-4 text-sm"
            style={{ color: '#dc2626' }}
          >
            {error}
          </div>
        )}

        {/* Segment Builder */}
        {showBuilder && (
          <div className="rounded-2xl border-2 border-primary/20 bg-surface-container-lowest p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-on-surface">
                {editingId ? 'Modifier le segment' : 'Nouveau segment'}
              </h2>
              <button
                type="button"
                onClick={() => setShowBuilder(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Nom du segment
              </label>
              <input
                type="text"
                value={segName}
                onChange={(e) => setSegName(e.target.value)}
                placeholder="Ex : VIP Abidjan, Nouveaux inscrits..."
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Opérateur */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-on-surface-variant">Combiner les filtres avec</span>
              {(['AND', 'OR'] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setCriteria((prev) => ({ ...prev, operator: op }))}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    criteria.operator === op
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {op === 'AND' ? 'ET' : 'OU'}
                </button>
              ))}
            </div>

            {/* Filtres */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Critères
              </label>
              {criteria.filters.length === 0 && (
                <p className="text-sm text-on-surface-variant italic">
                  Aucun filtre — ce segment contiendra tous les contacts actifs.
                </p>
              )}
              {criteria.filters.map((f, i) => (
                <FilterRow
                  key={i}
                  filter={f}
                  index={i}
                  onChange={updateFilter}
                  onRemove={removeFilter}
                />
              ))}
              <button
                type="button"
                onClick={addFilter}
                className="flex items-center gap-2 text-primary text-sm font-bold hover:underline"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  add_circle
                </span>
                Ajouter un filtre
              </button>
            </div>

            {/* Preview count */}
            <div className="flex items-center gap-4 p-4 bg-surface-container rounded-xl">
              <span className="material-symbols-outlined text-primary">people</span>
              <div>
                <p className="text-xs text-on-surface-variant">
                  Contacts correspondants (temps réel)
                </p>
                <p className="text-2xl font-black text-on-surface">
                  {previewLoading ? (
                    <span className="text-on-surface-variant text-base">Calcul...</span>
                  ) : previewCount !== null ? (
                    previewCount.toLocaleString('fr-FR')
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#dc2626' }}>
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowBuilder(false)}
                className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors text-sm font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : editingId ? 'Mettre à jour' : 'Créer le segment'}
              </button>
            </div>
          </div>
        )}

        {/* Liste des segments */}
        {loading ? (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl animate-spin">refresh</span>
            <p className="mt-2 text-sm">Chargement des segments...</p>
          </div>
        ) : segments.length === 0 && !showBuilder ? (
          <div className="text-center py-16 space-y-4">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant">
              group_work
            </span>
            <p className="text-on-surface-variant">Aucun segment créé pour le moment.</p>
            <button
              type="button"
              onClick={openNew}
              className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 transition-all"
            >
              Créer mon premier segment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => {
              const safeCriteria = ensureCriteria(segment.criteria);
              const createdLabel = segment.createdAt
                ? new Date(segment.createdAt).toLocaleDateString('fr-FR')
                : 'Récemment';

              return (
                <div
                  key={segment.id}
                  className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 space-y-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface truncate">{segment.name}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {safeCriteria.filters.length} filtre
                        {safeCriteria.filters.length !== 1 ? 's' : ''} · {safeCriteria.operator}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(segment)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                        title="Modifier"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          edit
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(segment.id)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error transition-colors"
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          delete
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontSize: 20 }}
                    >
                      people
                    </span>
                    <div>
                      <p className="text-xs text-on-surface-variant">Contacts</p>
                      <p className="text-xl font-black text-on-surface">
                        {segment.contactCount.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {safeCriteria.filters.slice(0, 3).map((f, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-mono"
                      >
                        {FIELD_LABELS[f.field] ?? f.field} {OP_LABELS[f.op] ?? f.op}{' '}
                        {Array.isArray(f.value) ? f.value.join(', ') : f.value}
                      </span>
                    ))}
                    {safeCriteria.filters.length > 3 && (
                      <span className="text-[11px] px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full">
                        +{safeCriteria.filters.length - 3} autres
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-on-surface-variant">Créé le {createdLabel}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
