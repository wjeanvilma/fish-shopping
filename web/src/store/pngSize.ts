/**
 * Minimal PNG IHDR reader (no deps) for screenshot size validation.
 */
import { readFileSync } from "node:fs";

export const PNG = {
  size(path: string): { width: number; height: number } {
    const buf = readFileSync(path);
    if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") {
      throw new Error(`not a PNG: ${path}`);
    }
    // IHDR: 8 signature + 4 length + 4 "IHDR" + 4 width + 4 height
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  },
};
