/**
 * Phase 28 (post-1.0) — support / refund / restore runbook catalog
 * (mirrors shared/ops/support-runbook.json).
 */
import runbookJson from "../../../shared/ops/support-runbook.json";

export interface SupportKnownIssue {
  id: string;
  title: string;
  symptom: string;
  workaround: string;
  severity: string;
}

export interface SupportFaq {
  id: string;
  title: string;
  body: string;
}

export interface SupportRunbookCatalog {
  phase: number;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  packageName: string;
  supportUrl: string;
  privacyUrl: string;
  triage: {
    primaryChannel: string;
    issuesUrl: string;
    email: string;
    mailto: string;
    subjectPrefix: string;
    requiredFields: string[];
  };
  restore: {
    inAppLabel: string;
    androidPath: string;
    webPath: string;
    steps: string[];
    skus: string[];
    idempotent: boolean;
    powerNeutralCosmetics: boolean;
  };
  refund: {
    play: { playerSelfServe: string; consolePath: string; afterRefund: string[] };
    web: { playerPath: string; opsPath: string; afterRefund: string[] };
  };
  knownIssues: SupportKnownIssue[];
  faq: SupportFaq[];
  ui: {
    settingsSupportLabel: string;
    restoreHelpLine: string;
    runbookAnchor: string;
  };
}

export const SUPPORT_RUNBOOK = runbookJson as unknown as SupportRunbookCatalog;
export const SUPPORT_RUNBOOK_PHASE = SUPPORT_RUNBOOK.phase;
export const SUPPORT_RUNBOOK_SCHEMA = SUPPORT_RUNBOOK.schema;

export const SUPPORT_EMAIL = SUPPORT_RUNBOOK.triage.email;
export const SUPPORT_MAILTO = SUPPORT_RUNBOOK.triage.mailto;
export const SUPPORT_ISSUES_URL = SUPPORT_RUNBOOK.triage.issuesUrl;
export const SUPPORT_RESTORE_HELP = SUPPORT_RUNBOOK.ui.restoreHelpLine;

export function supportFaqById(id: string): SupportFaq | undefined {
  return SUPPORT_RUNBOOK.faq.find((f) => f.id === id);
}

export function knownIssueById(id: string): SupportKnownIssue | undefined {
  return SUPPORT_RUNBOOK.knownIssues.find((k) => k.id === id);
}

export function restoreSkuList(): readonly string[] {
  return SUPPORT_RUNBOOK.restore.skus;
}
