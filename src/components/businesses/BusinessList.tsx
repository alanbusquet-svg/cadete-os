import React, { useState } from 'react';
import { Plus, Store, Phone, Edit, Trash2, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { useBusinesses } from '../../hooks/useBusinesses';
import { BusinessFormModal } from './BusinessFormModal';
import { BusinessDebtModal } from './BusinessDebtModal';
import { BusinessProfitabilityCard } from './BusinessProfitabilityCard';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/formatting';
import type { Business } from '../../types';

export const BusinessList: React.FC = () => {
  const { businesses, debts, totalPendingDebt, deleteBusiness } = useBusinesses();

  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [businessToEdit, setBusinessToEdit] = useState<Business | undefined>(undefined);

  const [selectedDebtBusiness, setSelectedDebtBusiness] = useState<Business | null>(null);

  const handleEdit = (business: Business) => {
    setBusinessToEdit(business);
    setIsFormModalOpen(true);
  };

  const handleCreate = () => {
    setBusinessToEdit(undefined);
    setIsFormModalOpen(true);
  };

  const handleDelete = (businessId: string, name: string) => {
    if (window.confirm(`¿Eliminar el comercio "${name}"?`)) {
      deleteBusiness(businessId);
    }
  };

  const getCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'daily':
        return 'Diario';
      case 'weekly':
        return 'Semanal';
      case 'biweekly':
        return 'Quincenal';
      case 'monthly':
        return 'Mensual';
      case 'per_order':
        return 'Por Pedido';
      default:
        return cycle;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner: Total Pending Accounts Receivable & CTA */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Total Cuentas Corrientes
              </span>
              <span className="text-3xl font-black text-amber-400 tracking-tight mt-0.5">
                {formatCurrency(totalPendingDebt)}
              </span>
              <span className="text-xs text-zinc-400">
                Pendiente por liquidar de comercios
              </span>
            </div>
          </div>

          {/* CTA Crear Comercio */}
          <div className="sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreate}
              leftIcon={<Plus className="w-6 h-6 stroke-[3]" />}
            >
              Nuevo Comercio
            </Button>
          </div>
        </div>
      </div>

      {/* Responsive Grid: R4 Business Profitability Card + Businesses List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column (Desktop): R4 Business Profitability Ranking */}
        <div className="space-y-4">
          <BusinessProfitabilityCard />
        </div>

        {/* Right Column: Registered Businesses List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Comercios Registrados ({businesses.length})
            </h4>
          </div>

          {businesses.length > 0 ? (
            businesses.map((business) => {
              const debtInfo = debts.find((d) => d.businessId === business.id);
              const hasDebt = (debtInfo?.totalDebt || 0) > 0;

              return (
                <div
                  key={business.id}
                  className={`bg-zinc-900 border rounded-3xl p-4 transition-all shadow-sm ${
                    hasDebt
                      ? 'border-amber-500/40 shadow-amber-950/20'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Header: Name + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="font-bold text-base text-zinc-100 truncate">
                          {business.name}
                        </span>
                      </div>

                      {business.phone && (
                        <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{business.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(business)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Editar comercio"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(business.id, business.name)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                        title="Eliminar comercio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tariffs Breakdown */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-zinc-800/60 text-center">
                    <div className="bg-zinc-950/60 p-2 rounded-2xl border border-zinc-800/60 flex flex-col">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400">
                        Urbana
                      </span>
                      <span className="text-xs font-black text-zinc-200 mt-0.5">
                        ${business.defaultPrices.plantaUrbana}
                      </span>
                    </div>

                    <div className="bg-zinc-950/60 p-2 rounded-2xl border border-zinc-800/60 flex flex-col">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400">
                        B. Cerca
                      </span>
                      <span className="text-xs font-black text-zinc-200 mt-0.5">
                        ${business.defaultPrices.barrioCerca}
                      </span>
                    </div>

                    <div className="bg-zinc-950/60 p-2 rounded-2xl border border-zinc-800/60 flex flex-col">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400">
                        B. Lejos
                      </span>
                      <span className="text-xs font-black text-zinc-200 mt-0.5">
                        ${business.defaultPrices.barrioLejos}
                      </span>
                    </div>
                  </div>

                  {/* Badges & Debt Action */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-zinc-800/60">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="zinc" size="sm">
                        Ciclo: {getCycleLabel(business.paymentCycle)}
                      </Badge>
                    </div>

                    {hasDebt ? (
                      <button
                        onClick={() => setSelectedDebtBusiness(business)}
                        className="min-h-[44px] px-3.5 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/30 transition-all active:scale-95"
                      >
                        <span>Cobrar {formatCurrency(debtInfo!.totalDebt)}</span>
                        <ChevronRight className="w-4 h-4 stroke-[3]" />
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Al día
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl text-xs text-zinc-400">
              No tenés comercios dados de alta. Tocá "Nuevo Comercio" para comenzar.
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <BusinessFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        businessToEdit={businessToEdit}
      />

      {/* Debt Modal */}
      <BusinessDebtModal
        isOpen={selectedDebtBusiness !== null}
        onClose={() => setSelectedDebtBusiness(null)}
        business={selectedDebtBusiness}
      />
    </div>
  );
};
