/**
 * Pluggable cloud save backend. Local play never requires a backend — [NullCloudBackend]
 * is the default. When Firebase web config is present, [FirestoreRestBackend] links an
 * anonymous Identity Toolkit account to `users/{uid}/saves/harbor`.
 *
 * Phase 22: anonymous uid is restored across sessions via Secure Token refresh_token.
 * Firestore security rules are not shipped in-repo (ask for a snippet if you need them).
 */

import { cloudDocumentPathFor, readWebFirebaseEnv } from "./cloudProductionPath";

export interface CloudAuthSession {
  uid: string;
  /** Identity Toolkit refresh token — persisted for guest recovery. Null for local backends. */
  refreshToken: string | null;
}

export interface CloudBackend {
  readonly kind: "null" | "memory" | "firestore";
  /** True when the backend can actually talk to a remote store. */
  readonly available: boolean;
  /** Ensure an account session (anonymous). Restores uid when refreshToken is valid. */
  ensureAccount(existingUid: string | null, refreshToken: string | null): Promise<CloudAuthSession>;
  get(uid: string): Promise<string | null>;
  put(uid: string, snapshot: string): Promise<void>;
  clear(uid: string): Promise<void>;
}

export class NullCloudBackend implements CloudBackend {
  readonly kind = "null" as const;
  readonly available = false;
  async ensureAccount(existingUid: string | null, _refreshToken: string | null): Promise<CloudAuthSession> {
    return { uid: existingUid ?? crypto.randomUUID(), refreshToken: null };
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
  async ensureAccount(existingUid: string | null, _refreshToken: string | null): Promise<CloudAuthSession> {
    return { uid: existingUid ?? crypto.randomUUID(), refreshToken: null };
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
  const meta = (import.meta as ImportMeta & { env?: Record<string, string> }).env ?? {};
  const fromMeta = readWebFirebaseEnv(meta);
  if (fromMeta.apiKey && fromMeta.projectId) {
    return { apiKey: fromMeta.apiKey, projectId: fromMeta.projectId };
  }
  const fromProcess = typeof process !== "undefined"
    ? readWebFirebaseEnv({
      VITE_FIREBASE_API_KEY: process.env?.VITE_FIREBASE_API_KEY,
      VITE_FIREBASE_PROJECT_ID: process.env?.VITE_FIREBASE_PROJECT_ID,
    })
    : { apiKey: null, projectId: null, missing: [] as string[] };
  if (fromProcess.apiKey && fromProcess.projectId) {
    return { apiKey: fromProcess.apiKey, projectId: fromProcess.projectId };
  }
  return null;
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
  private refreshToken: string | null = null;

  constructor(private readonly config: FirebaseWebConfig) {}

  async ensureAccount(existingUid: string | null, existingRefresh: string | null): Promise<CloudAuthSession> {
    if (this.uid && this.idToken) {
      return { uid: this.uid, refreshToken: this.refreshToken };
    }
    if (existingRefresh) {
      const restored = await this.tryRefresh(existingRefresh);
      if (restored) return restored;
    }
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(this.config.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSecureToken: true }),
      },
    );
    if (!res.ok) throw new Error(`Cloud auth failed (${res.status})`);
    const body = await res.json() as { localId: string; idToken: string; refreshToken?: string };
    this.uid = body.localId;
    this.idToken = body.idToken;
    this.refreshToken = body.refreshToken ?? null;
    void existingUid;
    return { uid: this.uid, refreshToken: this.refreshToken };
  }

  private async tryRefresh(refreshToken: string): Promise<CloudAuthSession | null> {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(this.config.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      },
    );
    if (!res.ok) return null;
    const body = await res.json() as {
      user_id?: string;
      id_token?: string;
      refresh_token?: string;
    };
    if (!body.user_id || !body.id_token) return null;
    this.uid = body.user_id;
    this.idToken = body.id_token;
    this.refreshToken = body.refresh_token ?? refreshToken;
    return { uid: this.uid, refreshToken: this.refreshToken };
  }

  async get(uid: string): Promise<string | null> {
    await this.ensureAccount(uid, this.refreshToken);
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
    await this.ensureAccount(uid, this.refreshToken);
    let savedAtEpochMs = 0;
    let checksum = "";
    try {
      const env = JSON.parse(snapshot) as { savedAtEpochMs?: number; checksum?: string };
      savedAtEpochMs = typeof env.savedAtEpochMs === "number" ? env.savedAtEpochMs : 0;
      checksum = typeof env.checksum === "string" ? env.checksum : "";
    } catch { /* still upload raw */ }
    const name = this.docName(uid);
    const payload = {
      fields: {
        snapshot: { stringValue: snapshot },
        savedAtEpochMs: { integerValue: String(savedAtEpochMs) },
        checksum: { stringValue: checksum },
      },
    };
    const res = await fetch(
      `https://firestore.googleapis.com/v1/${name}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    if (res.status === 404 || res.status === 400) {
      const create = await fetch(
        `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/saves?documentId=harbor`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!create.ok) throw new Error(`Cloud put failed (${create.status})`);
      return;
    }
    if (!res.ok) throw new Error(`Cloud put failed (${res.status})`);
  }

  async clear(uid: string): Promise<void> {
    await this.ensureAccount(uid, this.refreshToken);
    const res = await fetch(
      `https://firestore.googleapis.com/v1/${this.docName(uid)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${this.idToken}` } },
    );
    if (!res.ok && res.status !== 404) throw new Error(`Cloud clear failed (${res.status})`);
  }

  private docName(uid: string): string {
    return `projects/${this.config.projectId}/databases/(default)/documents/${cloudDocumentPathFor(uid)}`;
  }
}

export function createCloudBackend(override?: CloudBackend): CloudBackend {
  if (override) return override;
  const cfg = readFirebaseConfig();
  if (cfg) return new FirestoreRestBackend(cfg);
  return new NullCloudBackend();
}
