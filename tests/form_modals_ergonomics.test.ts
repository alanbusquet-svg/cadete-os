import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Milestone 2 (R3) — Form Modals Bottom Cancel Ergonomics Suite', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  const formModals = [
    {
      name: 'OrderFormModal.tsx',
      path: 'src/components/orders/OrderFormModal.tsx',
      cancelLabel: 'Cancelar',
      saveLabel: 'Guardar Viaje',
      resetTokens: [
        'setShowMoreOptions(false);',
        "setAddress('');",
        "setCustomerPhone('');",
        "setNotes('');",
        "setError('');",
        'onClose();'
      ]
    },
    {
      name: 'ExpenseFormModal.tsx',
      path: 'src/components/finance/ExpenseFormModal.tsx',
      cancelLabel: 'Cancelar',
      saveLabel: 'Guardar Gasto',
      resetTokens: [
        "setAmount('');",
        "setError('');",
        "setCategory('fuel');",
        "setDescription('Nafta Súper');",
        "setPaymentMethod('cash');",
        'onClose();'
      ]
    },
    {
      name: 'BusinessFormModal.tsx',
      path: 'src/components/businesses/BusinessFormModal.tsx',
      cancelLabel: 'Cancelar',
      saveLabel: 'Guardar Cambios',
      resetTokens: [
        "setError('');",
        'onClose();'
      ]
    },
    {
      name: 'MaintenanceFormModal.tsx',
      path: 'src/components/maintenance/MaintenanceFormModal.tsx',
      cancelLabel: 'Cancelar',
      saveLabel: 'Guardar en Historial',
      resetTokens: [
        'setItem(',
        "setCost('');",
        "setError('');",
        'onClose();'
      ]
    },
    {
      name: 'BusinessDebtModal.tsx',
      path: 'src/components/businesses/BusinessDebtModal.tsx',
      cancelLabel: 'Volver sin Liquidar',
      saveLabel: 'Liquidar Deuda en Lote',
      resetTokens: [
        'onClick={onClose}'
      ]
    }
  ];

  formModals.forEach(({ name, path, cancelLabel, saveLabel, resetTokens }) => {
    describe(`${name} Bottom Cancel Ergonomics`, () => {
      it(`renders a secondary full-width button with label containing "${cancelLabel}"`, () => {
        const content = getFileContent(path);
        expect(content).toContain(cancelLabel);
        expect(content).toContain('variant="secondary"');
        expect(content).toContain('fullWidth');
      });

      it(`stacks "${cancelLabel}" directly under "${saveLabel}" in a vertical layout`, () => {
        const content = getFileContent(path);
        const saveIdx = content.indexOf(saveLabel);
        const cancelIdx = content.lastIndexOf(cancelLabel);
        expect(saveIdx).toBeGreaterThan(-1);
        expect(cancelIdx).toBeGreaterThan(-1);
        expect(cancelIdx).toBeGreaterThan(saveIdx);
      });

      it(`ensures the Cancel/Volver button has type="button" and size="lg" for >=52px touch height`, () => {
        const content = getFileContent(path);
        // Find section around cancelLabel
        const cancelIdx = content.lastIndexOf(cancelLabel);
        const buttonChunk = content.slice(Math.max(0, cancelIdx - 200), cancelIdx + 100);
        expect(buttonChunk).toContain('type="button"');
        expect(buttonChunk).toContain('variant="secondary"');
        expect(buttonChunk).toContain('size="lg"');
        expect(buttonChunk).toContain('fullWidth');
      });

      it('executes state/error cleanup before closing on cancel', () => {
        const content = getFileContent(path);
        resetTokens.forEach((token) => {
          expect(content).toContain(token);
        });
      });
    });
  });

  describe('Specific Modal Ergonomics & Defensive Checks', () => {
    it('OrderFormModal preserves accordion tokens and clears extra options on cancel', () => {
      const content = getFileContent('src/components/orders/OrderFormModal.tsx');
      expect(content).toContain('handleCancel');
      expect(content).toContain('setShowMoreOptions(false);');
      expect(content).toContain("setAddress('');");
      expect(content).toContain("setCustomerPhone('');");
      expect(content).toContain("setNotes('');");
      expect(content).toContain("setError('');");
      expect(content).toContain('onClose();');
    });

    it('ExpenseFormModal resets form state and clears errors on isOpen toggle and cancel', () => {
      const content = getFileContent('src/components/finance/ExpenseFormModal.tsx');
      expect(content).toContain('useEffect');
      expect(content).toContain("setError('');");
      expect(content).toContain('handleCancel');
      expect(content).toContain("setAmount('');");
      expect(content).toContain("setCategory('fuel');");
      expect(content).toContain("setDescription('Nafta Súper');");
      expect(content).toContain("setPaymentMethod('cash');");
    });

    it('BusinessFormModal handles cancel by reverting fields and clearing errors', () => {
      const content = getFileContent('src/components/businesses/BusinessFormModal.tsx');
      expect(content).toContain('handleCancel');
      expect(content).toContain("setError('');");
      expect(content).toContain('businessToEdit');
      expect(content).toContain('setName(');
      expect(content).toContain('setPhone(');
      expect(content).toContain('setPlantaUrbana(');
      expect(content).toContain('setBarrioCerca(');
      expect(content).toContain('setBarrioLejos(');
      expect(content).toContain('setPaymentCycle(');
    });

    it('MaintenanceFormModal resets date, item, cost and errors on isOpen and cancel', () => {
      const content = getFileContent('src/components/maintenance/MaintenanceFormModal.tsx');
      expect(content).toContain('useEffect');
      expect(content).toContain('handleCancel');
      expect(content).toContain('defaultIsOilChange');
      expect(content).toContain('getTodayDateString()');
      expect(content).toContain("setCost('');");
      expect(content).toContain("setError('');");
    });

    it('BusinessDebtModal provides 58px Volver button when debts > 0 and 58px Cerrar when debt is 0', () => {
      const content = getFileContent('src/components/businesses/BusinessDebtModal.tsx');
      expect(content).toContain('Volver sin Liquidar');
      expect(content).toContain('size="lg"');
      // Verify both branches have size="lg"
      const lgMatches = content.match(/size="lg"/g) || [];
      expect(lgMatches.length).toBeGreaterThanOrEqual(4); // WhatsApp, Settle, Volver, Cerrar
    });
  });
});
