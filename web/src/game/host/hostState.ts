/**
 * Finish 4.0 Phase 6 — GameHost UI state extracted from GameHost.ts.
 */
import type { OfflineReport, SimView } from "../../engine";
import type { GameSettings } from "../settingsStore";
import type { CloudConflictView, LocalRecoveryView } from "../snapshotChoice";

export type HostState =
  | { status: "loading" }
  | {
      status: "title";
      hasSave: boolean;
      cloudConflict: CloudConflictView | null;
      localRecovery: LocalRecoveryView | null;
      settings: GameSettings;
    }
  | {
      status: "ready";
      view: SimView;
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
      offlineReport: OfflineReport | null;
      settings: GameSettings;
    }
  | { status: "failed"; message: string };

