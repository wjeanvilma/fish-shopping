/**
 * Owns the simulation in the browser (the web counterpart of Android's GameViewModel).
 * React and Three.js never mutate game state: input becomes Commands, and they read
 * immutable SimView snapshots. The HUD snapshot is published ~10 times per second and
 * immediately after transactions (blueprint "Rendering boundary").
 */
import contentJson from "../../../shared/content/content-pack.json";
import {
  type Command, type ContentPack, FixedStepClock, GameState, INPUT_SCALE, NewerSaveError, Simulation,
  type SimView, buildView, decodeSnapshot, encodeSnapshot, loadContent,
} from "../engine";
import { CameraRig } from "./cameraRig";
import { openSaveStore, type SaveStore } from "./saveStore";

export type HostState =
  | { status: "loading" }
  | { status: "ready"; view: SimView; upgradesOpen: boolean }
  | { status: "failed"; message: string };

const START_HARBOR = "harbor.sunrise_pier";
const HUD_PUBLISH_INTERVAL_MS = 100;

export class GameHost {
  private state: HostState = { status: "loading" };
  private readonly listeners = new Set<() => void>();
  private readonly messageListeners = new Set<(m: string) => void>();
  private readonly commands: Command[] = [];
  private readonly clock = new FixedStepClock();
  private sim: Simulation | null = null;
  private store: SaveStore | null = null;
  private allowSaving = true;
  private rotateOnNextSave = true;
  private upgradesOpen = false;
  private running = false;
  private lastMove = { x: 0, z: 0 };
  private lastHudPublishMs = 0;
  private saveChain: Promise<void> = Promise.resolve();

  /** Latest snapshot for the renderer (updated every tick). */
  latestView: SimView | null = null;

  private starting: Promise<void> | null = null;

  /** Idempotent: React StrictMode mounts effects twice in development. */
  start(): Promise<void> {
    this.starting ??= this.doStart();
    return this.starting;
  }

  private async doStart(): Promise<void> {
    try {
      const content = loadContent(contentJson);
      this.store = await openSaveStore();
      const state = await this.restoreOrCreate(content);
      this.sim = new Simulation(content, state);
      this.latestView = buildView(this.sim);
      if (!this.store.persistent) this.say("Saving is unavailable in this browser window");
      this.publish(true);
    } catch (e) {
      this.allowSaving = !(e instanceof NewerSaveError);
      this.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
    }
  }

  private async restoreOrCreate(content: ContentPack): Promise<GameState> {
    for (const [label, text] of await this.store!.readCandidates()) {
      try {
        const s = decodeSnapshot(content, text);
        if (label !== "latest") {
          this.rotateOnNextSave = false;
          this.say("Recovered your previous save");
        }
        return s;
      } catch (e) {
        if (e instanceof NewerSaveError) throw e; // never overwrite a newer app's save
        console.warn(`Save '${label}' unusable:`, e);
      }
    }
    return GameState.newGame(content, START_HARBOR, (Math.random() * 2 ** 32) | 0);
  }

  // ---- loop -------------------------------------------------------------------------

  resume(): void {
    this.running = true;
    this.clock.reset();
  }

  /** Called when the tab is hidden or the page is being unloaded: stop and checkpoint. */
  pause(): void {
    this.running = false;
    this.enqueueMove(0, 0);
    this.save();
  }

  /** Advance the simulation for this animation frame. */
  frame(nowMs: number): void {
    const sim = this.sim;
    if (!sim || !this.running || this.upgradesOpen) {
      this.clock.reset();
      return;
    }
    const ticks = this.clock.advance(nowMs);
    for (let i = 0; i < ticks; i++) this.step(sim);
    if (ticks > 0) this.publish(false);
  }

  private step(sim: Simulation): void {
    const batch = this.commands.splice(0);
    let transaction = false;
    for (const e of sim.step(batch)) {
      switch (e.type) {
        case "sale_committed": this.say(`+${e.coins} coins`); transaction = true; break;
        case "fish_caught":
          if (e.timingBonus) {
            const tip = sim.content.speciesById.get(e.speciesId)?.baseValue ?? 0;
            this.say(`Perfect reel! +${tip}`);
            transaction = true;
          }
          if (e.rareUpgrade) {
            this.say(`Rare catch: ${sim.content.speciesById.get(e.speciesId)?.name ?? e.speciesId}`);
            transaction = true;
          }
          break;
        case "upgrade_purchased":
          if (!e.replayed) { this.say(`Bought ${sim.content.upgradesById.get(e.upgradeId)?.name ?? e.upgradeId}`); transaction = true; }
          break;
        case "purchase_rejected": this.say(e.reason); transaction = true; break;
        case "quest_completed": this.say(`Goal complete: ${sim.content.questsById.get(e.questId)?.name}`); break;
        case "checkpoint_requested": this.save(); break;
        default: break;
      }
    }
    this.latestView = buildView(sim);
    if (transaction) this.publish(true);
  }

  // ---- intent ------------------------------------------------------------------------

  /** Joystick / keys in screen space: x right, y down, each -1..1. */
  setMove(screenX: number, screenY: number): void {
    if (this.upgradesOpen) return;
    this.enqueueMove(screenX, screenY);
  }

  private enqueueMove(screenX: number, screenY: number): void {
    const [wx, wz] = CameraRig.screenToWorld(screenX, screenY);
    const clamp = (v: number) => Math.max(-INPUT_SCALE, Math.min(INPUT_SCALE, Math.round(v * INPUT_SCALE)));
    const move = { x: clamp(wx), z: clamp(wz) };
    if (move.x !== this.lastMove.x || move.z !== this.lastMove.z) {
      this.lastMove = move;
      this.commands.push({ type: "move", ...move });
    }
  }

  setUpgradesOpen(open: boolean): void {
    this.upgradesOpen = open;
    if (open) this.enqueueMove(0, 0);
    this.publish(true);
  }

  purchase(upgradeId: string): void {
    this.commands.push({ type: "purchase_upgrade", upgradeId, requestId: crypto.randomUUID() });
    // Panels pause the world; advance a single tick so the command commits now.
    if (this.upgradesOpen && this.sim) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  reel(): void {
    if (this.upgradesOpen) return;
    this.commands.push({ type: "reel" });
  }

  // ---- persistence -------------------------------------------------------------------

  /** Encodes one consistent tick synchronously; writes are serialised. */
  save(): void {
    const sim = this.sim;
    const store = this.store;
    if (!sim || !store || !this.allowSaving) return;
    const text = encodeSnapshot(sim.content, sim.state);
    const rotate = this.rotateOnNextSave;
    this.rotateOnNextSave = true;
    this.saveChain = this.saveChain
      .then(() => store.write(text, rotate))
      .catch((e) => console.error("Save failed", e));
  }

  // ---- subscriptions (useSyncExternalStore) -----------------------------------------

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getState = (): HostState => this.state;

  onMessage(l: (m: string) => void): () => void {
    this.messageListeners.add(l);
    return () => this.messageListeners.delete(l);
  }

  private say(m: string): void {
    this.messageListeners.forEach((l) => l(m));
  }

  private publish(force: boolean): void {
    if (!this.latestView) return;
    const now = performance.now();
    if (!force && now - this.lastHudPublishMs < HUD_PUBLISH_INTERVAL_MS) return;
    this.lastHudPublishMs = now;
    this.setState({ status: "ready", view: this.latestView, upgradesOpen: this.upgradesOpen });
  }

  private setState(s: HostState): void {
    this.state = s;
    this.listeners.forEach((l) => l());
  }
}
