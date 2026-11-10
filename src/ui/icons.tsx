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

export function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...PEN} d="M7 18.5h10.2a4 4 0 0 0 .6-7.95A5.6 5.6 0 0 0 7 9.3a4.6 4.6 0 0 0 0 9.2z" />
    </svg>
  );
}

// Points forward; the calendar turns it round for the month before.
export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...PEN} d="M9.5 5.5l6 6.5-6 6.5" />
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

export function BinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...PEN} d="M4 6.5h16M9.5 6.5V4.8c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v1.7M6 6.5l1.1 12.6c.1.9.8 1.4 1.6 1.4h6.6c.8 0 1.5-.5 1.6-1.4L18 6.5M10 10.5v6.5M14 10.5v6.5" />
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
