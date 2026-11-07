/**
 * Phase 13 (post-1.0) — Android device lifecycle matrix catalog (shared with Kotlin).
 */
import matrixJson from "../../../shared/lifecycle/android-device-matrix.json";

export interface DeviceClass {
  id: string;
  minWidthDp: number;
  maxWidthDp: number;
  orientations: string[];
}

export interface LifecycleScenario {
  id: string;
  title: string;
  trigger: string;
  expects: string[];
  hostHooks: string[];
  phase28Keys: string[];
}

export interface AndroidDeviceMatrix {
  phase: number;
  schema: string;
  phase28Catalog: string;
  packageName: string;
  activity: string;
  deviceClasses: DeviceClass[];
  scenarios: LifecycleScenario[];
  trimMemoryCheckpointFrom: string;
  restoreSlots: string[];
  manualChecklist: string[];
  failCriteria: string[];
}

export const androidDeviceMatrix = matrixJson as unknown as AndroidDeviceMatrix;
export const ANDROID_DEVICE_LIFECYCLE_PHASE = androidDeviceMatrix.phase;
export const ANDROID_DEVICE_LIFECYCLE_SCHEMA = androidDeviceMatrix.schema;

/** ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW */
export const TRIM_MEMORY_CHECKPOINT_FROM = 10;

export function shouldCheckpointForTrimLevel(level: number): boolean {
  return level >= TRIM_MEMORY_CHECKPOINT_FROM;
}

export function deviceClassForWidthDp(widthDp: number): string {
  if (widthDp < 600) return "phone";
  if (widthDp < 840) return "tablet7";
  return "tablet10";
}
