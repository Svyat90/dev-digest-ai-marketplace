// localStorage for per-viewer preferences (theme, language). It can be missing or
// throw (private windows, blocked site data); the site then simply forgets.

export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null): void {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // Preference is not remembered; the page still works.
    }
  },
};
