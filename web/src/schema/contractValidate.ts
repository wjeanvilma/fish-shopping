/**
 * Finish 6.0 Phase 2 — Ajv validation for ship/billing/ops contract schemas.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject } from "ajv";
import shipSchema from "../../../shared/schema/ship-catalog.schema.json";
import billingSchema from "../../../shared/schema/billing-contract.schema.json";
import opsSchema from "../../../shared/schema/ops-catalog.schema.json";
import schemaIndexJson from "../../../shared/schema/schema-index.json";

export type ContractDomain = "ship" | "billing" | "ops";

export interface SchemaIndexEntry {
  id: string;
  path: string;
  domain: string;
  $id: string;
}

export interface SchemaIndex {
  schema: string;
  description: string;
  phase: number;
  plan: string;
  schemas: SchemaIndexEntry[];
  schemaMin: number;
  sampleCatalogs: Record<ContractDomain, string[]>;
  ajvOptions: { allErrors: boolean; strict: boolean };
}

export const SCHEMA_INDEX = schemaIndexJson as unknown as SchemaIndex;

const ajv = new Ajv2020({
  allErrors: SCHEMA_INDEX.ajvOptions.allErrors,
  strict: SCHEMA_INDEX.ajvOptions.strict,
});

const validateShip = ajv.compile(shipSchema as object);
const validateBilling = ajv.compile(billingSchema as object);
const validateOps = ajv.compile(opsSchema as object);

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return [];
  return errors.map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`.trim());
}

export function validateContract(
  domain: ContractDomain,
  data: unknown,
): { ok: boolean; errors: string[] } {
  const validate =
    domain === "ship" ? validateShip : domain === "billing" ? validateBilling : validateOps;
  const ok = validate(data) === true;
  return { ok, errors: ok ? [] : formatErrors(validate.errors) };
}

export function validateContractFile(
  repoRoot: string,
  domain: ContractDomain,
  relativePath: string,
): { ok: boolean; errors: string[]; path: string } {
  const abs = resolve(repoRoot, relativePath);
  const data = JSON.parse(readFileSync(abs, "utf8"));
  const result = validateContract(domain, data);
  return {
    ok: result.ok,
    path: relativePath,
    errors: result.errors.map((e) => `${relativePath}: ${e}`),
  };
}

export function validateSampleSet(
  repoRoot: string,
  domain: ContractDomain,
  paths: string[] = SCHEMA_INDEX.sampleCatalogs[domain],
): { ok: boolean; validated: number; errors: string[] } {
  const errors: string[] = [];
  let validated = 0;
  for (const path of paths) {
    const result = validateContractFile(repoRoot, domain, path);
    validated += 1;
    if (!result.ok) errors.push(...result.errors);
  }
  return { ok: errors.length === 0, validated, errors };
}

export function measureSchemaFoundations(repoRoot: string): {
  schemaCount: number;
  indexIds: string[];
  ship: { ok: boolean; validated: number; errors: string[] };
  billing: { ok: boolean; validated: number; errors: string[] };
  ops: { ok: boolean; validated: number; errors: string[] };
  allOk: boolean;
} {
  const ship = validateSampleSet(repoRoot, "ship");
  const billing = validateSampleSet(repoRoot, "billing");
  const ops = validateSampleSet(repoRoot, "ops");
  return {
    schemaCount: SCHEMA_INDEX.schemas.length,
    indexIds: SCHEMA_INDEX.schemas.map((s) => s.id).sort(),
    ship,
    billing,
    ops,
    allOk: ship.ok && billing.ok && ops.ok,
  };
}
