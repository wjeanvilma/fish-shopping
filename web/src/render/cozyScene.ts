/**
 * Cozy art pass 5 — web-only presentation helpers for HarborScene:
 * lit wave water, quay tile detail, rain, lamp lights and bobbing boats.
 * Presentation only; nothing here reads or writes simulation state.
 */
import * as THREE from "three";
import type { AtmosphereFrame } from "./atmosphere";

// --------------------------------------------------------------------------- water

const WATER_VERT = /* glsl */ `
uniform float uTime;
uniform float uWave;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vCrest;
varying float vViewZ;

float wave(vec2 p, vec2 d, float k, float s, float t) { return sin(dot(p, d) * k + t * s); }

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 p = world.xz;
  float t = uTime;
  float h = 0.0;
  vec2 grad = vec2(0.0);
  // Four directional sines (cheap Gerstner-ish look).
  vec2 d1 = normalize(vec2(1.0, 0.35)); float k1 = 0.55; float s1 = 1.15; float a1 = 0.08;
  vec2 d2 = normalize(vec2(-0.6, 1.0)); float k2 = 0.85; float s2 = 1.6;  float a2 = 0.05;
  vec2 d3 = normalize(vec2(0.2, -1.0)); float k3 = 1.7;  float s3 = 2.3;  float a3 = 0.025;
  vec2 d4 = normalize(vec2(-1.0, -0.2)); float k4 = 2.9; float s4 = 3.1;  float a4 = 0.012;
  h += a1 * wave(p, d1, k1, s1, t); grad += a1 * k1 * d1 * cos(dot(p, d1) * k1 + t * s1);
  h += a2 * wave(p, d2, k2, s2, t); grad += a2 * k2 * d2 * cos(dot(p, d2) * k2 + t * s2);
  h += a3 * wave(p, d3, k3, s3, t); grad += a3 * k3 * d3 * cos(dot(p, d3) * k3 + t * s3);
  h += a4 * wave(p, d4, k4, s4, t); grad += a4 * k4 * d4 * cos(dot(p, d4) * k4 + t * s4);
  world.y += h * uWave;
  grad *= uWave;
  vNormalW = normalize(vec3(-grad.x, 1.0, -grad.y));
  vCrest = clamp(h * uWave * 6.0 + 0.5, 0.0, 1.0);
  vWorld = world.xyz;
  vec4 view = viewMatrix * world;
  vViewZ = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSparkle;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunIntensity;
uniform vec3 uSkyColor;
uniform float uAmbient;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vCrest;
varying float vViewZ;

void main() {
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 l = normalize(-uSunDir);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 base = mix(uDeep, uShallow, vCrest);
  float diff = max(dot(n, l), 0.0);
  vec3 col = base * (uAmbient + 0.35 * diff * uSunIntensity * uSunColor);
  col = mix(col, uSkyColor * (0.55 + 0.25 * uAmbient), fres * 0.55);
  vec3 h = normalize(l + v);
  float spec = pow(max(dot(n, h), 0.0), 90.0) * uSunIntensity * 0.35;
  col += uSunColor * spec;
  // Soft caustic shimmer near crests instead of hard sparkle squares.
  float shimmer = smoothstep(0.75, 1.0, vCrest) * (0.5 + 0.5 * sin(vWorld.x * 3.1 + vWorld.z * 2.3 + uTime * 2.0));
  col += uSparkle * shimmer * 0.05 * uSunIntensity;
  float fog = smoothstep(uFogNear, uFogFar, vViewZ);
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createCozyWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWave: { value: 1 },
      uDeep: { value: new THREE.Color("#1a5f7a") },
      uShallow: { value: new THREE.Color("#3a9fc4") },
      uSparkle: { value: new THREE.Color("#cfefff") },
      uSunDir: { value: new THREE.Vector3(0.3, -1, 0.5).normalize() },
      uSunColor: { value: new THREE.Color("#fff6e4") },
      uSunIntensity: { value: 2.5 },
      uSkyColor: { value: new THREE.Color("#9fd3ea") },
      uAmbient: { value: 0.75 },
      uFogColor: { value: new THREE.Color("#b9dff0") },
      uFogNear: { value: 34 },
      uFogFar: { value: 85 },
    },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
  });
}

/**
 * Swap the GLB's 24-vertex water slab for a subdivided top surface so the vertex shader
 * can displace waves. Keeps the node transform (local top face sits at y=+0.5).
 */
export function subdivideWater(mesh: THREE.Mesh, segments: number): void {
  const geo = new THREE.PlaneGeometry(1, 1, segments, segments);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.5, 0);
  mesh.geometry.dispose();
  mesh.geometry = geo;
}

export function applyAtmosphereToWater(
  mat: THREE.ShaderMaterial,
  a: AtmosphereFrame,
  elapsed: number,
  waveScale: number,
): void {
  const u = mat.uniforms;
  u.uTime!.value = elapsed;
  u.uWave!.value = waveScale * (0.8 + a.wind * 0.9);
  (u.uSunDir!.value as THREE.Vector3).set(a.sunDir[0], a.sunDir[1], a.sunDir[2]);
  (u.uSunColor!.value as THREE.Color).set(a.sunHex);
  u.uSunIntensity!.value = a.sunIntensity;
  (u.uSkyColor!.value as THREE.Color).set(a.skyHex);
  u.uAmbient!.value = 0.35 + 0.35 * a.hemiIntensity;
  (u.uFogColor!.value as THREE.Color).set(a.fogHex);
  u.uFogNear!.value = a.fogNear;
  u.uFogFar!.value = a.fogFar;
}

// --------------------------------------------------------------------------- quay tiles

/**
 * Adds a running-bond paving pattern (world-space, top faces only) to a vertex-coloured
 * MeshStandardMaterial. Pure shader patch; geometry and colours stay as authored.
 */
export function patchGroundMaterial(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCozyWorld;\nvarying float vCozyUp;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvCozyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvCozyUp = normalize(mat3(modelMatrix) * objectNormal).y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vCozyWorld;\nvarying float vCozyUp;\nfloat cozyHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        if (vCozyUp > 0.7) {
          vec2 g = vCozyWorld.xz / vec2(0.9, 0.6);
          float row = floor(g.y);
          vec2 q = vec2(g.x + 0.5 * mod(row, 2.0), g.y);
          vec2 f = fract(q);
          vec2 id = floor(q);
          float edge = min(min(f.x, 1.0 - f.x) * 0.9, min(f.y, 1.0 - f.y) * 0.6);
          float grout = smoothstep(0.0, 0.035, edge);
          float n = cozyHash(id);
          diffuseColor.rgb *= mix(0.72, 1.0, grout) * (0.92 + 0.14 * n);
        }`,
      );
  };
  mat.customProgramCacheKey = () => "cozy-ground-v1";
  mat.needsUpdate = true;
}

// --------------------------------------------------------------------------- rain

export class RainField {
  readonly object: THREE.LineSegments;
  private readonly positions: Float32Array;
  private readonly speeds: Float32Array;
  private readonly count: number;
  private readonly material: THREE.LineBasicMaterial;

  constructor(count = 700) {
    this.count = count;
    this.positions = new Float32Array(count * 6);
    this.speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.speeds[i] = 14 + Math.random() * 8;
      this.seed(i, Math.random() * 16);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.LineBasicMaterial({ color: 0xe4f0fa, transparent: true, opacity: 0, depthWrite: false });
    this.object = new THREE.LineSegments(geo, this.material);
    this.object.frustumCulled = false;
    this.object.visible = false;
    this.object.name = "CozyRain";
  }

  private seed(i: number, y: number): void {
    const o = i * 6;
    const x = (Math.random() - 0.5) * 34;
    const z = (Math.random() - 0.5) * 30;
    this.positions[o] = x;
    this.positions[o + 1] = y;
    this.positions[o + 2] = z;
    this.positions[o + 3] = x;
    this.positions[o + 4] = y - 0.45;
    this.positions[o + 5] = z;
  }

  update(dt: number, amount: number, wind: number, centerX: number, centerZ: number, budget: number): void {
    const visible = amount > 0.02;
    this.object.visible = visible;
    if (!visible) return;
    this.material.opacity = 0.75 * amount;
    this.object.position.set(centerX, 0, centerZ);
    const active = Math.min(this.count, Math.round(budget * amount));
    const slant = 0.35 * wind;
    for (let i = 0; i < this.count; i++) {
      const o = i * 6;
      if (i >= active) {
        this.positions[o + 1] = -50;
        this.positions[o + 4] = -50;
        continue;
      }
      const fall = this.speeds[i]! * dt;
      const pos = this.positions;
      pos[o + 1] = pos[o + 1]! - fall;
      pos[o + 4] = pos[o + 4]! - fall;
      pos[o] = pos[o]! + slant * fall;
      this.positions[o + 3] = this.positions[o]! - slant * 0.45;
      if (this.positions[o + 4]! < -0.6) this.seed(i, 12 + Math.random() * 4);
    }
    (this.object.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.object.geometry.dispose();
    this.material.dispose();
  }
}

// --------------------------------------------------------------------------- lamps

/** A small pool of point lights assigned to the lamps nearest the player at night. */
export class LampLights {
  readonly lights: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene, pool = 6) {
    for (let i = 0; i < pool; i++) {
      const l = new THREE.PointLight(0xffc977, 0, 9, 1.6);
      l.castShadow = false;
      l.visible = false;
      scene.add(l);
      this.lights.push(l);
    }
  }

  update(
    lamps: readonly THREE.Object3D[],
    glowMaterials: readonly THREE.MeshStandardMaterial[],
    glow: number,
    budget: number,
    px: number,
    pz: number,
  ): void {
    for (const m of glowMaterials) m.emissiveIntensity = 0.15 + glow * 2.6;
    const on = glow > 0.05 && budget > 0;
    const nearest = on
      ? [...lamps].sort((a, b) => Math.hypot(a.position.x - px, a.position.z - pz) - Math.hypot(b.position.x - px, b.position.z - pz))
      : [];
    this.lights.forEach((l, i) => {
      const lamp = i < budget ? nearest[i] : undefined;
      l.visible = !!lamp;
      if (!lamp) return;
      l.position.set(lamp.position.x, 2.0, lamp.position.z);
      l.intensity = 16 * glow;
    });
  }
}

// --------------------------------------------------------------------------- boats

export interface Bobber {
  obj: THREE.Object3D;
  baseY: number;
  baseRotZ: number;
  phase: number;
}

export function updateBobbers(bobbers: readonly Bobber[], elapsed: number, wind: number, reducedMotion: boolean): void {
  if (reducedMotion) return;
  const amp = 0.04 + 0.06 * wind;
  for (const b of bobbers) {
    b.obj.position.y = b.baseY + Math.sin(elapsed * 1.3 + b.phase) * amp;
    b.obj.rotation.z = b.baseRotZ + Math.sin(elapsed * 0.9 + b.phase * 1.7) * (0.03 + 0.05 * wind);
  }
}
