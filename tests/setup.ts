// Polyfill window for Node test runners if missing
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

// Polyfill localStorage for Node/Vitest test environment if missing
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.clear) {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    }
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true
  });
}

// Polyfill PopStateEvent
if (typeof (globalThis as any).PopStateEvent === 'undefined') {
  class MockPopStateEvent {
    type: string;
    state: any;
    defaultPrevented: boolean = false;
    constructor(type: string, eventInitDict?: { state?: any }) {
      this.type = type;
      this.state = eventInitDict?.state ?? null;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
    stopPropagation() {}
  }
  (globalThis as any).PopStateEvent = MockPopStateEvent;
  if (typeof (globalThis as any).window !== 'undefined') {
    (globalThis as any).window.PopStateEvent = MockPopStateEvent;
  }
}

// Polyfill window event dispatching if missing on globalThis / window
if (typeof (globalThis as any).addEventListener === 'undefined') {
  const windowListeners = new Map<string, Function[]>();
  const addListener = (event: string, handler: Function) => {
    const list = windowListeners.get(event) || [];
    list.push(handler);
    windowListeners.set(event, list);
  };
  const removeListener = (event: string, handler: Function) => {
    const list = windowListeners.get(event) || [];
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
    windowListeners.set(event, list);
  };
  const dispatch = (event: any) => {
    const list = windowListeners.get(event.type || 'popstate') || [];
    list.forEach((fn) => fn(event));
    return true;
  };

  (globalThis as any).addEventListener = addListener;
  (globalThis as any).removeEventListener = removeListener;
  (globalThis as any).dispatchEvent = dispatch;
  if (typeof (globalThis as any).window !== 'undefined') {
    (globalThis as any).window.addEventListener = addListener;
    (globalThis as any).window.removeEventListener = removeListener;
    (globalThis as any).window.dispatchEvent = dispatch;
  }
}

// Polyfill window.history for Node/Vitest test environment if missing
if (typeof (globalThis as any).history === 'undefined' || !(globalThis as any).history?.pushState) {
  interface HistoryEntry {
    state: any;
    title: string;
    url?: string | null;
  }

  class MockHistory {
    private stack: HistoryEntry[] = [{ state: null, title: '', url: null }];
    private currentIndex: number = 0;

    get length(): number {
      return this.stack.length;
    }

    get state(): any {
      return this.stack[this.currentIndex]?.state ?? null;
    }

    pushState(state: any, title: string = '', url?: string | null): void {
      this.stack = this.stack.slice(0, this.currentIndex + 1);
      this.stack.push({ state, title, url: url ?? null });
      this.currentIndex = this.stack.length - 1;
    }

    replaceState(state: any, title: string = '', url?: string | null): void {
      if (this.stack.length === 0) {
        this.stack.push({ state, title, url: url ?? null });
        this.currentIndex = 0;
      } else {
        this.stack[this.currentIndex] = { state, title, url: url ?? null };
      }
    }

    back(): void {
      this.go(-1);
    }

    forward(): void {
      this.go(1);
    }

    go(delta: number = 0): void {
      const targetIndex = this.currentIndex + delta;
      if (targetIndex >= 0 && targetIndex < this.stack.length) {
        this.currentIndex = targetIndex;
        const currentState = this.state;
        const PopEventCls = (globalThis as any).PopStateEvent;
        const popStateEvent = PopEventCls
          ? new PopEventCls('popstate', { state: currentState })
          : { type: 'popstate', state: currentState };
        if (typeof (globalThis as any).window?.dispatchEvent === 'function') {
          (globalThis as any).window.dispatchEvent(popStateEvent);
        } else if (typeof (globalThis as any).dispatchEvent === 'function') {
          (globalThis as any).dispatchEvent(popStateEvent);
        }
      }
    }

    _reset(): void {
      this.stack = [{ state: null, title: '', url: null }];
      this.currentIndex = 0;
    }
  }

  const mockHistory = new MockHistory();
  Object.defineProperty(globalThis, 'history', {
    value: mockHistory,
    writable: true,
    configurable: true
  });
  if (typeof (globalThis as any).window !== 'undefined') {
    Object.defineProperty((globalThis as any).window, 'history', {
      value: mockHistory,
      writable: true,
      configurable: true
    });
  }
}

// Polyfill minimal document / Element for Node/Vitest test environment if missing
if (typeof globalThis.document === 'undefined' || !(globalThis as any).document.documentElement) {
  class MockElement {
    tagName: string;
    parentElement: MockElement | null = null;
    attributes: Record<string, string> = {};
    style: Record<string, any> = {};
    classList = {
      add: (_cls: string) => {},
      remove: (_cls: string) => {},
      contains: (_cls: string) => false,
      toggle: (_cls: string) => false
    };

    constructor(tagName: string) {
      this.tagName = tagName.toUpperCase();
    }

    setAttribute(name: string, value: string) {
      this.attributes[name.toLowerCase()] = String(value);
    }

    getAttribute(name: string) {
      return this.attributes[name.toLowerCase()] ?? null;
    }

    appendChild(child: MockElement) {
      child.parentElement = this;
      return child;
    }

    removeChild(child: MockElement) {
      child.parentElement = null;
      return child;
    }

    addEventListener(_event: string, _handler: any) {}
    removeEventListener(_event: string, _handler: any) {}

    closest(selector: string): MockElement | null {
      const tokens = selector.split(',').map((t) => t.trim().toLowerCase());
      let current: MockElement | null = this;
      while (current) {
        const tag = current.tagName.toLowerCase();
        const role = current.getAttribute('role');
        const noSwipe = current.getAttribute('data-no-swipe');

        for (const token of tokens) {
          if (token === tag) return current;
          if (token === '[role="button"]' && role === 'button') return current;
          if (token.startsWith('[role=') && role && token.includes(role)) return current;
          if (token === '[data-no-swipe]' && noSwipe !== null) return current;
          if (token === '[data-no-swipe="true"]' && noSwipe === 'true') return current;
        }
        current = current.parentElement;
      }
      return null;
    }
  }

  const docElement = new MockElement('html');
  const bodyElement = new MockElement('body');
  const headElement = new MockElement('head');

  (globalThis as any).document = {
    createElement: (tag: string) => new MockElement(tag),
    createElementNS: (_ns: string, tag: string) => new MockElement(tag),
    documentElement: docElement,
    body: bodyElement,
    head: headElement
  };
  (globalThis as any).Element = MockElement;
}

// Polyfill screen for Leaflet Browser.js
if (typeof (globalThis as any).screen === 'undefined') {
  const mockScreen = {
    deviceXDPI: 96,
    logicalXDPI: 96,
    width: 1920,
    height: 1080
  };
  (globalThis as any).screen = mockScreen;
  if (typeof (globalThis as any).window !== 'undefined') {
    (globalThis as any).window.screen = mockScreen;
  }
}

// Polyfill navigator fields for Leaflet Browser.js
if (typeof (globalThis as any).navigator === 'undefined') {
  (globalThis as any).navigator = {};
}
if (!(globalThis as any).navigator.userAgent) {
  (globalThis as any).navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
}
if (!(globalThis as any).navigator.platform) {
  (globalThis as any).navigator.platform = 'Win32';
}

// Polyfill SpeechSynthesisUtterance
if (typeof (globalThis as any).SpeechSynthesisUtterance === 'undefined') {
  class MockSpeechSynthesisUtterance {
    text: string;
    lang: string = 'es-AR';
    pitch: number = 1;
    rate: number = 1;
    volume: number = 1;
    voice: any = null;
    onend: ((ev: any) => void) | null = null;
    onerror: ((ev: any) => void) | null = null;
    onstart: ((ev: any) => void) | null = null;

    constructor(text: string = '') {
      this.text = text;
    }
  }
  (globalThis as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
}

// Polyfill window.speechSynthesis
if (typeof (globalThis as any).speechSynthesis === 'undefined') {
  const mockVoices = [
    { lang: 'es-AR', name: 'Diego (es-AR)', default: true, localService: true, voiceURI: 'es-AR-diego' },
    { lang: 'es-ES', name: 'Laura (es-ES)', default: false, localService: true, voiceURI: 'es-ES-laura' },
    { lang: 'en-US', name: 'Samantha (en-US)', default: false, localService: true, voiceURI: 'en-US-samantha' }
  ];

  const mockSpeechSynthesis = {
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null as (() => void) | null,
    getVoices: () => mockVoices,
    speak: (utterance: any) => {
      mockSpeechSynthesis.speaking = true;
      if (utterance.onstart) utterance.onstart({ utterance });
      setTimeout(() => {
        mockSpeechSynthesis.speaking = false;
        if (utterance.onend) utterance.onend({ utterance });
      }, 0);
    },
    cancel: () => {
      mockSpeechSynthesis.speaking = false;
    },
    pause: () => {
      mockSpeechSynthesis.paused = true;
    },
    resume: () => {
      mockSpeechSynthesis.paused = false;
    }
  };

  Object.defineProperty(globalThis, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
    configurable: true
  });
  if (typeof (globalThis as any).window !== 'undefined') {
    Object.defineProperty((globalThis as any).window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true
    });
  }
}

// Polyfill navigator.geolocation
if (typeof (globalThis as any).navigator === 'undefined') {
  (globalThis as any).navigator = {};
}

if (typeof (globalThis as any).navigator.geolocation === 'undefined') {
  let watchIdCounter = 1;
  const activeWatches = new Set<number>();

  const mockGeolocation = {
    getCurrentPosition: (
      success: (pos: any) => void,
      _error?: (err: any) => void,
      _options?: any
    ) => {
      setTimeout(() => {
        success({
          coords: {
            latitude: -36.2307,
            longitude: -61.1130,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: 0,
            speed: 5
          },
          timestamp: Date.now()
        });
      }, 0);
    },
    watchPosition: (
      success: (pos: any) => void,
      _error?: (err: any) => void,
      _options?: any
    ) => {
      const id = watchIdCounter++;
      activeWatches.add(id);
      setTimeout(() => {
        if (activeWatches.has(id)) {
          success({
            coords: {
              latitude: -36.2307,
              longitude: -61.1130,
              accuracy: 8,
              altitude: null,
              altitudeAccuracy: null,
              heading: 45,
              speed: 7
            },
            timestamp: Date.now()
          });
        }
      }, 0);
      return id;
    },
    clearWatch: (id: number) => {
      activeWatches.delete(id);
    }
  };

  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
    configurable: true
  });
}

