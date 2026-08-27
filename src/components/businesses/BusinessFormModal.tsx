import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusinesses } from '../../hooks/useBusinesses';
import type { Business, PaymentCycle } from '../../types';
import { Store, Phone, Plus, Check } from 'lucide-react';

export interface BusinessFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessToEdit?: Business;
}

export const BusinessFormModal: React.FC<BusinessFormModalProps> = ({
  isOpen,
  onClose,
  businessToEdit
}) => {
  const { addBusiness, updateBusiness } = useBusinesses();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [plantaUrbana, setPlantaUrbana] = useState<string>('1500');
  const [barrioCerca, setBarrioCerca] = useState<string>('2200');
  const [barrioLejos, setBarrioLejos] = useState<string>('3000');
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycle>('weekly');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (businessToEdit) {
        setName(businessToEdit.name);
        setPhone(businessToEdit.phone || '');
        setPlantaUrbana(String(businessToEdit.defaultPrices.plantaUrbana || ''));
        setBarrioCerca(String(businessToEdit.defaultPrices.barrioCerca || ''));
        setBarrioLejos(String(businessToEdit.defaultPrices.barrioLejos || ''));
        setPaymentCycle(businessToEdit.paymentCycle);
      } else {
        setName('');
        setPhone('');
        setPlantaUrbana('1500');
        setBarrioCerca('2200');
        setBarrioLejos('3000');
        setPaymentCycle('weekly');
      }
      setError('');
    }
  }, [isOpen, businessToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Ingresá el nombre del comercio');
      return;
    }

    const pu = parseFloat(plantaUrbana.replace(',', '.')) || 0;
    const bc = parseFloat(barrioCerca.replace(',', '.')) || 0;
    const bl = parseFloat(barrioLejos.replace(',', '.')) || 0;

    if (pu <= 0 || bc <= 0 || bl <= 0) {
      setError('Las tarifas de zona deben ser mayores a $0');
      return;
    }

    if (businessToEdit) {
      updateBusiness(businessToEdit.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        defaultPrices: {
          plantaUrbana: pu,
          barrioCerca: bc,
          barrioLejos: bl
        },
        paymentCycle
      });
    } else {
      addBusiness({
        name: name.trim(),
        phone: phone.trim() || undefined,
        defaultPrices: {
          plantaUrbana: pu,
          barrioCerca: bc,
          barrioLejos: bl
        },
        paymentCycle,
        active: true
      });
    }

    onClose();
  };

  const cycleOptions = [
    { value: 'daily', label: 'Diario (Fin de turno)' },
    { value: 'weekly', label: 'Semanal (ej: Domingos)' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'per_order', label: 'Por Pedido' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={businessToEdit ? 'Editar Comercio' : 'Nuevo Comercio'}
      subtitle="Configurá tarifas de viaje y ciclo de liquidación"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* 1. Nombre del Comercio */}
        <Input
          label="Nombre del Comercio o Cliente"
          placeholder="Ej: Pizzería Don Antonio"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftElement={<Store className="w-5 h-5 text-emerald-400" />}
          required
        />

        {/* 2. Teléfono WhatsApp */}
        <Input
          label="Teléfono WhatsApp (Para enviar resúmenes)"
          type="tel"
          inputMode="tel"
          placeholder="Ej: 2314551234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leftElement={<Phone className="w-5 h-5 text-zinc-400" />}
          helperText="Sin 0 ni 15. Usado para enviar resúmenes automáticos"
        />

        {/* 3. Tarifas por Zona */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Tarifas de Viaje por Zona ($)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Planta Urbana"
              type="text"
              inputMode="decimal"
              placeholder="1500"
              value={plantaUrbana}
              onChange={(e) => setPlantaUrbana(e.target.value)}
              required
            />
            <Input
              label="Barrio Cerca"
              type="text"
              inputMode="decimal"
              placeholder="2200"
              value={barrioCerca}
              onChange={(e) => setBarrioCerca(e.target.value)}
              required
            />
            <Input
              label="Barrio Lejos"
              type="text"
              inputMode="decimal"
              placeholder="3000"
              value={barrioLejos}
              onChange={(e) => setBarrioLejos(e.target.value)}
              required
            />
          </div>
        </div>

        {/* 4. Ciclo de Cobro */}
        <Select
          label="Ciclo de Liquidación Acordado"
          options={cycleOptions}
          value={paymentCycle}
          onChange={(e) => setPaymentCycle(e.target.value as PaymentCycle)}
        />

        {/* Botón Guardar */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={businessToEdit ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6 stroke-[3]" />}
          >
            {businessToEdit ? 'Guardar Cambios' : 'Crear Comercio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
