import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AppShell } from './components/layout/AppShell';
import { OrderList } from './components/orders/OrderList';
import { ExpenseList } from './components/finance/ExpenseList';
import { BusinessList } from './components/businesses/BusinessList';
import { MaintenanceList } from './components/maintenance/MaintenanceList';
import { SettingsView } from './components/settings/SettingsView';
import { MapView } from './components/map/MapView';
import { AuthView } from './components/auth/AuthView';
import type { ActiveTab } from './types';
import { Bike, Loader2 } from 'lucide-react';

export interface UseTabNavigationReturn {
  activeTab: ActiveTab;
  setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>;
  handleSelectTab: (tab: ActiveTab) => void;
}

/**
 * Reusable tab navigation hook synchronizing active tab with browser history.
 * - Orders -> secondary tab: pushState
 * - Secondary tab -> secondary tab: replaceState
 * - Secondary tab -> orders: pushState
 * - Hardware / browser back (popstate): restores previous tab or returns to 'orders'
 */
export function useTabNavigation(defaultTab: ActiveTab = 'orders'): UseTabNavigationReturn {
  // Read history.state.tab synchronously as lazy initializer so initial mount
  // (and renderHook in tests) already has the correct tab from the very first render.
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined' && window.history?.state?.tab) {
      return window.history.state.tab as ActiveTab;
    }
    return defaultTab;
  });
  const activeTabRef = useRef<ActiveTab>(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.tab) {
        const nextTab = e.state.tab as ActiveTab;
        activeTabRef.current = nextTab;
        setActiveTab(nextTab);
      } else if (activeTabRef.current !== 'orders') {
        // Popped back to initial app state without tab property: return to primary tab
        activeTabRef.current = 'orders';
        setActiveTab('orders');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSelectTab = useCallback((tab: ActiveTab) => {
    if (tab === activeTabRef.current) return;

    if (typeof window !== 'undefined' && window.history?.pushState && window.history?.replaceState) {
      if (activeTabRef.current === 'orders' && tab !== 'orders') {
        window.history.pushState({ tab }, '');
      } else if (activeTabRef.current !== 'orders' && tab !== 'orders') {
        window.history.replaceState({ tab }, '');
      } else if (activeTabRef.current !== 'orders' && tab === 'orders') {
        window.history.pushState({ tab: 'orders' }, '');
      }
    }

    activeTabRef.current = tab;
    setActiveTab(tab);
  }, []);

  return { activeTab, setActiveTab, handleSelectTab };
}

export const AppContent: React.FC = () => {
  const { firebaseUser, isDemoMode, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined' && window.history?.state?.tab) {
      return window.history.state.tab as ActiveTab;
    }
    return 'orders';
  });
  const activeTabRef = useRef<ActiveTab>(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.tab) {
        const nextTab = e.state.tab as ActiveTab;
        activeTabRef.current = nextTab;
        setActiveTab(nextTab);
      } else if (activeTabRef.current !== 'orders') {
        // Popped back to initial app state without tab property: return to primary tab
        activeTabRef.current = 'orders';
        setActiveTab('orders');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSelectTab = useCallback((tab: ActiveTab) => {
    if (tab === activeTabRef.current) return;

    if (typeof window !== 'undefined' && window.history?.pushState && window.history?.replaceState) {
      if (activeTabRef.current === 'orders' && tab !== 'orders') {
        window.history.pushState({ tab }, '');
      } else if (activeTabRef.current !== 'orders' && tab !== 'orders') {
        window.history.replaceState({ tab }, '');
      } else if (activeTabRef.current !== 'orders' && tab === 'orders') {
        window.history.pushState({ tab: 'orders' }, '');
      }
    }

    activeTabRef.current = tab;
    setActiveTab(tab);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3 select-none">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
          <Bike className="w-8 h-8 animate-pulse stroke-[2.2]" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Cargando Cadete OS...</span>
        </div>
      </div>
    );
  }

  if (!firebaseUser && !isDemoMode) {
    return <AuthView />;
  }

  return (
    <AppShell activeTab={activeTab} onSelectTab={handleSelectTab}>
      {activeTab === 'orders' && <OrderList />}
      {activeTab === 'map' && <MapView />}
      {activeTab === 'finance' && <ExpenseList />}
      {activeTab === 'businesses' && <BusinessList />}
      {activeTab === 'maintenance' && <MaintenanceList />}
      {activeTab === 'settings' && <SettingsView />}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
