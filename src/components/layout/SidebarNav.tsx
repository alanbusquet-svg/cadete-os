import React from 'react';
import { Bike, Map, Wallet, Store, Wrench, Settings, ShieldCheck, ChevronRight, Sparkles, Zap, LogOut } from 'lucide-react';
import type { ActiveTab } from '../../types';
import { useOrders } from '../../hooks/useOrders';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useOilTracker } from '../../hooks/useOilTracker';
import { useFinancials } from '../../hooks/useFinancials';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatting';
import { cn } from '../../lib/utils';

export interface SidebarNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, onSelectTab }) => {
  const { dayOrders } = useOrders();
  const { totalPendingDebt } = useBusinesses();
  const { status: oilStatus, ordersSinceLastChange } = useOilTracker();
  const { summary } = useFinancials();
  const { user, isDemoMode, trialInfo, logout, exitDemoMode } = useAuth();

  const navItems = [
    {
      id: 'orders' as ActiveTab,
      label: 'Viajes',
      description: 'Carga rápida e historial',
      icon: Bike,
      badge: dayOrders.length > 0 ? `${dayOrders.length}` : null,
      badgeColor: 'bg-emerald-500 text-zinc-950'
    },
    {
      id: 'map' as ActiveTab,
      label: 'Mapa en Vivo',
      description: 'GPS y entregas en Bolívar',
      icon: Map,
      badge: dayOrders.filter((o) => !o.settled).length > 0 ? `${dayOrders.filter((o) => !o.settled).length}` : null,
      badgeColor: 'bg-emerald-500 text-zinc-950'
    },
    {
      id: 'finance' as ActiveTab,
      label: 'Finanzas',
      description: 'Arqueo, caja y gastos',
      icon: Wallet,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'businesses' as ActiveTab,
      label: 'Comercios',
      description: 'Cuentas corrientes y tarifas',
      icon: Store,
      badge: totalPendingDebt > 0 ? '!' : null,
      badgeColor: 'bg-amber-500 text-zinc-950'
    },
    {
      id: 'maintenance' as ActiveTab,
      label: 'Taller',
      description: 'Odómetro virtual y service',
      icon: Wrench,
      badge: oilStatus === 'red' ? '!' : oilStatus === 'yellow' ? '•' : null,
      badgeColor: oilStatus === 'red' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-zinc-950'
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Ajustes',
      description: 'Metas, perfil y backup',
      icon: Settings,
      badge: null,
      badgeColor: ''
    }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-zinc-950 border-r border-zinc-800/80 p-5 h-screen sticky top-0 shrink-0 z-30 justify-between select-none">
      {/* 1. Header / Brand & User Profile */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-1">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950/40 shrink-0">
            <Bike className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-tight text-lg text-zinc-100">CADETE OS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {user?.settings?.cityDefault || 'Bolívar'}
              </span>
            </div>
            <span className="text-xs text-zinc-400 font-medium truncate">
              {user?.displayName || 'Cadete en Moto'}
            </span>
          </div>
        </div>

        {/* Trial or Demo Mode Status Card */}
        {isDemoMode ? (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-amber-300">Modo Demo</span>
                <span className="text-[10px] text-zinc-400 truncate">Datos locales</span>
              </div>
            </div>
            <button
              type="button"
              onClick={exitDemoMode}
              className="px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition-colors shrink-0"
            >
              Crear Cuenta
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-emerald-300">
                  {trialInfo.isExpired ? 'Prueba Vencida' : `Prueba: ${trialInfo.daysRemaining} días`}
                </span>
                <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                  {user?.email || 'Nube Activa'}
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              7 Días
            </span>
          </div>
        )}

        {/* 2. Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={cn(
                  'w-full min-h-[52px] px-3.5 py-3 rounded-2xl text-left flex items-center justify-between gap-3 transition-all duration-150',
                  isActive
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent font-medium'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      isActive
                        ? 'bg-emerald-500 text-zinc-950 shadow'
                        : 'bg-zinc-900 text-zinc-400 group-hover:text-zinc-200'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate leading-tight text-zinc-100">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-zinc-400 truncate leading-tight">
                      {item.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span
                      className={cn(
                        'min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center shadow-md',
                        item.badgeColor
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom Summary / Status Widget & Logout */}
      <div className="space-y-3 pt-4 border-t border-zinc-800/80">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Arqueo Turno
            </span>
            <span
              className={cn(
                'font-black text-sm',
                summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {formatCurrency(summary.netProfit)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-800/60">
            <div>
              <span className="text-zinc-400 block">Efectivo:</span>
              <span className="font-bold text-zinc-200">{formatCurrency(summary.cashInPocket)}</span>
            </div>
            <div>
              <span className="text-zinc-400 block">En Cuenta:</span>
              <span className="font-bold text-zinc-200">{formatCurrency(summary.moneyInAccount)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400">
            <span>Aceite ({ordersSinceLastChange} v.)</span>
            <span
              className={cn(
                'font-bold px-1.5 py-0.5 rounded text-[10px] uppercase',
                oilStatus === 'green'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : oilStatus === 'yellow'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              )}
            >
              {oilStatus === 'green' ? 'OK' : oilStatus === 'yellow' ? 'Pronto' : 'Cambiar'}
            </span>
          </div>
        </div>

        {/* Logout / Exit button */}
        <button
          type="button"
          onClick={() => logout()}
          className="w-full min-h-[44px] px-3 py-2 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isDemoMode ? 'Salir de Modo Demo' : 'Cerrar Sesión'}</span>
        </button>
      </div>
    </aside>
  );
};
