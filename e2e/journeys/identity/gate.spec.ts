import { expect, test } from "@playwright/test";
import { configuredParticipantEmail, PARTICIPANT_EMAIL_MISSING } from "../../lib/journeys/participantEmail";
import { hasPersonaState } from "../../personas";

test.describe("Jornada identidade — OAuth real do participante", () => {
  test("conta Google QA configurada para a jornada da Rede", async () => {
    const email = configuredParticipantEmail();
    test.skip(!email, PARTICIPANT_EMAIL_MISSING);
    expect(email).toBe("jihadfotografia@gmail.com");
    if (!hasPersonaState("professional")) {
      test.info().annotations.push({
        type: "note",
        description:
          "professional.json ausente após o run: a identidade OAuth é provada em e2e/rede.journey.spec.ts (users + auth.me + grant). Cleanup do ledger remove o user criado. Não tratar este skip como PASS da cadeia OAuth.",
      });
    }
    expect(email).toBeTruthy();
  });
});
