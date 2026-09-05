import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getPreviousDate,
  getNextDate,
  isInteractiveElement,
  evaluateSwipeGesture
} from '../src/utils/date';
import { getTodayDateString } from '../src/utils/formatting';

describe('R1: Floating Action Button (FAB) Verification', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  it('verifies OrderList.tsx renders the bottom-left green FAB with exact ergonomic specifications', () => {
    const content = getFileContent('src/components/orders/OrderList.tsx');
    expect(content).toContain('fixed bottom-20 left-4 z-40 md:hidden');
    expect(content).toContain('min-w-[60px] min-h-[60px] w-[60px] h-[60px]');
    expect(content).toContain('bg-emerald-500');
    expect(content).toContain('rounded-full');
    expect(content).toContain('active:scale-95');
    expect(content).toContain('aria-label="Registrar Viaje"');
    expect(content).toContain('onClick={() => setIsModalOpen(true)}');
  });

  it('verifies FloatingActionButton common component exists and is properly typed', () => {
    const content = getFileContent('src/components/common/FloatingActionButton.tsx');
    expect(content).toContain('export interface FloatingActionButtonProps');
    expect(content).toContain('export const FloatingActionButton');
    expect(content).toContain('bottom-20 left-4');
    expect(content).toContain('md:hidden');
  });
});

describe('R2: Date Arithmetic & Swipe Gesture Utilities (src/utils/date.ts)', () => {
  it('calculates previous date correctly across ordinary days', () => {
    expect(getPreviousDate('2026-09-15')).toBe('2026-09-14');
    expect(getPreviousDate('2026-05-20')).toBe('2026-05-19');
  });

  it('calculates previous date across month boundaries and leap years', () => {
    // September 1 -> August 31
    expect(getPreviousDate('2026-09-01')).toBe('2026-08-31');
    // March 1 in non-leap year (2025) -> Feb 28
    expect(getPreviousDate('2025-03-01')).toBe('2025-02-28');
    // March 1 in leap year (2024) -> Feb 29
    expect(getPreviousDate('2024-03-01')).toBe('2024-02-29');
    // January 1 -> December 31 of previous year
    expect(getPreviousDate('2026-01-01')).toBe('2025-12-31');
  });

  it('calculates next date correctly across ordinary days and month/year boundaries', () => {
    expect(getNextDate('2026-09-14', '2026-09-30')).toBe('2026-09-15');
    expect(getNextDate('2026-08-31', '2026-09-30')).toBe('2026-09-01');
    expect(getNextDate('2024-02-28', '2024-03-10')).toBe('2024-02-29');
    expect(getNextDate('2025-12-31', '2026-01-10')).toBe('2026-01-01');
  });

  it('strictly caps next date at maxDateStr (cannot navigate to future dates)', () => {
    const today = getTodayDateString();
    expect(getNextDate(today, today)).toBe(today);
    expect(getNextDate('2099-01-01', today)).toBe(today);
    expect(getNextDate('2026-09-01', '2026-09-01')).toBe('2026-09-01');
  });

  it('evaluates swipe gestures with 50px threshold and direction dominance', () => {
    // Swipe Right (deltaX > 50, |deltaX| > |deltaY|) -> 'prev_day'
    expect(evaluateSwipeGesture(55, 10, 50)).toBe('prev_day');
    expect(evaluateSwipeGesture(120, -20, 50)).toBe('prev_day');

    // Swipe Left (deltaX < -50, |deltaX| > |deltaY|) -> 'next_day'
    expect(evaluateSwipeGesture(-55, 10, 50)).toBe('next_day');
    expect(evaluateSwipeGesture(-150, 30, 50)).toBe('next_day');

    // Below threshold -> null
    expect(evaluateSwipeGesture(49, 10, 50)).toBeNull();
    expect(evaluateSwipeGesture(-49, 10, 50)).toBeNull();
    expect(evaluateSwipeGesture(0, 0, 50)).toBeNull();

    // Vertical dominance (scrolling list vertically) -> null
    expect(evaluateSwipeGesture(60, 80, 50)).toBeNull();
    expect(evaluateSwipeGesture(-60, -80, 50)).toBeNull();
    expect(evaluateSwipeGesture(50, 50, 50)).toBeNull();
  });

  it('filters interactive elements accurately for touch handling', () => {
    // Simulated DOM element structure
    const button = document.createElement('button');
    const spanInsideButton = document.createElement('span');
    button.appendChild(spanInsideButton);

    const input = document.createElement('input');
    const link = document.createElement('a');
    const select = document.createElement('select');
    const textarea = document.createElement('textarea');
    const roleButton = document.createElement('div');
    roleButton.setAttribute('role', 'button');
    const noSwipeDiv = document.createElement('div');
    noSwipeDiv.setAttribute('data-no-swipe', 'true');

    // SVG element inside button (e.g., Lucide icon)
    const buttonWithSvg = document.createElement('button');
    const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgIcon.appendChild(svgPath);
    buttonWithSvg.appendChild(svgIcon);

    const regularDiv = document.createElement('div');
    const regularSpan = document.createElement('span');
    regularDiv.appendChild(regularSpan);

    expect(isInteractiveElement(button)).toBe(true);
    expect(isInteractiveElement(spanInsideButton)).toBe(true);
    expect(isInteractiveElement(buttonWithSvg)).toBe(true);
    expect(isInteractiveElement(svgIcon)).toBe(true);
    expect(isInteractiveElement(svgPath)).toBe(true);
    expect(isInteractiveElement(input)).toBe(true);
    expect(isInteractiveElement(link)).toBe(true);
    expect(isInteractiveElement(select)).toBe(true);
    expect(isInteractiveElement(textarea)).toBe(true);
    expect(isInteractiveElement(roleButton)).toBe(true);
    expect(isInteractiveElement(noSwipeDiv)).toBe(true);

    expect(isInteractiveElement(regularDiv)).toBe(false);
    expect(isInteractiveElement(regularSpan)).toBe(false);
    expect(isInteractiveElement(null)).toBe(false);
  });

  it('verifies Header.tsx and OrderList.tsx adopt the new date & gesture utilities', () => {
    const headerContent = readFileSync(resolve(__dirname, '../src/components/layout/Header.tsx'), 'utf-8');
    expect(headerContent).toContain("import { getPreviousDate, getNextDate } from '../../utils/date';");
    expect(headerContent).toContain('getPreviousDate(selectedDate)');
    expect(headerContent).toContain('getNextDate(selectedDate, getTodayDateString())');

    const orderListContent = readFileSync(resolve(__dirname, '../src/components/orders/OrderList.tsx'), 'utf-8');
    expect(orderListContent).toContain("import { getPreviousDate, getNextDate, isInteractiveElement, evaluateSwipeGesture } from '../../utils/date';");
    expect(orderListContent).toContain('onTouchStart={handleTouchStart}');
    expect(orderListContent).toContain('onTouchEnd={handleTouchEnd}');
    expect(orderListContent).toContain('onTouchCancel={handleTouchCancel}');
    expect(orderListContent).toContain('duration-150');
  });
});

describe('R3: OrderFormModal Accordion "+ Más opciones"', () => {
  const modalContent = readFileSync(resolve(__dirname, '../src/components/orders/OrderFormModal.tsx'), 'utf-8');

  it('initializes showMoreOptions state to false (collapsed by default)', () => {
    expect(modalContent).toContain('const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);');
  });

  it('resets showMoreOptions to false when modal opens', () => {
    expect(modalContent).toContain('setShowMoreOptions(false);');
  });

  it('renders accordion toggle button with "+ Más opciones" and "- Menos opciones"', () => {
    expect(modalContent).toContain("showMoreOptions ? '- Menos opciones' : '+ Más opciones'");
    expect(modalContent).toContain('aria-expanded={showMoreOptions}');
    expect(modalContent).toContain('setShowMoreOptions((prev) => !prev)');
  });

  it('guards optional fields inside showMoreOptions block', () => {
    expect(modalContent).toContain('{showMoreOptions && (');
    expect(modalContent).toContain('Medio de Pago');
    expect(modalContent).toContain('Estado de Cobro');
    expect(modalContent).toContain('Dirección de Entrega');
    expect(modalContent).toContain('Teléfono del Cliente (WhatsApp)');
    expect(modalContent).toContain('Notas / Aclaraciones');
  });

  it('keeps core 5 elements outside the collapsible section', () => {
    expect(modalContent).toContain('label="Comercio"');
    expect(modalContent).toContain('Zona de Entrega');
    expect(modalContent).toContain('label="Importe del Viaje ($)"');
    expect(modalContent).toContain('¿Quién paga el viaje?');
    expect(modalContent).toContain('Guardar Viaje');
  });
});

describe('R4: OilOdometerCard ConfirmDialog Integration (Zero window.confirm)', () => {
  const oilCardContent = readFileSync(resolve(__dirname, '../src/components/maintenance/OilOdometerCard.tsx'), 'utf-8');

  it('has 0 occurrences of window.confirm in OilOdometerCard.tsx', () => {
    expect(oilCardContent).not.toContain('window.confirm');
    expect(oilCardContent).not.toMatch(/\bconfirm\s*\(/);
  });

  it('imports and uses ConfirmDialog component', () => {
    expect(oilCardContent).toContain("import { ConfirmDialog } from '../common/ConfirmDialog';");
    expect(oilCardContent).toContain('<ConfirmDialog');
    expect(oilCardContent).toContain('title="Cambiar Aceite"');
    expect(oilCardContent).toContain('message="¿Registrar cambio de aceite? El contador virtual se reiniciará a 0 viajes y 0 días desde hoy."');
    expect(oilCardContent).toContain('confirmLabel="Confirmar Reset"');
    expect(oilCardContent).toContain('cancelLabel="Cancelar"');
    expect(oilCardContent).toContain('confirmVariant="danger"');
  });

  it('manages isConfirmOpen state and handles reset action safely', () => {
    expect(oilCardContent).toContain('const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);');
    expect(oilCardContent).toContain('setIsConfirmOpen(true);');
    expect(oilCardContent).toContain("recordOilChange('Cambio de Aceite (Reset Rápido)', 0);");
  });
});

describe('R5: BottomNav & AppShell Responsive Layout Fix', () => {
  const bottomNavContent = readFileSync(resolve(__dirname, '../src/components/layout/BottomNav.tsx'), 'utf-8');
  const appShellContent = readFileSync(resolve(__dirname, '../src/components/layout/AppShell.tsx'), 'utf-8');
  const sidebarNavContent = readFileSync(resolve(__dirname, '../src/components/layout/SidebarNav.tsx'), 'utf-8');

  it('removes max-w-md mx-auto from BottomNav and ensures full width on mobile with md:hidden', () => {
    expect(bottomNavContent).not.toContain('max-w-md mx-auto');
    expect(bottomNavContent).toContain('w-full');
    expect(bottomNavContent).toContain('md:hidden');
  });

  it('applies pb-28 on mobile and resets to md:pb-0 on desktop in AppShell', () => {
    expect(appShellContent).toContain('pb-28 md:pb-0');
    expect(appShellContent).not.toContain('md:pb-12');
  });

  it('preserves SidebarNav intact for desktop', () => {
    expect(sidebarNavContent).toContain('hidden md:flex');
  });
});
