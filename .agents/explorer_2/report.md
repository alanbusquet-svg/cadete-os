# Technical Investigation & Design Report: ConfirmDialog (R2) & CashDrawer Cleanup (R3)

**Author:** Explorer Subagent 2  
**Target Project:** Cadete OS (PWA React + Vite + TypeScript + Tailwind CSS)  
**Date:** 2026-08-27  
**Scope:** Requirements R2 & R3 from `ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

This investigation surveys Cadete OS for the implementation of:
1. **R2: Reusable `ConfirmDialog` Component**: Replacing native, synchronous, non-styled `window.confirm()` browser dialogs with a high-contrast, glove-friendly Dark Theme modal dialog (`src/components/common/ConfirmDialog.tsx`) across `OrderList.tsx`, `ExpenseList.tsx`, and `SettingsView.tsx`.
2. **R3: CashDrawerCard Duplicate Value Removal**: Eliminating the duplicate rendering of `realCashEarned` at line ~142 ("Efectivo cobrado menos gastos:") in `src/components/finance/CashDrawerCard.tsx`, while preserving the underlying financial calculation logic and visual card aesthetics.

All proposed architectures maintain strict adherence to:
- **TypeScript strict mode** (`noUnusedLocals: true`, zero `any`).
- **Cadete OS Ergonomics**: Dark theme (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`), ≥52px touch targets for single-hand or gloved operation.
- **Zero test regressions** against the existing 114 test suite.

---

## 2. Specification & Design for `ConfirmDialog.tsx` (R2)

### 2.1 Component Location & Interface
**File path:** `src/components/common/ConfirmDialog.tsx`

```typescript
import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;              // Default: "Eliminar"
  cancelLabel?: string;               // Default: "Cancelar"
  confirmVariant?: 'danger' | 'primary'; // Default: 'danger'
}
```

### 2.2 Layout, Styling & Touch Ergonomics
- **Backdrop Overlay:** `fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200`
- **Dialog Container:** `relative w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col space-y-4`
- **Mobile Bottom Sheet Handle:** `w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-1 sm:hidden flex-shrink-0`
- **Header & Visual Icon:**
  - **Danger variant (`confirmVariant === 'danger'`):** `AlertTriangle` icon inside `w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0`.
  - **Primary variant (`confirmVariant === 'primary'`):** `CheckCircle2` icon inside `w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0`.
- **Text Hierarchy:**
  - `title`: `<h3 className="text-lg font-bold text-zinc-100 leading-snug">{title}</h3>`
  - `message`: `<p className="text-sm text-zinc-400 leading-relaxed">{message}</p>`
- **Action Buttons (Touch Targets ≥ 52px):**
  - Uses existing `Button` component with `size="md"` (which sets `min-h-[52px]`).
  - Container: `<div className="grid grid-cols-2 gap-3 pt-2">`
  - Cancel Action: `<Button variant="secondary" size="md" fullWidth onClick={onCancel}>{cancelLabel}</Button>`
  - Confirm Action: `<Button variant={confirmVariant} size="md" fullWidth onClick={onConfirm}>{confirmLabel}</Button>`
- **Accessibility & Scroll Locking:**
  - Locks `document.body.style.overflow = 'hidden'` when `isOpen === true`.
  - Keyboard listener: Closes dialog on `Escape` key press.
  - Backdrop click triggers `onCancel`.

### 2.3 Reference Implementation

```tsx
import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'danger'
}) => {
  // Prevent background scroll when dialog is active
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop overlay */}
      <div className="fixed inset-0" onClick={onCancel} aria-hidden="true" />

      {/* Dialog card */}
      <div className="relative w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col space-y-4">
        {/* Mobile handle */}
        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-1 sm:hidden flex-shrink-0" />

        {/* Content row */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              confirmVariant === 'danger'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {confirmVariant === 'danger' ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-lg font-bold text-zinc-100 leading-snug">{title}</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{message}</p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex items-center justify-center transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buttons (min 52px touch target) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={confirmVariant}
            size="md"
            fullWidth
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## 3. Call Sites Analysis & State Management Migration (R2)

### 3.1 `src/components/orders/OrderList.tsx`
- **Current implementation (Line 32-36):**
  ```tsx
  const handleDelete = (orderId: string) => {
    if (window.confirm('¿Eliminar este viaje?')) {
      deleteOrder(orderId);
    }
  };
  ```
- **New state model:**
  ```tsx
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const handleConfirmDelete = () => {
    if (orderToDelete) {
      deleteOrder(orderToDelete);
      setOrderToDelete(null);
    }
  };
  ```
- **ConfirmDialog JSX insertion (at root of component):**
  ```tsx
  <ConfirmDialog
    isOpen={orderToDelete !== null}
    title="Eliminar Viaje"
    message="¿Estás seguro de que querés eliminar este viaje? Esta acción no se puede deshacer."
    confirmLabel="Eliminar"
    confirmVariant="danger"
    onConfirm={handleConfirmDelete}
    onCancel={() => setOrderToDelete(null)}
  />
  ```

---

### 3.2 `src/components/finance/ExpenseList.tsx`
- **Current implementation (Line 35-39):**
  ```tsx
  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este gasto?')) {
      deleteExpense(id);
    }
  };
  ```
- **New state model:**
  ```tsx
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setExpenseToDelete(id);
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };
  ```
- **ConfirmDialog JSX insertion:**
  ```tsx
  <ConfirmDialog
    isOpen={expenseToDelete !== null}
    title="Eliminar Gasto"
    message="¿Estás seguro de que querés eliminar este registro de gasto del turno?"
    confirmLabel="Eliminar"
    confirmVariant="danger"
    onConfirm={handleConfirmDelete}
    onCancel={() => setExpenseToDelete(null)}
  />
  ```

---

### 3.3 `src/components/settings/SettingsView.tsx`
- **Current implementation (Line 95-100):**
  ```tsx
  const handleResetData = () => {
    if (window.confirm('¿Reiniciar todos los datos a la configuración demo inicial?')) {
      resetData();
      showNotification('success', 'Datos restaurados a valores iniciales');
    }
  };
  ```
- **New state model:**
  ```tsx
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  const handleConfirmReset = () => {
    resetData();
    setIsResetConfirmOpen(false);
    showNotification('success', 'Datos restaurados a valores iniciales');
  };
  ```
- **Trigger button:**
  ```tsx
  <Button
    variant="outline"
    size="md"
    fullWidth
    onClick={() => setIsResetConfirmOpen(true)}
    leftIcon={<RotateCcw className="w-4 h-4" />}
  >
    Restablecer Datos Demo
  </Button>
  ```
- **ConfirmDialog JSX insertion:**
  ```tsx
  <ConfirmDialog
    isOpen={isResetConfirmOpen}
    title="Restablecer Datos Demo"
    message="¿Estás seguro de que querés reiniciar todos los datos a la configuración demo inicial? Se borrarán los viajes, gastos y comercios agregados."
    confirmLabel="Restablecer"
    confirmVariant="danger"
    onConfirm={handleConfirmReset}
    onCancel={() => setIsResetConfirmOpen(false)}
  />
  ```

---

### 3.4 Additional Codebase Audit (`window.confirm` in other files)
During the full scan, three additional files were identified with `window.confirm`:
1. `src/components/businesses/BusinessList.tsx` (line 31: `handleDelete`)
2. `src/components/businesses/BusinessDebtModal.tsx` (line 37: `handleSettle`)
3. `src/components/maintenance/MaintenanceList.tsx` (line 29: `handleDelete`)

*Note:* While R2 explicitly lists `OrderList.tsx`, `ExpenseList.tsx`, and `SettingsView.tsx`, the implementer may optionally extend `ConfirmDialog` to these components if complete elimination of `window.confirm` across the entire codebase is desired.

---

## 4. CashDrawerCard Duplicate Value Removal (R3)

### 4.1 Inspection of `src/components/finance/CashDrawerCard.tsx`
Currently, lines 138-164 contain:
```tsx
      {/* R2: Breakdown Line: Fondo de Cambio & Efectivo Real Ganado */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium">Efectivo cobrado menos gastos:</span>
          <span className="font-bold text-zinc-200">{formatCurrency(realCashEarned)}</span>
        </div>

        {startingCash > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-400/90 pt-1 border-t border-zinc-800/80">
            <span className="font-semibold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> Fondo de Cambio:
            </span>
            <span className="font-bold">
              -{formatCurrency(startingCash)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
          <span className="font-bold text-emerald-400 uppercase tracking-wider">
            Efectivo Real Ganado:
          </span>
          <span className="font-black text-sm text-emerald-400">
            {formatCurrency(realCashEarned)}
          </span>
        </div>
      </div>
```

### 4.2 Exact Issue Identified
- `realCashEarned` is rendered at line 142 as `"Efectivo cobrado menos gastos: ${formatCurrency(realCashEarned)}"`.
- `realCashEarned` is rendered again at line 161 as `"Efectivo Real Ganado: ${formatCurrency(realCashEarned)}"`.
- This creates visual redundancy and confusion for couriers during shift reconciliation.

### 4.3 Proposed Clean Replacement
Remove the first `<div>` (lines 140-143) completely. When `startingCash > 0`, it appears as the top line item with `-Fondo de Cambio`, followed by the final `Efectivo Real Ganado:` line with a top border divider. When `startingCash === 0`, only the `Efectivo Real Ganado:` line is displayed cleanly without unnecessary top borders.

```tsx
      {/* Breakdown Line: Fondo de Cambio & Efectivo Real Ganado */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        {startingCash > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-400/90">
            <span className="font-semibold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> Fondo de Cambio:
            </span>
            <span className="font-bold">
              -{formatCurrency(startingCash)}
            </span>
          </div>
        )}

        <div
          className={`flex items-center justify-between text-xs ${
            startingCash > 0 ? 'pt-1 border-t border-zinc-800/80' : ''
          }`}
        >
          <span className="font-bold text-emerald-400 uppercase tracking-wider">
            Efectivo Real Ganado:
          </span>
          <span className="font-black text-sm text-emerald-400">
            {formatCurrency(realCashEarned)}
          </span>
        </div>
      </div>
```

### 4.4 Mathematical Invariant Verification
- In `src/utils/calculations.ts`:
  - `netProfit = totalRevenue - totalExpenses`
  - `realCashEarned = cashCollected - cashExpenses`
  - `cashInPocket = initialCash + realCashEarned`
- In `src/components/finance/CashDrawerCard.tsx`:
  - `const startingCash = summary.startingCash || 0;`
  - `const realCashEarned = summary.realCashEarned ?? (summary.cashInPocket - startingCash);`
- **Conclusion:** The calculation logic remains completely intact; only the redundant view row is removed.

---

## 5. Verification & Acceptance Checklist

| Requirement | Target | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **R2: ConfirmDialog Component** | `src/components/common/ConfirmDialog.tsx` | Unit test / render check props, dark styles, ≥52px buttons | Ready for implementation |
| **R2: OrderList Integration** | `src/components/orders/OrderList.tsx` | Confirm dialog renders on delete click; `window.confirm` removed | Ready for implementation |
| **R2: ExpenseList Integration** | `src/components/finance/ExpenseList.tsx` | Confirm dialog renders on delete click; `window.confirm` removed | Ready for implementation |
| **R2: SettingsView Integration** | `src/components/settings/SettingsView.tsx` | Confirm dialog renders on reset click; `window.confirm` removed | Ready for implementation |
| **R3: Duplicate Removal** | `src/components/finance/CashDrawerCard.tsx` | Verify `realCashEarned` rendered exactly once | Ready for implementation |
| **Integrity & Strict TS** | Entire project | `npm run build` (`tsc && vite build`) exit code 0 | Ready for implementation |
| **Existing Test Suite** | 114 tests | `npm run test` exits 0 with 114 passing tests | Ready for implementation |

---
