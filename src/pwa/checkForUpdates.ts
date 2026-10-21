// Browsers only look for a new version on a fresh page load, and an installed app can sit open for days.
// So look again whenever the app comes back to the front. Returns a function that stops looking.
export function checkForUpdates(
  registration: Pick<ServiceWorkerRegistration, 'update'>,
  doc: EventTarget & { visibilityState: DocumentVisibilityState } = document,
): () => void {
  const onChange = () => {
    // Offline, the check fails; the next one will catch up.
    if (doc.visibilityState === 'visible') registration.update().catch(() => {});
  };
  doc.addEventListener('visibilitychange', onChange);
  return () => doc.removeEventListener('visibilitychange', onChange);
}
