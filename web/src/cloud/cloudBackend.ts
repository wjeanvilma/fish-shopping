/**
 * Pluggable cloud save backend. Local play never requires a backend — [NullCloudBackend]
 * is the default. When Firebase web config is present, [FirestoreRestBackend] links an
 * anonymous Identity Toolkit account to `users/{uid}/saves/harbor`.
 *
 * Firestore security rules are not shipped in-repo (ask for a snippet if you need them).
 */

export interface CloudBackend {
  readonly kind: "null" | "memory" | "firestore";
  /** True when the backend can actually talk to a remote store. */
  readonly available: boolean;
  /** Ensure an account id exists (anonymous). Returns the uid. */
  ensureAccount(existingUid: string | null): Promise<string>;
  get(uid: string): Promise<string | null>;
  put(uid: string, snapshot: string): Promise<void>;
  clear(uid: string): Promise<void>;
}

export class NullCloudBackend implements CloudBackend {
  readonly kind = "null" as const;
  readonly available = false;
  async ensureAccount(existingUid: string | null): Promise<string> {
    return existingUid ?? crypto.randomUUID();
  }
  async get(): Promise<string | null> { return null; }
  async put(): Promise<void> { /* no-op */ }
  async clear(): Promise<void> { /* no-op */ }
}

/** In-process remote for tests and offline demos of the merge path. */
export class MemoryCloudBackend implements CloudBackend {
  readonly kind = "memory" as const;
  readonly available = true;
  private readonly slots = new Map<string, string>();
  async ensureAccount(existingUid: string | null): Promise<string> {
    return existingUid ?? crypto.randomUUID();
  }
  async get(uid: string): Promise<string | null> {
    return this.slots.get(uid) ?? null;
  }
  async put(uid: string, snapshot: string): Promise<void> {
    this.slots.set(uid, snapshot);
  }
  async clear(uid: string): Promise<void> {
    this.slots.delete(uid);
  }
}

interface FirebaseWebConfig {
  apiKey: string;
  projectId: string;
}

function readFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_FIREBASE_API_KEY
    ?? (typeof process !== "undefined" ? process.env?.VITE_FIREBASE_API_KEY : undefined);
  const projectId = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_FIREBASE_PROJECT_ID
    ?? (typeof process !== "undefined" ? process.env?.VITE_FIREBASE_PROJECT_ID : undefined);
  if (!apiKey || !projectId) return null;
  return { apiKey, projectId };
}

/**
 * Firestore REST + Identity Toolkit anonymous auth. No Firebase JS SDK required.
 * Document: `users/{uid}/saves/harbor` fields { snapshot, savedAtEpochMs, checksum }.
 */
export class FirestoreRestBackend implements CloudBackend {
  readonly kind = "firestore" as const;
  readonly available = true;
  private idToken: string | null = null;
  private uid: string | null = null;

  constructor(private readonly config: FirebaseWebConfig) {}

  async ensureAccount(existingUid: string | null): Promise<string> {
    if (this.uid && this.idToken) return this.uid;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(this.config.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSecureToken: true }),
      },
    );
    if (!res.ok) throw new Error(`Cloud auth failed (${res.status})`);
    const body = await res.json() as { localId: string; idToken: string };
    this.uid = body.localId;
    this.idToken = body.idToken;
    // existingUid is a local preference id; Firebase anonymous mints a new uid each enable.
    void existingUid;
    return this.uid;
  }

  async get(uid: string): Promise<string | null> {
    await this.ensureAccount(uid);
    const name = this.docName(uid);
    const res = await fetch(
      `https://firestore.googleapis.com/v1/${name}`,
      { headers: { Authorization: `Bearer ${this.idToken}` } },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Cloud get failed (${res.status})`);
    const body = await res.json() as { fields?: { snapshot?: { stringValue?: string } } };
    return body.fields?.snapshot?.stringValue ?? null;
  }

  async put(uid: string, snapshot: string): Promise<void> {
    await this.ensureAccount(uid);
    let savedAtEpochMs = 0;
    let checksum = "";
    try {
      const env = JSON.parse(snapshot) as { savedAtEpochMs?: number; checksum?: string };
      savedAtEpochMs = typeof env.savedAtEpochMs === "number" ? env.savedAtEpochMs : 0;
      checksum = typeof env.checksum === "string" ? env.checksum : "";
    } catch { /* still upload raw */ }
    const name = this.docName(uid);
    const res = await fetch(
      `https://firestore.googleapis.com/v1/${name}?documentId=harbor`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            snapshot: { stringValue: snapshot },
            savedAtEpochMs: { integerValue: String(savedAtEpochMs) },
            checksum: { stringValue: checksum },
          },
        }),
      },
    );
    // First create may need POST; retry with updateMask-friendly PATCH to the full path.
    if (res.status === 404 || res.status === 400) {
      const create = await fetch(
        `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/saves?documentId=harbor`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              snapshot: { stringValue: snapshot },
              savedAtEpochMs: { integerValue: String(savedAtEpochMs) },
              checksum: { stringValue: checksum },
            },
          }),
        },
      );
      if (!create.ok) throw new Error(`Cloud put failed (${create.status})`);
      return;
    }
    if (!res.ok) throw new Error(`Cloud put failed (${res.status})`);
  }

  async clear(uid: string): Promise<void> {
    await this.ensureAccount(uid);
    const res = await fetch(
      `https://firestore.googleapis.com/v1/${this.docName(uid)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${this.idToken}` } },
    );
    if (!res.ok && res.status !== 404) throw new Error(`Cloud clear failed (${res.status})`);
  }

  private docName(uid: string): string {
    return `projects/${this.config.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/saves/harbor`;
  }
}

export function createCloudBackend(override?: CloudBackend): CloudBackend {
  if (override) return override;
  const cfg = readFirebaseConfig();
  if (cfg) return new FirestoreRestBackend(cfg);
  return new NullCloudBackend();
}
