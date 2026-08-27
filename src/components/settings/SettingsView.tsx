import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Settings,
  User,
  Shield,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Target
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { exportData, importData, resetData } = useData();

  const [displayName, setDisplayName] = useState<string>(user.displayName || 'Cadete Bolívar');
  const [dailyGoal, setDailyGoal] = useState<string>(
    user.settings?.dailyGoal ? String(user.settings.dailyGoal) : ''
  );
  const [thresholdOrders, setThresholdOrders] = useState<string>(
    String(user.settings?.oilChangeThresholdOrders || 250)
  );
  const [thresholdDays, setThresholdDays] = useState<string>(
    String(user.settings?.oilChangeThresholdDays || 30)
  );
  const [cityDefault, setCityDefault] = useState<string>(
    user.settings?.cityDefault || 'San Carlos de Bolívar'
  );
  const [countryDefault, setCountryDefault] = useState<string>(
    user.settings?.countryDefault || 'Argentina'
  );

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const ordersNum = parseInt(thresholdOrders, 10) || 250;
    const daysNum = parseInt(thresholdDays, 10) || 30;
    const goalNum = dailyGoal.trim() ? parseFloat(dailyGoal.replace(',', '.')) : undefined;

    updateProfile({
      displayName: displayName.trim(),
      settings: {
        currency: 'ARS',
        cityDefault: cityDefault.trim(),
        countryDefault: countryDefault.trim() || 'Argentina',
        oilChangeThresholdOrders: ordersNum,
        oilChangeThresholdDays: daysNum,
        dailyGoal: goalNum && goalNum > 0 ? goalNum : undefined
      }
    });

    showNotification('success', 'Configuración guardada correctamente');
  };

  const handleExportBackup = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadete-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Copia de seguridad descargada');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = importData(content);
        if (success) {
          showNotification('success', 'Datos importados exitosamente');
        } else {
          showNotification('error', 'Error al procesar el archivo JSON');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    resetData();
    setIsResetConfirmOpen(false);
    showNotification('success', 'Datos restaurados a valores iniciales');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-300 flex items-center justify-center">
          <Settings className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-zinc-100">Ajustes del Sistema</h2>
          <p className="text-xs text-zinc-400">Personalización, metas de ganancia y copias de seguridad</p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Responsive Grid for Settings Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Formulario de Perfil, Meta Diaria y Umbrales */}
        <form onSubmit={handleSaveProfile} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Perfil y Metas Operativas</span>
          </h3>

          <Input
            label="Nombre del Cadete"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          {/* R5: Meta de Ganancia Diaria */}
          <Input
            label="Meta de Ganancia Diaria ($ ARS)"
            type="text"
            inputMode="decimal"
            placeholder="Ej: 30000"
            value={dailyGoal}
            onChange={(e) => setDailyGoal(e.target.value)}
            leftElement={<Target className="w-5 h-5 text-amber-400" />}
            helperText="Objetivo para la barra de progreso de ganancia diaria"
          />

          <Input
            label="Ciudad por Defecto (Para navegación GPS)"
            value={cityDefault}
            onChange={(e) => setCityDefault(e.target.value)}
            required
          />

          <Input
            label="País por Defecto"
            placeholder="Argentina"
            value={countryDefault}
            onChange={(e) => setCountryDefault(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Límite Viajes Aceite"
              type="number"
              inputMode="numeric"
              value={thresholdOrders}
              onChange={(e) => setThresholdOrders(e.target.value)}
              helperText="Ej: 250 viajes"
              required
            />
            <Input
              label="Límite Días Aceite"
              type="number"
              inputMode="numeric"
              value={thresholdDays}
              onChange={(e) => setThresholdDays(e.target.value)}
              helperText="Ej: 30 días"
              required
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" size="lg" fullWidth>
              Guardar Preferencias
            </Button>
          </div>
        </form>

        {/* Right Column: Respaldo y Mantenimiento */}
        <div className="space-y-5">
          {/* 2. Respaldo y Recuperación Offline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>Copias de Seguridad (Offline First)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Tus datos se guardan de forma instantánea en tu dispositivo. Podés exportar o importar tu base completa en cualquier momento.
            </p>

            <div className="space-y-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleExportBackup}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Exportar Copia (JSON)
              </Button>

              <label className="block w-full">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                  id="import-backup-file"
                />
                <div className="w-full min-h-[52px] px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 font-semibold text-base flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Importar Copia (JSON)</span>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Reset Demo Data */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Zona de Mantenimiento
            </h3>
            <p className="text-xs text-zinc-400">
              Restablece los comercios, viajes y gastos de ejemplo para demostración.
            </p>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={handleResetData}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Restablecer Datos Demo
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Confirmación de Reseteo */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Restablecer Datos Demo"
        message="¿Estás seguro de que querés reiniciar todos los datos a la configuración demo inicial? Se borrarán los viajes, gastos y comercios agregados."
        confirmLabel="Restablecer"
        confirmVariant="danger"
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
