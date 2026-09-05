import React, { type ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SidebarNav } from './SidebarNav';
import type { ActiveTab } from '../../types';

export interface AppShellProps {
  children: ReactNode;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  onSelectTab
}) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row selection:bg-emerald-500/30">
      {/* Desktop Fixed Sidebar */}
      <SidebarNav activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header />
        
        {/* Responsive Content Container:
            Mobile: max-w-md centered with bottom padding for BottomNav (pb-28)
            Desktop: full width max-w-7xl with generous padding and 0 bottom padding (md:pb-0)
        */}
        <main className="flex-1 w-full max-w-md md:max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-28 md:pb-0 space-y-5">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (<768px only) */}
        <div className="md:hidden">
          <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} />
        </div>
      </div>
    </div>
  );
};
