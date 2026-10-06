type Listener = (event: MediaQueryListEvent) => void;

let matches: boolean | ((query: string) => boolean) = true;
const listeners = new Set<Listener>();

/** true/false면 모든 미디어 쿼리가 같은 값, 함수면 쿼리 문자열마다 따로 정한다. */
export function setMediaMatches(next: boolean | ((query: string) => boolean)): void {
  matches = next;
  listeners.forEach((listener) => listener({ matches: typeof next === 'boolean' ? next : false } as MediaQueryListEvent));
}

export function installMatchMedia(): void {
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        if (query.includes('prefers-reduced-motion')) {
          return false;
        }
        return typeof matches === 'boolean' ? matches : matches(query);
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
