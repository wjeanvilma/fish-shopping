/**
 * Finish 2.0 Phase 27 — Ajv fragment validation for content scaffolds.
 */
import Ajv2020 from "ajv/dist/2020";
import schema from "../../../shared/schema/content-pack.schema.json";
import type { ScaffoldKind } from "../../../shared/tools/content_cli/ids";
import { structuralScaffoldErrors } from "../../../shared/tools/content_cli/validateFragment";

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(schema as object, "content-pack");

const validateSpecies = ajv.compile({ $ref: "content-pack#/properties/species/items" });
const validateQuest = ajv.compile({ $ref: "content-pack#/properties/quests/items" });
const validateHarbor = ajv.compile({ $ref: "content-pack#/properties/harbors/items" });

function ajvErrors(validate: { errors?: Array<{ instancePath?: string; message?: string }> | null }): string[] {
  return (validate.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
  );
}

export function validateScaffoldFragment(
  kind: ScaffoldKind,
  document: Record<string, unknown>,
): string[] {
  const structural = structuralScaffoldErrors(kind, document);
  if (structural.length) return structural;

  const validate =
    kind === "species" ? validateSpecies : kind === "quest" ? validateQuest : validateHarbor;
  const ok = validate(document) as boolean;
  return ok ? [] : ajvErrors(validate);
}
