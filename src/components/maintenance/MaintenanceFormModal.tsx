import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useMaintenance } from '../../hooks/useMaintenance';
import { getTodayDateString } from '../../utils/formatting';
import { Wrench, DollarSign, Calendar, Plus, Droplet } from 'lucide-react';

export interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIsOilChange?: boolean;
}

export const MaintenanceFormModal: React.FC<MaintenanceFormModalProps> = ({
  isOpen,
  onClose,
  defaultIsOilChange = false
}) => {
  const { addMaintenance } = useMaintenance();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [item, setItem] = useState<string>(defaultIsOilChange ? 'Aceite Castrol 20W-50 y Filtro' : '');
  const [cost, setCost] = useState<string>('');
  const [isOilChange, setIsOilChange] = useState<boolean>(defaultIsOilChange);
  const [error, setError] = useState<string>('');

  const quickItems = [
    'Aceite Castrol 20W-50',
    'Transmisión completa',
    'Cinta de freno trasero',
    'Pastillas de freno delantero',
    'Cubierta delantera',
    'Cubierta trasera',
    'Parche de cámara'
  ];

  const handleSelectQuickItem = (desc: string) => {
    setItem(desc);
    if (desc.toLowerCase().includes('aceite')) {
      setIsOilChange(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!item.trim()) {
      setError('Ingresá el detalle del mantenimiento o repuesto');
      return;
    }

    const parsedCost = parseFloat(cost.replace(',', '.')) || 0;

    addMaintenance({
      date,
      item: item.trim(),
      cost: parsedCost,
      isOilChange
    });

    // Reset
    setItem('');
    setCost('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isOilChange ? 'Registrar Cambio de Aceite' : 'Mantenimiento de Moto'}
      subtitle="Control preventivo para motos de reparto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* 1. Toggle Cambio de Aceite */}
        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOilChange ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
              <Droplet className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-100">
                ¿Es un Cambio de Aceite?
              </span>
              <span className="text-[11px] text-zinc-400">
                Reinicia el contador virtual de viajes
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isOilChange}
            onChange={(e) => {
              setIsOilChange(e.target.checked);
              if (e.target.checked && !item) {
                setItem('Aceite Castrol 20W-50 y Filtro');
              }
            }}
            className="w-6 h-6 rounded-lg accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* 2. Detalle / Item */}
        <Input
          label="Trabajo realizado o Repuesto"
          placeholder="Ej: Transmisión corona y piñón"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          leftElement={<Wrench className="w-5 h-5 text-emerald-400" />}
          required
        />

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5">
          {quickItems.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSelectQuickItem(q)}
              className="text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-xl transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* 3. Costo */}
        <Input
          label="Costo Total del Trabajo ($)"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          leftElement={<DollarSign className="w-5 h-5 text-zinc-400" />}
          helperText="Opcional para llevar el gasto histórico de la moto"
        />

        {/* 4. Fecha */}
        <Input
          label="Fecha del Service"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          leftElement={<Calendar className="w-5 h-5 text-zinc-400" />}
          required
        />

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<Plus className="w-6 h-6 stroke-[3]" />}
          >
            Guardar en Historial
          </Button>
        </div>
      </form>
    </Modal>
  );
};
