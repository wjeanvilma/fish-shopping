/**
 * Three.js (WebGL 2) presentation of a harbor. Reads SimView snapshots and writes
 * transforms; never changes game state. Uses the same GLB and node-name contract as
 * the Android Filament renderer (Player, PlayerBody, CustomerBody_N, Fly_N_*, Water).
 *
 * Item stacks, character locomotion, flying transfers, and water are driven from
 * SimView / ItemsTransferred cues by the presenters in ./presenters.ts.
 *
 * Phase 31: on-demand harbor GLB cache (LRU 2) + Zone_* distance occlusion fade.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { SimView } from "../engine";
import { CameraRig } from "../game/cameraRig";
import type { QualityPreset } from "../game/settingsStore";
import { downgradeQuality, FRAME_TARGET_MS, FrameTiming } from "./frameTiming";
import {
  CUSTOMER_BODY_REST_Y,
  CustomerCrowd,
  crowdDrawCapForQuality,
  FlyingTransfers,
  FLYING_TRANSFER_POOL,
  flyingTransferPoolForQuality,
  HARBOR_TRANSITION_S,
  isOcclusionFadeName,
  occlusionOpacity,
  PLAYER_BODY_REST_Y,
  PLAYER_NOSE_REST_Y,
  PLAYER_NOSE_REST_Z,
  PlayerSmoother,
  stackVisibility,
  type FlyingTransferCue,
} from "./presenters";
import { createWaterMaterial } from "./waterMaterial";

interface HarborCacheEntry {
  root: THREE.Object3D;
  player: THREE.Object3D | null;
  playerBody: THREE.Object3D | null;
  playerNose: THREE.Object3D | null;
  customers: THREE.Object3D[];
  customerBodies: THREE.Object3D[];
  slots: Map<string, THREE.Object3D>;
  flyFish: THREE.Object3D[];
  flyPortion: THREE.Object3D[];
  water: THREE.Object3D | null;
  waterMat: THREE.ShaderMaterial | null;
  fadeZones: { obj: THREE.Object3D; x: number; z: number }[];
}

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
  private root: THREE.Object3D | null = null;
  private player: THREE.Object3D | null = null;
  private playerBody: THREE.Object3D | null = null;
  private playerNose: THREE.Object3D | null = null;
  private customers: THREE.Object3D[] = [];
  private customerBodies: THREE.Object3D[] = [];
  private crowd: CustomerCrowd | null = null;
  private playerSmooth = new PlayerSmoother();
  private slots = new Map<string, THREE.Object3D>();
  private flyFish: THREE.Object3D[] = [];
  private flyPortion: THREE.Object3D[] = [];
  private flying = new FlyingTransfers(FLYING_TRANSFER_POOL);
  private pendingCues: FlyingTransferCue[] = [];
  private water: THREE.Object3D | null = null;
  private waterMat: THREE.ShaderMaterial | null = null;
  private fadeZones: { obj: THREE.Object3D; x: number; z: number }[] = [];
  private lastMs = 0;
  private elapsed = 0;
  /** Currently loaded blockout URL (for harbor travel swaps). */
  loadedUrl: string | null = null;
  contextLost = false;
  private cssWidth = 0;
  private cssHeight = 0;
  private appliedKey = "";
  private requestedQuality: QualityPreset = "medium";
  /** Session floor: may soft-downgrade under sustained frame misses (Phase 29). */
  private sessionQuality: QualityPreset = "medium";
  private readonly frameTiming = new FrameTiming();
  /** Phase 31: keep up to two harbors warm for travel swaps. */
  private readonly harborCache = new Map<string, HarborCacheEntry>();
  private readonly harborLru: string[] = [];
  private transition = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color("#9fd3ea");
    this.scene.add(new THREE.HemisphereLight(0xdcefff, 0x8a7a5a, 1.3));
    // Sun direction matches the Android renderer (0.35, -1, 0.55).
    this.sun.position.set(-0.35, 1, -0.55).multiplyScalar(30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 80;
    this.scene.add(this.sun, this.sun.target);

    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault(); // allow restoration
    this.contextLost = true;
  };

  private onContextRestored = () => {
    this.contextLost = false;
  };

  /** Queue sim-authoritative transfer arcs (drained on the next frame). */
  enqueueTransfers(cues: readonly FlyingTransferCue[]): void {
    if (cues.length === 0) return;
    this.pendingCues.push(...cues);
  }

  async load(url: string): Promise<void> {
    if (this.loadedUrl === url && this.root) return;
    this.stashCurrentHarbor();
    const cached = this.harborCache.get(url);
    if (cached) {
      this.bindHarbor(url, cached);
      this.touchLru(url);
      this.beginTransition();
      return;
    }
    const gltf = await new GLTFLoader().loadAsync(url);
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
    this.customers = [];
    this.customerBodies = [];
    this.crowd = null;
    this.slots.clear();
    this.flyFish = [];
    this.flyPortion = [];
    this.flying.clear();
    this.pendingCues.length = 0;
    this.fadeZones = [];
    this.water = null;
    this.waterMat = null;
    this.loadedUrl = null;
  }

  private touchLru(url: string): void {
    const i = this.harborLru.indexOf(url);
    if (i >= 0) this.harborLru.splice(i, 1);
    this.harborLru.push(url);
  }

  private trimCache(): void {
    while (this.harborLru.length > 2) {
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
    const slots = new Map<string, THREE.Object3D>();
    const flyFish: THREE.Object3D[] = [];
    const flyPortion: THREE.Object3D[] = [];
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
    let water = sceneRoot.getObjectByName("Water") ?? null;
    let waterMat: THREE.ShaderMaterial | null = null;
    if (water && (water as THREE.Mesh).isMesh) {
      const mesh = water as THREE.Mesh;
      const prev = mesh.material;
      waterMat = createWaterMaterial();
      mesh.material = waterMat;
      if (Array.isArray(prev)) prev.forEach((m) => m.dispose());
      else prev.dispose();
    }
    return {
      root: sceneRoot,
      player: sceneRoot.getObjectByName("Player") ?? null,
      playerBody: sceneRoot.getObjectByName("PlayerBody") ?? null,
      playerNose: sceneRoot.getObjectByName("PlayerNose") ?? null,
      customers,
      customerBodies,
      slots,
      flyFish,
      flyPortion,
      water,
      waterMat,
      fadeZones,
    };
  }

  private bindHarbor(url: string, entry: HarborCacheEntry): void {
    this.root = entry.root;
    this.scene.add(entry.root);
    entry.root.visible = true;
    this.player = entry.player;
    this.playerBody = entry.playerBody;
    this.playerNose = entry.playerNose;
    this.customers = entry.customers;
    this.customerBodies = entry.customerBodies;
    this.slots = entry.slots;
    this.flyFish = entry.flyFish;
    this.flyPortion = entry.flyPortion;
    this.water = entry.water;
    this.waterMat = entry.waterMat;
    this.fadeZones = entry.fadeZones;
    this.crowd = new CustomerCrowd(this.customers.length);
    this.crowd.setDrawCap(crowdDrawCapForQuality(this.sessionQuality, this.customers.length));
    this.playerSmooth = new PlayerSmoother();
    const flyPool = Math.max(this.flyFish.length, this.flyPortion.length, FLYING_TRANSFER_POOL);
    this.flying = new FlyingTransfers(flyPool);
    this.flying.setBudget(Math.min(flyPool, flyingTransferPoolForQuality(this.sessionQuality)));
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
   * Phase 29 quality → real GPU + VFX cost.
   * low: 1× DPR, no shadows; medium: ≤1.5× + 1024 shadows; high: ≤2× + 2048 soft shadows.
   */
  private applyQuality(quality: QualityPreset): void {
    const dpr = window.devicePixelRatio || 1;
    const ratio = quality === "low" ? 1 : quality === "medium" ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    const shadowMap = quality === "low" ? 0 : quality === "medium" ? 1024 : 2048;
    const key = `${quality}:${ratio}:${shadowMap}`;
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
  }

  /** Effective quality after session soft-downgrade (presentation-only). */
  effectiveQuality(): QualityPreset {
    return this.sessionQuality;
  }

  render(nowMs: number, view: SimView | null, quality: QualityPreset = "medium"): void {
    if (this.contextLost) return;
    if (quality !== this.requestedQuality) {
      this.requestedQuality = quality;
      this.sessionQuality = quality;
      this.frameTiming.reset();
      this.appliedKey = "";
    }
    this.applyQuality(this.sessionQuality);
    if (view) this.update(nowMs, view);
    this.renderer.render(this.scene, this.camera);
  }

  private update(nowMs: number, v: SimView): void {
    const dt = this.lastMs === 0 ? 0 : Math.min(0.25, Math.max(0, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;
    this.elapsed += dt;
    if (dt > 0 && this.frameTiming.sample(dt, FRAME_TARGET_MS[this.sessionQuality])) {
      const next = downgradeQuality(this.sessionQuality);
      if (next !== this.sessionQuality) {
        this.sessionQuality = next;
        this.appliedKey = "";
        this.applyQuality(next);
      }
    }

    const pose = this.playerSmooth.update(v.player, dt);
    if (this.player) {
      this.player.position.set(pose.x, 0, pose.z);
      this.player.rotation.set(0, pose.yaw, 0);
    }
    if (this.playerBody) {
      this.playerBody.position.y = PLAYER_BODY_REST_Y + pose.bobY;
      this.playerBody.rotation.set(pose.swayRad * 0.35, 0, pose.swayRad);
    }
    if (this.playerNose) {
      this.playerNose.position.set(0, PLAYER_NOSE_REST_Y + pose.bobY * 0.4, PLAYER_NOSE_REST_Z);
      this.playerNose.rotation.set(0, 0, -pose.swayRad * 0.5);
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
          body.rotation.set(c.swayRad * 0.35, 0, c.swayRad);
        }
      }
    });

    if (this.pendingCues.length > 0) {
      for (const cue of this.pendingCues) this.flying.spawn(cue);
      this.pendingCues.length = 0;
    }
    const poses = this.flying.update(dt);
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
      mesh.rotation.set(0, 0, 0);
    }

    if (this.waterMat) this.waterMat.uniforms.uTime!.value = this.elapsed;
    if (this.water) this.water.position.y = -0.65 + Math.sin(this.elapsed * 0.7) * 0.02;

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

    this.camera.position.set(pose.x, CameraRig.HEIGHT_M, pose.z - CameraRig.BACK_M);
    this.camera.lookAt(pose.x, 0, pose.z + CameraRig.LOOK_AHEAD_M);
    this.sun.target.position.set(pose.x, 0, pose.z);
    this.sun.position.set(pose.x - 10.5, 30, pose.z - 16.5);
  }

  dispose(): void {
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.clearHarbor();
    this.sun.shadow.map?.dispose();
    this.renderer.dispose();
  }
}
