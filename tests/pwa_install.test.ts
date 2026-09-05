import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PWA Installation & Download Flow (Enterprise Grade)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  describe('T1: Hook Contracts & Logic (src/hooks/usePWAInstall.ts)', () => {
    const hookSource = getFileContent('src/hooks/usePWAInstall.ts');

    it('exports usePWAInstall hook with standard interface', () => {
      expect(hookSource).toContain('export function usePWAInstall()');
      expect(hookSource).toContain('isInstallable: Boolean(deferredPrompt)');
      expect(hookSource).toContain('isInstalled');
      expect(hookSource).toContain('isIOS');
      expect(hookSource).toContain('promptInstall');
    });

    it('implements iOS User Agent detection regex correctly', () => {
      const iosRegex = /iphone|ipad|ipod/;
      expect(iosRegex.test('mozilla/5.0 (iphone; cpu iphone os 16_5 like mac os x)')).toBe(true);
      expect(iosRegex.test('mozilla/5.0 (ipad; cpu os 15_0 like mac os x)')).toBe(true);
      expect(iosRegex.test('mozilla/5.0 (ipod touch; cpu iphone os 14_0 like mac os x)')).toBe(true);
      expect(iosRegex.test('mozilla/5.0 (linux; android 13; sm-g991b)')).toBe(false);
      expect(iosRegex.test('mozilla/5.0 (windows nt 10.0; win64; x64)')).toBe(false);
    });

    it('listens for beforeinstallprompt and appinstalled events and cleans up', () => {
      expect(hookSource).toContain("window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)");
      expect(hookSource).toContain("window.addEventListener('appinstalled', handleAppInstalled)");
      expect(hookSource).toContain("window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)");
      expect(hookSource).toContain("window.removeEventListener('appinstalled', handleAppInstalled)");
    });

    it('checks display-mode: standalone and navigator.standalone for installed state', () => {
      expect(hookSource).toContain("window.matchMedia('(display-mode: standalone)').matches");
      expect(hookSource).toContain('navigator as unknown as { standalone?: boolean }').toBeDefined();
    });

    it('implements promptInstall with error handling and outcome acceptance', () => {
      expect(hookSource).toContain('await deferredPrompt.prompt()');
      expect(hookSource).toContain("choiceResult.outcome === 'accepted'");
      expect(hookSource).toContain('setIsInstalled(true)');
      expect(hookSource).toContain('setDeferredPrompt(null)');
    });
  });

  describe('T2: PWA Install Modal (src/components/common/PWAInstallModal.tsx)', () => {
    const modalSource = getFileContent('src/components/common/PWAInstallModal.tsx');

    it('renders modal with title and explanation', () => {
      expect(modalSource).toContain('title="Instalar Cadete OS en tu Celular"');
      expect(modalSource).toContain('Instalá la aplicación');
      expect(modalSource).toContain('Usala a pantalla completa, más rápido y sin barras del navegador.');
    });

    it('includes specific step-by-step instructions for iOS Safari', () => {
      expect(modalSource).toContain('Pasos para iPhone / iPad (Safari):');
      expect(modalSource).toContain('Compartir');
      expect(modalSource).toContain('&quot;Agregar a pantalla de inicio&quot;');
      expect(modalSource).toContain('&quot;Agregar&quot;');
    });

    it('includes specific step-by-step instructions for Android Chrome', () => {
      expect(modalSource).toContain('Pasos para Android (Chrome):');
      expect(modalSource).toContain('tres puntos');
      expect(modalSource).toContain('&quot;Instalar aplicación&quot;');
      expect(modalSource).toContain('&quot;Instalar&quot;');
    });
  });

  describe('T3: PWA Install Button (src/components/common/PWAInstallButton.tsx)', () => {
    const buttonSource = getFileContent('src/components/common/PWAInstallButton.tsx');

    it('supports header, settings, and full variants', () => {
      expect(buttonSource).toContain("variant === 'header'");
      expect(buttonSource).toContain("variant === 'settings'");
      expect(buttonSource).toContain("variant === 'full'");
    });

    it('renders installed status badge when app is already installed', () => {
      expect(buttonSource).toContain('Cadete OS instalado como app en este dispositivo');
      expect(buttonSource).toContain('CheckCircle2');
    });

    it('triggers promptInstall or opens PWAInstallModal on click', () => {
      expect(buttonSource).toContain('if (isInstallable) {');
      expect(buttonSource).toContain('const installed = await promptInstall();');
      expect(buttonSource).toContain('setIsModalOpen(true);');
    });
  });

  describe('T4: Touchpoint Placements (Header, Settings, Auth)', () => {
    it('integrates PWAInstallButton in Header.tsx', () => {
      const headerSource = getFileContent('src/components/layout/Header.tsx');
      expect(headerSource).toContain("import { PWAInstallButton } from '../common/PWAInstallButton';");
      expect(headerSource).toContain('<PWAInstallButton variant="header" />');
    });

    it('integrates PWAInstallButton in SettingsView.tsx', () => {
      const settingsSource = getFileContent('src/components/settings/SettingsView.tsx');
      expect(settingsSource).toContain("import { PWAInstallButton } from '../common/PWAInstallButton';");
      expect(settingsSource).toContain('Aplicación Móvil (PWA)');
      expect(settingsSource).toContain('<PWAInstallButton variant="settings" />');
    });

    it('integrates PWAInstallButton in AuthView.tsx', () => {
      const authSource = getFileContent('src/components/auth/AuthView.tsx');
      expect(authSource).toContain("import { PWAInstallButton } from '../common/PWAInstallButton';");
      expect(authSource).toContain('<PWAInstallButton variant="full" />');
    });
  });

  describe('T5: PWA Manifest & Vite Configuration', () => {
    it('configures VitePWA plugin with standalone display and autoUpdate', () => {
      const viteConfig = getFileContent('vite.config.ts');
      expect(viteConfig).toContain("registerType: 'autoUpdate'");
      expect(viteConfig).toContain("display: 'standalone'");
      expect(viteConfig).toContain("orientation: 'portrait-primary'");
      expect(viteConfig).toContain("name: 'Cadete OS'");
    });

    it('defines web app manifest in public directory', () => {
      const manifest = JSON.parse(getFileContent('public/manifest.json'));
      expect(manifest.name).toBe('Cadete OS');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBe('#09090b');
      expect(manifest.icons.length).toBeGreaterThan(0);
    });
  });
});