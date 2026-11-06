/**
 * Simple animated water material for the blockout Water slab (no UVs required —
 * waves are driven from world XZ). Presentation only.
 */
import * as THREE from "three";

const VERT = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSparkle;
varying vec3 vWorldPos;
void main() {
  float w1 = sin(vWorldPos.x * 0.35 + uTime * 1.1);
  float w2 = sin(vWorldPos.z * 0.28 - uTime * 0.85);
  float w3 = sin((vWorldPos.x + vWorldPos.z) * 0.55 + uTime * 1.7);
  float mixW = 0.5 + 0.5 * (0.55 * w1 + 0.30 * w2 + 0.15 * w3);
  vec3 col = mix(uDeep, uShallow, mixW);
  float spark = smoothstep(0.82, 1.0, 0.5 + 0.5 * w3);
  col += uSparkle * spark * 0.35;
  gl_FragColor = vec4(col, 0.92);
}
`;

export function createWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#1a5f7a") },
      uShallow: { value: new THREE.Color("#3a9fc4") },
      uSparkle: { value: new THREE.Color("#cfefff") },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
}
