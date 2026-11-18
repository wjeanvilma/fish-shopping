/**
 * Finish 3.0 Phase 19 — register the PWA service worker shell.
 * Uses a relative `./sw.js` so Vite base (/ or /fish-shopping/play/) scopes correctly.
 * No-op under Node/vitest and insecure non-localhost contexts.
 */
export const PWA_SW_SCRIPT = "./sw.js";
export const PWA_CACHE_PREFIX = "fish-shopping-pwa-";

export interface RegisterServiceWorkerResult {
  supported: boolean;
  registered: boolean;
  scriptURL: string | null;
  scope: string | null;
  reason?: string;
}

export function canRegisterServiceWorker(
  env: {
    serviceWorker?: unknown;
    isSecureContext?: boolean;
    hostname?: string;
  } = typeof navigator !== "undefined"
    ? {
        serviceWorker: navigator.serviceWorker,
        isSecureContext: typeof window !== "undefined" ? window.isSecureContext : false,
        hostname: typeof location !== "undefined" ? location.hostname : "",
      }
    : {},
): boolean {
  if (!env.serviceWorker) return false;
  if (env.isSecureContext) return true;
  const host = (env.hostname ?? "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export async function registerServiceWorker(
  sw: ServiceWorkerContainer | null =
    typeof navigator !== "undefined" ? navigator.serviceWorker : null,
  scriptUrl: string = PWA_SW_SCRIPT,
): Promise<RegisterServiceWorkerResult> {
  const env = {
    serviceWorker: sw ?? undefined,
    isSecureContext: typeof window !== "undefined" ? window.isSecureContext : !!sw,
    hostname: typeof location !== "undefined" ? location.hostname : "localhost",
  };
  if (!canRegisterServiceWorker(env)) {
    return {
      supported: false,
      registered: false,
      scriptURL: null,
      scope: null,
      reason: "service worker unsupported or insecure context",
    };
  }
  if (!sw) {
    return {
      supported: false,
      registered: false,
      scriptURL: null,
      scope: null,
      reason: "service worker unsupported or insecure context",
    };
  }
  try {
    const reg = await sw.register(scriptUrl, { scope: "./" });
    reg.addEventListener?.("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && sw.controller) {
          installing.postMessage?.({ type: "SKIP_WAITING" });
        }
      });
    });
    return {
      supported: true,
      registered: true,
      scriptURL: reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? scriptUrl,
      scope: reg.scope,
    };
  } catch (err) {
    return {
      supported: true,
      registered: false,
      scriptURL: null,
      scope: null,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Prefer SW notifications when a registration exists (Phase 18 reminders deepen here). */
export async function showPwaNotification(
  title: string,
  options: NotificationOptions,
  sw: ServiceWorkerContainer | null =
    typeof navigator !== "undefined" ? navigator.serviceWorker : null,
): Promise<boolean> {
  if (!sw) return false;
  try {
    const reg = await sw.getRegistration();
    if (!reg || typeof reg.showNotification !== "function") return false;
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") return false;
    await reg.showNotification(title, options);
    return true;
  } catch {
    return false;
  }
}
