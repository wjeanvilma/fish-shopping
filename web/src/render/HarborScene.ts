/**
 * Three.js (WebGL 2) presentation of a harbor. Reads SimView snapshots and writes
 * transforms; never changes game state. Uses the same GLB and node-name contract as
 * the Android Filament renderer (Player, PlayerBody, CustomerBody_N, Fly_N_*, Water).
 *
 * Item stacks, character locomotion, flying transfers, and water are driven from
 * SimView / ItemsTransferred cues by the presenters in ./presenters.ts.
 *
 * TODO(blueprint): occlusion fade, on-demand harbor loading.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { SimView } from "../engine";
import { CameraRig } from "../game/cameraRig";
import type { QualityPreset } from "../game/settingsStore";
import {
  CUSTOMER_BODY_REST_Y,
  CustomerCrowd,
  FlyingTransfers,
  FLYING_TRANSFER_POOL,
  PLAYER_BODY_REST_Y,
  PLAYER_NOSE_REST_Y,
  PLAYER_NOSE_REST_Z,
  PlayerSmoother,
  stackVisibility,
  type FlyingTransferCue,
} from "./presenters";
import { createWaterMaterial } from "./waterMaterial";

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
  private lastMs = 0;
  private elapsed = 0;
  /** Currently loaded blockout URL (for harbor travel swaps). */
  loadedUrl: string | null = null;
  contextLost = false;
  private cssWidth = 0;
  private cssHeight = 0;
  private appliedRatio = -1;

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
    this.clearHarbor();
    const gltf = await new GLTFLoader().loadAsync(url);
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = !o.name.startsWith("Zone_") && o.name !== "Water";
        o.receiveShadow = true;
      }
    });
    this.root = gltf.scene;
    this.scene.add(gltf.scene);
    this.player = gltf.scene.getObjectByName("Player") ?? null;
    this.playerBody = gltf.scene.getObjectByName("PlayerBody") ?? null;
    this.playerNose = gltf.scene.getObjectByName("PlayerNose") ?? null;
    this.customers = [];
    this.customerBodies = [];
    for (let i = 0; ; i++) {
      const c = gltf.scene.getObjectByName(`Customer_${i}`);
      if (!c) break;
      c.visible = false;
      this.customers.push(c);
      this.customerBodies.push(gltf.scene.getObjectByName(`CustomerBody_${i}`) ?? c);
    }
    this.crowd = new CustomerCrowd(this.customers.length);
    this.playerSmooth = new PlayerSmoother();
    this.slots.clear();
    this.flyFish = [];
    this.flyPortion = [];
    gltf.scene.traverse((o) => {
      if (/^(Bag_\d+_(fish|portion)|In_.+_\d+|Out_.+_\d+|Stock_.+_\d+)$/.test(o.name)) {
        o.visible = false;
        this.slots.set(o.name, o);
      }
      const fly = /^Fly_(\d+)_(fish|portion)$/.exec(o.name);
      if (fly) {
        o.visible = false;
        const idx = Number(fly[1]);
        const kind = fly[2]!;
        const list = kind === "fish" ? this.flyFish : this.flyPortion;
        list[idx] = o;
      }
    });
    this.flying = new FlyingTransfers(Math.max(this.flyFish.length, this.flyPortion.length, FLYING_TRANSFER_POOL));
    this.water = gltf.scene.getObjectByName("Water") ?? null;
    if (this.water && (this.water as THREE.Mesh).isMesh) {
      const mesh = this.water as THREE.Mesh;
      const prev = mesh.material;
      this.waterMat = createWaterMaterial();
      mesh.material = this.waterMat;
      if (Array.isArray(prev)) prev.forEach((m) => m.dispose());
      else prev.dispose();
    }
    this.loadedUrl = url;
  }

  private clearHarbor(): void {
    if (!this.root) return;
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m !== this.waterMat) m.dispose();
        });
      }
    });
    this.waterMat?.dispose();
    this.waterMat = null;
    this.water = null;
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
    this.loadedUrl = null;
  }

  resize(width: number, height: number): void {
    this.cssWidth = width;
    this.cssHeight = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /** Low draws at 1×; medium and high cap device pixel ratio at 2. */
  private applyQuality(quality: QualityPreset): void {
    const dpr = window.devicePixelRatio || 1;
    const ratio = quality === "low" ? 1 : Math.min(dpr, 2);
    if (ratio === this.appliedRatio) return;
    this.appliedRatio = ratio;
    this.renderer.setPixelRatio(ratio);
    if (this.cssWidth > 0 && this.cssHeight > 0) {
      this.renderer.setSize(this.cssWidth, this.cssHeight, false);
    }
  }

  render(nowMs: number, view: SimView | null, quality: QualityPreset = "medium"): void {
    if (this.contextLost) return;
    this.applyQuality(quality);
    if (view) this.update(nowMs, view);
    this.renderer.render(this.scene, this.camera);
  }

  private update(nowMs: number, v: SimView): void {
    const dt = this.lastMs === 0 ? 0 : Math.min(0.25, Math.max(0, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;
    this.elapsed += dt;

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

    this.camera.position.set(pose.x, CameraRig.HEIGHT_M, pose.z - CameraRig.BACK_M);
    this.camera.lookAt(pose.x, 0, pose.z + CameraRig.LOOK_AHEAD_M);
    this.sun.target.position.set(pose.x, 0, pose.z);
    this.sun.position.set(pose.x - 10.5, 30, pose.z - 16.5);
  }

  dispose(): void {
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.clearHarbor();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.sun.shadow.map?.dispose();
    this.renderer.dispose();
  }
}
