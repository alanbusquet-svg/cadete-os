import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { openNavigation, isValidAddress } from '../../utils/navigation';
import { speakSuccess } from '../../utils/speech';
import type { ZoneType, PayerType, PaymentMethodType } from '../../types';
import { Navigation, MapPin, Plus, DollarSign, Phone, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({ isOpen, onClose }) => {
  const { activeBusinesses } = useBusinesses();
  const { addOrder, selectedDate } = useData();
  const { user } = useAuth();
  const city = user.settings?.cityDefault || 'San Carlos de Bolívar';
  const country = user.settings?.countryDefault || 'Argentina';

  const [businessId, setBusinessId] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [zone, setZone] = useState<ZoneType>('planta_urbana');
  const [amount, setAmount] = useState<string>('');
  const [paidBy, setPaidBy] = useState<PayerType>('customer');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [settled, setSettled] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);

  // Pre-select first business when modal opens & reset accordion to collapsed state
  useEffect(() => {
    if (isOpen) {
      if (activeBusinesses.length > 0 && !businessId) {
        setBusinessId(activeBusinesses[0]?.id || '');
      }
      setShowMoreOptions(false);
      setError('');
    }
  }, [isOpen, activeBusinesses, businessId]);

  // Selected business object
  const selectedBusiness = activeBusinesses.find((b) => b.id === businessId);

  // Auto-fill price when business or zone changes
  useEffect(() => {
    if (!selectedBusiness) return;

    if (zone === 'planta_urbana') {
      setAmount(String(selectedBusiness.defaultPrices.plantaUrbana || ''));
    } else if (zone === 'barrio_cerca') {
      setAmount(String(selectedBusiness.defaultPrices.barrioCerca || ''));
    } else if (zone === 'barrio_lejos') {
      setAmount(String(selectedBusiness.defaultPrices.barrioLejos || ''));
    }
  }, [businessId, zone, selectedBusiness]);

  // Adjust settled default based on paidBy
  const handlePayerChange = (payer: PayerType) => {
    setPaidBy(payer);
    if (payer === 'business') {
      setSettled(false); // Cta Cte
    } else {
      setSettled(true); // Direct customer payment
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      setError('Seleccioná un comercio');
      return;
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresá un importe válido mayor a 0');
      return;
    }

    const businessName = selectedBusiness ? selectedBusiness.name : 'Comercio';

    addOrder({
      date: selectedDate,
      businessId,
      businessName,
      address: address.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      zone,
      amount: parsedAmount,
      paidBy,
      paymentMethod,
      settled,
      notes: notes.trim() || undefined
    });

    // Audio confirmation for cadete
    try {
      speakSuccess(parsedAmount);
    } catch {
      // Safe fallback
    }

    // Reset form
    setAddress('');
    setCustomerPhone('');
    setNotes('');
    setShowMoreOptions(false);
    setError('');
    onClose();
  };

  const businessOptions = activeBusinesses.map((b) => ({
    value: b.id,
    label: b.name
  }));

  const zonePrices = selectedBusiness?.defaultPrices;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Viaje"
      subtitle="Carga rápida de pedido en 3 segundos"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* 1. CORE: Selector de Comercio */}
        {businessOptions.length > 0 ? (
          <Select
            label="Comercio"
            options={businessOptions}
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
          />
        ) : (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            No tenés comercios activos. Podés crearlos en la pestaña Comercios.
          </div>
        )}

        {/* 2. CORE: Selector de Zona con Tarifa Rápida */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Zona de Entrega
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setZone('planta_urbana')}
              className={`min-h-[52px] p-2.5 rounded-2xl border text-left flex flex-col justify-center transition-all ${
                zone === 'planta_urbana'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <span className="text-xs">Planta Urbana</span>
              <span className="text-sm font-black">
                {zonePrices?.plantaUrbana ? `$${zonePrices.plantaUrbana}` : 'Tarifa 1'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setZone('barrio_cerca')}
              className={`min-h-[52px] p-2.5 rounded-2xl border text-left flex flex-col justify-center transition-all ${
                zone === 'barrio_cerca'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <span className="text-xs">Barrio Cerca</span>
              <span className="text-sm font-black">
                {zonePrices?.barrioCerca ? `$${zonePrices.barrioCerca}` : 'Tarifa 2'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setZone('barrio_lejos')}
              className={`min-h-[52px] p-2.5 rounded-2xl border text-left flex flex-col justify-center transition-all ${
                zone === 'barrio_lejos'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <span className="text-xs">Barrio Lejos</span>
              <span className="text-sm font-black">
                {zonePrices?.barrioLejos ? `$${zonePrices.barrioLejos}` : 'Tarifa 3'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setZone('custom')}
              className={`min-h-[52px] p-2.5 rounded-2xl border text-left flex flex-col justify-center transition-all ${
                zone === 'custom'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <span className="text-xs">Personalizado</span>
              <span className="text-sm font-black">Manual</span>
            </button>
          </div>
        </div>

        {/* 3. CORE: Importe con Teclado Numérico */}
        <Input
          label="Importe del Viaje ($)"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          leftElement={<DollarSign className="w-5 h-5 text-emerald-400" />}
          required
        />

        {/* 4. CORE: Quién Paga (Cliente vs Comercio) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            ¿Quién paga el viaje?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePayerChange('customer')}
              className={`min-h-[52px] rounded-2xl border font-bold text-sm transition-all ${
                paidBy === 'customer'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              Cliente (En Puerta)
            </button>
            <button
              type="button"
              onClick={() => handlePayerChange('business')}
              className={`min-h-[52px] rounded-2xl border font-bold text-sm transition-all ${
                paidBy === 'business'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              Comercio (Cta Cte)
            </button>
          </div>
        </div>

        {/* ACCORDION TOGGLE: + Más opciones / - Menos opciones */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            className={cn(
              'w-full min-h-[44px] py-2.5 px-4 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all',
              showMoreOptions
                ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            )}
            aria-expanded={showMoreOptions}
          >
            <span className="flex items-center gap-2">
              <span>{showMoreOptions ? '- Menos opciones' : '+ Más opciones'}</span>
              {!showMoreOptions && (
                <span className="text-[10px] text-zinc-500 font-normal">
                  (Pago, GPS, Teléfono, Notas)
                </span>
              )}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-zinc-400 transition-transform duration-200',
                showMoreOptions && 'rotate-180 text-emerald-400'
              )}
            />
          </button>
        </div>

        {/* COLLAPSIBLE SECTION: Optional Fields */}
        {showMoreOptions && (
          <div className="space-y-4 pt-1 border-t border-zinc-800/60 transition-all duration-200 animate-in fade-in slide-in-from-top-2">
            {/* Medio de Pago & Estado de Cobro */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Medio de Pago
                </label>
                <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 min-h-[52px]">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`rounded-xl text-xs font-bold transition-colors ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-500 text-zinc-950 shadow'
                        : 'text-zinc-400'
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`rounded-xl text-xs font-bold transition-colors ${
                      paymentMethod === 'transfer'
                        ? 'bg-sky-500 text-zinc-950 shadow'
                        : 'text-zinc-400'
                    }`}
                  >
                    Transf.
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Estado de Cobro
                </label>
                <button
                  type="button"
                  onClick={() => setSettled(!settled)}
                  className={`min-h-[52px] rounded-2xl border text-xs font-bold px-3 transition-colors ${
                    settled
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                  }`}
                >
                  {settled ? '✓ Cobrado al Instante' : '⏳ Pendiente Cta Cte'}
                </button>
              </div>
            </div>

            {/* Dirección de Entrega con botón GPS */}
            <div className="flex flex-col gap-1.5">
              <Input
                label={`Dirección de Entrega (${city})`}
                placeholder="Ej: Av. San Martín 450"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                leftElement={<MapPin className="w-5 h-5 text-zinc-400" />}
                rightElement={
                  isValidAddress(address) ? (
                    <button
                      type="button"
                      onClick={() => openNavigation(address, 'google', city, country)}
                      className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      title="Probar GPS Google Maps"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  ) : undefined
                }
              />
            </div>

            {/* Teléfono del Cliente (WhatsApp) */}
            <Input
              label="Teléfono del Cliente (WhatsApp)"
              type="tel"
              inputMode="tel"
              placeholder="Ej: 2314 551234"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              leftElement={<Phone className="w-5 h-5 text-emerald-400" />}
              helperText="Opcional: Permite avisar 'Estoy afuera 🛵' con 1 toque"
            />

            {/* Notas adicionales */}
            <Input
              label="Notas / Aclaraciones"
              placeholder="Ej: Paga con $5.000, timbre blanco"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        {/* CORE 5: Botón Principal Guardar */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<Plus className="w-6 h-6" />}
          >
            Guardar Viaje
          </Button>
        </div>
      </form>
    </Modal>
  );
};
