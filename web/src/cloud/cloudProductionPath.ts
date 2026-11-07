/**
 * Phase 22 — cloud production path catalog (mirrors shared/cloud/production-path.json).
 * Firestore security rules are not shipped in-repo — ask for a snippet when needed.
 */
import productionPath from "../../../shared/cloud/production-path.json";

export interface CloudEnvKeyDef {
  name: string;
  required: boolean;
  description: string;
  file?: string;
}

export interface CloudProductionPathCatalog {
  phase: number;
  authMode: string;
  documentPath: string;
  documentFields: string[];
  conflictUi: string;
  firestoreRules: string;
  envKeys: {
    web: CloudEnvKeyDef[];
    android: CloudEnvKeyDef[];
  };
  guestRecovery: {
    persisted: string[];
    note: string;
  };
}

export const CLOUD_PRODUCTION_PATH = productionPath as CloudProductionPathCatalog;

export const WEB_FIREBASE_ENV_KEYS = CLOUD_PRODUCTION_PATH.envKeys.web.map((k) => k.name);
export const ANDROID_FIREBASE_PROP_KEYS = CLOUD_PRODUCTION_PATH.envKeys.android.map((k) => k.name);

export function readWebFirebaseEnv(
  env: Record<string, string | undefined> = {},
): { apiKey: string | null; projectId: string | null; missing: string[] } {
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim() || null;
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim() || null;
  const missing: string[] = [];
  if (!apiKey) missing.push("VITE_FIREBASE_API_KEY");
  if (!projectId) missing.push("VITE_FIREBASE_PROJECT_ID");
  return { apiKey, projectId, missing };
}

export function cloudKeysConfigured(env: Record<string, string | undefined>): boolean {
  const { missing } = readWebFirebaseEnv(env);
  return missing.length === 0;
}

export function cloudDocumentPathFor(uid: string): string {
  return CLOUD_PRODUCTION_PATH.documentPath.replace("{uid}", uid);
}

export interface CloudProductionReadiness {
  keysConfigured: boolean;
  missingKeys: string[];
  conflictUiShipped: boolean;
  authMode: string;
  documentPath: string;
  firestoreRulesInRepo: boolean;
}

export function cloudProductionReadiness(
  env: Record<string, string | undefined>,
): CloudProductionReadiness {
  const { missing } = readWebFirebaseEnv(env);
  return {
    keysConfigured: missing.length === 0,
    missingKeys: missing,
    conflictUiShipped: CLOUD_PRODUCTION_PATH.conflictUi.includes("phase11"),
    authMode: CLOUD_PRODUCTION_PATH.authMode,
    documentPath: CLOUD_PRODUCTION_PATH.documentPath,
    firestoreRulesInRepo: CLOUD_PRODUCTION_PATH.firestoreRules !== "not_shipped_ask_for_snippet"
      ? true
      : false,
  };
}
