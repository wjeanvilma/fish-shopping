/**
 * Fixed-rotation follow camera, identical to the Android CameraRig.kt. The camera sits
 * behind the player on -z looking toward +z, so screen right = world -x, screen up = world +z.
 */
function hypot3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export const CameraRig = {
  HEIGHT_M: 13,
  BACK_M: 11,
  LOOK_AHEAD_M: 1,
  FOV_DEGREES: 45,
  screenToWorld(screenX: number, screenY: number): [number, number] {
    return [-screenX, -screenY];
  },

  /**
   * Ray from the follow camera through NDC onto the y=0 ground plane.
   * ndcX ∈ [-1,1] right, ndcY ∈ [-1,1] up (DOM y-down must be flipped by the caller).
   * Returns millimetres, or null if the ray misses the ground.
   */
  groundFromNdc(
    ndcX: number,
    ndcY: number,
    aspect: number,
    playerXMm: number,
    playerZMm: number,
  ): { xMm: number; zMm: number } | null {
    const px = playerXMm / 1000;
    const pz = playerZMm / 1000;
    const eyeX = px;
    const eyeY = CameraRig.HEIGHT_M;
    const eyeZ = pz - CameraRig.BACK_M;
    const targetX = px;
    const targetY = 0;
    const targetZ = pz + CameraRig.LOOK_AHEAD_M;

    let czX = eyeX - targetX;
    let czY = eyeY - targetY;
    let czZ = eyeZ - targetZ;
    const czLen = hypot3(czX, czY, czZ);
    if (czLen < 1e-8) return null;
    czX /= czLen; czY /= czLen; czZ /= czLen;

    let cxX = czZ;
    let cxY = 0;
    let cxZ = -czX;
    const cxLen = hypot3(cxX, cxY, cxZ);
    if (cxLen < 1e-8) return null;
    cxX /= cxLen; cxY /= cxLen; cxZ /= cxLen;

    const cyX = czY * cxZ - czZ * cxY;
    const cyY = czZ * cxX - czX * cxZ;
    const cyZ = czX * cxY - czY * cxX;

    const tanHalf = Math.tan((CameraRig.FOV_DEGREES * Math.PI) / 180 / 2);
    let dx = ndcX * aspect * tanHalf;
    let dy = ndcY * tanHalf;
    let dz = -1;
    const dLen = hypot3(dx, dy, dz);
    dx /= dLen; dy /= dLen; dz /= dLen;

    const dirX = cxX * dx + cyX * dy + czX * dz;
    const dirY = cxY * dx + cyY * dy + czY * dz;
    const dirZ = cxZ * dx + cyZ * dy + czZ * dz;

    if (Math.abs(dirY) < 1e-8) return null;
    const t = -eyeY / dirY;
    if (t <= 0) return null;
    return {
      xMm: Math.round((eyeX + t * dirX) * 1000),
      zMm: Math.round((eyeZ + t * dirZ) * 1000),
    };
  },
} as const;
