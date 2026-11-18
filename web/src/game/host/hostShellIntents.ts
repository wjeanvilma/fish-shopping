/**
 * Finish 4.0 Phase 6 — shell panel open/close intents for GameHost.
 */
import type { ShellPanelId } from "../../shell/shellPanels";
import type { HostShellIntentHost } from "./hostIntentHost";

export class HostShellIntents {
  constructor(private readonly host: HostShellIntentHost) {}

  setUpgradesOpen(open: boolean): void {
    this.host.setPanelOpen("upgrades", open);
  }
  setStaffOpen(open: boolean): void {
    this.host.setPanelOpen("staff", open);
  }
  setQuestsOpen(open: boolean): void {
    if (open) this.host.syncWallClockNow();
    this.host.setPanelOpen("quests", open);
  }
  setContractsOpen(open: boolean): void {
    this.host.setPanelOpen("contracts", open);
  }
  setMapOpen(open: boolean): void {
    this.host.setPanelOpen("map", open);
  }
  setWarehouseOpen(open: boolean): void {
    this.host.setPanelOpen("warehouse", open);
  }
  setSpeciesBookOpen(open: boolean): void {
    this.host.setPanelOpen("speciesBook", open);
  }
  setDashboardOpen(open: boolean): void {
    this.host.setPanelOpen("dashboard", open);
  }
  setPauseOpen(open: boolean): void {
    this.host.setPanelOpen("pause", open);
  }
  setSettingsOpen(open: boolean): void {
    this.host.setPanelOpen("settings", open);
  }
  setBagOpen(open: boolean): void {
    this.host.setPanelOpen("bag", open);
  }
  setStationOpen(open: boolean): void {
    this.host.setPanelOpen("station", open);
  }

  openFromDeepLink(panel: ShellPanelId | null | undefined): void {
    switch (panel) {
      case "quests":
        this.setQuestsOpen(true);
        break;
      case "contracts":
        this.setContractsOpen(true);
        break;
      case "staff":
        this.setStaffOpen(true);
        break;
      case "map":
        this.setMapOpen(true);
        break;
      case "upgrades":
        this.setUpgradesOpen(true);
        break;
      case "dashboard":
        this.setDashboardOpen(true);
        break;
      case "settings":
        this.setSettingsOpen(true);
        break;
      case "speciesBook":
        this.setSpeciesBookOpen(true);
        break;
      case "warehouse":
        this.setWarehouseOpen(true);
        break;
      case "bag":
        this.setBagOpen(true);
        break;
      case "station":
        this.setStationOpen(true);
        break;
      case "pause":
        this.setPauseOpen(true);
        break;
      default:
        break;
    }
  }
}
