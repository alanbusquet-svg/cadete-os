import React, { useState } from 'react';
import { Plus, Wrench, Droplet, Calendar, Trash2 } from 'lucide-react';
import { useMaintenance } from '../../hooks/useMaintenance';
import { OilOdometerCard } from './OilOdometerCard';
import { MaintenanceFormModal } from './MaintenanceFormModal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDateAR } from '../../utils/formatting';

export const MaintenanceList: React.FC = () => {
  const { maintenance, deleteMaintenance } = useMaintenance();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [defaultIsOil, setDefaultIsOil] = useState<boolean>(false);

  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

  const handleOpenGeneral = () => {
    setDefaultIsOil(false);
    setIsModalOpen(true);
  };

  const handleOpenOilReset = () => {
    setDefaultIsOil(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, item: string) => {
    if (window.confirm(`¿Eliminar el registro "${item}"?`)) {
      deleteMaintenance(id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Responsive 2-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Oil Odometer + Investment Summary */}
        <div className="space-y-5">
          {/* 1. Tarjeta Principal Odómetro de Aceite */}
          <OilOdometerCard onQuickReset={handleOpenOilReset} />

          {/* 2. Resumen de Inversión en la Moto & CTA */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Total Invertido en la Moto
                </span>
                <span className="text-2xl font-black text-zinc-100 mt-0.5">
                  {formatCurrency(totalMaintenanceCost)}
                </span>
              </div>

              <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Wrench className="w-5 h-5" />
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleOpenGeneral}
              leftIcon={<Plus className="w-6 h-6 stroke-[3]" />}
            >
              Registrar Reparación o Repuesto
            </Button>
          </div>
        </div>

        {/* Right Column: Maintenance History List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
            Historial de Mantenimiento ({maintenance.length})
          </h4>

          {maintenance.length > 0 ? (
            <div className="space-y-2">
              {maintenance.map((record) => (
                <div
                  key={record.id}
                  className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        record.isOilChange
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {record.isOilChange ? (
                        <Droplet className="w-5 h-5" />
                      ) : (
                        <Wrench className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100 truncate">
                          {record.item}
                        </span>
                        {record.isOilChange && (
                          <Badge variant="amber" size="sm">
                            Reset Aceite
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDateAR(record.date)}
                        </span>
                        {record.ordersSnapshot !== undefined && record.ordersSnapshot > 0 && (
                          <span>• A los {record.ordersSnapshot} viajes</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {record.cost > 0 && (
                      <span className="text-sm font-black text-zinc-200">
                        {formatCurrency(record.cost)}
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(record.id, record.item)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl text-xs text-zinc-400">
              No hay registros de taller.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <MaintenanceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultIsOilChange={defaultIsOil}
      />
    </div>
  );
};
