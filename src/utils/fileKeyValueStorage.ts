import * as FileSystem from 'expo-file-system/legacy';
import type { StateStorage } from 'zustand/middleware';

/**
 * Small key/value storage on the app's document directory, for zustand `persist`.
 *
 * Uses expo-file-system, which every shipped binary already contains, so the
 * Make Food Count draft can persist without a new native module (AsyncStorage
 * would need a store build, and an OTA update without it would crash on start).
 *
 * A torn or unreadable file reads as "no draft" rather than throwing; the
 * server still holds everything that was synced.
 */
const DIR = `${FileSystem.documentDirectory ?? ''}kv/`;

let dirReady: Promise<void> | null = null;

function ensureDir(): Promise<void> {
  if (!dirReady) {
    dirReady = FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => undefined);
  }
  return dirReady;
}

function pathFor(key: string): string {
  return `${DIR}${encodeURIComponent(key)}.json`;
}

/** Serialise writes per key so an older write can never land after a newer one. */
const queues = new Map<string, Promise<unknown>>();

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  queues.set(key, next);
  void next.finally(() => {
    if (queues.get(key) === next) queues.delete(key);
  });
  return next;
}

export const fileKeyValueStorage: StateStorage = {
  async getItem(key) {
    if (!FileSystem.documentDirectory) return null;
    await (queues.get(key) ?? Promise.resolve()).catch(() => undefined);
    try {
      const info = await FileSystem.getInfoAsync(pathFor(key));
      if (!info.exists) return null;
      return await FileSystem.readAsStringAsync(pathFor(key));
    } catch {
      return null;
    }
  },

  setItem(key, value) {
    if (!FileSystem.documentDirectory) return Promise.resolve();
    return enqueue(key, async () => {
      await ensureDir();
      await FileSystem.writeAsStringAsync(pathFor(key), value);
    }).catch(() => undefined);
  },

  removeItem(key) {
    if (!FileSystem.documentDirectory) return Promise.resolve();
    return enqueue(key, () => FileSystem.deleteAsync(pathFor(key), { idempotent: true })).catch(() => undefined);
  },
};
