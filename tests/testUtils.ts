import React from 'react';

// Polyfill KeyboardEvent for Node test runner if missing
if (typeof (globalThis as any).KeyboardEvent === 'undefined') {
  class MockKeyboardEvent extends Event {
    key: string;
    code: string;
    defaultPrevented: boolean = false;
    constructor(type: string, eventInitDict?: { key?: string; code?: string; cancelable?: boolean }) {
      super(type, { cancelable: eventInitDict?.cancelable ?? false });
      this.key = eventInitDict?.key ?? '';
      this.code = eventInitDict?.code ?? '';
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
  }
  (globalThis as any).KeyboardEvent = MockKeyboardEvent;
  if (typeof (globalThis as any).window !== 'undefined') {
    (globalThis as any).window.KeyboardEvent = MockKeyboardEvent;
  }
}

export interface RenderHookResult<Result, Props = void> {
  result: { current: Result };
  rerender: (newProps?: Props) => void;
  unmount: () => void;
}

const mountedHooks: Array<() => void> = [];

/**
 * Unmount all currently mounted hooks and clear the registry.
 * Prevents event listener leaks across tests.
 */
export function cleanup(): void {
  while (mountedHooks.length > 0) {
    const unmountFn = mountedHooks.pop();
    if (unmountFn) {
      try {
        unmountFn();
      } catch (err) {
        console.error('Error during hook cleanup:', err);
      }
    }
  }
}

/**
 * Lightweight, zero-dependency renderHook runner for React 18 in Node/Vitest.
 * Executes genuine React hooks using ReactCurrentDispatcher without @testing-library/react or jsdom.
 */
export function renderHook<Result, Props = void>(
  renderCallback: (props: Props) => Result,
  options?: { initialProps?: Props }
): RenderHookResult<Result, Props> {
  const hooksState: any[] = [];
  const cleanups: Map<number, () => void> = new Map();
  let hookIndex = 0;
  let currentProps = options?.initialProps as Props;
  const result: { current: Result } = { current: undefined as any };

  function areDepsEqual(prevDeps?: any[], nextDeps?: any[]): boolean {
    if (!prevDeps || !nextDeps) return false;
    if (prevDeps.length !== nextDeps.length) return false;
    for (let i = 0; i < prevDeps.length; i++) {
      if (!Object.is(prevDeps[i], nextDeps[i])) return false;
    }
    return true;
  }

  const dispatcher = {
    useRef: (initialValue: any) => {
      const idx = hookIndex++;
      if (hooksState[idx] === undefined) {
        hooksState[idx] = { current: initialValue };
      }
      return hooksState[idx];
    },
    useCallback: (callback: any, deps?: any[]) => {
      const idx = hookIndex++;
      const prev = hooksState[idx];
      if (!prev || !areDepsEqual(prev.deps, deps)) {
        hooksState[idx] = { callback, deps };
        return callback;
      }
      return prev.callback;
    },
    useEffect: (effect: () => void | (() => void), deps?: any[]) => {
      const idx = hookIndex++;
      const prev = hooksState[idx];
      const hasChanged = !prev || deps === undefined || !areDepsEqual(prev.deps, deps);
      if (hasChanged) {
        const prevCleanup = cleanups.get(idx);
        if (prevCleanup) {
          try {
            prevCleanup();
          } catch (err) {
            console.error('Error in effect cleanup:', err);
          }
          cleanups.delete(idx);
        }
        hooksState[idx] = { deps: deps ? [...deps] : undefined };
        const cleanup = effect();
        if (typeof cleanup === 'function') {
          cleanups.set(idx, cleanup);
        }
      }
    },
    useLayoutEffect: (effect: () => void | (() => void), deps?: any[]) => {
      const idx = hookIndex++;
      const prev = hooksState[idx];
      const hasChanged = !prev || deps === undefined || !areDepsEqual(prev.deps, deps);
      if (hasChanged) {
        const prevCleanup = cleanups.get(idx);
        if (prevCleanup) {
          try {
            prevCleanup();
          } catch (err) {
            console.error('Error in layout effect cleanup:', err);
          }
          cleanups.delete(idx);
        }
        hooksState[idx] = { deps: deps ? [...deps] : undefined };
        const cleanup = effect();
        if (typeof cleanup === 'function') {
          cleanups.set(idx, cleanup);
        }
      }
    },
    useMemo: (factory: () => any, deps?: any[]) => {
      const idx = hookIndex++;
      const prev = hooksState[idx];
      if (!prev || !areDepsEqual(prev.deps, deps)) {
        const value = factory();
        hooksState[idx] = { value, deps };
        return value;
      }
      return prev.value;
    },
    useState: (initial: any) => {
      const idx = hookIndex++;
      if (hooksState[idx] === undefined) {
        hooksState[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (newValue: any) => {
        hooksState[idx] = typeof newValue === 'function' ? newValue(hooksState[idx]) : newValue;
        render(currentProps);
      };
      return [hooksState[idx], setState];
    },
    useId: () => {
      const idx = hookIndex++;
      if (hooksState[idx] === undefined) {
        hooksState[idx] = `:r${idx}:`;
      }
      return hooksState[idx];
    }
  };

  const ReactInternals =
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED ||
    (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED ||
    (React as any).__SECRET_INTERNALS_DO_NOT_OR_YOU_WILL_BE_FIRED;

  function render(props: Props) {
    hookIndex = 0;
    currentProps = props;
    const prevDispatcher = ReactInternals?.ReactCurrentDispatcher?.current;
    if (ReactInternals?.ReactCurrentDispatcher) {
      ReactInternals.ReactCurrentDispatcher.current = dispatcher;
    }
    try {
      result.current = renderCallback(props);
    } finally {
      if (ReactInternals?.ReactCurrentDispatcher) {
        ReactInternals.ReactCurrentDispatcher.current = prevDispatcher;
      }
    }
  }

  function unmount() {
    const hookIdx = mountedHooks.indexOf(unmount);
    if (hookIdx !== -1) {
      mountedHooks.splice(hookIdx, 1);
    }
    const cleanupEntries = Array.from(cleanups.entries()).reverse();
    for (const [idx, cleanupFn] of cleanupEntries) {
      try {
        cleanupFn();
      } catch (err) {
        console.error('Error in unmount cleanup:', err);
      } finally {
        cleanups.delete(idx);
      }
    }
  }

  render(currentProps);

  mountedHooks.push(unmount);

  return {
    result,
    rerender: (newProps?: Props) => render(newProps !== undefined ? newProps : currentProps),
    unmount
  };
}

/**
 * Synchronous act wrapper for Node test execution.
 */
export function act(callback: () => void): void {
  callback();
}
