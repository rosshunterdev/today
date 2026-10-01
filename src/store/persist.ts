// Asks the browser not to evict our IndexedDB (iOS can clear unused site data). Best effort only.
export async function requestPersistentStorage(): Promise<void> {
  try {
    const storage = navigator.storage;
    if (!storage?.persist || !storage.persisted) return;
    if (await storage.persisted()) return;
    await storage.persist();
  } catch {
    // Not supported or refused: data still lives locally.
  }
}
