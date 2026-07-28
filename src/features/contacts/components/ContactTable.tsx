import { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/** Normalise le champ tags : Prisma Json? peut arriver en tableau OU en string JSON */
function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string' && raw.startsWith('[')) {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      /* ignore */
    }
  }
  return [];
}
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Mail,
  Phone,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  X,
  Download,
  Trash2,
  FileDown,
} from 'lucide-react';
import ExportModal from './ExportModal';
import { useAuthStore } from '@/stores/authStore';
import { contactsApi } from '@/api/contacts';
import type {
  Contact,
  ContactFilter,
  SegmentCriterion,
  SegmentLogic,
  SegmentWithContacts,
} from '../types/contact';

// Composant inline pour la vue détail d'un segment avec barre de recherche
function SegmentDetail({
  segment,
  onEdit,
  onRemove,
  formatFormula,
}: {
  segment: SegmentWithContacts;
  onEdit: (s: SegmentWithContacts) => void;
  onRemove: (s: SegmentWithContacts) => void;
  formatFormula: (c: SegmentWithContacts['criteria']) => string;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q
    ? segment.contacts.filter(
        (c) =>
          `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q),
      )
    : segment.contacts;

  return (
    <details className="group rounded-lg border border-outline-variant/40 bg-background/50">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-on-surface">
        <div className="flex flex-col">
          <span>{segment.name || 'Sans nom'}</span>
          <span className="text-xs font-normal text-on-surface-variant">
            {formatFormula(segment.criteria)}
          </span>
        </div>
        <span className="text-xs text-on-surface-variant">
          {segment.contactCount} contact{segment.contactCount > 1 ? 's' : ''}
        </span>
      </summary>
      <div className="border-t border-outline-variant/40 px-4 py-3 space-y-3">
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(segment)}
            className="rounded-md border border-outline-variant/40 px-2.5 py-1 text-xs font-semibold text-on-surface hover:bg-surface"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={() => onRemove(segment)}
            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
        {/* Barre de recherche locale */}
        {segment.contacts.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher dans ce segment…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-outline-variant/30 bg-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        )}
        {/* Liste des contacts */}
        {visible.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-3 gap-1 pb-1 border-b border-outline-variant/20 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
              <span>Nom</span>
              <span>Email</span>
              <span>Téléphone</span>
            </div>
            {visible.map((contact) => (
              <div
                key={contact.id}
                className="grid grid-cols-1 gap-1 text-xs text-on-surface-variant md:grid-cols-3 py-0.5"
              >
                <span className="text-on-surface font-medium">
                  {(contact.firstName || '-') + ' ' + (contact.lastName || '-')}
                </span>
                <span>{contact.email || '-'}</span>
                <span>{contact.phone || '-'}</span>
              </div>
            ))}
            {q && visible.length < segment.contacts.length && (
              <p className="text-[10px] text-on-surface-variant pt-1">
                {visible.length} / {segment.contacts.length} contacts
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant">
            {q ? `Aucun contact ne correspond à "${query}"` : 'Aucun contact dans ce segment.'}
          </p>
        )}
      </div>
    </details>
  );
}

type ContactTableProps = {
  onContactClick?: (contact: Contact) => void;
  onImportClick?: () => void;
  onAddContactClick?: () => void;
};

export default function ContactTable({
  onContactClick,
  onImportClick,
  onAddContactClick,
}: ContactTableProps) {
  const { accessToken } = useAuthStore();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState<ContactFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'tag' | 'location'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<
    Array<{ key: string; value: string; label: string }>
  >([]);
  const [segmentName, setSegmentName] = useState('Nouveau segment');
  const [segmentLogic, setSegmentLogic] = useState<SegmentLogic>('AND');
  const [segmentCriteria, setSegmentCriteria] = useState<SegmentCriterion[]>([
    { field: 'tag', operator: 'equals', value: '' },
  ]);
  const [previewCount, setPreviewCount] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewAbortRef = useRef<AbortController | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [savingSegment, setSavingSegment] = useState(false);
  const [segments, setSegments] = useState<SegmentWithContacts[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Ref pour le conteneur scrollable (virtualisation)
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Virtualizer — estime chaque ligne à ~56px
  const rowVirtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });

  // Debounce search query (500ms) to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatSegmentFormula = (criteria: SegmentWithContacts['criteria']) => {
    const payload = criteria as {
      logic?: string;
      rules?: Array<{ field?: string; operator?: string; value?: unknown }>;
    };
    const logic = payload?.logic === 'OR' ? 'OU' : 'ET';
    const rules = Array.isArray(payload?.rules) ? payload.rules : [];
    if (rules.length === 0) return 'Aucune condition';

    const fieldLabels: Record<string, string> = {
      tag: 'Tag',
      status: 'Statut',
      email: 'Email',
      phone: 'Téléphone',
      firstName: 'Prénom',
      lastName: 'Nom',
      location: 'Localisation',
      createdAt: 'Date création',
      lastPurchaseDate: 'Dernier achat',
    };

    const operatorLabels: Record<string, string> = {
      equals: 'égal à',
      contains: 'contient',
      gt: '>',
      lt: '<',
      gte: '>=',
      lte: '<=',
      in: 'dans',
      notIn: 'pas dans',
      notEquals: 'différent de',
    };

    const parts = rules.map((rule) => {
      const field = fieldLabels[rule.field || ''] || 'Champ';
      const operator = operatorLabels[rule.operator || ''] || 'contient';
      const value = Array.isArray(rule.value)
        ? rule.value.join(', ')
        : String(rule.value ?? '').trim();
      return `${field} ${operator} ${value || '-'}`;
    });

    return `${logic}: ${parts.join(` ${logic} `)}`;
  };

  // Fetch contacts avec pagination cursor-based (RG-53)
  const fetchContacts = useCallback(
    async (nextCursor?: string | null, reset: boolean = false) => {
      if (!accessToken) return;

      setIsLoading(true);
      try {
        const params: {
          limit: number;
          cursor?: string;
          search?: string;
          tag?: string;
          location?: string;
        } & ContactFilter = {
          limit: 20,
          ...(debouncedSearch && searchType === 'tag' && { tag: debouncedSearch }),
          ...(debouncedSearch && searchType === 'location' && { location: debouncedSearch }),
          ...(debouncedSearch && searchType === 'all' && { search: debouncedSearch }),
          ...filters,
        };

        if (nextCursor) params.cursor = nextCursor;

        const response = await contactsApi.list(params);

        if (reset) {
          setContacts(response.data);
        } else {
          setContacts((prev) => (nextCursor ? [...prev, ...response.data] : response.data));
        }

        setTotal(response.total);
        setCursor(response.nextCursor);
        setHasMore(!!response.nextCursor);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, filters, debouncedSearch, searchType],
  );

  // Initial load
  useEffect(() => {
    fetchContacts(null, true);
  }, [fetchContacts]);

  const loadSegments = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await contactsApi.listSegmentsWithContacts();
      setSegments(data);
    } catch {
      // Non bloquant pour le tableau contacts
    }
  }, [accessToken]);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  // Debounced preview avec AbortController (RG-52: Performance)
  useEffect(() => {
    // Annuler la requête précédente et le timeout
    if (previewAbortRef.current) {
      previewAbortRef.current.abort();
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Si aucun token, skip
    if (!accessToken) return;

    // Créer un nouveau AbortController pour cette requête
    const abortController = new AbortController();
    previewAbortRef.current = abortController;

    // Attendre 300ms avant de faire la requête (debounce)
    const timeout = setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const response = await contactsApi.previewSegment(segmentLogic, segmentCriteria);

        // Vérifier que cette requête n'a pas été annulée
        if (!abortController.signal.aborted) {
          setPreviewCount(response.count || 0);
        }
      } catch (error: unknown) {
        // Ignorer les erreurs d'annulation
        if (!abortController.signal.aborted) {
          const message = error instanceof Error ? error.message : 'Erreur de prévisualisation';
          console.warn('Preview error:', message);
          setPreviewCount(0);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsPreviewLoading(false);
        }
      }
    }, 300);

    previewTimeoutRef.current = timeout;

    // Cleanup
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [accessToken, segmentLogic, segmentCriteria]);

  // Handlers
  const handleNextPage = () => {
    if (hasMore && !isLoading && cursor) {
      fetchContacts(cursor, false);
    }
  };

  const handlePrevPage = () => {
    setCursor(null);
    fetchContacts(null, true);
  };

  const removeFilter = (key: string) => {
    setFilters((prev) => {
      const { [key as keyof ContactFilter]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
    setActiveFilters((prev) => prev.filter((f) => f.key !== key));
  };

  const clearAllFilters = () => {
    setFilters({});
    setActiveFilters([]);
    setSearchQuery('');
  };

  const toggleSelectContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.size === contacts.length && contacts.length > 0) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

    try {
      setIsDeleting(true);
      await contactsApi.delete(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSelectedContactIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setOpenMenuId(null);
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Erreur lors de la suppression du contact');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSelectedContacts = async () => {
    if (selectedContactIds.size === 0) return;
    if (
      !confirm(
        `Supprimer ${selectedContactIds.size} contact${selectedContactIds.size > 1 ? 's' : ''} définitivement ?`,
      )
    )
      return;

    try {
      setIsDeleting(true);
      await contactsApi.bulkDelete([...selectedContactIds]);
      setContacts((prev) => prev.filter((c) => !selectedContactIds.has(c.id)));
      setTotal((prev) => prev - selectedContactIds.size);
      setSelectedContactIds(new Set());
    } catch (error) {
      console.error('Failed to delete contacts:', error);
      alert('Erreur lors de la suppression des contacts');
    } finally {
      setIsDeleting(false);
    }
  };

  const updateCriterion = <K extends keyof SegmentCriterion>(
    index: number,
    key: K,
    value: SegmentCriterion[K],
  ) => {
    setSegmentCriteria((prev) =>
      prev.map((criterion, i) =>
        i === index
          ? {
              ...criterion,
              [key]: value,
            }
          : criterion,
      ),
    );
  };

  const addCriterion = () => {
    setSegmentCriteria((prev) => [...prev, { field: 'tag', operator: 'equals', value: '' }]);
  };

  const removeCriterion = (index: number) => {
    setSegmentCriteria((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const saveSegment = async () => {
    const name = segmentName.trim();
    if (!name) {
      setSegmentError('Le nom du segment est requis');
      return;
    }

    setSavingSegment(true);
    setSegmentError(null);
    try {
      const payload = {
        name,
        logic: segmentLogic,
        criteria: segmentCriteria,
      };
      const result = editingSegmentId
        ? await contactsApi.updateSegment(editingSegmentId, payload)
        : await contactsApi.createSegment(name, segmentLogic, segmentCriteria);

      await loadSegments();
      if (result?.segment?.id) {
        setSelectedSegmentId(result.segment.id);
        setEditingSegmentId(result.segment.id);
      }
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : error instanceof Error
            ? error.message
            : null;
      setSegmentError(message || 'Impossible de sauvegarder le segment');
    } finally {
      setSavingSegment(false);
    }
  };

  const applySegment = () => {
    if (!selectedSegmentId) return;
    const selected = segments.find((segment) => segment.id === selectedSegmentId);
    if (!selected) return;

    const criteriaObj = (selected.criteria || {}) as {
      logic?: SegmentLogic;
      rules?: SegmentCriterion[];
    };

    setSegmentLogic(criteriaObj.logic === 'OR' ? 'OR' : 'AND');
    setSegmentCriteria(
      Array.isArray(criteriaObj.rules) && criteriaObj.rules.length > 0
        ? criteriaObj.rules
        : [{ field: 'tag', operator: 'equals', value: '' }],
    );
    setSegmentName(selected.name || 'Segment');
    setEditingSegmentId(selected.id);
    setShowFilters(true);
  };

  const editSegment = (segment: SegmentWithContacts) => {
    const criteriaObj = (segment.criteria || {}) as {
      logic?: SegmentLogic;
      rules?: SegmentCriterion[];
    };

    setSelectedSegmentId(segment.id);
    setEditingSegmentId(segment.id);
    setSegmentName(segment.name || 'Segment');
    setSegmentLogic(criteriaObj.logic === 'OR' ? 'OR' : 'AND');
    setSegmentCriteria(
      Array.isArray(criteriaObj.rules) && criteriaObj.rules.length > 0
        ? criteriaObj.rules
        : [{ field: 'tag', operator: 'equals', value: '' }],
    );
    setShowFilters(true);
  };

  const removeSegment = async (segment: SegmentWithContacts) => {
    if (!confirm(`Supprimer le segment "${segment.name || 'Sans nom'}" ?`)) return;

    try {
      await contactsApi.deleteSegment(segment.id);
      await loadSegments();
      if (selectedSegmentId === segment.id) {
        setSelectedSegmentId('');
      }
      if (editingSegmentId === segment.id) {
        setEditingSegmentId(null);
        setSegmentName('Nouveau segment');
        setSegmentLogic('AND');
        setSegmentCriteria([{ field: 'tag', operator: 'equals', value: '' }]);
      }
      setSegmentError(null);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : error instanceof Error
            ? error.message
            : 'Impossible de supprimer le segment';
      setSegmentError(message || 'Impossible de supprimer le segment');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return '?';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Loading state
  if (isLoading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-on-surface-variant">Chargement des contacts...</span>
      </div>
    );
  }

  // Empty state — uniquement quand il n'y a vraiment aucun contact (pas de recherche active)
  const hasActiveSearch = debouncedSearch.length > 0 || Object.keys(filters).length > 0;
  if (contacts.length === 0 && !isLoading && !hasActiveSearch) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-50" />
        <p className="text-on-surface font-medium">Aucun contact trouvé</p>
        <p className="text-sm text-on-surface-variant mt-1 mb-4">
          Importez votre premier fichier CSV ou ajoutez un contact manuellement
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            id="tour-import-btn"
            onClick={onImportClick}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Importer CSV / XLS
          </button>
          <button
            onClick={onAddContactClick}
            className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un contact
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions - Conforme maquette */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="tour-import-btn"
            onClick={onImportClick}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Importer CSV / XLS
          </button>
          <button
            onClick={onAddContactClick}
            className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un contact
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2 text-sm font-medium"
            style={{ color: '#0c5460' }}
          >
            <FileDown className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={toggleSelectAll}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
              selectedContactIds.size > 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {selectedContactIds.size > 0
              ? `${selectedContactIds.size} sélectionné${selectedContactIds.size > 1 ? 's' : ''}`
              : 'Sélectionner'}
          </button>

          <button
            onClick={() => void deleteSelectedContacts()}
            disabled={selectedContactIds.size === 0 || isDeleting}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {selectedContactIds.size > 0 ? `Supprimer (${selectedContactIds.size})` : 'Supprimer'}
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80 flex">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'all' | 'tag' | 'location')}
            aria-label="Type de recherche"
            className="text-xs border border-r-0 border-outline-variant px-2 py-1 bg-surface rounded-l-lg rounded-r-none outline-none text-on-surface-variant focus:ring-2 focus:ring-primary/20 shrink-0"
          >
            <option value="all">Tous les champs</option>
            <option value="tag">Tag</option>
            <option value="location">Localisation</option>
          </select>
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              role="searchbox"
              aria-label="Rechercher un contact"
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-r-lg rounded-l-none border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Filters Bar - Conforme maquette contacts.html */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            showFilters || activeFilters.length > 0
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtres
          {activeFilters.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
              {activeFilters.length}
            </span>
          )}
        </button>

        {/* Active Filters Tags - Comme dans la maquette */}
        {activeFilters.map((filter) => (
          <span
            key={filter.key}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
          >
            {filter.label}
            <button
              onClick={() => removeFilter(filter.key)}
              className="hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {activeFilters.length > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-on-surface-variant hover:text-on-surface underline"
          >
            Effacer tout
          </button>
        )}

        <div className="flex-1" />

        {segments.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              data-testid="saved-segments-select"
              value={selectedSegmentId}
              onChange={(e) => setSelectedSegmentId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm"
            >
              <option value="">Segments sauvegardés</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {(segment.name || 'Sans nom') + ` (${segment.contactCount})`}
                </option>
              ))}
            </select>
            <button
              data-testid="apply-saved-segment-button"
              onClick={applySegment}
              disabled={!selectedSegmentId}
              className="px-3 py-2 rounded-lg border border-outline-variant text-sm disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        ) : null}

        <button
          data-testid="new-segment-button"
          onClick={() => {
            setShowFilters(true);
            setEditingSegmentId(null);
            setSegmentName('Nouveau segment');
            setSegmentLogic('AND');
            setSegmentCriteria([{ field: 'tag', operator: 'equals', value: '' }]);
            setSegmentError(null);
          }}
          className="px-4 py-2 text-primary font-medium rounded-lg hover:bg-primary/5 transition-colors text-sm"
        >
          + Nouveau segment
        </button>
      </div>

      {/* Filters Panel - Expandable comme maquette */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 rounded-xl border border-outline-variant bg-surface space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-on-surface">Créer un segment dynamique</p>
              <button
                data-testid="segment-save-button"
                className="text-sm text-primary font-medium hover:text-primary/80 disabled:opacity-50"
                onClick={() => void saveSegment()}
                disabled={savingSegment}
              >
                {savingSegment
                  ? 'Sauvegarde…'
                  : editingSegmentId
                    ? 'Enregistrer les modifications'
                    : 'Sauvegarder'}
              </button>
            </div>

            <input
              data-testid="segment-name-input"
              type="text"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              placeholder="Nom du segment"
            />

            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  data-testid="segment-logic-select"
                  value={segmentLogic}
                  onChange={(e) => setSegmentLogic(e.target.value as SegmentLogic)}
                  className="px-3 py-2 rounded-lg border border-outline-variant bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="AND">ET</option>
                  <option value="OR">OU</option>
                </select>
                <button
                  data-testid="segment-add-criterion-button"
                  className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  onClick={addCriterion}
                >
                  <Plus className="w-3 h-3" />
                  Ajouter un critère
                </button>
              </div>

              {segmentCriteria.map((criterion, index) => (
                <div
                  key={`${criterion.field}-${index}`}
                  className="flex items-center gap-3 flex-wrap"
                >
                  <select
                    value={criterion.field}
                    onChange={(e) =>
                      updateCriterion(index, 'field', e.target.value as SegmentCriterion['field'])
                    }
                    className="px-3 py-2 rounded-lg border border-outline-variant bg-background text-sm min-w-[150px]"
                  >
                    <option value="tag">Tag</option>
                    <option value="status">Statut</option>
                    <option value="email">Email</option>
                    <option value="phone">Téléphone</option>
                    <option value="firstName">Prénom</option>
                    <option value="lastName">Nom</option>
                  </select>

                  <select
                    value={criterion.operator}
                    onChange={(e) =>
                      updateCriterion(
                        index,
                        'operator',
                        e.target.value as SegmentCriterion['operator'],
                      )
                    }
                    className="px-3 py-2 rounded-lg border border-outline-variant bg-background text-sm min-w-[130px]"
                  >
                    <option value="equals">Égal à</option>
                    <option value="contains">Contient</option>
                  </select>

                  <input
                    value={criterion.value}
                    onChange={(e) => updateCriterion(index, 'value', e.target.value)}
                    className="px-3 py-2 rounded-lg border border-outline-variant bg-background text-sm min-w-[200px]"
                    placeholder="Valeur"
                  />

                  <button
                    className="text-xs text-on-surface-variant hover:text-on-surface"
                    onClick={() => removeCriterion(index)}
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>

            {/* Result count avec loading state (RG-52) */}
            <div className="pt-3 border-t border-outline-variant">
              <div className="flex items-center gap-2">
                {isPreviewLoading && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                <p className="text-sm text-on-surface-variant">
                  <span className="font-semibold text-on-surface">{previewCount}</span> contacts
                  correspondent
                </p>
              </div>
              {segmentError ? <p className="text-sm text-red-600 mt-2">{segmentError}</p> : null}
              {segments.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-on-surface-variant">Contacts par segment</p>
                  <div className="space-y-3">
                    {segments.map((segment) => (
                      <SegmentDetail
                        key={segment.id}
                        segment={segment}
                        onEdit={editSegment}
                        onRemove={(s) => void removeSegment(s)}
                        formatFormula={formatSegmentFormula}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table - Conforme maquette contacts.html */}
      <div
        ref={tableContainerRef}
        className="overflow-auto rounded-xl border border-outline-variant"
        style={{ maxHeight: '520px' }}
      >
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={selectedContactIds.size === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-outline-variant"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-on-surface">Nom</th>
              <th className="hidden md:table-cell px-4 py-3 text-left font-semibold text-on-surface">
                Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-on-surface">Téléphone</th>
              <th className="hidden sm:table-cell px-4 py-3 text-left font-semibold text-on-surface">
                Tags
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-left font-semibold text-on-surface">
                Ajouté le
              </th>
              <th className="px-4 py-3 text-left font-semibold text-on-surface">Statut</th>
              <th className="px-4 py-3 text-right font-semibold text-on-surface"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50">
            {/* Inline empty state quand une recherche/filtre est actif mais sans résultat */}
            {contacts.length === 0 && !isLoading && hasActiveSearch && (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Search className="w-8 h-8 text-on-surface-variant mx-auto mb-3 opacity-50" />
                  <p className="text-on-surface font-medium">Aucun résultat</p>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {debouncedSearch
                      ? `Aucun contact ne correspond à "${debouncedSearch}"`
                      : 'Aucun contact ne correspond aux filtres actifs'}
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Effacer la recherche
                  </button>
                </td>
              </tr>
            )}
            {/* Spacer haut pour la virtualisation */}
            {rowVirtualizer.getVirtualItems().length > 0 &&
              rowVirtualizer.getVirtualItems()[0].start > 0 && (
                <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
              )}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const contact = contacts[virtualRow.index];
              return (
                <motion.tr
                  key={contact.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-surface/50 transition-colors"
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={() => toggleSelectContact(contact.id)}
                      className="w-4 h-4 rounded border-outline-variant"
                    />
                  </td>

                  {/* Nom avec avatar initials - Comme maquette */}
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => onContactClick?.(contact)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {getInitials(contact.firstName, contact.lastName)}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.location && (
                          <p className="text-xs text-on-surface-variant">{contact.location}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td
                    className="hidden md:table-cell px-4 py-3 cursor-pointer"
                    onClick={() => onContactClick?.(contact)}
                  >
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{contact.email}</span>
                    </div>
                  </td>

                  {/* Téléphone */}
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => onContactClick?.(contact)}
                  >
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{contact.phone}</span>
                    </div>
                  </td>

                  {/* Tags */}
                  <td
                    className="hidden sm:table-cell px-4 py-3 cursor-pointer"
                    onClick={() => onContactClick?.(contact)}
                  >
                    <div className="flex flex-wrap gap-1">
                      {parseTags(contact.tags)
                        .slice(0, 2)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      {(contact.tags || []).length > 2 && (
                        <span className="text-xs text-on-surface-variant">
                          +{(contact.tags || []).length - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date d'ajout */}
                  <td
                    className="hidden lg:table-cell px-4 py-3 text-on-surface-variant cursor-pointer"
                    onClick={() => onContactClick?.(contact)}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(contact.createdAt)}
                    </div>
                  </td>

                  {/* Statut - Comme maquette */}
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => onContactClick?.(contact)}
                  >
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        contact.optOut ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
                      }`}
                    >
                      {contact.optOut ? (
                        <XCircle className="w-3 h-3" />
                      ) : (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {contact.optOut ? 'Inactif' : 'Actif'}
                    </span>
                  </td>

                  {/* Actions menu */}
                  <td
                    className="px-4 py-3 text-right relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <button
                        aria-label="Actions du contact"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === contact.id}
                        onClick={() => setOpenMenuId(openMenuId === contact.id ? null : contact.id)}
                        className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
                        disabled={isDeleting}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === contact.id && (
                        <div
                          role="menu"
                          aria-label="Actions du contact"
                          className="absolute right-0 mt-1 w-40 bg-surface border border-outline-variant rounded-lg shadow-lg z-10"
                        >
                          <button
                            role="menuitem"
                            onClick={() => deleteContact(contact.id)}
                            disabled={isDeleting}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-t-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Supprimer ce contact
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {/* Spacer bas pour la virtualisation */}
            {rowVirtualizer.getVirtualItems().length > 0 &&
              (() => {
                const lastItem =
                  rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1];
                const bottomSpace = rowVirtualizer.getTotalSize() - lastItem.end;
                return bottomSpace > 0 ? <tr style={{ height: `${bottomSpace}px` }} /> : null;
              })()}
          </tbody>
        </table>
      </div>

      {/* Pagination - Conforme maquette */}
      <div className="flex items-center justify-between px-2 py-3">
        <p className="text-sm text-on-surface-variant">
          Affichage <span className="font-medium text-on-surface">1–{contacts.length}</span> sur{' '}
          <span className="font-medium text-on-surface">{total.toLocaleString('fr-FR')}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={!cursor || isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Préc.
          </button>

          <button
            onClick={handleNextPage}
            disabled={!hasMore || isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Suiv.
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading more indicator */}
      {isLoading && contacts.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="ml-2 text-sm text-on-surface-variant">Chargement...</span>
        </div>
      )}

      {/* Barre d'actions bulk — apparaît quand des contacts sont sélectionnés */}
      <AnimatePresence>
        {selectedContactIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-surface border border-outline-variant rounded-2xl shadow-xl"
          >
            <span className="text-sm font-semibold text-on-surface">
              {selectedContactIds.size} contact{selectedContactIds.size > 1 ? 's' : ''} sélectionné
              {selectedContactIds.size > 1 ? 's' : ''}
            </span>
            <div className="w-px h-5 bg-outline-variant" />
            <button
              onClick={toggleSelectAll}
              className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {selectedContactIds.size === contacts.length
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </button>
            <button
              onClick={deleteSelectedContacts}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Supprimer
            </button>
            <button
              onClick={() => setSelectedContactIds(new Set())}
              className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
              aria-label="Annuler la sélection"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        totalContacts={total}
        selectedContacts={
          selectedContactIds.size > 0
            ? contacts.filter((c) => selectedContactIds.has(c.id))
            : undefined
        }
      />
    </div>
  );
}
