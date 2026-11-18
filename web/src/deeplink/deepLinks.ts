/**
 * Finish 3.0 Phase 20 — web deep-link parse (mirrors game-core DeepLinkRoutes).
 */
import routesJson from "../../../shared/deep-links/routes.json";
import type { ShellPanelId } from "../shell/shellPanels";

export const DEEP_LINK_ROUTES = routesJson as {
  packageName: string;
  host: string;
  pathPrefix: string;
  playUrl: string;
  customScheme: string;
  customHost: string;
  assetLinksPath: string;
  queryPanelKeys: string[];
  queryHarborKey: string;
  panelAliases: Record<string, string>;
  hashAliases: Record<string, string>;
};

export const DEEP_LINK_HOST = DEEP_LINK_ROUTES.host;
export const DEEP_LINK_PATH_PREFIX = DEEP_LINK_ROUTES.pathPrefix;
export const DEEP_LINK_PLAY_URL = DEEP_LINK_ROUTES.playUrl;
export const DEEP_LINK_CUSTOM_SCHEME = DEEP_LINK_ROUTES.customScheme;

export interface DeepLinkIntent {
  panel: ShellPanelId | null;
  harborId: string | null;
  source: "query" | "path" | "hash" | "custom" | "applink" | "none";
  raw: string;
}

export function resolvePanelAlias(raw: string | null | undefined): ShellPanelId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  const mapped = DEEP_LINK_ROUTES.panelAliases[key] ?? DEEP_LINK_ROUTES.hashAliases[key];
  return (mapped as ShellPanelId | undefined) ?? null;
}

export function parseQuery(query: string | null | undefined): Record<string, string> {
  if (!query) return {};
  const q = query.trim().replace(/^\?/, "");
  if (!q) return {};
  const out: Record<string, string> = {};
  for (const part of q.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = decodeURIComponent(part.slice(0, eq).replace(/\+/g, " "));
    const value = decodeURIComponent(part.slice(eq + 1).replace(/\+/g, " "));
    if (key) out[key] = value;
  }
  return out;
}

export function parseHash(hash: string | null | undefined): ShellPanelId | null {
  if (!hash) return null;
  const token = hash.trim().replace(/^#/, "").split(/[?&]/)[0] ?? "";
  return resolvePanelAlias(token);
}

export function parsePathPanel(path: string | null | undefined): ShellPanelId | null {
  if (!path) return null;
  let p = path.trim();
  if (p.startsWith(DEEP_LINK_PATH_PREFIX)) p = p.slice(DEEP_LINK_PATH_PREFIX.length);
  p = p.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!p || p === "play") return null;
  const segment = p.split("/")[0]?.split("?")[0] ?? "";
  return resolvePanelAlias(segment);
}

export function parseDeepLink(input: {
  href?: string;
  scheme?: string | null;
  host?: string | null;
  path?: string | null;
  search?: string | null;
  hash?: string | null;
}): DeepLinkIntent {
  const raw = input.href ?? "";
  let scheme = input.scheme ?? null;
  let host = input.host ?? null;
  let path = input.path ?? null;
  let search = input.search ?? null;
  let hash = input.hash ?? null;

  if (raw && (scheme == null || path == null)) {
    try {
      const u = new URL(raw, "https://wjeanvilma.github.io");
      scheme = scheme ?? u.protocol.replace(":", "");
      host = host ?? u.host;
      path = path ?? u.pathname;
      search = search ?? u.search;
      hash = hash ?? u.hash;
    } catch {
      /* keep pieces */
    }
  }

  const params = parseQuery(search);
  const panelFromQuery = resolvePanelAlias(params.panel ?? params.go);
  const harborId = (params.harbor ?? "").trim() || null;
  const panelFromPath = parsePathPanel(path);
  const panelFromHash = parseHash(hash);
  const panel = panelFromQuery ?? panelFromPath ?? panelFromHash;

  let source: DeepLinkIntent["source"] = "none";
  if (panelFromQuery || harborId) source = "query";
  else if (panelFromPath) source = "path";
  else if (panelFromHash) source = "hash";
  else if ((scheme ?? "").toLowerCase() === DEEP_LINK_CUSTOM_SCHEME) source = "custom";
  else if ((host ?? "").toLowerCase() === DEEP_LINK_HOST) source = "applink";

  return { panel, harborId, source, raw };
}

export function parseLocation(
  loc: { href: string; search: string; hash: string; pathname: string } | null =
    typeof location !== "undefined" ? location : null,
): DeepLinkIntent {
  if (!loc) return { panel: null, harborId: null, source: "none", raw: "" };
  return parseDeepLink({
    href: loc.href,
    path: loc.pathname,
    search: loc.search,
    hash: loc.hash,
  });
}

/** Strip deep-link panel/harbor params after consume (keep billing params alone). */
export function stripDeepLinkQuery(
  search: string,
  replaceState: (url: string) => void = (url) => {
    if (typeof history !== "undefined" && typeof location !== "undefined") {
      history.replaceState({}, "", url);
    }
  },
): void {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  let changed = false;
  for (const key of ["panel", "go", "harbor"]) {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const pathname = typeof location !== "undefined" ? location.pathname : "";
  const hash = typeof location !== "undefined" ? location.hash : "";
  const q = params.toString();
  const next = `${pathname}${q ? `?${q}` : ""}${hash}`;
  replaceState(next);
}
