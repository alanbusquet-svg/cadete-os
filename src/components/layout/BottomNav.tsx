import React from 'react';
import { Bike, Map, Wallet, Store, Wrench, Settings } from 'lucide-react';
import type { ActiveTab } from '../../types';
import { useOrders } from '../../hooks/useOrders';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useOilTracker } from '../../hooks/useOilTracker';
import { cn } from '../../lib/utils';

export interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const { dayOrders } = useOrders();
  const { totalPendingDebt } = useBusinesses();
  const { status: oilStatus } = useOilTracker();

  const pendingDeliveriesCount = dayOrders.filter((o) => !o.settled).length;

  const navItems = [
    {
      id: 'orders' as ActiveTab,
      label: 'Viajes',
      icon: Bike,
      badge: dayOrders.length > 0 ? String(dayOrders.length) : null,
      badgeColor: 'bg-emerald-500 text-zinc-950'
    },
    {
      id: 'map' as ActiveTab,
      label: 'Mapa',
      icon: Map,
      badge: pendingDeliveriesCount > 0 ? String(pendingDeliveriesCount) : null,
      badgeColor: 'bg-emerald-500 text-zinc-950'
    },
    {
      id: 'finance' as ActiveTab,
      label: 'Finanzas',
      icon: Wallet,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'businesses' as ActiveTab,
      label: 'Comercios',
      icon: Store,
      badge: totalPendingDebt > 0 ? '!' : null,
      badgeColor: 'bg-amber-500 text-zinc-950'
    },
    {
      id: 'maintenance' as ActiveTab,
      label: 'Taller',
      icon: Wrench,
      badge: oilStatus === 'red' ? '!' : oilStatus === 'yellow' ? '•' : null,
      badgeColor: oilStatus === 'red' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-zinc-950'
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Ajustes',
      icon: Settings,
      badge: null,
      badgeColor: ''
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-40 md:hidden bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/80 px-1.5 py-1.5">
      <div className="flex items-center justify-around w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center min-h-[52px] min-w-[50px] sm:min-w-[56px] py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95',
                isActive
                  ? 'text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              )}
              aria-label={item.label}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6 transition-transform', isActive ? 'scale-110' : '')} />
                {item.badge && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-md',
                      item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight truncate max-w-[54px] text-center">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

