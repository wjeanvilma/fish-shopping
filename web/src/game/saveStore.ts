/**
 * Local-first save slots in IndexedDB (blueprint "Persistence": IndexedDB transactions).
 * Same policy as the Android SnapshotStore: a latest and a previous snapshot; the latest is
 * rotated into previous before each write, except right after recovering from the backup.
 * Falls back to memory when storage is unavailable (private windows, blocked site data).
 * Phase 14: QuotaExceededError on write also degrades to memory-only.
 */
const DB_NAME = "fish-shopping";
const STORE = "saves";
const LATEST = "harbor_save_latest";
const PREVIOUS = "harbor_save_previous";

export interface SaveStore {
  readonly persistent: boolean;
  readCandidates(): Promise<[label: "latest" | "previous", text: string][]>;
  write(snapshot: string, rotate: boolean): Promise<void>;
  /** Wipe both slots (New Game). */
  clear(): Promise<void>;
}

export function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name ?? "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  const code = (err as { code?: number }).code;
  // Legacy DOMException.QUOTA_EXCEEDED_ERR
  return code === 22;
}

class MemoryStore implements SaveStore {
  readonly persistent = false;
  private latest: string | null = null;
  private previous: string | null = null;
  async readCandidates() {
    const out: ["latest" | "previous", string][] = [];
    if (this.latest) out.push(["latest", this.latest]);
    if (this.previous) out.push(["previous", this.previous]);
    return out;
  }
  async write(snapshot: string, rotate: boolean) {
    if (rotate && this.latest) this.previous = this.latest;
    this.latest = snapshot;
  }
  async clear() {
    this.latest = null;
    this.previous = null;
  }
}

class IndexedDbStore implements SaveStore {
  readonly persistent = true;
  constructor(private readonly db: IDBDatabase) {}

  readCandidates(): Promise<["latest" | "previous", string][]> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const latest = store.get(LATEST);
      const previous = store.get(PREVIOUS);
      tx.oncomplete = () => {
        const out: ["latest" | "previous", string][] = [];
        if (typeof latest.result === "string") out.push(["latest", latest.result]);
        if (typeof previous.result === "string") out.push(["previous", previous.result]);
        resolve(out);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Rotation and write happen in one transaction, so a crash leaves either the old or new pair. */
  write(snapshot: string, rotate: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      if (rotate) {
        const current = store.get(LATEST);
        current.onsuccess = () => {
          if (typeof current.result === "string") store.put(current.result, PREVIOUS);
          store.put(snapshot, LATEST);
        };
      } else {
        store.put(snapshot, LATEST);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB abort"));
    });
  }

  clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.delete(LATEST);
      store.delete(PREVIOUS);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}

/** Phase 14: wrap a persistent store so QuotaExceededError degrades to memory-only. */
export function withQuotaFallback(inner: SaveStore): SaveStore {
  let active = inner;
  return {
    get persistent() {
      return active.persistent;
    },
    readCandidates: () => active.readCandidates(),
    clear: () => active.clear(),
    async write(snapshot: string, rotate: boolean) {
      try {
        await active.write(snapshot, rotate);
      } catch (err) {
        if (!isQuotaExceededError(err) || !active.persistent) throw err;
        const mem = new MemoryStore();
        await mem.write(snapshot, false);
        active = mem;
      }
    },
  };
}

/** Optional StorageManager estimate for diagnostics (Chrome / Firefox; Safari may omit). */
export async function probeStorageEstimate(): Promise<{
  usage: number | null;
  quota: number | null;
} | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est) return null;
    return {
      usage: typeof est.usage === "number" ? est.usage : null,
      quota: typeof est.quota === "number" ? est.quota : null,
    };
  } catch {
    return null;
  }
}

export async function openSaveStore(): Promise<SaveStore> {
  try {
    if (typeof indexedDB === "undefined") return new MemoryStore();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("IndexedDB blocked"));
    });
    return withQuotaFallback(new IndexedDbStore(db));
  } catch {
    return new MemoryStore();
  }
}

/** Test helper — memory store without IndexedDB. */
export function openMemorySaveStore(): SaveStore {
  return new MemoryStore();
}
