import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from './testUtils';
import { useMapTheme, getStoredMapTheme, setStoredMapTheme } from '../src/hooks/useMapTheme';

describe('Map Theme Management (useMapTheme & Stored Theme)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to light theme when localStorage is empty', () => {
    expect(getStoredMapTheme()).toBe('light');
    const { result } = renderHook(() => useMapTheme());
    expect(result.current.mapTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('initializes to dark theme when stored in localStorage', () => {
    localStorage.setItem('cadete_os_map_theme', 'dark');
    expect(getStoredMapTheme()).toBe('dark');
    const { result } = renderHook(() => useMapTheme());
    expect(result.current.mapTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('toggles theme from light to dark and persists in localStorage', () => {
    const { result } = renderHook(() => useMapTheme());
    expect(result.current.mapTheme).toBe('light');

    act(() => {
      result.current.toggleMapTheme();
    });

    expect(result.current.mapTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(localStorage.getItem('cadete_os_map_theme')).toBe('dark');

    act(() => {
      result.current.toggleMapTheme();
    });

    expect(result.current.mapTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(localStorage.getItem('cadete_os_map_theme')).toBe('light');
  });

  it('allows setting a specific theme directly', () => {
    const { result } = renderHook(() => useMapTheme());

    act(() => {
      result.current.setMapTheme('dark');
    });

    expect(result.current.mapTheme).toBe('dark');
    expect(localStorage.getItem('cadete_os_map_theme')).toBe('dark');

    act(() => {
      result.current.setMapTheme('light');
    });

    expect(result.current.mapTheme).toBe('light');
    expect(localStorage.getItem('cadete_os_map_theme')).toBe('light');
  });

  it('syncs across multiple hook instances via window event', () => {
    const hook1 = renderHook(() => useMapTheme());
    const hook2 = renderHook(() => useMapTheme());

    expect(hook1.result.current.mapTheme).toBe('light');
    expect(hook2.result.current.mapTheme).toBe('light');

    act(() => {
      hook1.result.current.toggleMapTheme();
    });

    expect(hook1.result.current.mapTheme).toBe('dark');
    expect(hook2.result.current.mapTheme).toBe('dark');
  });
});
