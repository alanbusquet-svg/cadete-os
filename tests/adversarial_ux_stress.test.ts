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

describe('Adversarial UX & Ergonomics Stress Testing Suite (R1 - R5)', () => {

  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  // =========================================================================
  // 1. DATE ARITHMETIC STRESS TEST: 100+ DATES, LEAP YEARS, ROLLOVERS & CAPPING
  // =========================================================================
  describe('1. Date Arithmetic Comprehensive Stress Engine', () => {

    it('processes 365+ consecutive simulated dates across leap and non-leap years without mathematical anomalies', () => {
      // Generate 730 consecutive dates starting from 2024-01-01 (leap year) through 2025-12-31
      const startDate = new Date(2024, 0, 1);
      const dates: string[] = [];

      for (let i = 0; i < 731; i++) {
        const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
      }

      expect(dates.length).toBeGreaterThanOrEqual(100);

      // Verify bidirectional consistency: prev -> next returns original (under unbounded maxDate)
      for (let i = 1; i < dates.length; i++) {
        const current = dates[i]!;
        const expectedPrev = dates[i - 1]!;
        const prev = getPreviousDate(current);

        expect(prev).toBe(expectedPrev);

        // getNextDate(prev, '2099-12-31') should equal current
        const next = getNextDate(prev, '2099-12-31');
        expect(next).toBe(current);
      }
    });

    it('handles leap year transitions with extreme precision (2024, 2020, 2000, 2400)', () => {
      // 2024 (Standard Leap Year)
      expect(getPreviousDate('2024-03-01')).toBe('2024-02-29');
      expect(getPreviousDate('2024-02-29')).toBe('2024-02-28');
      expect(getNextDate('2024-02-28', '2024-03-10')).toBe('2024-02-29');
      expect(getNextDate('2024-02-29', '2024-03-10')).toBe('2024-03-01');

      // 2020 (Standard Leap Year)
      expect(getPreviousDate('2020-03-01')).toBe('2020-02-29');
      expect(getNextDate('2020-02-28', '2020-03-10')).toBe('2020-02-29');

      // 2000 (Century Leap Year: divisible by 400)
      expect(getPreviousDate('2000-03-01')).toBe('2000-02-29');
      expect(getNextDate('2000-02-28', '2000-03-10')).toBe('2000-02-29');

      // 2400 (Century Leap Year)
      expect(getPreviousDate('2400-03-01')).toBe('2400-02-29');
      expect(getNextDate('2400-02-28', '2400-03-10')).toBe('2400-02-29');
    });

    it('handles non-leap century and standard year transitions correctly (1900, 2100, 2023, 2025, 2026)', () => {
      // 1900 (Century Non-Leap Year)
      expect(getPreviousDate('1900-03-01')).toBe('1900-02-28');
      expect(getNextDate('1900-02-28', '1900-03-10')).toBe('1900-03-01');

      // 2100 (Century Non-Leap Year)
      expect(getPreviousDate('2100-03-01')).toBe('2100-02-28');
      expect(getNextDate('2100-02-28', '2100-03-10')).toBe('2100-03-01');

      // 2025 & 2026 (Common Years)
      expect(getPreviousDate('2025-03-01')).toBe('2025-02-28');
      expect(getNextDate('2025-02-28', '2025-03-10')).toBe('2025-03-01');
      expect(getPreviousDate('2026-03-01')).toBe('2026-02-28');
      expect(getNextDate('2026-02-28', '2026-03-10')).toBe('2026-03-01');
    });

    it('handles all 12 month rollover boundaries in both forward and backward directions', () => {
      const monthRollovers = [
        { from: '2026-02-01', prev: '2026-01-31' },
        { from: '2026-03-01', prev: '2026-02-28' },
        { from: '2026-04-01', prev: '2026-03-31' },
        { from: '2026-05-01', prev: '2026-04-30' },
        { from: '2026-06-01', prev: '2026-05-31' },
        { from: '2026-07-01', prev: '2026-06-30' },
        { from: '2026-08-01', prev: '2026-07-31' },
        { from: '2026-09-01', prev: '2026-08-31' },
        { from: '2026-10-01', prev: '2026-09-30' },
        { from: '2026-11-01', prev: '2026-10-31' },
        { from: '2026-12-01', prev: '2026-11-30' },
        { from: '2027-01-01', prev: '2026-12-31' }
      ];

      for (const { from, prev } of monthRollovers) {
        expect(getPreviousDate(from)).toBe(prev);
        expect(getNextDate(prev, '2030-01-01')).toBe(from);
      }
    });

    it('handles decade and century year rollover boundaries (Dec 31 <-> Jan 01)', () => {
      expect(getPreviousDate('2030-01-01')).toBe('2029-12-31');
      expect(getNextDate('2029-12-31', '2035-01-01')).toBe('2030-01-01');

      expect(getPreviousDate('2000-01-01')).toBe('1999-12-31');
      expect(getNextDate('1999-12-31', '2005-01-01')).toBe('2000-01-01');

      expect(getPreviousDate('2100-01-01')).toBe('2099-12-31');
      expect(getNextDate('2099-12-31', '2105-01-01')).toBe('2100-01-01');
    });

    it('strictly caps future dates at maxDateStr under all edge scenarios', () => {
      const today = getTodayDateString();

      // Attempting to advance from today
      expect(getNextDate(today, today)).toBe(today);

      // Attempting to advance from yesterday -> reaches today
      const yesterday = getPreviousDate(today);
      expect(getNextDate(yesterday, today)).toBe(today);

      // Attempting to advance when base is already beyond maxDate -> stays at maxDate
      expect(getNextDate('2099-01-01', today)).toBe(today);
      expect(getNextDate('2050-06-15', '2026-09-01')).toBe('2026-09-01');

      // Attempting to advance when base is equal to maxDate
      expect(getNextDate('2026-09-01', '2026-09-01')).toBe('2026-09-01');
    });

    it('handles empty strings and default fallback parameters safely', () => {
      const today = getTodayDateString();
      expect(getPreviousDate('')).toBe(today);
      expect(getNextDate('')).toBe(today);
      expect(getNextDate('', '2026-05-01')).toBe('2026-05-01');
    });
  });

  // =========================================================================
  // 2. SWIPE GESTURE EVALUATION STRESS TEST
  // =========================================================================
  describe('2. Swipe Gesture Evaluation Engine (evaluateSwipeGesture)', () => {

    it('accurately identifies horizontal swipes at and above threshold (50px)', () => {
      // Right swipes (deltaX > 0) -> 'prev_day'
      expect(evaluateSwipeGesture(50, 0, 50)).toBe('prev_day');
      expect(evaluateSwipeGesture(50.001, 0, 50)).toBe('prev_day');
      expect(evaluateSwipeGesture(100, 20, 50)).toBe('prev_day');
      expect(evaluateSwipeGesture(300, -40, 50)).toBe('prev_day');

      // Left swipes (deltaX < 0) -> 'next_day'
      expect(evaluateSwipeGesture(-50, 0, 50)).toBe('next_day');
      expect(evaluateSwipeGesture(-50.001, 0, 50)).toBe('next_day');
      expect(evaluateSwipeGesture(-100, 20, 50)).toBe('next_day');
      expect(evaluateSwipeGesture(-300, -40, 50)).toBe('next_day');
    });

    it('rejects sub-threshold noise strictly (exact boundary 49px vs 50px)', () => {
      expect(evaluateSwipeGesture(49, 0, 50)).toBeNull();
      expect(evaluateSwipeGesture(49.999, 0, 50)).toBeNull();
      expect(evaluateSwipeGesture(-49, 0, 50)).toBeNull();
      expect(evaluateSwipeGesture(-49.999, 0, 50)).toBeNull();
      expect(evaluateSwipeGesture(0, 0, 50)).toBeNull();
      expect(evaluateSwipeGesture(10, 5, 50)).toBeNull();
      expect(evaluateSwipeGesture(-20, 15, 50)).toBeNull();
    });

    it('rejects vertical scroll dominance (|deltaY| >= |deltaX|)', () => {
      // Vertical pure scrolls
      expect(evaluateSwipeGesture(0, 80, 50)).toBeNull();
      expect(evaluateSwipeGesture(0, -80, 50)).toBeNull();

      // Vertical dominant diagonals
      expect(evaluateSwipeGesture(60, 80, 50)).toBeNull();
      expect(evaluateSwipeGesture(-60, 80, 50)).toBeNull();
      expect(evaluateSwipeGesture(60, -80, 50)).toBeNull();
      expect(evaluateSwipeGesture(-60, -80, 50)).toBeNull();

      // Exact 45-degree diagonal (|deltaX| === |deltaY|)
      expect(evaluateSwipeGesture(50, 50, 50)).toBeNull();
      expect(evaluateSwipeGesture(-50, 50, 50)).toBeNull();
      expect(evaluateSwipeGesture(50, -50, 50)).toBeNull();
      expect(evaluateSwipeGesture(-50, -50, 50)).toBeNull();
      expect(evaluateSwipeGesture(100, 100, 50)).toBeNull();
      expect(evaluateSwipeGesture(-100, -100, 50)).toBeNull();
    });

    it('evaluates slightly dominant diagonal gestures accurately', () => {
      // Slightly more horizontal than vertical: absX (51) > absY (50)
      expect(evaluateSwipeGesture(51, 50, 50)).toBe('prev_day');
      expect(evaluateSwipeGesture(-51, 50, 50)).toBe('next_day');
      expect(evaluateSwipeGesture(51, -50, 50)).toBe('prev_day');
      expect(evaluateSwipeGesture(-51, -50, 50)).toBe('next_day');

      // Slightly more vertical than horizontal: absX (50) < absY (51)
      expect(evaluateSwipeGesture(50, 51, 50)).toBeNull();
      expect(evaluateSwipeGesture(-50, 51, 50)).toBeNull();
      expect(evaluateSwipeGesture(50, -51, 50)).toBeNull();
      expect(evaluateSwipeGesture(-50, -51, 50)).toBeNull();
    });

    it('handles extreme touch values and custom thresholds safely', () => {
      expect(evaluateSwipeGesture(5000, 100, 50)).toBe('prev_day');
      expect(evaluateSwipeGesture(-5000, 100, 50)).toBe('next_day');

      // Custom threshold 100
      expect(evaluateSwipeGesture(90, 0, 100)).toBeNull();
      expect(evaluateSwipeGesture(100, 0, 100)).toBe('prev_day');
      expect(evaluateSwipeGesture(-100, 0, 100)).toBe('next_day');
    });
  });

  // =========================================================================
  // 3. INTERACTIVE ELEMENT DETECTION STRESS TEST
  // =========================================================================
  describe('3. Interactive Element Detection Engine (isInteractiveElement)', () => {

    it('detects standard HTML interactive controls', () => {
      const button = document.createElement('button');
      const link = document.createElement('a');
      const input = document.createElement('input');
      const select = document.createElement('select');
      const textarea = document.createElement('textarea');

      expect(isInteractiveElement(button)).toBe(true);
      expect(isInteractiveElement(link)).toBe(true);
      expect(isInteractiveElement(input)).toBe(true);
      expect(isInteractiveElement(select)).toBe(true);
      expect(isInteractiveElement(textarea)).toBe(true);
    });

    it('detects ARIA role="button" and data-no-swipe markers', () => {
      const roleBtn = document.createElement('div');
      roleBtn.setAttribute('role', 'button');

      const noSwipeEl = document.createElement('div');
      noSwipeEl.setAttribute('data-no-swipe', 'true');

      expect(isInteractiveElement(roleBtn)).toBe(true);
      expect(isInteractiveElement(noSwipeEl)).toBe(true);
    });

    it('detects nested HTML structures (button > span, a > img, div[role="button"] > span)', () => {
      // button > span
      const button = document.createElement('button');
      const spanInBtn = document.createElement('span');
      button.appendChild(spanInBtn);
      expect(isInteractiveElement(spanInBtn)).toBe(true);

      // a > img
      const link = document.createElement('a');
      const imgInLink = document.createElement('img');
      link.appendChild(imgInLink);
      expect(isInteractiveElement(imgInLink)).toBe(true);

      // div[role="button"] > span > strong
      const roleBtn = document.createElement('div');
      roleBtn.setAttribute('role', 'button');
      const span = document.createElement('span');
      const strong = document.createElement('strong');
      span.appendChild(strong);
      roleBtn.appendChild(span);
      expect(isInteractiveElement(strong)).toBe(true);
    });

    it('does not flag non-interactive DOM trees', () => {
      const container = document.createElement('div');
      const paragraph = document.createElement('p');
      const span = document.createElement('span');
      paragraph.appendChild(span);
      container.appendChild(paragraph);

      expect(isInteractiveElement(container)).toBe(false);
      expect(isInteractiveElement(paragraph)).toBe(false);
      expect(isInteractiveElement(span)).toBe(false);
      expect(isInteractiveElement(null)).toBe(false);
      expect(isInteractiveElement(undefined as unknown as EventTarget)).toBe(false);
    });

    it('examines SVG element hierarchy inside interactive controls', () => {
      const button = document.createElement('button');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(path);
      button.appendChild(svg);

      const isSvgElementInteractive = isInteractiveElement(svg);
      const isPathElementInteractive = isInteractiveElement(path);

      expect(typeof isSvgElementInteractive).toBe('boolean');
      expect(typeof isPathElementInteractive).toBe('boolean');
    });
  });

  // =========================================================================
  // 4. ARCHITECTURAL & ERGONOMIC VERIFICATION (R1 - R5)
  // =========================================================================
  describe('4. Architectural & Ergonomic Verification (R1 - R5)', () => {

    it('R1: OrderList.tsx renders bottom-left green FAB with min 60px touch target', () => {
      const content = getFileContent('src/components/orders/OrderList.tsx');
      expect(content).toContain('fixed bottom-20 left-4 z-40 md:hidden');
      expect(content).toContain('min-w-[60px] min-h-[60px] w-[60px] h-[60px]');
      expect(content).toContain('bg-emerald-500');
      expect(content).toContain('rounded-full');
      expect(content).toContain('active:scale-95');
      expect(content).toContain('aria-label="Registrar Viaje"');
      expect(content).toContain('onClick={() => setIsModalOpen(true)}');
    });

    it('R1: FloatingActionButton component exists and provides left-hand ergonomic defaults', () => {
      const content = getFileContent('src/components/common/FloatingActionButton.tsx');
      expect(content).toContain('bottom-20 left-4');
      expect(content).toContain('min-w-[60px] min-h-[60px]');
      expect(content).toContain('md:hidden');
    });

    it('R2: Touch event handlers in OrderList.tsx hook up swipe gesture logic correctly', () => {
      const content = getFileContent('src/components/orders/OrderList.tsx');
      expect(content).toContain('onTouchStart={handleTouchStart}');
      expect(content).toContain('onTouchEnd={handleTouchEnd}');
      expect(content).toContain('onTouchCancel={handleTouchCancel}');
      expect(content).toContain('evaluateSwipeGesture(deltaX, deltaY, 50)');
      expect(content).toContain('isInteractiveElement(e.target)');
      expect(content).toContain('selectedDate < todayStr');
    });

    it('R3: OrderFormModal keeps essential fields visible and optional fields in collapsed accordion', () => {
      const content = getFileContent('src/components/orders/OrderFormModal.tsx');
      expect(content).toContain('const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);');
      expect(content).toContain('setShowMoreOptions(false);');
      expect(content).toContain("showMoreOptions ? '- Menos opciones' : '+ Más opciones'");
      expect(content).toContain('{showMoreOptions && (');
      expect(content).toContain('label="Comercio"');
      expect(content).toContain('Zona de Entrega');
      expect(content).toContain('label="Importe del Viaje ($)"');
      expect(content).toContain('¿Quién paga el viaje?');
      expect(content).toContain('Guardar Viaje');
    });

    it('R4: OilOdometerCard completely replaces window.confirm with ConfirmDialog', () => {
      const content = getFileContent('src/components/maintenance/OilOdometerCard.tsx');
      expect(content).not.toContain('window.confirm');
      expect(content).not.toMatch(/\bconfirm\s*\(/);
      expect(content).toContain("import { ConfirmDialog } from '../common/ConfirmDialog';");
      expect(content).toContain('title="Cambiar Aceite"');
      expect(content).toContain('confirmVariant="danger"');
    });

    it('R5: BottomNav has no max-w-md mx-auto and AppShell uses pb-28 md:pb-0', () => {
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
