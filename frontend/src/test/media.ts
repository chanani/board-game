type Listener = (event: MediaQueryListEvent) => void;

let matches = true;
const listeners = new Set<Listener>();

export function setMediaMatches(next: boolean): void {
  matches = next;
  listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
}

export function installMatchMedia(): void {
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return query.includes('prefers-reduced-motion') ? false : matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
      addListener: (listener: Listener) => listeners.add(listener),
      removeListener: (listener: Listener) => listeners.delete(listener),
      dispatchEvent: () => true,
    }) as unknown as MediaQueryList;
}

export function resetMedia(): void {
  matches = true;
  listeners.clear();
}
