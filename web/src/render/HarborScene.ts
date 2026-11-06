/**
 * Three.js (WebGL 2) presentation of a harbor. Reads SimView snapshots and writes
 * transforms; never changes game state. Uses the same GLB and node-name contract as
 * the Android Filament renderer (Player, CustomerBody_N).
 *
 * Item stacks and customer walking are driven from SimView by the presenters in
 * ./presenters.ts, shared in spirit with the Android renderer.
 *
 * TODO(blueprint): animated characters, water shader, flying transfer animation,
 * occlusion fade, quality presets, on-demand harbor loading.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { SimView } from "../engine";
import { CameraRig } from "../game/cameraRig";
import { CustomerCrowd, stackVisibility } from "./presenters";

const SMOOTHING_PER_SECOND = 18;

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
  private player: THREE.Object3D | null = null;
  private customers: THREE.Object3D[] = [];
  private crowd: CustomerCrowd | null = null;
  private slots = new Map<string, THREE.Object3D>();
  private vis = { x: NaN, z: 0, yaw: 0 };
  private lastMs = 0;
  contextLost = false;

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

  async load(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = !o.name.startsWith("Zone_") && o.name !== "Water";
        o.receiveShadow = true;
      }
    });
    this.scene.add(gltf.scene);
    this.player = gltf.scene.getObjectByName("Player") ?? null;
    this.customers = [];
    for (let i = 0; ; i++) {
      const c = gltf.scene.getObjectByName(`Customer_${i}`);
      if (!c) break;
      c.visible = false;
      this.customers.push(c);
    }
    this.crowd = new CustomerCrowd(this.customers.length);
    this.slots.clear();
    gltf.scene.traverse((o) => {
      if (/^(Bag_\d+_(fish|portion)|In_.+_\d+|Out_.+_\d+|Stock_.+_\d+)$/.test(o.name)) {
        o.visible = false;
        this.slots.set(o.name, o);
      }
    });
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  render(nowMs: number, view: SimView | null): void {
    if (this.contextLost) return;
    if (view) this.update(nowMs, view);
    this.renderer.render(this.scene, this.camera);
  }

  private update(nowMs: number, v: SimView): void {
    const dt = this.lastMs === 0 ? 0 : Math.min(0.25, Math.max(0, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;
    const tx = v.player.xMm / 1000;
    const tz = v.player.zMm / 1000;
    const tyaw = Math.atan2(v.player.facingX, v.player.facingZ);
    if (Number.isNaN(this.vis.x)) {
      this.vis = { x: tx, z: tz, yaw: tyaw };
    } else {
      const k = 1 - Math.exp(-SMOOTHING_PER_SECOND * dt);
      this.vis.x += (tx - this.vis.x) * k;
      this.vis.z += (tz - this.vis.z) * k;
      let d = tyaw - this.vis.yaw;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      this.vis.yaw += d * k;
    }
    if (this.player) {
      this.player.position.set(this.vis.x, 0, this.vis.z);
      this.player.rotation.set(0, this.vis.yaw, 0);
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
      }
    });

    this.camera.position.set(this.vis.x, CameraRig.HEIGHT_M, this.vis.z - CameraRig.BACK_M);
    this.camera.lookAt(this.vis.x, 0, this.vis.z + CameraRig.LOOK_AHEAD_M);
    this.sun.target.position.set(this.vis.x, 0, this.vis.z);
    this.sun.position.set(this.vis.x - 10.5, 30, this.vis.z - 16.5);
  }

  dispose(): void {
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
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
