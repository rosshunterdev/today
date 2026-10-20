// Drawn icons in the ink colour, so the app's own controls look like the rest of the page.
const PEN = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...PEN} d="M19.6 14.6A8 8 0 1 1 9.4 4.4a6.4 6.4 0 0 0 10.2 10.2z" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle {...PEN} cx="12" cy="12" r="4.2" />
      <path {...PEN} d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M5.4 18.6l1.5-1.5M17.1 6.9l1.5-1.5" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...PEN} d="M4.5 19.5l1.1-4.5L15.8 4.8c.7-.7 1.9-.7 2.6 0l.9.9c.7.7.7 1.9 0 2.6L9.1 18.4zM14 6.6l3.4 3.4" />
    </svg>
  );
}

// The grip for dragging a line. Filled by CSS.
export function DragDotsIcon() {
  return (
    <svg viewBox="0 0 8 14" aria-hidden="true" focusable="false">
      <circle cx="2" cy="2" r="1.3" />
      <circle cx="6" cy="2" r="1.3" />
      <circle cx="2" cy="7" r="1.3" />
      <circle cx="6" cy="7" r="1.3" />
      <circle cx="2" cy="12" r="1.3" />
      <circle cx="6" cy="12" r="1.3" />
    </svg>
  );
}

// The bullet once a line is crossed off. Stroked by CSS.
export function CrossIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d="M2.5 2.2l9.1 9.6M11.4 2.6l-9 8.9" />
    </svg>
  );
}
