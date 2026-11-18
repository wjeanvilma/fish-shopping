/**
 * Finish 2.0 Phase 27 + Finish 3.0 Phase 28 + Finish 4.0 Phase 28 —
 * Ajv fragment validation for content scaffolds.
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
const validateContract = ajv.compile({
  $ref: "content-pack#/properties/contracts/properties/templates/items",
});
const validateBait = ajv.compile({ $ref: "content-pack#/properties/bait/items" });
const validateDecor = ajv.compile({
  $ref: "content-pack#/properties/decor/properties/items/items",
});
const validateMachine = ajv.compile({ $ref: "content-pack#/properties/machines/items" });
const validateRival = ajv.compile({
  $ref: "content-pack#/properties/rivalMarkets/properties/rivals/items",
});

function ajvErrors(validate: { errors?: Array<{ instancePath?: string; message?: string }> | null }): string[] {
  return (validate.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
  );
}

function validatorFor(kind: ScaffoldKind) {
  switch (kind) {
    case "species":
      return validateSpecies;
    case "quest":
      return validateQuest;
    case "harbor":
      return validateHarbor;
    case "contract":
      return validateContract;
    case "bait":
      return validateBait;
    case "decor":
      return validateDecor;
    case "machine":
      return validateMachine;
    case "rival":
      return validateRival;
  }
}

export function validateScaffoldFragment(
  kind: ScaffoldKind,
  document: Record<string, unknown>,
): string[] {
  const structural = structuralScaffoldErrors(kind, document);
  if (structural.length) return structural;

  const validate = validatorFor(kind);
  const ok = validate(document) as boolean;
  return ok ? [] : ajvErrors(validate);
}
