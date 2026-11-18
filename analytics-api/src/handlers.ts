/**
 * Finish 3.0 Phase 26 — analytics batch handlers.
 */
import {
  ALLOWED_PROPS,
  BATCH_SCHEMA,
  EVENT_NAMES,
  FORBIDDEN_KEYS,
} from "./catalog";

export interface HandlerError {
  error: string;
  status: number;
}

export interface AcceptedBatch {
  status: "accepted";
  accepted: number;
  dropped: number;
  totalReceived: number;
}

export interface BatchBody {
  schema?: string;
  platform?: string;
  sentAtMs?: number;
  events?: Array<{
    name?: string;
    props?: Record<string, unknown>;
    schema?: string;
    clientTsMs?: number;
  }>;
}

const store: Array<{
  platform: string;
  sentAtMs: number;
  name: string;
  props: Record<string, unknown>;
  clientTsMs: number;
}> = [];

export function resetAnalyticsStore(): void {
  store.length = 0;
}

export function storedEventCount(): number {
  return store.length;
}

function sanitizeProps(
  name: (typeof EVENT_NAMES)[number],
  props: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const allowed = ALLOWED_PROPS[name];
  const clean: Record<string, unknown> = {};
  if (!props) return clean;
  for (const [k, v] of Object.entries(props)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    if (!allowed.has(k)) continue;
    if (typeof v === "boolean" || typeof v === "number" || typeof v === "string") {
      clean[k] = v;
    }
  }
  return clean;
}

export function handleBatch(body: BatchBody): AcceptedBatch | HandlerError {
  if (body.schema !== BATCH_SCHEMA) {
    return { error: `schema must be ${BATCH_SCHEMA}`, status: 400 };
  }
  const platform = body.platform?.trim() ?? "";
  if (platform !== "web" && platform !== "android") {
    return { error: "platform must be web|android", status: 400 };
  }
  if (!Array.isArray(body.events)) {
    return { error: "events array required", status: 400 };
  }

  let accepted = 0;
  let dropped = 0;
  for (const raw of body.events) {
    const name = raw?.name;
    if (!name || !(EVENT_NAMES as readonly string[]).includes(name)) {
      dropped += 1;
      continue;
    }
    const eventName = name as (typeof EVENT_NAMES)[number];
    const props = sanitizeProps(eventName, raw.props);
    store.push({
      platform,
      sentAtMs: typeof body.sentAtMs === "number" ? body.sentAtMs : Date.now(),
      name: eventName,
      props,
      clientTsMs: typeof raw.clientTsMs === "number" ? raw.clientTsMs : 0,
    });
    accepted += 1;
  }

  return {
    status: "accepted",
    accepted,
    dropped,
    totalReceived: body.events.length,
  };
}

export function handleHealth(): { ok: true; service: string; stored: number } {
  return { ok: true, service: "analytics-api", stored: store.length };
}
