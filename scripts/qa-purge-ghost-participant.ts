import { playwrightQaWebServerEnv } from "../e2e/lib/qaPlaywrightEnv";

Object.assign(process.env, playwrightQaWebServerEnv());

const { purgeQaParticipantUserByEmail } = await import("../e2e/lib/redeJourneyCleanup");

const email = process.env.E2E_QA_PARTICIPANT_EMAIL?.trim().toLowerCase();
if (!email) {
  console.error("ABORTADO: E2E_QA_PARTICIPANT_EMAIL ausente");
  process.exit(1);
}

const result = await purgeQaParticipantUserByEmail(email);
if (!result.ok) {
  console.error("FAIL cleanup participante:", result.reason);
  process.exit(1);
}
console.log(result.purged ? "ghost participant user purged by ledger id" : "no leftover participant user");
process.exit(0);
