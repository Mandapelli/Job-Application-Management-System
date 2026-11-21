const KEY = 'careertrack_token';
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

// localStorage can throw (private mode, blocked storage), so every access is guarded.
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      /* ignore */
    }
    emit();
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
