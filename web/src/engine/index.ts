/** Public surface of the pure TypeScript engine (no React, no Three.js). */
export * from "./foundations";
export * from "./content";
export * from "./inventory";
export * from "./state";
export * from "./simulation";
export * from "./view";
export * from "./snapshot";
export { UpgradeSystem, ProductionSystem, FishingSystem, isOpen, PLAYER_RADIUS_MM } from "./systems";
