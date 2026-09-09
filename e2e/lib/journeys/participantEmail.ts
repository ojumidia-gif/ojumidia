export const PARTICIPANT_EMAIL_MISSING =
  "FRONTEIRA EXTERNA: E2E_QA_PARTICIPANT_EMAIL ausente em .env.qa. Sem conta Google QA do participante o robô não autentica essa persona. Não usa @example.com. Não fabrica OAuth.";

export function configuredParticipantEmail(): string | null {
  const email = process.env.E2E_QA_PARTICIPANT_EMAIL?.trim().toLowerCase();
  if (!email) return null;
  if (/@example\.(com|invalid)$/i.test(email)) return null;
  return email;
}

export function isGoogleQaParticipantEmail(email: string) {
  return Boolean(email) && !/@example\.(com|invalid)$/i.test(email);
}
