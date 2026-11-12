import { useEffect, useState } from 'react';
import { getTheme, setTheme, type Theme } from '../store/theme';
import { MoonIcon, SunIcon } from './icons';

// The browser bar follows the page colour, so night pages don't sit under a pale strip on a phone.
const PAPER: Record<Theme, string> = { day: '#fffdfa', night: '#1f1b17' };

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'night') root.dataset.theme = 'night';
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAPER[theme]);
}

export function ThemeSwitch() {
  const [theme, setShown] = useState<Theme>(getTheme);
  useEffect(() => applyTheme(theme), [theme]);
  const night = theme === 'night';
  return (
    <button
      type="button"
      className="theme-switch"
      aria-label="Night pages"
      aria-pressed={night}
      onClick={() => {
        const next: Theme = night ? 'day' : 'night';
        setTheme(next);
        setShown(next);
      }}
    >
      {night ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
