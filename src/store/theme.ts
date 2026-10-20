export type Theme = 'day' | 'night';

const KEY = 'today.theme';

// A choice per device, so it lives in localStorage rather than the synced database.
// Storage can be blocked (private browsing); the switch then still works for this visit.
export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'night' ? 'night' : 'day';
  } catch {
    return 'day';
  }
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === 'night') localStorage.setItem(KEY, 'night');
    else localStorage.removeItem(KEY);
  } catch {
    // Blocked storage: nowhere to remember it.
  }
}
