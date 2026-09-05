import React, { useState } from 'react';
import {
  Bike,
  Sparkles,
  Mail,
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PWAInstallButton } from '../common/PWAInstallButton';

function getErrorMessage(err: unknown): string {
  const errorString = String(err);
  if (
    errorString.includes('auth/invalid-credential') ||
    errorString.includes('auth/wrong-password') ||
    errorString.includes('auth/user-not-found')
  ) {
    return 'Correo o contraseña incorrectos. Verificá los datos ingresados.';
  }
  if (errorString.includes('auth/email-already-in-use')) {
    return 'Este correo electrónico ya está registrado. Probá iniciar sesión.';
  }
  if (errorString.includes('auth/weak-password')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (errorString.includes('auth/invalid-email')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (errorString.includes('auth/popup-closed-by-user')) {
    return 'Se cerró la ventana de Google antes de completar el inicio de sesión.';
  }
  if (errorString.includes('auth/popup-blocked')) {
    return 'La ventana emergente fue bloqueada por el navegador. Permití las ventanas emergentes.';
  }
  if (errorString.includes('auth/network-request-failed')) {
    return 'Error de conexión. Verificá tu acceso a internet.';
  }
  return 'Ocurrió un error al procesar la solicitud. Intentá nuevamente.';
}

export const AuthView: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, enterDemoMode } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Por favor completá todos los campos requeridos.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(trimmedEmail, password);
      } else {
        await signUpWithEmail(trimmedEmail, password, name.trim());
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/50 mb-2">
            <Bike className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-100">
            CADETE OS
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto">
            Control de viajes, finanzas en tiempo real y GPS 100% gratis para repartidores en moto
          </p>
        </div>

        {/* 7-Day Free Trial Banner */}
        <div className="bg-gradient-to-br from-emerald-950/50 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              7 Días de Prueba Gratis
            </span>
            <span className="text-[11px] font-semibold text-zinc-400">
              Sin tarjeta de crédito
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sincronización en la nube multi-dispositivo</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rutas automáticas a Google Maps y Waze</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Arqueo de caja y odómetro virtual de aceite</span>
            </div>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`min-h-[44px] rounded-xl text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`min-h-[44px] rounded-xl text-sm font-bold transition-all ${
                mode === 'register'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Error Message Feedback */}
          {error && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full min-h-[52px] px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-750 text-zinc-100 border border-zinc-700 font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-zinc-800" />
            <span className="absolute px-3 bg-zinc-900 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              o con correo electrónico
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Nombre y Apellido"
                placeholder="Ej: Martín Rodríguez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftElement={<User className="w-5 h-5" />}
                required={mode === 'register'}
                autoComplete="name"
              />
            )}

            <Input
              label="Correo Electrónico"
              type="email"
              inputMode="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftElement={<Mail className="w-5 h-5" />}
              required
              autoComplete="email"
              autoCapitalize="none"
            />

            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftElement={<Lock className="w-5 h-5" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                leftIcon={isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : undefined}
              >
                {isSubmitting
                  ? 'Procesando...'
                  : mode === 'login'
                  ? 'Ingresar a mi Cuenta'
                  : 'Comenzar Prueba Gratis (7 Días)'}
              </Button>
            </div>
          </form>
        </div>

        {/* Demo Mode Bypass Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-4 text-center space-y-2">
          <p className="text-xs text-zinc-400">
            ¿Querés probar la aplicación sin registrarte?
          </p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={enterDemoMode}
            leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
          >
            ⚡ Probar en Modo Demo (sin registrarse)
          </Button>
          <span className="text-[11px] text-zinc-500 block">
            Tus datos se guardarán de forma local en este dispositivo.
          </span>
        </div>

        {/* PWA Download / Install Button */}
        <div className="pt-1">
          <PWAInstallButton variant="full" />
        </div>
      </div>
    </div>
  );
};
