/**
 * Three.js (WebGL 2) presentation of a harbor. Reads SimView snapshots and writes
 * transforms; never changes game state. Uses the same GLB and node-name contract as
 * the Android Filament renderer (Player, PlayerBody, PlayerRod, CustomerBody_N,
 * WorkerBody_N, Fly_N_*, VfxBurst_N, Water).
 *
 * Item stacks, character locomotion clips, flying transfers, machine/pay/celebrate
 * bursts, and water are driven from SimView / event cues by ./presenters.ts.
 *
 * Phase 26/31: on-demand harbor GLB cache (LRU from device-matrix) + Zone_* fade.
 * Phase 26 also caps medium quality toward 1080 CSS px and cancels stale loads.
 */
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

/**
 * Load a harbor GLB. Self-contained builds (FISH_INLINE_GLB=1) inline GLBs as base64 data URIs;
 * decode those in-process so hosts with a strict connect-src still load them.
 */
async function loadGltf(url: string): Promise<GLTF> {
  const loader = new GLTFLoader();
  if (!url.startsWith("data:")) return loader.loadAsync(url);
  const b64 = url.slice(url.indexOf(",") + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return loader.parseAsync(bytes.buffer, "");
}
import type { SimView } from "../engine";
import { CameraRig } from "../game/cameraRig";
import type { QualityPreset } from "../game/settingsStore";
import { sharedAnalyticsBus } from "../analytics/analyticsBus";
import { cosmeticPresentation, cosmeticSwatchRgb } from "../engine/cosmeticPresentation";
import {
  downgradeQuality,
  upgradeQuality,
  qualityRank,
  FRAME_TARGET_MS,
  FrameTiming,
  HARBOR_CACHE_LIMIT,
  WEB_MEDIUM_MAX_CSS_HEIGHT,
} from "./frameTiming";
import { PresenterCpuHarness, type PresenterCpuSnapshot } from "./presenterCpuSnapshot";
import {
  CUSTOMER_BODY_REST_Y,
  CustomerCrowd,
  crowdDrawCapForQuality,
  FlyingTransfers,
  FLYING_TRANSFER_POOL,
  flyingTransferPoolForQuality,
  HARBOR_TRANSITION_S,
  isOcclusionFadeName,
  machineOperatePulses,
  occlusionOpacity,
  PLAYER_BODY_REST_Y,
  PLAYER_NOSE_REST_Y,
  PLAYER_NOSE_REST_Z,
  PLAYER_ROD_REST_X,
  PLAYER_ROD_REST_Y,
  PLAYER_ROD_REST_Z,
  PlayerSmoother,
  ScreenShake,
  stackVisibility,
  VFX_BURST_POOL,
  WORKER_BODY_REST_Y,
  WorkerCrowd,
  WorldBursts,
  worldBurstPoolForQuality,
  type FlyingTransferCue,
  type ShakeKind,
  type WorldBurstCue,
} from "./presenters";
import {
  nestAmbientIdForView,
  pressureAmbientIdForView,
  weatherAmbientProfile,
} from "./weatherAmbient";
import { atmosphereFrame } from "./atmosphere";
import {
  applyAtmosphereToWater,
  createCozyWaterMaterial,
  LampLights,
  patchGroundMaterial,
  RainField,
  subdivideWater,
  updateBobbers,
  type Bobber,
} from "./cozyScene";

interface HarborCacheEntry {
  root: THREE.Object3D;
  player: THREE.Object3D | null;
  playerBody: THREE.Object3D | null;
  playerNose: THREE.Object3D | null;
  playerRod: THREE.Object3D | null;
  customers: THREE.Object3D[];
  customerBodies: THREE.Object3D[];
  workers: THREE.Object3D[];
  workerBodies: THREE.Object3D[];
  slots: Map<string, THREE.Object3D>;
  footprints: Map<string, THREE.Mesh>;
  flyFish: THREE.Object3D[];
  flyPortion: THREE.Object3D[];
  bursts: THREE.Object3D[];
  water: THREE.Object3D | null;
  waterMat: THREE.ShaderMaterial | null;
  fadeZones: { obj: THREE.Object3D; x: number; z: number }[];
  /** Cozy art pass 5: lamp posts, their shared glow materials, bobbing boats, foam. */
  lamps: THREE.Object3D[];
  lampGlowMats: THREE.MeshStandardMaterial[];
  bobbers: Bobber[];
  foamMat: THREE.MeshStandardMaterial | null;
  /** Placeable decor nodes by decor id short name (Decor_<short>). */
  decor: Map<string, THREE.Object3D>;
}

/** Cozy art pass 5 quality budgets (presentation only). */
const LAMP_LIGHTS_BY_QUALITY: Record<QualityPreset, number> = { low: 0, medium: 3, high: 6 };
const RAIN_DROPS_BY_QUALITY: Record<QualityPreset, number> = { low: 220, medium: 460, high: 700 };
const WATER_SEGMENTS = 128;

export function hasWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export class HarborScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(CameraRig.FOV_DEGREES, 16 / 9, 0.1, 300);
  private readonly sun = new THREE.DirectionalLight(0xfff7e6, 2.6);
  private readonly hemi = new THREE.HemisphereLight(0xdcefff, 0x8a7a5a, 1.3);
  private readonly fog = new THREE.Fog(0xb9dff0, 34, 85);
  private readonly rain = new RainField(700);
  private readonly lampLights: LampLights;
  private lamps: THREE.Object3D[] = [];
  private lampGlowMats: THREE.MeshStandardMaterial[] = [];
  private bobbers: Bobber[] = [];
  private foamMat: THREE.MeshStandardMaterial | null = null;
  private decorNodes = new Map<string, THREE.Object3D>();
  /** Photo mode: free orbit camera offset (null = normal follow camera). */
  private photoCam: { yaw: number; pitch: number; dist: number } | null = null;
  private root: THREE.Object3D | null = null;
  private player: THREE.Object3D | null = null;
  private playerBody: THREE.Object3D | null = null;
  private playerNose: THREE.Object3D | null = null;
  private playerRod: THREE.Object3D | null = null;
  private customers: THREE.Object3D[] = [];
  private customerBodies: THREE.Object3D[] = [];
  private workers: THREE.Object3D[] = [];
  private workerBodies: THREE.Object3D[] = [];
  private crowd: CustomerCrowd | null = null;
  private workerCrowd: WorkerCrowd | null = null;
  private playerSmooth = new PlayerSmoother();
  private slots = new Map<string, THREE.Object3D>();
  private footprints = new Map<string, THREE.Mesh>();
  private footprintBase = new Map<string, THREE.Color>();
  private flyFish: THREE.Object3D[] = [];
  private flyPortion: THREE.Object3D[] = [];
  private bursts: THREE.Object3D[] = [];
  private flying = new FlyingTransfers(FLYING_TRANSFER_POOL);
  private worldBursts = new WorldBursts(VFX_BURST_POOL);
  private readonly screenShake = new ScreenShake();
  private pendingCues: FlyingTransferCue[] = [];
  private pendingBursts: WorldBurstCue[] = [];
  private pendingShakes: ShakeKind[] = [];
  private water: THREE.Object3D | null = null;
  private waterMat: THREE.ShaderMaterial | null = null;
  private fadeZones: { obj: THREE.Object3D; x: number; z: number }[] = [];
  private lastMs = 0;
  private elapsed = 0;
  /** Currently loaded blockout URL (for harbor travel swaps). */
  loadedUrl: string | null = null;
  contextLost = false;
  /** Phase 28: host UI listens for lost/restored banners + harbor reload. */
  onContextStateChange: ((lost: boolean) => void) | null = null;
  private cssWidth = 0;
  private cssHeight = 0;
  private appliedKey = "";
  private requestedQuality: QualityPreset = "medium";
  /** Session floor: may soft-downgrade under sustained frame misses (Phase 29). */
  private sessionQuality: QualityPreset = "medium";
  private readonly frameTiming = new FrameTiming();
  /** Finish 6.0 Phase 21 — presenter/render CPU snapshot harness (shares FrameTiming). */
  private readonly cpuHarness = new PresenterCpuHarness({ timing: this.frameTiming });
  private lastCpuSnapshot: PresenterCpuSnapshot | null = null;
  /** Phase 26/31: keep warm harbors for travel swaps (LRU from device-matrix). */
  private readonly harborCache = new Map<string, HarborCacheEntry>();
  private readonly harborLru: string[] = [];
  private transition = 1;
  /** Bumps on every load request so stale GLTF awaits cannot bind after travel. */
  private loadGen = 0;
  /** URL to reload after WebGL context restore (Phase 28). */
  private restoreUrl: string | null = null;
  /** Phase 24 + Finish 4.0 Phase 10: pier-side multi-part banner for equipped/preview cosmetics. */
  private cosmeticBanner: THREE.Group | null = null;
  private cosmeticBannerCloth: THREE.Mesh | null = null;
  private cosmeticBannerId: string | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Cozy art pass 5: filmic tone mapping, distance fog and atmosphere-driven lights.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.background = new THREE.Color("#9fd3ea");
    this.scene.fog = this.fog;
    this.scene.add(this.hemi);
    this.scene.add(this.rain.object);
    this.lampLights = new LampLights(this.scene, 6);
    // Sun direction matches the Android renderer (0.35, -1, 0.55).
    this.sun.position.set(-0.35, 1, -0.55).multiplyScalar(30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);

    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault(); // allow restoration (Phase 28)
    this.restoreUrl = this.loadedUrl;
    this.contextLost = true;
    this.onContextStateChange?.(true);
  };

  private onContextRestored = () => {
    this.contextLost = false;
    this.onContextStateChange?.(false);
    // GPU resources from before the loss are invalid — drop warm harbors and reload.
    void this.reloadAfterContextRestore();
  };

  /** Phase 28: wipe LRU harbor GPU cache and reload the active blockout. */
  async reloadAfterContextRestore(): Promise<void> {
    const url = this.restoreUrl ?? this.loadedUrl;
    this.restoreUrl = null;
    for (const entry of this.harborCache.values()) this.disposeHarborEntry(entry);
    this.harborCache.clear();
    this.harborLru.length = 0;
    this.stashCurrentHarbor();
    this.appliedKey = "";
    if (url) await this.load(url);
  }

  /** Queue sim-authoritative transfer arcs (drained on the next frame). */
  enqueueTransfers(cues: readonly FlyingTransferCue[]): void {
    if (cues.length === 0) return;
    this.pendingCues.push(...cues);
  }

  /** Queue Phase 16/21 catch / pay / celebrate / machine_done bursts. */
  enqueueBursts(cues: readonly WorldBurstCue[]): void {
    if (cues.length === 0) return;
    this.pendingBursts.push(...cues);
  }

  /** Queue Phase 21 screen-shake kinds. */
  enqueueShakes(kinds: readonly ShakeKind[]): void {
    if (kinds.length === 0) return;
    this.pendingShakes.push(...kinds);
  }

  async load(url: string): Promise<void> {
    if (this.loadedUrl === url && this.root) return;
    const gen = ++this.loadGen;
    this.stashCurrentHarbor();
    const cached = this.harborCache.get(url);
    if (cached) {
      if (gen !== this.loadGen) return;
      this.bindHarbor(url, cached);
      this.touchLru(url);
      this.beginTransition();
      return;
    }
    const gltf = await loadGltf(url);
    if (gen !== this.loadGen) {
      // Stale travel — dispose the freshly parsed scene so it cannot leak.
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
      return;
    }
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = !o.name.startsWith("Zone_") && o.name !== "Water";
        o.receiveShadow = true;
      }
    });
    const entry = this.buildCacheEntry(gltf.scene);
    this.harborCache.set(url, entry);
    this.touchLru(url);
    this.trimCache();
    this.bindHarbor(url, entry);
    this.beginTransition();
  }

  private beginTransition(): void {
    this.transition = 0;
    if (this.root) this.root.visible = true;
  }

  private stashCurrentHarbor(): void {
    if (!this.root || !this.loadedUrl) return;
    this.scene.remove(this.root);
    this.root.visible = false;
    // Entry already in cache when loaded via Phase 31 path; keep warm.
    this.root = null;
    this.player = null;
    this.playerBody = null;
    this.playerNose = null;
    this.playerRod = null;
    this.customers = [];
    this.customerBodies = [];
    this.workers = [];
    this.workerBodies = [];
    this.crowd = null;
    this.workerCrowd = null;
    this.slots.clear();
    this.footprints.clear();
    this.footprintBase.clear();
    this.flyFish = [];
    this.flyPortion = [];
    this.bursts = [];
    this.flying.clear();
    this.worldBursts.clear();
    this.pendingCues.length = 0;
    this.pendingBursts.length = 0;
    this.fadeZones = [];
    this.water = null;
    this.waterMat = null;
    this.lamps = [];
    this.lampGlowMats = [];
    this.bobbers = [];
    this.foamMat = null;
    this.decorNodes = new Map();
    this.loadedUrl = null;
  }

  private touchLru(url: string): void {
    const i = this.harborLru.indexOf(url);
    if (i >= 0) this.harborLru.splice(i, 1);
    this.harborLru.push(url);
  }

  private trimCache(): void {
    while (this.harborLru.length > HARBOR_CACHE_LIMIT) {
      const evict = this.harborLru.shift()!;
      if (evict === this.loadedUrl) {
        this.harborLru.push(evict);
        break;
      }
      const entry = this.harborCache.get(evict);
      if (!entry) continue;
      this.harborCache.delete(evict);
      this.disposeHarborEntry(entry);
    }
  }

  /** Test helper: current warm-harbor cache size after trim. */
  /** Finish 6.0 Phase 21 — last presenter/render CPU snapshot (null until first frame sample). */
  presenterCpuSnapshot(): PresenterCpuSnapshot | null {
    return this.lastCpuSnapshot;
  }

  harborCacheSize(): number {
    return this.harborCache.size;
  }

  private disposeHarborEntry(entry: HarborCacheEntry): void {
    entry.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m !== entry.waterMat) m.dispose();
        });
      }
    });
    entry.waterMat?.dispose();
  }

  private buildCacheEntry(sceneRoot: THREE.Object3D): HarborCacheEntry {
    const customers: THREE.Object3D[] = [];
    const customerBodies: THREE.Object3D[] = [];
    for (let i = 0; ; i++) {
      const c = sceneRoot.getObjectByName(`Customer_${i}`);
      if (!c) break;
      c.visible = false;
      customers.push(c);
      customerBodies.push(sceneRoot.getObjectByName(`CustomerBody_${i}`) ?? c);
    }
    const workers: THREE.Object3D[] = [];
    const workerBodies: THREE.Object3D[] = [];
    for (let i = 0; ; i++) {
      const w = sceneRoot.getObjectByName(`Worker_${i}`);
      if (!w) break;
      w.visible = false;
      workers.push(w);
      workerBodies.push(sceneRoot.getObjectByName(`WorkerBody_${i}`) ?? w);
    }
    const slots = new Map<string, THREE.Object3D>();
    const footprints = new Map<string, THREE.Mesh>();
    const flyFish: THREE.Object3D[] = [];
    const flyPortion: THREE.Object3D[] = [];
    const bursts: THREE.Object3D[] = [];
    const fadeZones: { obj: THREE.Object3D; x: number; z: number }[] = [];
    sceneRoot.traverse((o) => {
      if (/^(Bag_\d+_(fish|portion)|In_.+_\d+|Out_.+_\d+|Stock_.+_\d+)$/.test(o.name)) {
        o.visible = false;
        slots.set(o.name, o);
      }
      const fly = /^Fly_(\d+)_(fish|portion)$/.exec(o.name);
      if (fly) {
        o.visible = false;
        const idx = Number(fly[1]);
        const kind = fly[2]!;
        const list = kind === "fish" ? flyFish : flyPortion;
        list[idx] = o;
      }
      const burst = /^VfxBurst_(\d+)$/.exec(o.name);
      if (burst) {
        o.visible = false;
        bursts[Number(burst[1])] = o;
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            m.transparent = true;
            m.depthWrite = false;
          });
        }
      }
      if (o.name.startsWith("Footprint_")) {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) footprints.set(o.name, mesh);
      }
      if (isOcclusionFadeName(o.name)) {
        fadeZones.push({ obj: o, x: o.position.x, z: o.position.z });
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            m.transparent = true;
            m.depthWrite = false;
          });
        }
      }
    });
    const water = sceneRoot.getObjectByName("Water") ?? null;
    let waterMat: THREE.ShaderMaterial | null = null;
    if (water && (water as THREE.Mesh).isMesh) {
      const mesh = water as THREE.Mesh;
      const prev = mesh.material;
      waterMat = createCozyWaterMaterial();
      subdivideWater(mesh, WATER_SEGMENTS);
      mesh.material = waterMat;
      mesh.receiveShadow = false;
      mesh.castShadow = false;
      if (Array.isArray(prev)) prev.forEach((m) => m.dispose());
      else prev.dispose();
    }
    // Cozy art pass 5 sockets: lamps + glow, boats, foam, quay tiles, placeable decor.
    const lamps: THREE.Object3D[] = [];
    const lampGlowMats = new Set<THREE.MeshStandardMaterial>();
    const bobbers: Bobber[] = [];
    const decor = new Map<string, THREE.Object3D>();
    let foamMat: THREE.MeshStandardMaterial | null = null;
    const patched = new Set<THREE.Material>();
    sceneRoot.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (/^Lamp_\d+$/.test(o.name)) lamps.push(o);
      if (/^LampGlow_\d+$/.test(o.name) && mesh.isMesh) {
        const m = mesh.material as THREE.MeshStandardMaterial;
        m.emissive = m.emissive ?? new THREE.Color(0xffc977);
        lampGlowMats.add(m);
        mesh.castShadow = false;
      }
      if (/^Boat_\d+$/.test(o.name)) {
        bobbers.push({ obj: o, baseY: o.position.y, baseRotZ: o.rotation.z, phase: bobbers.length * 1.37 });
      }
      if (o.name === "Foam" && mesh.isMesh) {
        foamMat = mesh.material as THREE.MeshStandardMaterial;
        foamMat.depthWrite = false;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.renderOrder = 2;
      }
      if (o.name.startsWith("Decor_")) {
        o.visible = false;
        decor.set(o.name.slice("Decor_".length), o);
      }
      if ((o.name.startsWith("Ground_") || o.name === "Pier") && mesh.isMesh) {
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (o.name.startsWith("Ground_") && !patched.has(m)) {
          patchGroundMaterial(m);
          patched.add(m);
        }
      }
    });
    return {
      root: sceneRoot,
      player: sceneRoot.getObjectByName("Player") ?? null,
      playerBody: sceneRoot.getObjectByName("PlayerBody") ?? null,
      playerNose: sceneRoot.getObjectByName("PlayerNose") ?? null,
      playerRod: sceneRoot.getObjectByName("PlayerRod") ?? null,
      customers,
      customerBodies,
      workers,
      workerBodies,
      slots,
      footprints,
      flyFish,
      flyPortion,
      bursts,
      water,
      waterMat,
      fadeZones,
      lamps,
      lampGlowMats: [...lampGlowMats],
      bobbers,
      foamMat,
      decor,
    };
  }

  private bindHarbor(url: string, entry: HarborCacheEntry): void {
    this.root = entry.root;
    this.scene.add(entry.root);
    entry.root.visible = true;
    this.player = entry.player;
    this.playerBody = entry.playerBody;
    this.playerNose = entry.playerNose;
    this.playerRod = entry.playerRod;
    this.customers = entry.customers;
    this.customerBodies = entry.customerBodies;
    this.workers = entry.workers;
    this.workerBodies = entry.workerBodies;
    this.slots = entry.slots;
    this.footprints = entry.footprints;
    this.footprintBase.clear();
    for (const [name, mesh] of this.footprints) {
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = mat as THREE.MeshStandardMaterial;
      if (std?.color) this.footprintBase.set(name, std.color.clone());
    }
    this.flyFish = entry.flyFish;
    this.flyPortion = entry.flyPortion;
    this.bursts = entry.bursts;
    this.water = entry.water;
    this.waterMat = entry.waterMat;
    this.fadeZones = entry.fadeZones;
    this.lamps = entry.lamps;
    this.lampGlowMats = entry.lampGlowMats;
    this.bobbers = entry.bobbers;
    this.foamMat = entry.foamMat;
    this.decorNodes = entry.decor;
    this.crowd = new CustomerCrowd(this.customers.length);
    this.workerCrowd = new WorkerCrowd(this.workers.length);
    this.crowd.setDrawCap(crowdDrawCapForQuality(this.sessionQuality, this.customers.length));
    this.playerSmooth = new PlayerSmoother();
    const flyPool = Math.max(this.flyFish.length, this.flyPortion.length, FLYING_TRANSFER_POOL);
    this.flying = new FlyingTransfers(flyPool);
    this.flying.setBudget(Math.min(flyPool, flyingTransferPoolForQuality(this.sessionQuality)));
    const burstPool = Math.max(this.bursts.length, VFX_BURST_POOL);
    this.worldBursts = new WorldBursts(burstPool);
    this.worldBursts.setBudget(Math.min(burstPool, worldBurstPoolForQuality(this.sessionQuality)));
    this.loadedUrl = url;
  }

  private clearHarbor(): void {
    this.stashCurrentHarbor();
    for (const [, entry] of this.harborCache) this.disposeHarborEntry(entry);
    this.harborCache.clear();
    this.harborLru.length = 0;
  }

  resize(width: number, height: number): void {
    this.cssWidth = width;
    this.cssHeight = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Phase 26 quality → real GPU + VFX cost (device-matrix).
   * low: 1× DPR, no shadows; medium: ≤1.5× capped toward 1080 CSS tall + 1024 shadows;
   * high: ≤2× + 2048 soft shadows.
   */
  private applyQuality(quality: QualityPreset): void {
    const dpr = window.devicePixelRatio || 1;
    let ratio = quality === "low" ? 1 : quality === "medium" ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    // Mid-desktop 1080p budget: when CSS canvas is taller than 1080, scale DPR down.
    if (quality === "medium" && this.cssHeight > WEB_MEDIUM_MAX_CSS_HEIGHT) {
      ratio = Math.min(ratio, WEB_MEDIUM_MAX_CSS_HEIGHT / this.cssHeight);
    }
    const shadowMap = quality === "low" ? 0 : quality === "medium" ? 1024 : 2048;
    const key = `${quality}:${ratio.toFixed(3)}:${shadowMap}:${this.cssWidth}x${this.cssHeight}`;
    if (key === this.appliedKey) return;
    this.appliedKey = key;
    this.renderer.setPixelRatio(ratio);
    if (this.cssWidth > 0 && this.cssHeight > 0) {
      this.renderer.setSize(this.cssWidth, this.cssHeight, false);
    }
    const shadowsOn = shadowMap > 0;
    this.renderer.shadowMap.enabled = shadowsOn;
    this.sun.castShadow = shadowsOn;
    if (shadowsOn) {
      this.sun.shadow.mapSize.set(shadowMap, shadowMap);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.crowd?.setDrawCap(crowdDrawCapForQuality(quality, this.customers.length));
    this.flying.setBudget(Math.min(this.flying.poolSize, flyingTransferPoolForQuality(quality)));
    this.worldBursts.setBudget(Math.min(this.worldBursts.poolSize, worldBurstPoolForQuality(quality)));
    this.screenShake.setQuality(quality);
  }

  /** Effective quality after session soft-downgrade (presentation-only). */
  effectiveQuality(): QualityPreset {
    return this.sessionQuality;
  }

  render(
    nowMs: number,
    view: SimView | null,
    quality: QualityPreset = "medium",
    reducedMotion = false,
    cosmeticBannerId: string | null = null,
  ): void {
    if (this.contextLost) return;
    if (quality !== this.requestedQuality) {
      this.requestedQuality = quality;
      this.sessionQuality = quality;
      this.frameTiming.reset();
      this.appliedKey = "";
    }
    this.applyQuality(this.sessionQuality);
    this.syncCosmeticBanner(cosmeticBannerId);
    if (view) this.update(nowMs, view, reducedMotion);
    this.renderer.render(this.scene, this.camera);
  }

  /** Phase 24 + Finish 4.0 Phase 10: show/hide a power-neutral multi-part pier banner. */
  private syncCosmeticBanner(cosmeticId: string | null): void {
    if (cosmeticId === this.cosmeticBannerId) return;
    this.cosmeticBannerId = cosmeticId;
    if (!cosmeticId) {
      if (this.cosmeticBanner) {
        this.scene.remove(this.cosmeticBanner);
        this.cosmeticBanner.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        });
        this.cosmeticBanner = null;
        this.cosmeticBannerCloth = null;
      }
      return;
    }
    const [r, g, b] = cosmeticSwatchRgb(cosmeticId);
    const color = new THREE.Color(r / 255, g / 255, b / 255);
    if (!this.cosmeticBanner) {
      // Cozy art pass 5: round pole, gold finial, crossbar and a hanging (swaying) cloth.
      const h = cosmeticPresentation.anchor.heightM;
      const group = new THREE.Group();
      group.name = "CosmeticBanner";
      const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xe8b04a, roughness: 0.4, metalness: 0.4 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, h, 10), wood);
      pole.position.set(0, h * 0.5, 0);
      pole.castShadow = true;
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), gold);
      finial.position.set(0, h + 0.06, 0);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), wood);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0.6, h * 0.92, 0);
      const clothGeo = new THREE.PlaneGeometry(1.1, h * 0.5, 8, 2);
      clothGeo.translate(0.6, -h * 0.25, 0);
      const cloth = new THREE.Mesh(
        clothGeo,
        new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.85, metalness: 0.0 }),
      );
      cloth.position.set(0, h * 0.92, 0);
      cloth.castShadow = true;
      const crest = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), gold);
      crest.position.set(0.6, h * 0.72, 0.012);
      group.add(pole, finial, bar, cloth, crest);
      this.cosmeticBanner = group;
      this.cosmeticBannerCloth = cloth;
      this.scene.add(group);
    } else if (this.cosmeticBannerCloth) {
      (this.cosmeticBannerCloth.material as THREE.MeshStandardMaterial).color.copy(color);
    }
    const x = cosmeticPresentation.anchor.xMm / 1000;
    const z = cosmeticPresentation.anchor.zMm / 1000;
    this.cosmeticBanner.position.set(x, 0, z);
    this.cosmeticBanner.visible = true;
  }

  private update(nowMs: number, v: SimView, reducedMotion: boolean): void {
    const dt = this.lastMs === 0 ? 0 : Math.min(0.25, Math.max(0, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;
    this.elapsed += dt;
    if (dt > 0) {
      this.cpuHarness.beginStage("qualityBind");
      const action = this.cpuHarness.sampleFrame(dt, this.sessionQuality);
      this.cpuHarness.endStage("qualityBind");
      // Nest HUD pressure: bag spoil + service queue as a presentation-only permille cue.
      const nestPressure = Math.min(
        1000,
        Math.trunc((v.bagSpoilPressurePermille ?? 0) * 0.5 + (v.serviceQueuePressurePermille ?? 0) * 0.5),
      );
      this.cpuHarness.setNestHudPressurePermille(nestPressure);
      this.cpuHarness.recordStageMs("nestHud", Math.max(0.05, nestPressure / 1000));
      this.lastCpuSnapshot = this.cpuHarness.snapshot();
      if (action === "downgrade") {
        const next = downgradeQuality(this.sessionQuality);
        if (next !== this.sessionQuality) {
          this.sessionQuality = next;
          this.appliedKey = "";
          this.applyQuality(next);
        }
      } else if (action === "upgrade") {
        const next = upgradeQuality(this.sessionQuality);
        // Never exceed the player-requested preset.
        if (next !== this.sessionQuality && qualityRank(next) <= qualityRank(this.requestedQuality)) {
          this.sessionQuality = next;
          this.appliedKey = "";
          this.applyQuality(next);
        }
      }
    }
    if (dt > 0) {
      sharedAnalyticsBus.onFrameSample(this.frameTiming.emaFrameMs, this.sessionQuality);
    }

    const pose = this.playerSmooth.update(v.player, dt, reducedMotion, {
      bagUsedUnits: v.bagUsedUnits,
      fishingProgress: v.fishingProgress,
    });
    if (this.player) {
      this.player.position.set(pose.x, 0, pose.z);
      this.player.rotation.set(0, pose.yaw, 0);
    }
    if (this.playerBody) {
      this.playerBody.position.y = PLAYER_BODY_REST_Y + pose.bobY;
      this.playerBody.rotation.set(pose.leanRad + pose.swayRad * 0.35, 0, pose.swayRad);
    }
    if (this.playerNose) {
      this.playerNose.position.set(0, PLAYER_NOSE_REST_Y + pose.bobY * 0.4, PLAYER_NOSE_REST_Z);
      this.playerNose.rotation.set(0, 0, -pose.swayRad * 0.5);
    }
    if (this.playerRod) {
      const tip = pose.clip === "cast" ? -0.55 - 0.9 * pose.cast01 : -0.15;
      this.playerRod.position.set(PLAYER_ROD_REST_X, PLAYER_ROD_REST_Y + pose.bobY * 0.2, PLAYER_ROD_REST_Z);
      this.playerRod.rotation.set(tip, 0, pose.swayRad * 0.25);
      this.playerRod.visible = true;
    }

    for (const [name, visible] of stackVisibility(v, this.slots.keys())) {
      this.slots.get(name)!.visible = visible;
    }
    this.crowd?.update(v, dt).forEach((c, i) => {
      const o = this.customers[i]!;
      o.visible = c !== null;
      if (c) {
        o.position.set(c.x, 0, c.z);
        o.rotation.set(0, c.yaw, 0);
        const body = this.customerBodies[i];
        if (body && body !== o) {
          body.position.y = CUSTOMER_BODY_REST_Y + c.bobY;
          body.rotation.set(c.leanRad + c.swayRad * 0.35, 0, c.swayRad);
        }
      }
    });
    this.workerCrowd?.update(v, dt).forEach((w, i) => {
      const o = this.workers[i]!;
      o.visible = w !== null;
      if (w) {
        o.position.set(w.x, 0, w.z);
        o.rotation.set(0, w.yaw, 0);
        const body = this.workerBodies[i];
        if (body && body !== o) {
          body.position.y = WORKER_BODY_REST_Y + w.bobY;
          body.rotation.set(w.leanRad + w.swayRad * 0.35, 0, w.swayRad);
        }
      }
    });

    if (reducedMotion) {
      this.pendingCues.length = 0;
      this.pendingBursts.length = 0;
      this.pendingShakes.length = 0;
      this.flying.clear();
      this.worldBursts.clear();
      this.screenShake.clear();
    } else {
      if (this.pendingCues.length > 0) {
        for (const cue of this.pendingCues) this.flying.spawn(cue);
        this.pendingCues.length = 0;
      }
      if (this.pendingBursts.length > 0) {
        for (const cue of this.pendingBursts) this.worldBursts.spawn(cue);
        this.pendingBursts.length = 0;
      }
      if (this.pendingShakes.length > 0) {
        for (const kind of this.pendingShakes) this.screenShake.trigger(kind);
        this.pendingShakes.length = 0;
      }
    }
    const poses = reducedMotion ? [] : this.flying.update(dt);
    for (let i = 0; i < poses.length; i++) {
      const flyPose = poses[i]!;
      const fish = this.flyFish[i];
      const portion = this.flyPortion[i];
      if (fish) fish.visible = false;
      if (portion) portion.visible = false;
      if (!flyPose) continue;
      const mesh = flyPose.kind === "fish" ? fish : portion;
      if (!mesh) continue;
      mesh.visible = true;
      mesh.position.set(flyPose.x, flyPose.y, flyPose.z);
      mesh.rotation.set(0, flyPose.yaw, 0);
      mesh.scale.setScalar(flyPose.scale);
    }
    const burstPoses = reducedMotion ? [] : this.worldBursts.update(dt);
    for (let i = 0; i < this.bursts.length; i++) {
      const mesh = this.bursts[i]!;
      const pose = burstPoses[i] ?? null;
      mesh.visible = pose !== null;
      if (!pose) continue;
      mesh.position.set(pose.x, pose.y, pose.z);
      mesh.scale.setScalar(pose.scale);
      const m = mesh as THREE.Mesh;
      if (m.isMesh) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) mat.opacity = pose.opacity;
      }
    }
    // Phase 16: operate pulse on Footprint_* while PROCESSING.
    const active = new Map(
      reducedMotion ? [] : machineOperatePulses(v, this.elapsed).map((p) => [p.footprintName, p.pulse01]),
    );
    for (const [name, mesh] of this.footprints) {
      const base = this.footprintBase.get(name);
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const std = mat as THREE.MeshStandardMaterial;
      if (!std?.color || !base) continue;
      const pulse = active.get(name) ?? 0;
      std.color.copy(base).lerp(new THREE.Color(0xfff0a8), pulse * 0.65);
      if ("emissive" in std && std.emissive) {
        std.emissive.setRGB(0.35 * pulse, 0.28 * pulse, 0.05 * pulse);
      }
    }

    // Finish 2.0/3.0/4.0/5.0 — weather/festival/tide/rival/endgame/pressure ambient.
    const endgameMode = !v.endgameUnlocked
      ? "locked"
      : (v.endgameMarkCount ?? 0) > 0
        ? "crowned"
        : "active";
    // The profile's `tidePhaseId` slot keys dawn/day/dusk/night tints; the sim's tide phase ids
    // never matched those keys, so feed it the day part instead (cozy art pass 5 fix).
    const tidePhaseId = v.dayPartId || "day";
    const ambient = weatherAmbientProfile(
      v.weatherId,
      !!v.seasonalEvent,
      this.sessionQuality,
      reducedMotion,
      tidePhaseId,
      !!v.rivalPressureActive || (v.activeRivalIds?.length ?? 0) > 0,
      endgameMode,
      pressureAmbientIdForView(
        v.bagSpoilPressurePermille ?? 0,
        v.serviceQueuePressurePermille ?? 0,
        v.ticksUntilNearestContractDeadline ?? null,
        v.nextQuestProgressPermille ?? null,
      ),
      nestAmbientIdForView(
        v.decorPlacements?.length ?? 0,
        (v.tidePhaseId ?? "") === "night" || (v.tidePhaseId ?? "") === "dusk",
      ),
    );
    // Cozy art pass 5: continuous day/night + weather lighting.
    const atm = atmosphereFrame(v.dayProgressPermille ?? 400, v.weatherId, reducedMotion);
    this.photoAtmosphereOverride?.(atm);
    const sky = new THREE.Color(atm.skyHex).lerp(new THREE.Color(ambient.skyHex), 0.2);
    this.scene.background = sky;
    this.fog.color.set(atm.fogHex);
    this.fog.near = atm.fogNear;
    this.fog.far = atm.fogFar;
    this.sun.color.set(atm.sunHex);
    this.sun.intensity = atm.sunIntensity;
    this.hemi.color.set(atm.hemiSkyHex);
    this.hemi.groundColor.set(atm.hemiGroundHex);
    this.hemi.intensity = atm.hemiIntensity;
    this.renderer.toneMappingExposure = atm.night ? 1.25 : 1.05;
    if (this.waterMat) {
      (this.waterMat.uniforms.uDeep!.value as THREE.Color).set(ambient.waterDeepHex);
      (this.waterMat.uniforms.uShallow!.value as THREE.Color).set(ambient.waterShallowHex);
      (this.waterMat.uniforms.uSparkle!.value as THREE.Color).set(ambient.waterSparkleHex);
      applyAtmosphereToWater(this.waterMat, atm, reducedMotion ? 0 : this.elapsed, reducedMotion ? 0 : ambient.bobScale);
    }
    if (this.foamMat) {
      this.foamMat.opacity = reducedMotion ? 0.22 : 0.16 + 0.1 * (0.5 + 0.5 * Math.sin(this.elapsed * 1.1));
    }
    updateBobbers(this.bobbers, this.elapsed, atm.wind, reducedMotion);
    this.lampLights.update(
      this.lamps,
      this.lampGlowMats,
      atm.lampGlow,
      LAMP_LIGHTS_BY_QUALITY[this.sessionQuality],
      pose.x,
      pose.z,
    );
    this.rain.update(dt, atm.rain, atm.wind, pose.x, pose.z, RAIN_DROPS_BY_QUALITY[this.sessionQuality]);
    this.syncDecor(v);
    if (this.cosmeticBannerCloth && !reducedMotion) {
      this.cosmeticBannerCloth.rotation.y = Math.sin(this.elapsed * (1.4 + atm.wind * 2.2)) * (0.08 + 0.18 * atm.wind);
    }

    // Phase 31 harbor crossfade + Zone_* distance occlusion.
    if (this.transition < 1) {
      this.transition = Math.min(1, this.transition + dt / HARBOR_TRANSITION_S);
    }
    for (const z of this.fadeZones) {
      const d = Math.hypot(z.x - pose.x, z.z - pose.z);
      const a = occlusionOpacity(d) * this.transition;
      z.obj.visible = a > 0.05;
      const mesh = z.obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m.opacity = a;
      }
    }

    const shake = reducedMotion || this.photoCam ? { x: 0, y: 0 } : this.screenShake.update(dt);
    if (this.photoCam) {
      // Photo mode: orbit around the player.
      const pc = this.photoCam;
      const cx = pose.x + Math.sin(pc.yaw) * Math.cos(pc.pitch) * pc.dist;
      const cz = pose.z - Math.cos(pc.yaw) * Math.cos(pc.pitch) * pc.dist;
      const cy = 0.8 + Math.sin(pc.pitch) * pc.dist;
      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(pose.x, 0.9, pose.z);
    } else {
      const camX = pose.x + shake.x;
      const camY = CameraRig.HEIGHT_M + shake.y;
      const camZ = pose.z - CameraRig.BACK_M;
      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(pose.x + shake.x, 0, pose.z + CameraRig.LOOK_AHEAD_M);
    }
    this.sun.target.position.set(pose.x, 0, pose.z);
    this.sun.position.set(pose.x - atm.sunDir[0] * 35, -atm.sunDir[1] * 35, pose.z - atm.sunDir[2] * 35);
  }

  /** Optional hook (photo mode "time of day" scrubber) that may rewrite the frame's atmosphere. */
  photoAtmosphereOverride: ((a: import("./atmosphere").AtmosphereFrame) => void) | null = null;

  /** Photo mode: enable/disable the orbit camera. */
  setPhotoMode(on: boolean): void {
    this.photoCam = on ? { yaw: 0, pitch: 0.55, dist: 9 } : null;
  }

  /** Photo mode: orbit by deltas (radians / metres). */
  orbitPhoto(dYaw: number, dPitch: number, dDist: number): void {
    if (!this.photoCam) return;
    const pc = this.photoCam;
    pc.yaw += dYaw;
    pc.pitch = Math.min(1.35, Math.max(0.08, pc.pitch + dPitch));
    pc.dist = Math.min(26, Math.max(3, pc.dist + dDist));
  }

  /** Photo mode: render one frame now and return it as a PNG data URL (HUD is not part of the canvas). */
  capturePng(): string {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL("image/png");
  }

  private decorGhost: { short: string; obj: THREE.Object3D; mats: THREE.MeshStandardMaterial[] } | null = null;

  /**
   * Decorating: show a translucent preview of decor [short] at (x, z) mm, tinted green when the
   * spot is valid and red when it is not. Pass null to remove the preview.
   */
  setDecorGhost(short: string | null, xMm = 0, zMm = 0, rotationQuarter = 0, valid = true): void {
    if (!short) {
      if (this.decorGhost) {
        this.scene.remove(this.decorGhost.obj);
        this.decorGhost.mats.forEach((m) => m.dispose());
        this.decorGhost = null;
      }
      return;
    }
    if (!this.decorGhost || this.decorGhost.short !== short) {
      this.setDecorGhost(null);
      const src = this.decorNodes.get(short);
      if (!src) return;
      const obj = src.clone(true);
      const mats: THREE.MeshStandardMaterial[] = [];
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const m = (mesh.material as THREE.MeshStandardMaterial).clone();
        m.transparent = true;
        m.opacity = 0.6;
        m.depthWrite = false;
        mats.push(m);
        mesh.material = m;
        mesh.castShadow = false;
      });
      obj.visible = true;
      this.scene.add(obj);
      this.decorGhost = { short, obj, mats };
    }
    const g = this.decorGhost;
    g.obj.position.set(xMm / 1000, 0.02, zMm / 1000);
    g.obj.rotation.set(0, (rotationQuarter * Math.PI) / 2, 0);
    for (const m of g.mats) m.emissive.set(valid ? 0x1f8f4a : 0xb3412e).multiplyScalar(0.6);
  }

  /** Placeable decor: show each placed item at its simulation position. */
  private syncDecor(v: SimView): void {
    if (this.decorNodes.size === 0) return;
    const placed = new Map((v.decorPlacements ?? []).map((p) => [p.decorId.slice(p.decorId.indexOf(".") + 1), p]));
    for (const [short, obj] of this.decorNodes) {
      const p = placed.get(short);
      obj.visible = !!p;
      if (!p) continue;
      obj.position.set(p.xMm / 1000, 0, p.zMm / 1000);
      obj.rotation.set(0, (p.rotationQuarter * Math.PI) / 2, 0);
    }
  }

  dispose(): void {
    this.setDecorGhost(null);
    this.rain.dispose();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.clearHarbor();
    this.sun.shadow.map?.dispose();
    this.renderer.dispose();
  }
}
