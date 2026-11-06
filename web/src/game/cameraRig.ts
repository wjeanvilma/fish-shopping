/**
 * Fixed-rotation follow camera, identical to the Android CameraRig.kt. The camera sits
 * behind the player on -z looking toward +z, so screen right = world -x, screen up = world +z.
 */
export const CameraRig = {
  HEIGHT_M: 13,
  BACK_M: 11,
  LOOK_AHEAD_M: 1,
  FOV_DEGREES: 45,
  screenToWorld(screenX: number, screenY: number): [number, number] {
    return [-screenX, -screenY];
  },
} as const;
