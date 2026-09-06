import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { renderHook, act, cleanup } from './testUtils';
import { useTabNavigation } from '../src/App';
import type { ActiveTab } from '../src/types';

describe('Milestone 3 — Tab Navigation State Transitions & History Synchronization', () => {
  beforeEach(() => {
    if (typeof (window.history as any)?._reset === 'function') {
      (window.history as any)._reset();
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('initializes activeTab to orders by default', () => {
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current.activeTab).toBe('orders');
  });

  it('switches from orders to finance: pushes history state and updates activeTab', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    const { result } = renderHook(() => useTabNavigation());
    expect(result.current.activeTab).toBe('orders');

    act(() => {
      result.current.handleSelectTab('finance');
    });

    expect(result.current.activeTab).toBe('finance');
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith({ tab: 'finance' }, '');
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('switches from secondary tab to another secondary tab: uses replaceState', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    const { result } = renderHook(() => useTabNavigation());

    // 1. Move to secondary tab 'finance' (pushes state)
    act(() => {
      result.current.handleSelectTab('finance');
    });
    expect(pushSpy).toHaveBeenCalledWith({ tab: 'finance' }, '');

    // 2. Move between secondary tabs: finance -> map (must replaceState)
    act(() => {
      result.current.handleSelectTab('map');
    });
    expect(result.current.activeTab).toBe('map');
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith({ tab: 'map' }, '');

    // 3. Move between secondary tabs: map -> businesses (must replaceState)
    act(() => {
      result.current.handleSelectTab('businesses');
    });
    expect(result.current.activeTab).toBe('businesses');
    expect(replaceSpy).toHaveBeenCalledTimes(2);
    expect(replaceSpy).toHaveBeenCalledWith({ tab: 'businesses' }, '');

    // 4. Move between secondary tabs: businesses -> maintenance (must replaceState)
    act(() => {
      result.current.handleSelectTab('maintenance');
    });
    expect(result.current.activeTab).toBe('maintenance');
    expect(replaceSpy).toHaveBeenCalledTimes(3);

    // 5. Move between secondary tabs: maintenance -> settings (must replaceState)
    act(() => {
      result.current.handleSelectTab('settings');
    });
    expect(result.current.activeTab).toBe('settings');
    expect(replaceSpy).toHaveBeenCalledTimes(4);
    expect(replaceSpy).toHaveBeenCalledWith({ tab: 'settings' }, '');
  });

  it('switches from secondary tab back to orders: calls pushState', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');

    const { result } = renderHook(() => useTabNavigation());

    // Move to secondary tab
    act(() => {
      result.current.handleSelectTab('finance');
    });
    expect(result.current.activeTab).toBe('finance');
    expect(pushSpy).toHaveBeenCalledWith({ tab: 'finance' }, '');

    // Move back to orders tab
    act(() => {
      result.current.handleSelectTab('orders');
    });
    expect(result.current.activeTab).toBe('orders');
    expect(pushSpy).toHaveBeenCalledWith({ tab: 'orders' }, '');
  });

  it('does nothing when selecting the already active tab (no-op)', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    const { result } = renderHook(() => useTabNavigation());

    // Selecting 'orders' while on 'orders'
    act(() => {
      result.current.handleSelectTab('orders');
    });
    expect(result.current.activeTab).toBe('orders');
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();

    // Navigate to 'finance'
    act(() => {
      result.current.handleSelectTab('finance');
    });
    expect(pushSpy).toHaveBeenCalledTimes(1);

    // Selecting 'finance' while on 'finance'
    act(() => {
      result.current.handleSelectTab('finance');
    });
    expect(result.current.activeTab).toBe('finance');
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});

describe('Milestone 3 — Popstate Handling & Android Hardware Back Button', () => {
  beforeEach(() => {
    if (typeof (window.history as any)?._reset === 'function') {
      (window.history as any)._reset();
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('dispatches popstate with null state: transitions activeTab back to orders', () => {
    const { result } = renderHook(() => useTabNavigation());

    // Navigate to secondary tab
    act(() => {
      result.current.handleSelectTab('finance');
    });
    expect(result.current.activeTab).toBe('finance');

    // Simulate Android hardware back button (popping back to root with null state)
    act(() => {
      const PopEventCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopEventCls('popstate', { state: null });
      window.dispatchEvent(popEvent);
    });

    // activeTab must return to 'orders'
    expect(result.current.activeTab).toBe('orders');
  });

  it('dispatches popstate with state missing tab property: transitions activeTab back to orders', () => {
    const { result } = renderHook(() => useTabNavigation());

    act(() => {
      result.current.handleSelectTab('settings');
    });
    expect(result.current.activeTab).toBe('settings');

    // Popstate with empty state object
    act(() => {
      const PopEventCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopEventCls('popstate', { state: {} });
      window.dispatchEvent(popEvent);
    });

    expect(result.current.activeTab).toBe('orders');
  });

  it('dispatches popstate when already on orders: remains on orders', () => {
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current.activeTab).toBe('orders');

    act(() => {
      const PopEventCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopEventCls('popstate', { state: null });
      window.dispatchEvent(popEvent);
    });

    expect(result.current.activeTab).toBe('orders');
  });

  it('dispatches popstate with specific tab in state: transitions to that tab', () => {
    const { result } = renderHook(() => useTabNavigation());
    expect(result.current.activeTab).toBe('orders');

    act(() => {
      const PopEventCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopEventCls('popstate', { state: { tab: 'map' } });
      window.dispatchEvent(popEvent);
    });

    expect(result.current.activeTab).toBe('map');
  });

  it('restores activeTab from window.history.state.tab on initial mount', () => {
    // Pre-populate history state as if page was reloaded or restored
    window.history.replaceState({ tab: 'maintenance' }, '');

    const { result } = renderHook(() => useTabNavigation());
    expect(result.current.activeTab).toBe('maintenance');
  });

  it('removes popstate listener on unmount', () => {
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useTabNavigation());
    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
  });
});

describe('Milestone 3 — Interaction with Modal History Lifecycle', () => {
  beforeEach(() => {
    if (typeof (window.history as any)?._reset === 'function') {
      (window.history as any)._reset();
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('preserves secondary tab when a modal opened from that tab is dismissed via back button', () => {
    const { result } = renderHook(() => useTabNavigation());

    // 1. User navigates to 'finance'
    act(() => {
      result.current.handleSelectTab('finance');
    });
    expect(result.current.activeTab).toBe('finance');

    // 2. A modal is opened from finance (pushes modal state keeping tab)
    window.history.pushState({ tab: 'finance', modal: 'expense-form' }, '');

    // 3. User presses back button to dismiss the modal -> pops to { tab: 'finance' }
    act(() => {
      const PopEventCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopEventCls('popstate', { state: { tab: 'finance' } });
      window.dispatchEvent(popEvent);
    });

    // The activeTab must remain 'finance' while modal closes
    expect(result.current.activeTab).toBe('finance');

    // 4. User presses back button AGAIN -> pops to root (null)
    act(() => {
      const PopEventCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopEventCls('popstate', { state: null });
      window.dispatchEvent(popEvent);
    });

    // Now activeTab returns to 'orders'
    expect(result.current.activeTab).toBe('orders');
  });
});

describe('Milestone 3 — Source Code Contract & Adversarial Verification', () => {
  const getAppContent = (): string => {
    return readFileSync(resolve(__dirname, '../src/App.tsx'), 'utf-8');
  };

  it('preserves activeTab === "map" && <MapView /> verbatim (required by map_integration lines 132-135)', () => {
    const content = getAppContent();
    expect(content).toContain("activeTab === 'map' && <MapView />");
  });

  it('passes onSelectTab={handleSelectTab} to AppShell', () => {
    const content = getAppContent();
    expect(content).toContain('onSelectTab={handleSelectTab}');
  });

  it('uses lazy useState initializer that reads window.history.state.tab on initial mount', () => {
    const content = getAppContent();
    // The hook uses a lazy initializer function to synchronously restore tab from history
    expect(content).toContain('const [activeTab, setActiveTab] = useState<ActiveTab>(');
    expect(content).toContain('window.history?.state?.tab');
    expect(content).toContain('return defaultTab;');
  });

  it('registers and cleans up popstate event listener', () => {
    const content = getAppContent();
    expect(content).toContain("window.addEventListener('popstate', handlePopState)");
    expect(content).toContain("window.removeEventListener('popstate', handlePopState)");
  });

  it('uses pushState and replaceState in tab navigation logic', () => {
    const content = getAppContent();
    expect(content).toContain('window.history.pushState({ tab },');
    expect(content).toContain('window.history.replaceState({ tab },');
    expect(content).toContain("window.history.pushState({ tab: 'orders' },");
  });

  it('exports useTabNavigation, AppContent, and App', () => {
    const content = getAppContent();
    expect(content).toContain('export function useTabNavigation(');
    expect(content).toContain('export const AppContent: React.FC = () =>');
    expect(content).toContain('export const App: React.FC = () =>');
    expect(content).toContain('export default App;');
  });
});
