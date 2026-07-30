import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  /** Dashboard actif : 1 = KPIs/Analytics, 2 = Vue opérationnelle */
  activeDashboard: 1 | 2;
  toggleDashboard: () => void;
  setDashboard: (d: 1 | 2) => void;
  /** Sidebar repliée (desktop) */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  /** Sidebar ouverte sur mobile */
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeDashboard: 1,
      toggleDashboard: () => set((s) => ({ activeDashboard: s.activeDashboard === 1 ? 2 : 1 })),
      setDashboard: (d) => set({ activeDashboard: d }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      mobileSidebarOpen: false,
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
    }),
    { name: 'novasms-ui' },
  ),
);
