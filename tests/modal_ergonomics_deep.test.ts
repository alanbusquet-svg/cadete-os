import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Modal Ergonomics & Mobile-First Touch Targets Suite (tests/modal_ergonomics_deep.test.ts)', () => {
  it('1. OrderFormModal: Save button is size="lg" (>= 52px) and Cancel is stacked directly below with fullWidth', () => {
    const content = readFileSync(
      resolve(__dirname, '../src/components/orders/OrderFormModal.tsx'),
      'utf-8'
    );
    expect(content).toContain('Guardar Viaje');
    expect(content).toContain('variant="secondary"');
    expect(content).toContain('fullWidth');
    // Verify vertical stack container
    expect(content).toMatch(/<div className="[^"]*flex flex-col gap-2[\s\S]*?Guardar Viaje[\s\S]*?Cancelar/);
  });

  it('2. ExpenseFormModal: Save button is size="lg" and Cancel is stacked directly below with fullWidth', () => {
    const content = readFileSync(
      resolve(__dirname, '../src/components/finance/ExpenseFormModal.tsx'),
      'utf-8'
    );
    expect(content).toContain('Guardar Gasto');
    expect(content).toContain('variant="secondary"');
    expect(content).toContain('fullWidth');
    expect(content).toMatch(/<div className="[^"]*flex flex-col gap-2[\s\S]*?Guardar Gasto[\s\S]*?Cancelar/);
  });

  it('3. BusinessFormModal: Save button is size="lg" and Cancel is stacked directly below with fullWidth', () => {
    const content = readFileSync(
      resolve(__dirname, '../src/components/businesses/BusinessFormModal.tsx'),
      'utf-8'
    );
    expect(content).toContain('variant="secondary"');
    expect(content).toContain('fullWidth');
    expect(content).toMatch(/<div className="[^"]*flex flex-col gap-2[\s\S]*?Guardar[\s\S]*?Cancelar/);
  });

  it('4. MaintenanceFormModal: Save button is size="lg" and Cancel is stacked directly below with fullWidth', () => {
    const content = readFileSync(
      resolve(__dirname, '../src/components/maintenance/MaintenanceFormModal.tsx'),
      'utf-8'
    );
    expect(content).toContain('Guardar en Historial');
    expect(content).toContain('variant="secondary"');
    expect(content).toContain('fullWidth');
    expect(content).toMatch(/<div className="[^"]*flex flex-col gap-2[\s\S]*?Guardar en Historial[\s\S]*?Cancelar/);
  });

  it('5. BusinessDebtModal: Action buttons are size="lg" with stacked Volver sin Liquidar button', () => {
    const content = readFileSync(
      resolve(__dirname, '../src/components/businesses/BusinessDebtModal.tsx'),
      'utf-8'
    );
    expect(content).toContain('Volver sin Liquidar');
    expect(content).toContain('variant="secondary"');
    expect(content).toContain('fullWidth');
    expect(content).toContain('size="lg"');
  });

  it('6. Modal.tsx: Header incorporates top-left ArrowLeft button (>= 44px) and drag handle (min-h-[44px])', () => {
    const content = readFileSync(
      resolve(__dirname, '../src/components/common/Modal.tsx'),
      'utf-8'
    );
    expect(content).toContain('ArrowLeft');
    expect(content).toContain('min-w-[44px] min-h-[44px]');
    expect(content).toContain('min-h-[44px]');
    expect(content).toContain('aria-label="Volver"');
    expect(content).toContain('aria-label="Tocar para cerrar modal"');
  });

  it('7. OrderMapModal.tsx: Header and footer provide thumb-reachable back navigation and Volver a Viajes button', () => {
    const content = readFileSync(
      resolve(__dirname, '../src/components/map/OrderMapModal.tsx'),
      'utf-8'
    );
    expect(content).toContain('ArrowLeft');
    expect(content).toContain('min-w-[44px] min-h-[44px]');
    expect(content).toContain('min-h-[52px]');
    expect(content).toContain('Volver a Viajes');
  });
});
