import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useData } from '../../context/DataContext';
import type { ExpenseCategory, PaymentMethodType } from '../../types';
import { Fuel, Utensils, Disc, Smartphone, MoreHorizontal, Plus, DollarSign } from 'lucide-react';

export interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ isOpen, onClose }) => {
  const { addExpense, selectedDate } = useData();

  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [description, setDescription] = useState<string>('Nafta Súper');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [error, setError] = useState<string>('');

  const categories = [
    { id: 'fuel' as ExpenseCategory, label: 'Nafta', icon: Fuel, defaultDesc: 'Nafta Súper' },
    { id: 'food' as ExpenseCategory, label: 'Comida', icon: Utensils, defaultDesc: 'Almuerzo / Bebida' },
    { id: 'puncture' as ExpenseCategory, label: 'Pinchadura', icon: Disc, defaultDesc: 'Parche Gomería' },
    { id: 'phone' as ExpenseCategory, label: 'Celular', icon: Smartphone, defaultDesc: 'Carga de Datos' },
    { id: 'other' as ExpenseCategory, label: 'Otros', icon: MoreHorizontal, defaultDesc: 'Gasto Operativo' }
  ];

  const handleSelectCategory = (cat: ExpenseCategory, defaultDesc: string) => {
    setCategory(cat);
    if (!description || categories.some((c) => c.defaultDesc === description)) {
      setDescription(defaultDesc);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un importe válido mayor a 0');
      return;
    }

    if (!description.trim()) {
      setError('Ingresá una breve descripción del gasto');
      return;
    }

    addExpense({
      date: selectedDate,
      category,
      description: description.trim(),
      amount: parsedAmount,
      paymentMethod
    });

    // Reset
    setAmount('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Gasto"
      subtitle="Descontá combustible, comida o reparaciones"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* 1. Categoría de Gasto con Touch Chips */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Categoría
          </label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id, cat.defaultDesc)}
                  className={`min-h-[52px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Importe con Teclado Numérico */}
        <Input
          label="Monto del Gasto ($)"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          leftElement={<DollarSign className="w-5 h-5 text-rose-400" />}
          required
        />

        {/* 3. Descripción */}
        <Input
          label="Detalle / Descripción"
          placeholder="Ej: Nafta Súper YPF"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* 4. Medio de Pago del Gasto */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            ¿Cómo lo pagaste?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`min-h-[52px] rounded-2xl border font-bold text-sm transition-all ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              Efectivo del Bolsillo
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('transfer')}
              className={`min-h-[52px] rounded-2xl border font-bold text-sm transition-all ${
                paymentMethod === 'transfer'
                  ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              Transferencia / MP
            </button>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="danger"
            size="lg"
            fullWidth
            leftIcon={<Plus className="w-6 h-6 stroke-[3]" />}
          >
            Guardar Gasto
          </Button>
        </div>
      </form>
    </Modal>
  );
};
