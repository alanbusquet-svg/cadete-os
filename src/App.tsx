import React, { useState } from 'react';
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

export const AppContent: React.FC = () => {
  const { firebaseUser, isDemoMode, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');

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
    <AppShell activeTab={activeTab} onSelectTab={setActiveTab}>
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
