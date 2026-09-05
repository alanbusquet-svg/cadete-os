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

describe('Challenger 3: Adversarial UX & Touch Ergonomics Stress Suite (R1-R5)', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  // =========================================================================
  // 1. ADVERSARIAL TEST: isInteractiveElement
  // =========================================================================
  describe('1. Adversarial Challenge: isInteractiveElement Robustness', () => {
    it('accurately classifies standard form controls and clickable tags', () => {
      const button = document.createElement('button');
      const input = document.createElement('input');
      const select = document.createElement('select');
      const textarea = document.createElement('textarea');
      const link = document.createElement('a');

      expect(isInteractiveElement(button)).toBe(true);
      expect(isInteractiveElement(input)).toBe(true);
      expect(isInteractiveElement(select)).toBe(true);
      expect(isInteractiveElement(textarea)).toBe(true);
      expect(isInteractiveElement(link)).toBe(true);
    });

    it('correctly handles ARIA roles and custom data attributes', () => {
      const roleButton = document.createElement('div');
      roleButton.setAttribute('role', 'button');

      const noSwipeDiv = document.createElement('div');
      noSwipeDiv.setAttribute('data-no-swipe', 'true');

      const customSpan = document.createElement('span');
      noSwipeDiv.appendChild(customSpan);

      expect(isInteractiveElement(roleButton)).toBe(true);
      expect(isInteractiveElement(noSwipeDiv)).toBe(true);
      expect(isInteractiveElement(customSpan)).toBe(true);
    });

    it('handles nested SVGs, Lucide icons, paths, circles, polylines inside buttons', () => {
      const button = document.createElement('button');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

      g.appendChild(path);
      g.appendChild(circle);
      g.appendChild(polyline);
      g.appendChild(rect);
      svg.appendChild(g);
      button.appendChild(svg);

      expect(isInteractiveElement(button)).toBe(true);
      expect(isInteractiveElement(svg)).toBe(true);
      expect(isInteractiveElement(g)).toBe(true);
      expect(isInteractiveElement(path)).toBe(true);
      expect(isInteractiveElement(circle)).toBe(true);
      expect(isInteractiveElement(polyline)).toBe(true);
      expect(isInteractiveElement(rect)).toBe(true);
    });

    it('does NOT flag standalone SVGs and icons outside interactive containers', () => {
      const container = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(path);
      container.appendChild(svg);

      expect(isInteractiveElement(container)).toBe(false);
      expect(isInteractiveElement(svg)).toBe(false);
      expect(isInteractiveElement(path)).toBe(false);
    });

    it('does NOT flag plain non-interactive DOM trees', () => {
      const outerDiv = document.createElement('div');
      const section = document.createElement('section');
      const main = document.createElement('main');
      const article = document.createElement('article');
      const p = document.createElement('p');
      const span = document.createElement('span');

      article.appendChild(p);
      p.appendChild(span);
      main.appendChild(article);
      section.appendChild(main);
      outerDiv.appendChild(section);

      expect(isInteractiveElement(outerDiv)).toBe(false);
      expect(isInteractiveElement(section)).toBe(false);
      expect(isInteractiveElement(main)).toBe(false);
      expect(isInteractiveElement(article)).toBe(false);
      expect(isInteractiveElement(p)).toBe(false);
      expect(isInteractiveElement(span)).toBe(false);
    });

    it('survives boundary non-element event targets (null, undefined, non-element objects)', () => {
      expect(isInteractiveElement(null)).toBe(false);
      expect(isInteractiveElement(undefined as unknown as EventTarget)).toBe(false);
      expect(isInteractiveElement({} as unknown as EventTarget)).toBe(false);
      expect(isInteractiveElement({ nodeType: 3 } as unknown as EventTarget)).toBe(false);
      expect(isInteractiveElement({ nodeType: 8 } as unknown as EventTarget)).toBe(false);
    });

    it('correctly handles deeply nested elements (12 levels deep inside button)', () => {
      const btn = document.createElement('button');
      let current: any = btn;
      for (let i = 0; i < 12; i++) {
        const next = document.createElement('div');
        current.appendChild(next);
        current = next;
      }
      expect(isInteractiveElement(current)).toBe(true);
    });
  });

  // =========================================================================
  // 2. ADVERSARIAL TEST: getPreviousDate & getNextDate
  // =========================================================================
  describe('2. Adversarial Challenge: Date Arithmetic & Boundary Transitions', () => {
    it('stress-tests 1500+ consecutive days (2020 through 2024 leap years into 2028)', () => {
      const start = new Date(2020, 0, 1); // 2020 is leap year
      const totalDays = 1827; // ~5 years
      const dateList: string[] = [];

      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dateList.push(`${y}-${m}-${day}`);
      }

      for (let i = 1; i < dateList.length; i++) {
        const curr = dateList[i]!;
        const prevExpected = dateList[i - 1]!;
        expect(getPreviousDate(curr)).toBe(prevExpected);

        const next = getNextDate(prevExpected, '2099-12-31');
        expect(next).toBe(curr);
      }
    });

    it('verifies exact leap year Feb 28 <-> Feb 29 <-> March 1 transitions', () => {
      // 2020
      expect(getPreviousDate('2020-03-01')).toBe('2020-02-29');
      expect(getPreviousDate('2020-02-29')).toBe('2020-02-28');
      expect(getNextDate('2020-02-28', '2020-03-15')).toBe('2020-02-29');
      expect(getNextDate('2020-02-29', '2020-03-15')).toBe('2020-03-01');

      // 2024
      expect(getPreviousDate('2024-03-01')).toBe('2024-02-29');
      expect(getPreviousDate('2024-02-29')).toBe('2024-02-28');
      expect(getNextDate('2024-02-28', '2024-03-15')).toBe('2024-02-29');
      expect(getNextDate('2024-02-29', '2024-03-15')).toBe('2024-03-01');

      // 2000 (Century Leap)
      expect(getPreviousDate('2000-03-01')).toBe('2000-02-29');
      expect(getNextDate('2000-02-28', '2000-03-15')).toBe('2000-02-29');
    });

    it('verifies exact non-leap year Feb 28 <-> March 1 transitions (1900, 2023, 2025, 2026, 2100)', () => {
      // 2025
      expect(getPreviousDate('2025-03-01')).toBe('2025-02-28');
      expect(getNextDate('2025-02-28', '2025-03-15')).toBe('2025-03-01');

      // 2026
      expect(getPreviousDate('2026-03-01')).toBe('2026-02-28');
      expect(getNextDate('2026-02-28', '2026-03-15')).toBe('2026-03-01');

      // 1900 (Century non-leap)
      expect(getPreviousDate('1900-03-01')).toBe('1900-02-28');
      expect(getNextDate('1900-02-28', '1900-03-15')).toBe('1900-03-01');

      // 2100 (Century non-leap)
      expect(getPreviousDate('2100-03-01')).toBe('2100-02-28');
      expect(getNextDate('2100-02-28', '2100-03-15')).toBe('2100-03-01');
    });

    it('verifies all 12 month boundaries forward and backward', () => {
      const boundaries = [
        { firstDay: '2026-01-01', lastDayPrevMonth: '2025-12-31' },
        { firstDay: '2026-02-01', lastDayPrevMonth: '2026-01-31' },
        { firstDay: '2026-03-01', lastDayPrevMonth: '2026-02-28' },
        { firstDay: '2026-04-01', lastDayPrevMonth: '2026-03-31' },
        { firstDay: '2026-05-01', lastDayPrevMonth: '2026-04-30' },
        { firstDay: '2026-06-01', lastDayPrevMonth: '2026-05-31' },
        { firstDay: '2026-07-01', lastDayPrevMonth: '2026-06-30' },
        { firstDay: '2026-08-01', lastDayPrevMonth: '2026-07-31' },
        { firstDay: '2026-09-01', lastDayPrevMonth: '2026-08-31' },
        { firstDay: '2026-10-01', lastDayPrevMonth: '2026-09-30' },
        { firstDay: '2026-11-01', lastDayPrevMonth: '2026-10-31' },
        { firstDay: '2026-12-01', lastDayPrevMonth: '2026-11-30' }
      ];

      for (const b of boundaries) {
        expect(getPreviousDate(b.firstDay)).toBe(b.lastDayPrevMonth);
        expect(getNextDate(b.lastDayPrevMonth, '2030-01-01')).toBe(b.firstDay);
      }
    });

    it('strictly locks getNextDate to maxDateStr', () => {
      const today = getTodayDateString();

      // At max date
      expect(getNextDate(today, today)).toBe(today);

      // Beyond max date
      expect(getNextDate('2099-01-01', today)).toBe(today);
      expect(getNextDate('2026-10-15', '2026-09-01')).toBe('2026-09-01');

      // Approaching max date
      const yesterday = getPreviousDate(today);
      expect(getNextDate(yesterday, today)).toBe(today);
    });

    it('gracefully handles empty strings and default maxDate', () => {
      const today = getTodayDateString();
      expect(getPreviousDate('')).toBe(today);
      expect(getNextDate('')).toBe(today);
      expect(getNextDate('', '2026-06-01')).toBe('2026-06-01');
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL TEST: evaluateSwipeGesture
  // =========================================================================
  describe('3. Adversarial Challenge: evaluateSwipeGesture Logic', () => {
    it('evaluates clear horizontal swipe actions', () => {
      expect(evaluateSwipeGesture(50, 0)).toBe('prev_day');
      expect(evaluateSwipeGesture(100, 10)).toBe('prev_day');
      expect(evaluateSwipeGesture(-50, 0)).toBe('next_day');
      expect(evaluateSwipeGesture(-100, 10)).toBe('next_day');
    });

    it('strictly enforces 50px threshold', () => {
      expect(evaluateSwipeGesture(49.9, 0)).toBeNull();
      expect(evaluateSwipeGesture(-49.9, 0)).toBeNull();
      expect(evaluateSwipeGesture(0, 0)).toBeNull();
    });

    it('rejects dominant vertical gestures (scrolling)', () => {
      expect(evaluateSwipeGesture(0, 100)).toBeNull();
      expect(evaluateSwipeGesture(50, 80)).toBeNull();
      expect(evaluateSwipeGesture(-50, 80)).toBeNull();
      expect(evaluateSwipeGesture(60, 60)).toBeNull(); // 45-degree angle
      expect(evaluateSwipeGesture(-60, -60)).toBeNull();
    });
  });

  // =========================================================================
  // 4. VERIFICATION OF R1 - R5 IMPLEMENTATION ARTIFACTS
  // =========================================================================
  describe('4. Comprehensive Verification of Requirements R1 - R5', () => {
    it('R1: FAB in OrderList.tsx is mobile-only, circular, green, bottom-left, min 60px', () => {
      const content = getFileContent('src/components/orders/OrderList.tsx');
      expect(content).toContain('fixed bottom-20 left-4 z-40 md:hidden');
      expect(content).toContain('min-w-[60px] min-h-[60px] w-[60px] h-[60px]');
      expect(content).toContain('bg-emerald-500');
      expect(content).toContain('rounded-full');
      expect(content).toContain('aria-label="Registrar Viaje"');
      expect(content).toContain('onClick={() => setIsModalOpen(true)}');
    });

    it('R2: Touch swipe in OrderList.tsx uses isInteractiveElement filter & 150ms animation', () => {
      const content = getFileContent('src/components/orders/OrderList.tsx');
      expect(content).toContain('isInteractiveElement(e.target)');
      expect(content).toContain('onTouchStart={handleTouchStart}');
      expect(content).toContain('onTouchEnd={handleTouchEnd}');
      expect(content).toContain('onTouchCancel={handleTouchCancel}');
      expect(content).toContain('duration-150');
    });

    it('R3: OrderFormModal has "+ Más opciones" accordion collapsed by default and reset on open', () => {
      const content = getFileContent('src/components/orders/OrderFormModal.tsx');
      expect(content).toContain('const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);');
      expect(content).toContain('setShowMoreOptions(false);');
      expect(content).toContain("showMoreOptions ? '- Menos opciones' : '+ Más opciones'");
      expect(content).toContain('{showMoreOptions && (');
    });

    it('R4: OilOdometerCard uses ConfirmDialog and contains zero window.confirm', () => {
      const content = getFileContent('src/components/maintenance/OilOdometerCard.tsx');
      expect(content).not.toContain('window.confirm');
      expect(content).not.toMatch(/\bconfirm\s*\(/);
      expect(content).toContain("import { ConfirmDialog } from '../common/ConfirmDialog';");
      expect(content).toContain('title="Cambiar Aceite"');
      expect(content).toContain('confirmVariant="danger"');
    });

    it('R5: BottomNav is w-full without max-w-md, md:hidden, and AppShell has pb-28 md:pb-0', () => {
      const bottomNav = getFileContent('src/components/layout/BottomNav.tsx');
      const appShell = getFileContent('src/components/layout/AppShell.tsx');

      expect(bottomNav).not.toContain('max-w-md mx-auto');
      expect(bottomNav).toContain('w-full');
      expect(bottomNav).toContain('md:hidden');

      expect(appShell).toContain('pb-28 md:pb-0');
      expect(appShell).not.toContain('md:pb-12');
    });
  });
});
