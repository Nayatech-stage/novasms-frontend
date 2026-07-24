import type { FC } from 'react';
import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useCampaignStore } from '@/store/campaign.store';
import { useCampaignActions } from '@/hooks/useCampaign';
import type { Campaign, CampaignStatus } from '@/store/campaign.store';

const CampaignListDashboard: FC = () => {
  const navigate = useNavigate();
  const { campaigns, deleteCampaign, fetchCampaigns, isLoading, error } = useCampaignStore();
  const { duplicateCampaign } = useCampaignActions();

  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'SMS' | 'EMAIL'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'cost'>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = useMemo<Campaign[]>(() => {
    let result = [...campaigns];

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (channelFilter !== 'all') {
      result = result.filter((c) => c.channel === channelFilter);
    }
    if (searchTerm) {
      result = result.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else {
      result.sort((a, b) => b.estimatedCost - a.estimatedCost);
    }

    return result;
  }, [campaigns, statusFilter, channelFilter, sortBy, searchTerm]);

  const groupedCampaigns = useMemo(() => {
    const automation = filteredCampaigns.filter((c) => c.status === 'automation');
    const classic = filteredCampaigns.filter((c) => c.status !== 'automation');
    return { automation, classic };
  }, [filteredCampaigns]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCampaign(deleteTarget.id);
      toast.success('Campagne supprimée avec succès');
      setDeleteTarget(null);
    } catch {
      toast.error('Suppression impossible pour cette campagne');
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const map: Record<string, { label: string; cls: string }> = {
      draft: { label: 'Brouillon', cls: 'bg-outline/20 text-on-surface-variant' },
      scheduled: { label: 'Planifiée', cls: 'bg-primary/10 text-primary' },
      sent: { label: 'Envoyée', cls: 'bg-green-50 text-green-700' },
      paused: { label: 'En pause', cls: 'bg-secondary/10 text-secondary' },
      failed: { label: 'Échouée', cls: 'bg-red-50 text-red-600' },
      cancelled: { label: 'Annulée', cls: 'bg-secondary/10 text-secondary' },
      automation: { label: 'Automatisation', cls: 'bg-primary/10 text-primary' },
    };
    const entry = map[status] ?? { label: status, cls: 'bg-outline/20 text-on-surface-variant' };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${entry.cls}`}
      >
        {entry.label}
      </span>
    );
  };

  const getChannelIcon = (channel: string) => {
    const isSMS = channel === 'SMS';
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: isSMS ? 'rgba(12,84,96,0.10)' : 'rgba(124,58,237,0.10)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 18, color: isSMS ? '#0c5460' : '#7c3aed' }}
        >
          {isSMS ? 'sms' : 'mail'}
        </span>
      </div>
    );
  };

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatCost = (amount: number) => `${amount.toFixed(2)} FCFA`;

  const renderCampaignRow = (campaign: Campaign) => (
    <div
      key={campaign.id}
      className="flex items-center gap-4 px-5 py-4 hover:bg-surface/50 transition-colors"
    >
      {getChannelIcon(campaign.channel)}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-on-surface truncate" style={{ fontSize: 14 }}>
            {campaign.name}
          </p>
          {getStatusBadge(campaign.status)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              group
            </span>
            {campaign.estimatedRecipients.toLocaleString('fr-FR')} contacts
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              schedule
            </span>
            {formatDate(campaign.updatedAt)}
          </span>
          <span
            className="font-semibold"
            style={{ color: campaign.estimatedCost > 0 ? '#0c5460' : 'var(--text-3)' }}
          >
            {formatCost(campaign.estimatedCost)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          to={`/campaigns/${campaign.id}`}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          title="Voir"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            visibility
          </span>
        </Link>
        <Link
          to={`/campaigns/${campaign.id}/report`}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
          title="Rapport"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            bar_chart
          </span>
        </Link>
        <Link
          to={`/campaigns/${campaign.id}/edit`}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          title="Modifier"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            edit
          </span>
        </Link>
        <button
          onClick={async () => {
            try {
              const duplicated = await duplicateCampaign(campaign);
              toast.success('Campagne dupliquée');
              navigate(`/campaigns/${duplicated.id}/edit`);
            } catch {
              toast.error('Impossible de dupliquer la campagne');
            }
          }}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          title="Dupliquer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            content_copy
          </span>
        </button>
        <button
          onClick={() => setDeleteTarget(campaign)}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          title="Supprimer"
        >
          <span className="material-symbols-outlined text-error" style={{ fontSize: 18 }}>
            delete
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Campagnes</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            id="tour-new-campaign-btn"
            to="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Nouvelle campagne
          </Link>
          <Link
            to="/campaigns/new?mode=automation"
            className="inline-flex items-center gap-2 px-4 py-2 border border-outline-variant text-sm font-medium rounded-lg hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            Automatisée
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
            className="px-3 py-2 border border-outline-variant bg-surface rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="scheduled">Planifiée</option>
            <option value="sent">Envoyée</option>
            <option value="paused">En pause</option>
            <option value="failed">Échouée</option>
            <option value="cancelled">Annulée</option>
            <option value="automation">Automatisation</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as 'all' | 'SMS' | 'EMAIL')}
            className="px-3 py-2 border border-outline-variant bg-surface rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Tous les canaux</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'cost')}
            className="px-3 py-2 border border-outline-variant bg-surface rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="date">Date (récent)</option>
            <option value="cost">Coût (élevé)</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            style={{ fontSize: 18 }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Rechercher une campagne..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm text-on-surface"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-on-surface-variant">
        <span className="font-medium text-on-surface">{filteredCampaigns.length}</span> résultat
        {filteredCampaigns.length !== 1 ? 's' : ''}
      </p>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined mt-0.5 text-[18px]">error</span>
          <p>{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && campaigns.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-3 text-on-surface-variant text-sm">Chargement des campagnes…</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined mb-4 block text-6xl text-on-surface-variant opacity-30">
            mail
          </span>
          <p className="text-on-surface font-medium">
            {searchTerm ? 'Aucune campagne trouvée' : 'Aucune campagne pour le moment'}
          </p>
          <p className="text-sm text-on-surface-variant mt-1 mb-4">
            {searchTerm
              ? 'Essayez un autre terme de recherche ou modifiez les filtres'
              : 'Créez votre première campagne pour démarrer'}
          </p>
          {!searchTerm && (
            <Link
              to="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Créer une campagne
            </Link>
          )}
        </div>
      )}

      {/* Campaign groups */}
      {filteredCampaigns.length > 0 && (
        <div className="space-y-6">
          {/* Automatisées */}
          {groupedCampaigns.automation.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                  Automatisées
                </h2>
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-semibold">
                  {groupedCampaigns.automation.length}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-outline-variant">
                <div className="divide-y divide-outline-variant/50">
                  {groupedCampaigns.automation.map((c) => renderCampaignRow(c))}
                </div>
              </div>
            </div>
          )}

          {/* Classiques */}
          {groupedCampaigns.classic.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                  Classiques
                </h2>
                <span className="px-2 py-0.5 text-xs rounded-full bg-outline/20 text-on-surface-variant font-semibold">
                  {groupedCampaigns.classic.length}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-outline-variant">
                <div className="divide-y divide-outline-variant/50">
                  {groupedCampaigns.classic.map((c) => renderCampaignRow(c))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-on-surface">
              Supprimer la campagne ?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-on-surface-variant">
              Cette action est irréversible pour{' '}
              <strong className="text-on-surface">{deleteTarget?.name}</strong>.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
                Annuler
              </Dialog.Close>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isLoading ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default CampaignListDashboard;
