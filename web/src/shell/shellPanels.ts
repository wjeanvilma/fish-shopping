/**
 * Finish 3.0 Phase 4 — shared HUD panel ids + flag snapshot
 * (mirrors game-core shell/ShellPanels.kt).
 */

export type ShellPanelId =
  | "upgrades"
  | "staff"
  | "quests"
  | "contracts"
  | "map"
  | "warehouse"
  | "speciesBook"
  | "dashboard"
  | "pause"
  | "settings"
  | "bag"
  | "station";

export const SHELL_PANEL_IDS: readonly ShellPanelId[] = [
  "upgrades",
  "staff",
  "quests",
  "contracts",
  "map",
  "warehouse",
  "speciesBook",
  "dashboard",
  "pause",
  "settings",
  "bag",
  "station",
] as const;

export interface ShellPanelFlags {
  upgradesOpen: boolean;
  staffOpen: boolean;
  questsOpen: boolean;
  contractsOpen: boolean;
  mapOpen: boolean;
  warehouseOpen: boolean;
  speciesBookOpen: boolean;
  dashboardOpen: boolean;
  pauseOpen: boolean;
  settingsOpen: boolean;
  bagOpen: boolean;
  stationOpen: boolean;
}

export const EMPTY_SHELL_PANEL_FLAGS: ShellPanelFlags = {
  upgradesOpen: false,
  staffOpen: false,
  questsOpen: false,
  contractsOpen: false,
  mapOpen: false,
  warehouseOpen: false,
  speciesBookOpen: false,
  dashboardOpen: false,
  pauseOpen: false,
  settingsOpen: false,
  bagOpen: false,
  stationOpen: false,
};

export function anyHudPanelOpen(flags: ShellPanelFlags): boolean {
  return (
    flags.upgradesOpen ||
    flags.staffOpen ||
    flags.questsOpen ||
    flags.contractsOpen ||
    flags.mapOpen ||
    flags.warehouseOpen ||
    flags.speciesBookOpen ||
    flags.dashboardOpen ||
    flags.pauseOpen ||
    flags.settingsOpen ||
    flags.bagOpen ||
    flags.stationOpen
  );
}

export function isPanelOpen(flags: ShellPanelFlags, id: ShellPanelId): boolean {
  switch (id) {
    case "upgrades":
      return flags.upgradesOpen;
    case "staff":
      return flags.staffOpen;
    case "quests":
      return flags.questsOpen;
    case "contracts":
      return flags.contractsOpen;
    case "map":
      return flags.mapOpen;
    case "warehouse":
      return flags.warehouseOpen;
    case "speciesBook":
      return flags.speciesBookOpen;
    case "dashboard":
      return flags.dashboardOpen;
    case "pause":
      return flags.pauseOpen;
    case "settings":
      return flags.settingsOpen;
    case "bag":
      return flags.bagOpen;
    case "station":
      return flags.stationOpen;
  }
}

/** Opening one panel closes the others. */
export function openOnly(id: ShellPanelId): ShellPanelFlags {
  const next = { ...EMPTY_SHELL_PANEL_FLAGS };
  switch (id) {
    case "upgrades":
      next.upgradesOpen = true;
      break;
    case "staff":
      next.staffOpen = true;
      break;
    case "quests":
      next.questsOpen = true;
      break;
    case "contracts":
      next.contractsOpen = true;
      break;
    case "map":
      next.mapOpen = true;
      break;
    case "warehouse":
      next.warehouseOpen = true;
      break;
    case "speciesBook":
      next.speciesBookOpen = true;
      break;
    case "dashboard":
      next.dashboardOpen = true;
      break;
    case "pause":
      next.pauseOpen = true;
      break;
    case "settings":
      next.settingsOpen = true;
      break;
    case "bag":
      next.bagOpen = true;
      break;
    case "station":
      next.stationOpen = true;
      break;
  }
  return next;
}

export function closePanel(flags: ShellPanelFlags, id: ShellPanelId): ShellPanelFlags {
  const next = { ...flags };
  switch (id) {
    case "upgrades":
      next.upgradesOpen = false;
      break;
    case "staff":
      next.staffOpen = false;
      break;
    case "quests":
      next.questsOpen = false;
      break;
    case "contracts":
      next.contractsOpen = false;
      break;
    case "map":
      next.mapOpen = false;
      break;
    case "warehouse":
      next.warehouseOpen = false;
      break;
    case "speciesBook":
      next.speciesBookOpen = false;
      break;
    case "dashboard":
      next.dashboardOpen = false;
      break;
    case "pause":
      next.pauseOpen = false;
      break;
    case "settings":
      next.settingsOpen = false;
      break;
    case "bag":
      next.bagOpen = false;
      break;
    case "station":
      next.stationOpen = false;
      break;
  }
  return next;
}

export class ShellPanelController {
  private flags: ShellPanelFlags = { ...EMPTY_SHELL_PANEL_FLAGS };

  snapshot(): ShellPanelFlags {
    return { ...this.flags };
  }

  open(id: ShellPanelId): ShellPanelFlags {
    this.flags = openOnly(id);
    return this.snapshot();
  }

  close(id: ShellPanelId): ShellPanelFlags {
    this.flags = closePanel(this.flags, id);
    return this.snapshot();
  }

  closeAll(): ShellPanelFlags {
    this.flags = { ...EMPTY_SHELL_PANEL_FLAGS };
    return this.snapshot();
  }

  isOpen(id: ShellPanelId): boolean {
    return isPanelOpen(this.flags, id);
  }

  anyHudPanelOpen(): boolean {
    return anyHudPanelOpen(this.flags);
  }
}

export const ShellModalPolicy = {
  blocksWorldInput(flags: ShellPanelFlags, offlineReportPending: boolean): boolean {
    return anyHudPanelOpen(flags) || offlineReportPending;
  },

  shouldCommitPanelCommand(flags: ShellPanelFlags, offlineReportPending: boolean): boolean {
    return anyHudPanelOpen(flags) && !offlineReportPending;
  },

  allowsSimTick(flags: ShellPanelFlags, offlineReportPending: boolean): boolean {
    return !ShellModalPolicy.blocksWorldInput(flags, offlineReportPending);
  },
};

export const ShellHudPolicy = {
  PUBLISH_INTERVAL_MS: 100,
  PUBLISH_INTERVAL_NANOS: 100_000_000,
} as const;
