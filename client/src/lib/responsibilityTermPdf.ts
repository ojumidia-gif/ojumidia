import { jsPDF } from "jspdf";

function clean(value?: string | null) { return value?.trim() || "Não informado"; }

export function downloadResponsibilityTermPdf(input: { termId: number; administratorName?: string | null; administratorEmail: string; note?: string | null }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18; const width = 174; let y = 18;
  const write = (text: string, size = 10, bold = false, gap = 5) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); const lines = doc.splitTextToSize(text, width); if (y + lines.length * (size * 0.48) > 278) { doc.addPage(); y = 18; } doc.text(lines, margin, y); y += lines.length * (size * 0.48) + gap; };

  write("OJÚ MÍDIA", 12, true, 2); write("TERMO DE RESPONSABILIDADE — CRIADOR PARCEIRO OJÚ", 16, true, 8);
  write(`Referência do termo: OJU-AR-1.0-${input.termId}`, 9, false, 8);
  write("1. Identificação", 12, true, 3);
  write(`Criador(a) parceiro(a): ${clean(input.administratorName)}. Conta Google autorizada: ${input.administratorEmail}. Observação de escopo: ${clean(input.note)}.`, 10, false, 6);
  write("2. Natureza da função", 12, true, 3);
  write("O acesso de criador parceiro é uma confiança individual e revogável. Ele não transfere propriedade da marca Ojú Mídia, do acervo, das relações institucionais, das credenciais, dos dados pessoais ou das decisões de governança da Equipe Ojú.", 10, false, 6);
  write("3. Responsabilidade editorial, cultural e de privacidade", 12, true, 3);
  write("O(a) criador(a) parceiro(a) compromete-se a respeitar o ciclo editorial, os consentimentos registrados, as restrições culturais, os direitos de imagem e os limites de acesso da própria carteira. Nenhuma contratação torna uma publicação automaticamente pública; materiais privados só podem seguir para curadoria quando houver autorização editorial válida e específica.", 10, false, 6);
  write("4. Dados, documentos e armazenamento", 12, true, 3);
  write("Documentos contratuais, termos assinados e mídias restritas são confidenciais. Devem permanecer nos fluxos protegidos da Ojú, sem cópias, compartilhamentos, downloads ou uso externo não autorizado. Qualquer incidente, acesso indevido ou pedido de revogação deve ser comunicado imediatamente à Equipe Ojú.", 10, false, 6);
  write("5. Carteira e divisão de receita", 12, true, 3);
  write("Cada fechamento deve ser registrado e vinculado à carteira responsável. Salvo porcentagem diferente formalizada em contrato, a distribuição padrão é 70% para o(a) criador(a) parceiro(a) responsável pela captação ou gestão e 30% para a Ojú Mídia como taxa de operação, infraestrutura, curadoria e manutenção. Valores, repasses e exceções ficam sujeitos à conferência e registro contratual.", 10, false, 6);
  write("6. Conduta e integridade", 12, true, 3);
  write("É vedado assumir obrigações em nome da Ojú sem registro e aprovação cabível, omitir receitas, alterar consentimentos, publicar fora do fluxo, utilizar o nome da Ojú em proveito próprio ou causar dano à comunidade, aos contratantes, às pessoas retratadas ou à marca. O acesso pode ser suspenso ou revogado a qualquer tempo diante de risco, descumprimento ou necessidade de proteção.", 10, false, 6);
  write("7. Assinatura exclusiva via gov.br", 12, true, 3);
  write("Este PDF deve ser assinado exclusivamente pelo serviço oficial de assinatura eletrônica do gov.br. Após a assinatura, o PDF assinado deve ser entregue à Equipe Ojú para anexo no painel interno. A Ojú não coleta assinatura eletrônica dentro do portal.", 10, false, 14);
  write("Assinatura do(a) criador(a) parceiro(a) via gov.br: __________________________________________", 10, false, 8);
  write("Data da assinatura: ____ / ____ / ______", 10, false, 0);
  doc.save(`termo-responsabilidade-administrativa-oju-${input.termId}.pdf`);
}
