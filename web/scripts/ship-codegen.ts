/**
 * Finish 6.0 Phase 3 — npm entry for ship catalog codegen.
 *
 *   npm run ship:codegen -- --list
 *   npm run ship:codegen -- --check
 *   npm run ship:codegen -- --write
 */
import { runShipCodegenCli } from "../../shared/tools/ship_codegen/cli";

runShipCodegenCli(process.argv.slice(2));
