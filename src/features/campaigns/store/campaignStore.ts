import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Campaign, CampaignBlock, ABConfig } from '../types/campaign';

interface CampaignState {
  currentCampaign: Partial<Campaign> | null;
  blocks: CampaignBlock[];
  abConfig: ABConfig;
  scheduledAt: string | null;
  timezone: string;
  smsText: string;

  setCampaignField: (field: string, value: unknown) => void;
  addBlock: (block: CampaignBlock) => void;
  updateBlock: (id: string, updates: Partial<CampaignBlock>) => void;
  removeBlock: (id: string) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  setABConfig: (config: Partial<ABConfig>) => void;
  setSchedule: (date: string, tz: string) => void;
  setSmsText: (text: string) => void;
  resetCampaign: () => void;
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set) => ({
      currentCampaign: null,
      blocks: [],
      abConfig: {
        subjectA: '',
        subjectB: '',
        splitPct: 20,
        victoryMetric: 'open',
        testDuration: 4,
      },
      scheduledAt: null,
      timezone: 'Africa/Abidjan',
      smsText: '',

      setCampaignField: (field, value) =>
        set((state) => ({
          currentCampaign: { ...state.currentCampaign, [field]: value },
        })),
      addBlock: (block) => set((state) => ({ blocks: [...state.blocks, block] })),
      updateBlock: (id, updates) =>
        set((state) => ({
          blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      removeBlock: (id) => set((state) => ({ blocks: state.blocks.filter((b) => b.id !== id) })),
      reorderBlocks: (from, to) =>
        set((state) => {
          const newBlocks = [...state.blocks];
          const [moved] = newBlocks.splice(from, 1);
          newBlocks.splice(to, 0, moved);
          return { blocks: newBlocks };
        }),
      setABConfig: (config) => set((state) => ({ abConfig: { ...state.abConfig, ...config } })),
      setSchedule: (date, tz) => set({ scheduledAt: date, timezone: tz }),
      setSmsText: (text) => set({ smsText: text }),
      resetCampaign: () =>
        set({
          currentCampaign: null,
          blocks: [],
          abConfig: {
            subjectA: '',
            subjectB: '',
            splitPct: 20,
            victoryMetric: 'open',
            testDuration: 4,
          },
          scheduledAt: null,
          smsText: '',
        }),
    }),
    { name: 'nova-campaign-draft' },
  ),
);
