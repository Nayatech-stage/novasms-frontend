import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import OnboardingTour from './OnboardingTour';
import { useUiStore } from '@/stores/uiStore';

export default function AppLayout() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUiStore();

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Skip link WCAG 2.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu principal
      </a>

      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main id="main-content" className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}
