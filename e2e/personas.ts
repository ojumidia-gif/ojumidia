import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { COOKIE_NAME } from "../shared/const";

export const personaStateFiles = {
  superAdmin: "e2e/.auth/super-admin.json",
  professional: "e2e/.auth/professional.json",
  territorialAdmin: "e2e/.auth/territorial-admin.json",
  professionalNoTerritory: "e2e/.auth/professional-no-territory.json",
} as const;

/** Captura futura: contas de QA controladas, nunca conta pessoal de operação. */

export type PersonaId = keyof typeof personaStateFiles;

export function personaStatePath(persona: PersonaId) {
  return path.resolve(personaStateFiles[persona]);
}

export function hasPersonaState(persona: PersonaId) {
  const file = personaStatePath(persona);
  if (!existsSync(file)) return false;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { cookies?: Array<{ name?: string }> };
    return (parsed.cookies || []).some(cookie => cookie.name === COOKIE_NAME);
  } catch {
    return false;
  }
}
