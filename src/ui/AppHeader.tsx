import { CloudButton } from './CloudButton';
import { ThemeSwitch } from './ThemeSwitch';

export type View = 'today' | 'calendar';

const LINKS: { view: View; label: string }[] = [
  { view: 'today', label: 'Today' },
  { view: 'calendar', label: 'Calendar' },
];

// The FOCUS header: the wordmark, the views, and the app's two switches.
// The links are real ones (#today, #calendar), so back and forward move between views.
export function AppHeader({ view, onView }: { view: View; onView: (view: View) => void }) {
  return (
    <header className="app-header">
      <p className="wordmark">FOCUS</p>
      <div className="navrow">
        <nav className="navlinks" aria-label="Views">
          {LINKS.map((link) => (
            <a
              key={link.view}
              className="navlink"
              href={`#${link.view}`}
              aria-current={view === link.view ? 'page' : undefined}
              onClick={() => onView(link.view)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <CloudButton />
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}
