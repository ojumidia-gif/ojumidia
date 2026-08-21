import { jsPDF } from "jspdf";

type Authorization = {
  status: string;
  allowPhotos: boolean;
  allowVideos: boolean;
  allowOrganizationName: boolean;
  allowLocation: boolean;
  allowStory: boolean;
  allowPeopleIdentification: boolean;
  allowPortal: boolean;
  allowInstitutional: boolean;
  allowSocial: boolean;
  authorizedByName?: string | null;
  authorizedByRole?: string | null;
  expiresAt?: Date | string | null;
  culturalRestrictions?: string | null;
  notes?: string | null;
};

const scopeLabels: Array<[keyof Pick<Authorization, "allowPhotos" | "allowVideos" | "allowOrganizationName" | "allowLocation" | "allowStory" | "allowPeopleIdentification" | "allowPortal" | "allowInstitutional" | "allowSocial">, string]> = [
  ["allowPhotos", "Fotografias"], ["allowVideos", "Vídeos"], ["allowOrganizationName", "Nome da casa ou comunidade"], ["allowLocation", "Localização"], ["allowStory", "Descrição, história e biografia"], ["allowPeopleIdentification", "Identificação de pessoas"], ["allowPortal", "Portal Ojú"], ["allowInstitutional", "Divulgação institucional da Ojú"], ["allowSocial", "Redes sociais da Ojú"],
];

function clean(value?: string | null) { return value?.trim() || "Não informado"; }

export function downloadAuthorizationTermPdf(input: { termId: number; clientName: string; eventType: string; location?: string | null; deliveredAt?: Date | string | null; authorization: Authorization }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18; const width = 174; let y = 18;
  const write = (text: string, size = 10, bold = false, gap = 5) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); const lines = doc.splitTextToSize(text, width); if (y + lines.length * (size * 0.48) > 278) { doc.addPage(); y = 18; } doc.text(lines, margin, y); y += lines.length * (size * 0.48) + gap; };
  const date = input.deliveredAt ? new Date(input.deliveredAt).toLocaleDateString("pt-BR") : "data registrada na operação privada";
  const expires = input.authorization.expiresAt ? new Date(input.authorization.expiresAt).toLocaleDateString("pt-BR") : "sem prazo determinado";
  const scopes = scopeLabels.filter(([field]) => input.authorization[field]).map(([, label]) => label);
  write("OJÚ MÍDIA", 12, true, 2); write("TERMO DE AUTORIZAÇÃO EDITORIAL", 18, true, 8);
  write(`Referência do termo: OJU-AE-1.0-${input.termId}`, 9, false, 8);
  write("1. Identificação da contratação", 12, true, 3);
  write(`Contratante ou referência: ${clean(input.clientName)}. Serviço/registro: ${clean(input.eventType)}. Local informado: ${clean(input.location)}. A entrega privada foi registrada em ${date}.`, 10, false, 6);
  write("2. Separação entre contratação e curadoria", 12, true, 3);
  write("A contratação remunerou a produção e a entrega privada. Este termo não compra publicação, destaque, posição na Home ou aprovação editorial. A Ojú poderá avaliar o material dentro do escopo autorizado, preservando sua curadoria independente.", 10, false, 6);
  write("3. Escopo específico autorizado", 12, true, 3);
  write(scopes.length ? `A pessoa responsável autoriza exclusivamente: ${scopes.join("; ")}.` : "Nenhum uso público está autorizado neste termo.", 10, false, 6);
  write("4. Responsável e validade", 12, true, 3);
  write(`Responsável que autoriza: ${clean(input.authorization.authorizedByName)}. Função ou vínculo: ${clean(input.authorization.authorizedByRole)}. Situação declarada: ${input.authorization.status}. Validade: ${expires}.`, 10, false, 6);
  write("5. Restrições e condições culturais", 12, true, 3);
  write(clean(input.authorization.culturalRestrictions), 10, false, 6);
  write("6. Revogação e privacidade", 12, true, 3);
  write("A autorização pode ser revista ou revogada nos limites legais e contratuais aplicáveis. Sem autorização válida, ou fora do escopo registrado, o material permanece privado. A Ojú manterá a trilha de autorização e aplicará retirada preventiva do portal quando necessária.", 10, false, 6);
  write("7. Assinatura exclusiva via gov.br", 12, true, 3);
  write("Este PDF deve ser assinado exclusivamente pelo serviço oficial de assinatura eletrônica do gov.br. Após a assinatura, o PDF assinado deve ser devolvido à Ojú Mídia para anexo nesta cobertura. A Ojú não coleta assinatura eletrônica dentro do portal.", 10, false, 6);
  write(`Observações: ${clean(input.authorization.notes)}`, 9, false, 16);
  write("Assinatura do responsável via gov.br: ______________________________________________", 10, false, 8);
  write("Data da assinatura: ____ / ____ / ______", 10, false, 0);
  doc.save(`termo-autorizacao-editorial-oju-${input.termId}.pdf`);
}
