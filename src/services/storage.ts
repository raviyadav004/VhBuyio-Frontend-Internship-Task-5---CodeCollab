import type { StateStorage } from 'zustand/middleware';

export type StorageErrorKind = 'read' | 'write' | 'parse' | 'quota';
export interface StorageError {
  kind: StorageErrorKind;
  key: string;
  message: string;
}

type Listener = (error: StorageError) => void;
const listeners = new Set<Listener>();
export function onStorageError(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function report(error: StorageError) {
  for (const listener of listeners) {
    try {
      listener(error);
    } catch {
    }
  }
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22
  );
}

export function isStorageAvailable(): boolean {
  try {
    const probe = '__codecollab_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    report({ kind: 'read', key, message: (err as Error).message });
    return null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    report({
      kind: isQuotaError(err) ? 'quota' : 'write',
      key,
      message: isQuotaError(err) ? 'Browser storage is full. Recent changes are kept in memory only.' : (err as Error).message,
    });
    return false;
  }
}

export function removeRaw(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    report({ kind: 'write', key, message: (err as Error).message });
  }
}

const pendingCancellers = new Set<() => void>();
export function createDebouncedStorage(delayMs = 600): StateStorage {
  const pending = new Map<string, string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    for (const [key, value] of pending) writeRaw(key, value);
    pending.clear();
  };

  pendingCancellers.add(() => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending.clear();
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  return {
    getItem: (name) => {
      if (pending.has(name)) return pending.get(name) as string;
      const raw = readRaw(name);
      if (raw === null) return null;
      try {
        JSON.parse(raw);
        return raw;
      } catch {
        report({
          kind: 'parse',
          key: name,
          message: 'Saved data was unreadable and has been reset.',
        });
        removeRaw(name);
        return null;
      }
    },
    setItem: (name, value) => {
      pending.set(name, value);
      if (timer === null) {
        timer = setTimeout(flush, delayMs);
      }
    },
    removeItem: (name) => {
      pending.delete(name);
      removeRaw(name);
    },
  };
}

export const STORAGE_KEYS = {
  projects: 'codecollab.projects',
  editor: 'codecollab.editor',
  ui: 'codecollab.ui',
} as const;

export function resetAllStorage(): void {
  for (const cancel of pendingCancellers) cancel();
  for (const key of Object.values(STORAGE_KEYS)) removeRaw(key);
}