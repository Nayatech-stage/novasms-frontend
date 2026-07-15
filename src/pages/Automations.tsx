import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Clock3, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  automationsApi,
  type AutomationItem,
  type AutomationWorkflow,
  type WorkflowNode,
} from '@/api/automations';
import { contactsApi } from '@/api/contacts';
import { campaignApi } from '@/api/campaignApi';
import type { CampaignAPIResponse } from '@/types/campaign.types';
import type { Contact, DynamicSegment } from '@/features/contacts/types/contact';
import CanvasEditor from '@/components/CanvasEditor';

type DraftAutomation = {
  name: string;
  trigger:
    | 'contact_added'
    | 'api'
    | 'segment_joined'
    | 'tag_added'
    | 'campaign_opened'
    | 'link_clicked'
    | 'date_based'
    | 'birthday';
  delaySeconds: string;
  delayPreset: '0' | '300' | '1800' | '3600' | '86400' | 'custom';
  channel: 'Email' | 'SMS' | 'WhatsApp';
  campaignId: string;
  templateId: string;
  triggerConfig: {
    runAt: string;
    segmentId: string;
    contactId: string;
    daysOffset: string;
  };
  status: 'Active' | 'Inactive' | 'Draft';
};

type WorkflowTemplate = {
  key: string;
  label: string;
  description: string;
  draft: DraftAutomation;
  workflow: AutomationWorkflow;
};

const initialDraft: DraftAutomation = {
  name: 'Bienvenue après inscription',
  trigger: 'contact_added',
  delaySeconds: '3600',
  delayPreset: '3600',
  channel: 'Email',
  campaignId: '',
  templateId: '',
  triggerConfig: {
    runAt: '',
    segmentId: '',
    contactId: '',
    daysOffset: '0',
  },
  status: 'Active',
};

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: 'welcome',
    label: 'Bienvenue',
    description: "Accueille automatiquement un nouveau contact avec un message d'introduction.",
    draft: {
      name: 'Bienvenue après inscription',
      trigger: 'contact_added',
      delaySeconds: '3600',
      delayPreset: '3600',
      channel: 'Email',
      campaignId: '',
      templateId: '',
      triggerConfig: {
        runAt: '',
        segmentId: '',
        contactId: '',
        daysOffset: '0',
      },
      status: 'Active',
    },
    workflow: {
      nodes: [
        {
          id: 't-1',
          x: 240,
          y: 80,
          label: 'Contact ajouté',
          type: 'trigger',
          config: { triggerSource: 'contact_added' },
        },
        {
          id: 't-2',
          x: 240,
          y: 230,
          label: 'Attente 1 heure',
          type: 'wait',
          config: { delaySeconds: 3600, delayPreset: '3600' },
        },
        {
          id: 't-3',
          x: 240,
          y: 380,
          label: 'Email de bienvenue',
          type: 'action',
          config: { channel: 'Email', templateId: '' },
        },
        { id: 't-4', x: 240, y: 530, label: 'Fin', type: 'end' },
      ],
      edges: [
        { id: 'te-1', from: 't-1', to: 't-2' },
        { id: 'te-2', from: 't-2', to: 't-3' },
        { id: 'te-3', from: 't-3', to: 't-4' },
      ],
    },
  },
  {
    key: 'relance',
    label: 'Relance',
    description: 'Relance un prospect après un délai court puis applique un tag de suivi.',
    draft: {
      name: 'Relance automatique',
      trigger: 'api',
      delaySeconds: '1800',
      delayPreset: '1800',
      channel: 'SMS',
      campaignId: '',
      templateId: '',
      triggerConfig: {
        runAt: '',
        segmentId: '',
        contactId: '',
        daysOffset: '0',
      },
      status: 'Active',
    },
    workflow: {
      nodes: [
        {
          id: 'r-1',
          x: 240,
          y: 80,
          label: 'Intégration externe',
          type: 'trigger',
          config: { triggerSource: 'api' },
        },
        {
          id: 'r-2',
          x: 240,
          y: 230,
          label: 'Attente 30 min',
          type: 'wait',
          config: { delaySeconds: 1800, delayPreset: '1800' },
        },
        {
          id: 'r-3',
          x: 240,
          y: 380,
          label: 'SMS de relance',
          type: 'action',
          config: { channel: 'SMS', templateId: '' },
        },
        {
          id: 'r-4',
          x: 240,
          y: 530,
          label: 'Tag relance',
          type: 'tag',
          config: { tag: 'Relance' },
        },
      ],
      edges: [
        { id: 're-1', from: 'r-1', to: 'r-2' },
        { id: 're-2', from: 'r-2', to: 'r-3' },
        { id: 're-3', from: 'r-3', to: 'r-4' },
      ],
    },
  },
  {
    key: 'qualification',
    label: 'Qualification',
    description: "Vérifie un tag puis branche la séquence selon l'ouverture de la campagne.",
    draft: {
      name: 'Qualification pipeline',
      trigger: 'contact_added',
      delaySeconds: '300',
      delayPreset: '300',
      channel: 'WhatsApp',
      campaignId: '',
      templateId: '',
      triggerConfig: {
        runAt: '',
        segmentId: '',
        contactId: '',
        daysOffset: '0',
      },
      status: 'Draft',
    },
    workflow: {
      nodes: [
        {
          id: 'q-1',
          x: 240,
          y: 80,
          label: 'Nouveau contact',
          type: 'trigger',
          config: { triggerSource: 'contact_added' },
        },
        {
          id: 'q-2',
          x: 240,
          y: 230,
          label: 'Vérification tag',
          type: 'condition',
          config: { conditionType: 'tag', tag: 'VIP' },
        },
        {
          id: 'q-3',
          x: 40,
          y: 390,
          label: 'WhatsApp VIP',
          type: 'action',
          config: { channel: 'WhatsApp', templateId: '' },
        },
        {
          id: 'q-4',
          x: 440,
          y: 390,
          label: 'Tag lead',
          type: 'tag',
          config: { tag: 'Lead chaud' },
        },
        { id: 'q-5', x: 240, y: 540, label: 'Fin', type: 'end' },
      ],
      edges: [
        { id: 'qe-1', from: 'q-1', to: 'q-2' },
        { id: 'qe-2', from: 'q-2', to: 'q-3', fromPort: 'left', toPort: 'left' },
        { id: 'qe-3', from: 'q-2', to: 'q-4', fromPort: 'right', toPort: 'right' },
        { id: 'qe-4', from: 'q-3', to: 'q-5' },
        { id: 'qe-5', from: 'q-4', to: 'q-5' },
      ],
    },
  },
];

const nodeStyles = {
  trigger: 'border-l-4 border-teal-600/40 bg-white text-teal-900 shadow-sm',
  wait: 'border-l-4 border-amber-400/40 bg-white text-amber-900 shadow-sm',
  action: 'border-l-4 border-lime-500/40 bg-white text-lime-900 shadow-sm',
  condition: 'border-l-4 border-purple-500/40 bg-white text-purple-900 shadow-sm',
  end: 'border-l-4 border-slate-300 bg-white text-slate-700 shadow-sm',
} as const;

function formatDelay(seconds: number) {
  if (!seconds) return 'Immédiat';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} h`;
}

function triggerLabel(trigger: DraftAutomation['trigger']) {
  const labels: Record<DraftAutomation['trigger'], string> = {
    contact_added: 'Nouveau contact',
    api: 'Événement externe (API / webhook)',
    segment_joined: 'Entrée dans un segment',
    tag_added: 'Tag ajouté au contact',
    campaign_opened: 'Ouverture de campagne',
    link_clicked: 'Clic sur un lien',
    date_based: 'Date planifiée',
    birthday: 'Anniversaire du contact',
  };

  return labels[trigger] ?? trigger;
}

function orderWorkflowNodes(workflow?: AutomationWorkflow | null) {
  const nodes = workflow?.nodes ?? [];
  const edges = workflow?.edges ?? [];
  if (nodes.length <= 1) return nodes;

  const nodeMap = new Map(nodes.map((node) => [node.id, node] as const));
  const outgoing = new Map<string, string[]>();

  for (const edge of edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  }

  const triggerNode = nodes.find((node) => node.type === 'trigger') ?? nodes[0];
  const ordered: typeof nodes = [];
  const visited = new Set<string>();
  const queue: string[] = triggerNode ? [triggerNode.id] : [];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;
    const current = nodeMap.get(currentId);
    if (!current) continue;
    visited.add(currentId);
    ordered.push(current);

    const nextIds = outgoing.get(currentId) ?? [];
    for (const nextId of nextIds) {
      if (!visited.has(nextId)) queue.push(nextId);
    }
  }

  const remaining = nodes.filter((node) => !visited.has(node.id));
  remaining.sort((a, b) => a.y - b.y || a.x - b.x);

  return [...ordered, ...remaining];
}

function getTriggerConfigValue(config: unknown, key: 'runAt' | 'segmentId' | 'contactId') {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return '';
  const value = (config as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function toDateTimeLocalValue(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildTriggerConfigPayload(draft: DraftAutomation) {
  const triggerConfig: Record<string, unknown> = {};

  if (draft.trigger === 'birthday') {
    triggerConfig.daysOffset = Number(draft.triggerConfig.daysOffset) || 0;
    if (draft.triggerConfig.segmentId) triggerConfig.segmentId = draft.triggerConfig.segmentId;
  } else if (draft.trigger === 'date_based') {
    if (draft.triggerConfig.runAt) {
      const runAt = new Date(draft.triggerConfig.runAt);
      if (!Number.isNaN(runAt.getTime())) triggerConfig.runAt = runAt.toISOString();
    }
    if (draft.triggerConfig.segmentId) triggerConfig.segmentId = draft.triggerConfig.segmentId;
    if (draft.triggerConfig.contactId) triggerConfig.contactId = draft.triggerConfig.contactId;
  }

  return Object.keys(triggerConfig).length > 0 ? triggerConfig : undefined;
}

function statusChip(status: AutomationItem['status']) {
  if (status === 'Active') return 'border-lime-200 bg-lime-50 text-lime-700';
  if (status === 'Inactive') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function describeWorkflowNode(node?: WorkflowNode | null) {
  if (!node) return 'Aucun détail';
  const config = node.config ?? {};
  if (node.type === 'trigger')
    return config.triggerSource === 'api' ? 'Déclencheur externe' : 'Contact ajouté';
  if (node.type === 'wait')
    return config.delaySeconds ? formatDelay(config.delaySeconds) : 'Immédiat';
  if (node.type === 'action')
    return `${config.channel || 'Email'}${config.templateId ? ` · ${config.templateId}` : ''}`;
  if (node.type === 'tag') return config.tag || 'Tag';
  if (node.type === 'condition')
    return config.conditionType === 'field'
      ? `Champ ${config.field || 'contact'}`
      : `Condition ${config.conditionType || ''}`.trim();
  return 'Fin';
}

function workflowNodesFromAutomation(automation: AutomationItem | null) {
  return orderWorkflowNodes(automation?.workflow ?? null);
}

function PreviewNode({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: keyof typeof nodeStyles;
}) {
  return (
    <div className={`rounded-xl px-4 py-3 text-center ${nodeStyles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
        {subtitle}
      </p>
      <p className="mt-2 text-sm font-headline text-secondary font-bold">{title}</p>
    </div>
  );
}

export default function Automations() {
  const [items, setItems] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState<DraftAutomation>(initialDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignAPIResponse[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [segments, setSegments] = useState<DynamicSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);

  const campaignChannel = useMemo(() => {
    if (draft.channel === 'Email') return 'EMAIL';
    if (draft.channel === 'SMS') return 'SMS';
    return null;
  }, [draft.channel]);

  const normalizeCampaignStatus = (status: string | null | undefined) =>
    String(status ?? '')
      .trim()
      .toLowerCase();

  const selectedAutomation = useMemo(
    () =>
      selectedId === null
        ? null
        : (items.find((automation) => automation.id === selectedId) ?? items[0] ?? null),
    [items, selectedId],
  );

  const selectedMetrics = useMemo(() => {
    const executions = selectedAutomation?._count?.executions ?? 0;
    const sent = selectedAutomation?.sendCount ?? 0;
    const inProgress = Math.max(0, executions - sent);
    const conversion = executions > 0 ? (sent / executions) * 100 : 0;

    return {
      entries: executions,
      inProgress,
      sent,
      conversion,
    };
  }, [selectedAutomation]);

  const activeWorkflows = items.filter(
    (automation) => normalizeCampaignStatus(automation.status) === 'active',
  ).length;
  const draftWorkflows = items.filter(
    (automation) => normalizeCampaignStatus(automation.status) === 'draft',
  ).length;
  const inactiveWorkflows = items.filter(
    (automation) => normalizeCampaignStatus(automation.status) === 'inactive',
  ).length;
  const totalSent = items.reduce((sum, automation) => sum + (automation.sendCount || 0), 0);

  const previewNodes = useMemo(
    () => workflowNodesFromAutomation(selectedAutomation),
    [selectedAutomation],
  );

  const loadAutomations = async () => {
    setRefreshing(true);
    try {
      const data = await automationsApi.list();
      setItems(data);
      setSelectedId((current) => (current === undefined ? (data[0]?.id ?? null) : current));
    } catch (error) {
      toast.error('Impossible de charger les automatisations');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAutomations();
  }, []);

  useEffect(() => {
    const loadSegmentsAndContacts = async () => {
      setSegmentsLoading(true);
      setContactsLoading(true);
      try {
        const [segmentList, contactList] = await Promise.all([
          contactsApi.listSegments(),
          contactsApi.list({ limit: 100 }),
        ]);
        setSegments(segmentList);
        setContacts(contactList.data ?? []);
      } catch (error) {
        console.error(error);
        setSegments([]);
        setContacts([]);
      } finally {
        setSegmentsLoading(false);
        setContactsLoading(false);
      }
    };

    void loadSegmentsAndContacts();
  }, []);

  useEffect(() => {
    if (!campaignChannel) {
      setCampaigns([]);
      setDraft((current) => ({ ...current, campaignId: '' }));
      return;
    }

    const loadCampaigns = async () => {
      setCampaignsLoading(true);
      try {
        const response = await campaignApi.list({
          channel: campaignChannel,
          status: 'AUTOMATION',
          page: 1,
          limit: 100,
        });
        setCampaigns(response.data ?? []);
      } catch (error) {
        setCampaigns([]);
        console.error(error);
      } finally {
        setCampaignsLoading(false);
      }
    };

    void loadCampaigns();
  }, [campaignChannel]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        const updated = await automationsApi.update(editingId, {
          name: draft.name.trim(),
          trigger: draft.trigger,
          delaySeconds: Number(draft.delaySeconds) || 0,
          channel: draft.channel,
          templateId: draft.templateId.trim() || null,
          campaignId: draft.campaignId || null,
          triggerConfig: buildTriggerConfigPayload(draft),
          status: draft.status,
        });

        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedId(updated.id);
        setEditingId(null);
        setSelectedTemplateKey(null);
        toast.success('Workflow mis à jour');
        return;
      }

      const created = await automationsApi.create({
        name: draft.name.trim(),
        trigger: draft.trigger,
        delaySeconds: Number(draft.delaySeconds) || 0,
        channel: draft.channel,
        templateId: draft.templateId.trim() || undefined,
        campaignId: draft.campaignId || undefined,
        triggerConfig: buildTriggerConfigPayload(draft),
        status: draft.status,
      });

      if (selectedTemplateKey) {
        const template = WORKFLOW_TEMPLATES.find((item) => item.key === selectedTemplateKey);
        if (template) {
          const updated = await automationsApi.update(created.id, { workflow: template.workflow });
          setItems((current) => [updated, ...current]);
          setSelectedId(updated.id);
          setEditorOpen(true);
          setSelectedTemplateKey(null);
          toast.success(`Workflow créé à partir du modèle “${template.label}”`);
          return;
        }
      }

      setItems((current) => [created, ...current]);
      setSelectedId(created.id);
      setEditorOpen(true);
      setDraft(initialDraft);
      setSelectedTemplateKey(null);
      toast.success('Workflow créé');
    } catch (error) {
      toast.error('La création du workflow a échoué');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const loadSelectedForEdition = () => {
    if (!selectedAutomation) {
      toast.error('Sélectionnez un workflow à modifier');
      return;
    }

    const cfg = selectedAutomation.triggerConfig as Record<string, unknown> | null | undefined;
    const savedDaysOffset =
      cfg && typeof cfg.daysOffset === 'number' ? String(cfg.daysOffset) : '0';

    setDraft({
      name: selectedAutomation.name,
      trigger: selectedAutomation.trigger,
      delaySeconds: String(selectedAutomation.delaySeconds ?? 0),
      delayPreset: 'custom',
      channel: selectedAutomation.channel,
      campaignId: (selectedAutomation as any).campaignId ?? '',
      templateId: selectedAutomation.templateId ?? '',
      triggerConfig: {
        runAt: toDateTimeLocalValue(
          getTriggerConfigValue(selectedAutomation.triggerConfig, 'runAt'),
        ),
        segmentId: getTriggerConfigValue(selectedAutomation.triggerConfig, 'segmentId'),
        contactId: getTriggerConfigValue(selectedAutomation.triggerConfig, 'contactId'),
        daysOffset: savedDaysOffset,
      },
      status: selectedAutomation.status,
    });
    setEditingId(selectedAutomation.id);
    setSelectedTemplateKey(null);
    toast.info('Workflow chargé pour modification');
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await automationsApi.toggle(id);
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      toast.success(updated.status === 'Active' ? 'Workflow activé' : 'Workflow désactivé');
    } catch (error) {
      toast.error('Impossible de changer le statut');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await automationsApi.remove(id);
      setItems((current) => {
        const next = current.filter((item) => item.id !== id);
        setSelectedId((selected) => {
          if (selected === id) {
            return next[0]?.id ?? null;
          }
          return selected;
        });
        return next;
      });
      toast.success('Workflow supprimé');
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Impossible de supprimer ce workflow';
      toast.error(String(message));
      console.error(error);
    }
  };

  const handleQuickTest = async () => {
    if (!selectedAutomation) {
      toast.error('Sélectionnez un workflow pour tester');
      return;
    }

    if (selectedAutomation.status !== 'Active') {
      toast.error('Activez le workflow avant de lancer un test réel');
      return;
    }

    const testContact = contacts[0];
    if (!testContact) {
      toast.error('Ajoutez au moins un contact pour tester le workflow');
      return;
    }

    try {
      await automationsApi.trigger(selectedAutomation.id, {
        contactId: testContact.id,
        delaySeconds: 0,
      });
      const label = [testContact.firstName, testContact.lastName].filter(Boolean).join(' ');
      toast.success(
        `Test lancé pour ${label || testContact.email || testContact.phone || 'le contact sélectionné'}`,
      );
      void loadAutomations();
    } catch (error) {
      toast.error('Impossible de lancer le test du workflow');
      console.error(error);
    }
  };

  const applyTemplate = (template: WorkflowTemplate) => {
    setDraft(template.draft);
    setSelectedTemplateKey(template.key);
    toast.info(`Modèle “${template.label}” prêt à être créé`);
  };

  return (
    <div id="tour-automations-header" className="min-h-full bg-[#f7f9f7] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1280px] overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-[0_18px_50px_rgba(12,84,96,0.10)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/30 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
              Orchestration automatisée
            </p>
            <h1 className="text-base font-semibold text-secondary">
              {selectedAutomation ? selectedAutomation.name : 'Automatisations'}
            </h1>
            <p className="text-xs text-on-surface-variant">
              {selectedAutomation
                ? `${triggerLabel(selectedAutomation.trigger)} · ${selectedAutomation.channel} · ${formatDelay(selectedAutomation.delaySeconds)}`
                : 'Créez, testez et activez vos workflows visuels'}
            </p>
          </div>

          <div className="hidden xl:flex items-center gap-3 rounded-full border border-outline-variant/30 bg-surface px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Actifs
            </span>
            <strong className="text-sm text-secondary">{activeWorkflows}</strong>
            <span className="h-4 w-px bg-outline-variant/40" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Brouillons
            </span>
            <strong className="text-sm text-secondary">{draftWorkflows}</strong>
            <span className="h-4 w-px bg-outline-variant/40" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Inactifs
            </span>
            <strong className="text-sm text-secondary">{inactiveWorkflows}</strong>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleQuickTest()}
              className="rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-xs font-semibold text-secondary transition hover:border-primary/50 hover:text-primary"
            >
              Tester
            </button>
            <button
              type="button"
              disabled={!selectedAutomation}
              onClick={() => {
                if (!selectedAutomation) return;
                if (!window.confirm('Supprimer ce workflow ?')) return;
                void handleDelete(selectedAutomation.id);
              }}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Supprimer
            </button>
            <button
              type="button"
              disabled={!selectedAutomation}
              onClick={() => {
                if (!selectedAutomation) return;
                void handleToggle(selectedAutomation.id);
              }}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedAutomation?.status === 'Active'
                ? 'Désactiver le workflow'
                : 'Activer le workflow'}
            </button>
          </div>
        </div>

        <div className="grid min-h-[760px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="border-r border-outline-variant/30 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-secondary">Workflows</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(initialDraft);
                    setSelectedId(null);
                    setEditingId(null);
                    setSelectedTemplateKey(null);
                    setEditorOpen(false);
                    toast.info('Nouveau workflow prêt à être créé');
                  }}
                  className="rounded-md border border-outline-variant/40 bg-white px-2 py-1 text-xs font-semibold text-secondary transition hover:border-primary/40 hover:text-primary"
                >
                  <span className="inline-flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Créer
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void loadAutomations()}
                  className="rounded-md border border-outline-variant/40 bg-white p-1.5 text-secondary transition hover:border-primary/40 hover:text-primary"
                  title="Actualiser"
                >
                  <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-outline-variant/40 bg-surface/40 p-4 text-sm text-on-surface-variant">
                Chargement des workflows...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant/40 bg-surface/40 p-4 text-sm text-on-surface-variant">
                Aucun workflow pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((automation) => {
                  const isSelected = automation.id === selectedAutomation?.id;
                  return (
                    <button
                      key={automation.id}
                      type="button"
                      onClick={() => setSelectedId(automation.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-outline-variant/30 bg-white hover:border-primary/30 hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-secondary">{automation.name}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {triggerLabel(automation.trigger)} · {automation.channel}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusChip(automation.status)}`}
                        >
                          {automation.status}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                        <span>{formatDelay(automation.delaySeconds)}</span>
                        <span>{automation.sendCount} envois</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-5 border-t border-outline-variant/30 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Stats workflow sélectionné
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Entrées totales</span>
                  <strong>{selectedMetrics.entries}</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-on-surface-variant">En cours</span>
                  <strong className="text-secondary">{selectedMetrics.inProgress}</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Convertis</span>
                  <strong className="text-success">{selectedMetrics.sent}</strong>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Taux conversion</span>
                  <strong className="text-primary">{selectedMetrics.conversion.toFixed(1)}%</strong>
                </p>
              </div>

              <div className="mt-5 rounded-xl border border-outline-variant/30 bg-surface p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  Volume global
                </p>
                <p className="mt-2 text-2xl font-bold text-secondary">
                  {totalSent.toLocaleString('fr-FR')}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Envois cumulés sur tous les workflows
                </p>
              </div>
            </div>
          </aside>

          <section className="relative overflow-hidden bg-[#f7f9f7] p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(12,84,96,0.12)_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="relative mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-outline-variant/30 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  Palette workflow
                </p>
                <p className="text-sm font-semibold text-secondary">
                  Déclencheur · Attente · Action · Condition · Tag · Fin
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">Trigger</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Wait</span>
                <span className="rounded-full bg-lime-50 px-3 py-1 text-lime-800">Action</span>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-800">
                  Condition
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">End</span>
              </div>
            </div>

            <div className="relative mx-auto flex max-w-[340px] flex-col items-stretch gap-3">
              {previewNodes.length > 0 ? (
                previewNodes.map((node, index) => (
                  <div key={node.id} className="flex flex-col items-stretch gap-3">
                    <PreviewNode
                      tone={
                        node.type === 'trigger'
                          ? 'trigger'
                          : node.type === 'wait'
                            ? 'wait'
                            : node.type === 'action'
                              ? 'action'
                              : node.type === 'condition'
                                ? 'condition'
                                : node.type === 'tag'
                                  ? 'action'
                                  : 'end'
                      }
                      subtitle={
                        node.type === 'trigger'
                          ? 'Déclencheur'
                          : node.type === 'wait'
                            ? 'Attente'
                            : node.type === 'action'
                              ? 'Action'
                              : node.type === 'condition'
                                ? 'Condition'
                                : node.type === 'tag'
                                  ? 'Tag'
                                  : 'Fin'
                      }
                      title={node.label}
                    />
                    <p className="-mt-2 text-center text-[11px] font-medium text-on-surface-variant">
                      {describeWorkflowNode(node)}
                    </p>
                    {index < previewNodes.length - 1 && (
                      <div className="mx-auto h-8 w-px bg-outline-variant/80" />
                    )}
                  </div>
                ))
              ) : (
                <>
                  <PreviewNode
                    tone="trigger"
                    subtitle="Déclencheur"
                    title={
                      selectedAutomation
                        ? triggerLabel(selectedAutomation.trigger)
                        : 'Contact ajouté'
                    }
                  />
                  <div className="mx-auto h-8 w-px bg-outline-variant/80" />
                  <PreviewNode
                    tone="wait"
                    subtitle="Attente"
                    title={
                      selectedAutomation ? formatDelay(selectedAutomation.delaySeconds) : '1 heure'
                    }
                  />
                  <div className="mx-auto h-8 w-px bg-outline-variant/80" />
                  <PreviewNode
                    tone="action"
                    subtitle="Envoi message"
                    title={
                      selectedAutomation
                        ? `${selectedAutomation.channel} message`
                        : 'Email de relance'
                    }
                  />
                  <div className="mx-auto h-8 w-px bg-outline-variant/80" />
                  <PreviewNode
                    tone="condition"
                    subtitle="Condition"
                    title="Ouverture / clic / achat / tag"
                  />
                  <div className="mx-auto h-8 w-px bg-outline-variant/80" />
                  <PreviewNode tone="end" subtitle="Fin" title="Workflow clôturé" />
                </>
              )}
            </div>

            <div className="relative mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (!selectedAutomation) {
                    toast.error("Créez ou sélectionnez d'abord un workflow pour ouvrir l'éditeur");
                    return;
                  }
                  setEditorOpen(true);
                }}
                className="rounded-lg border border-outline-variant/40 bg-white px-4 py-2 text-sm font-semibold text-secondary transition hover:border-primary/40 hover:text-primary"
              >
                Ouvrir l'éditeur visuel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setDraft(initialDraft);
                  setSelectedTemplateKey('welcome');
                  toast.info('Workflow de bienvenue prêt à être personnalisé');
                }}
                className="ml-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
              >
                Démarrer un modèle
              </button>
            </div>
          </section>

          <aside className="border-l border-outline-variant/30 bg-white p-4">
            <h2 className="text-sm font-semibold text-secondary">Nouveau workflow</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Configurez le déclencheur, le délai et le canal pour créer un workflow conforme.
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={!selectedAutomation}
                onClick={loadSelectedForEdition}
                className="rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-xs font-semibold text-secondary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Charger la sélection
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(initialDraft);
                    setSelectedTemplateKey(null);
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                >
                  Annuler l'édition
                </button>
              )}
            </div>

            <form className="mt-4 space-y-3" onSubmit={(event) => void handleCreate(event)}>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary" htmlFor="automation-name">
                  Nom
                </label>
                <input
                  id="automation-name"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Bienvenue après inscription"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-semibold text-secondary"
                  htmlFor="automation-trigger"
                >
                  Déclencheur
                </label>
                <select
                  id="automation-trigger"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                  value={draft.trigger}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      trigger: event.target.value as DraftAutomation['trigger'],
                    }))
                  }
                >
                  <option value="contact_added">Nouveau contact</option>
                  <option value="api">Événement externe (site, CRM, Zapier)</option>
                  <option value="segment_joined">Entrée dans un segment</option>
                  <option value="tag_added">Tag ajouté au contact</option>
                  <option value="campaign_opened">Ouverture de campagne</option>
                  <option value="link_clicked">Clic sur un lien</option>
                  <option value="birthday">Anniversaire du contact</option>
                  <option value="date_based">Date planifiée (ponctuelle)</option>
                </select>
              </div>

              {draft.trigger === 'birthday' && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                    Anniversaire automatique
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Le système envoie automatiquement un message à chaque contact dont la date de
                    naissance est enregistrée. Aucune date de déclenchement à configurer.
                  </p>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold text-secondary"
                      htmlFor="automation-days-offset"
                    >
                      Envoi
                    </label>
                    <select
                      id="automation-days-offset"
                      className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                      value={draft.triggerConfig.daysOffset}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          triggerConfig: {
                            ...current.triggerConfig,
                            daysOffset: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="-7">7 jours avant l'anniversaire</option>
                      <option value="-3">3 jours avant l'anniversaire</option>
                      <option value="-1">La veille de l'anniversaire</option>
                      <option value="0">Le jour de l'anniversaire</option>
                      <option value="1">Le lendemain de l'anniversaire</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold text-secondary"
                      htmlFor="automation-birthday-segment"
                    >
                      Segment cible (optionnel)
                    </label>
                    <select
                      id="automation-birthday-segment"
                      disabled={segmentsLoading}
                      className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary disabled:opacity-60"
                      value={draft.triggerConfig.segmentId}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          triggerConfig: {
                            ...current.triggerConfig,
                            segmentId: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">
                        {segmentsLoading
                          ? 'Chargement...'
                          : 'Tous les contacts avec une date de naissance'}
                      </option>
                      {segments.map((segment) => (
                        <option key={segment.id} value={segment.id}>
                          {segment.name || segment.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {draft.trigger === 'date_based' && (
                <div className="space-y-3 rounded-xl border border-primary/10 bg-primary/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                    Date planifiée (ponctuelle)
                  </p>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold text-secondary"
                      htmlFor="automation-run-at"
                    >
                      Exécuter le
                    </label>
                    <input
                      id="automation-run-at"
                      type="datetime-local"
                      className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                      value={draft.triggerConfig.runAt}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          triggerConfig: { ...current.triggerConfig, runAt: event.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold text-secondary"
                      htmlFor="automation-segment-id"
                    >
                      Segment cible (optionnel)
                    </label>
                    <select
                      id="automation-segment-id"
                      className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                      value={draft.triggerConfig.segmentId}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          triggerConfig: {
                            ...current.triggerConfig,
                            segmentId: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Aucun segment</option>
                      {segments.map((segment) => (
                        <option key={segment.id} value={segment.id}>
                          {segment.name || segment.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-semibold text-secondary"
                      htmlFor="automation-contact-id"
                    >
                      Contact cible (optionnel)
                    </label>
                    <select
                      id="automation-contact-id"
                      className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                      value={draft.triggerConfig.contactId}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          triggerConfig: {
                            ...current.triggerConfig,
                            contactId: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Aucun contact</option>
                      {contacts.map((contact) => {
                        const label = [contact.firstName, contact.lastName]
                          .filter(Boolean)
                          .join(' ')
                          .trim();
                        return (
                          <option key={contact.id} value={contact.id}>
                            {label || contact.email || contact.phone || contact.id}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[11px] text-on-surface-variant">
                      {contactsLoading
                        ? 'Chargement des contacts...'
                        : 'Laissez vide pour cibler le segment lié.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label
                  className="text-xs font-semibold text-secondary"
                  htmlFor="automation-delay-preset"
                >
                  Délai
                </label>
                <select
                  id="automation-delay-preset"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                  value={draft.delayPreset}
                  onChange={(event) => {
                    const nextPreset = event.target.value as DraftAutomation['delayPreset'];
                    setDraft((current) => ({
                      ...current,
                      delayPreset: nextPreset,
                      delaySeconds:
                        nextPreset === 'custom' ? current.delaySeconds || '0' : nextPreset,
                    }));
                  }}
                >
                  <option value="0">Immédiat</option>
                  <option value="300">5 min</option>
                  <option value="1800">30 min</option>
                  <option value="3600">1 heure</option>
                  <option value="86400">1 jour</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-semibold text-secondary"
                  htmlFor="automation-delay-custom"
                >
                  Secondes (personnalisé)
                </label>
                <input
                  id="automation-delay-custom"
                  type="number"
                  min={0}
                  disabled={draft.delayPreset !== 'custom'}
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-surface"
                  value={draft.delaySeconds}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      delaySeconds: event.target.value,
                      delayPreset: 'custom',
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-semibold text-secondary"
                  htmlFor="automation-channel"
                >
                  Canal
                </label>
                <select
                  id="automation-channel"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                  value={draft.channel}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      channel: event.target.value as DraftAutomation['channel'],
                    }))
                  }
                >
                  <option value="Email">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="WhatsApp">WhatsApp</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-semibold text-secondary"
                  htmlFor="automation-campaign-id"
                >
                  Campagne automation (optionnel)
                </label>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!campaignChannel || campaignsLoading}
                    onClick={() => {
                      if (!campaignChannel) return;
                      setCampaignsLoading(true);
                      void campaignApi
                        .list({
                          channel: campaignChannel,
                          status: 'AUTOMATION',
                          page: 1,
                          limit: 100,
                        })
                        .then((response) => setCampaigns(response.data ?? []))
                        .catch((error) => {
                          setCampaigns([]);
                          console.error(error);
                        })
                        .finally(() => setCampaignsLoading(false));
                    }}
                    className="rounded-lg border border-outline-variant/40 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-secondary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Rafraîchir
                  </button>
                </div>
                <div className="mb-2 rounded-lg border border-dashed border-outline-variant/40 bg-surface/30 px-3 py-2 text-[11px] text-on-surface-variant">
                  Sélectionnez une campagne existante. Créez-en une dans la section Campagnes.
                  <a
                    href="/campaigns"
                    className="text-[11px] text-primary font-semibold underline ml-1"
                  >
                    Accéder aux campagnes →
                  </a>
                </div>
                <select
                  id="automation-campaign-id"
                  disabled={!campaignChannel || campaignsLoading}
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-surface"
                  value={draft.campaignId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, campaignId: event.target.value }))
                  }
                >
                  <option value="">Aucune campagne liée</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
                {campaignsLoading && (
                  <p className="text-[11px] text-on-surface-variant">Chargement des campagnes...</p>
                )}
                {!campaignsLoading && campaignChannel && campaigns.length === 0 && (
                  <p className="text-[11px] text-on-surface-variant">
                    Aucune campagne trouvée pour ce canal.
                  </p>
                )}
                {!campaignChannel && (
                  <p className="text-[11px] text-on-surface-variant">
                    Disponible uniquement pour Email et SMS.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-secondary" htmlFor="automation-status">
                  Statut
                </label>
                <select
                  id="automation-status"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as DraftAutomation['status'],
                    }))
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-semibold text-secondary"
                  htmlFor="automation-template-id"
                >
                  Modèle associé (optionnel)
                </label>
                <input
                  id="automation-template-id"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-secondary outline-none transition focus:border-primary"
                  value={draft.templateId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, templateId: event.target.value }))
                  }
                  placeholder="Identifiant du modèle"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-bold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingId ? 'Enregistrer les modifications' : 'Créer le workflow'}
              </button>
            </form>

            <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs text-secondary">
              <p className="font-semibold">Points clés</p>
              <ul className="mt-2 space-y-1 text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-lime-600" />
                  Déclencheur contact ajouté ou intégration externe
                </li>
                <li className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
                  Délai configurable: immédiat, 30 min, 1h, 1 jour, personnalisé
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-lime-600" />
                  Compteur d'envois et activation sans perte de configuration
                </li>
              </ul>
            </div>

            <div className="mt-4 rounded-lg border border-outline-variant/30 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Modèles prêts à l'emploi
              </p>
              <div className="mt-3 space-y-2">
                {WORKFLOW_TEMPLATES.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${selectedTemplateKey === template.key ? 'border-primary bg-primary/10' : 'border-outline-variant/30 bg-surface hover:border-primary/30'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-secondary">{template.label}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {template.description}
                        </p>
                      </div>
                      <span className="rounded-full border border-outline-variant/20 px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                        Modèle
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {editorOpen && (
        <CanvasEditor
          automation={selectedAutomation}
          workflows={items}
          campaigns={campaigns}
          onSave={async (workflow) => {
            if (!selectedAutomation) return;
            try {
              setSaving(true);
              const updated = await automationsApi.update(selectedAutomation.id, { workflow });
              setItems((cur) => cur.map((it) => (it.id === updated.id ? updated : it)));
              setSelectedId(updated.id);
              toast.success(`Workflow “${updated.name}” enregistré et synchronisé`);
              setEditorOpen(false);
            } catch (err) {
              console.error(err);
              toast.error("Impossible d'enregistrer le workflow");
            } finally {
              setSaving(false);
            }
          }}
          onClose={() => setEditorOpen(false)}
          isSaving={saving}
        />
      )}
    </div>
  );
}
