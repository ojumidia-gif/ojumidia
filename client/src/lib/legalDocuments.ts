import { OJU_CONTACT_EMAIL, OJU_WHATSAPP_LABEL } from "./publicNav";

export const LEGAL_UPDATED_AT = "6 de setembro de 2026";

export const requiredLegalLinks = [
  { label: "Termos de uso", href: "/termos-de-uso" },
  { label: "Privacidade e LGPD", href: "/privacidade" },
  { label: "Cuidado e consentimento", href: "/cuidado-e-consentimento" },
] as const;

export type LegalKind = "terms" | "privacy";

export type LegalDocument = {
  kind: LegalKind;
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
};

export const legalDocuments: Record<LegalKind, LegalDocument> = {
  terms: {
    kind: "terms",
    href: "/termos-de-uso",
    eyebrow: "Termos de uso",
    title: "Como este site pode ser usado.",
    description: "Estes termos regem o uso do portal público da Ojú Mídia e dos formulários de contato, planejamento e cuidado. O Centro Administrativo tem regras próprias de acesso, responsabilidade e auditoria.",
    sections: [
      {
        title: "Quem somos",
        paragraphs: [
          "A Ojú Mídia documenta culturas afro-brasileiras, religiosidades de matriz africana e os territórios que as sustentam — com contexto, crédito e autorização. O sagrado só entra no portal quando a casa autoriza.",
          "Contato institucional: e-mail " + OJU_CONTACT_EMAIL + " e WhatsApp " + OJU_WHATSAPP_LABEL + ".",
        ],
      },
      {
        title: "O que o portal oferece",
        paragraphs: [
          "O site público reúne histórias, coberturas, documentários, projetos, fotografia documental, territórios, fotógrafos, instituições, agenda e memórias que receberam autorização editorial para circular.",
          "Publicar no portal não coloca o conteúdo na vitrine da Home. A Home nacional é curadoria do Super Admin.",
          "Espaços identificados como divulgação contratada não fazem parte da curadoria documental.",
        ],
      },
      {
        title: "Uso permitido",
        paragraphs: [
          "Você pode navegar, ler, assistir e compartilhar links públicos do portal para fins pessoais, educativos ou de divulgação da memória autorizada, sempre com crédito visível quando houver.",
          "É proibido copiar, revender, reutilizar em campanha, treinar sistemas automáticos ou republicar imagens, áudios e textos sem licença. Pedidos de uso passam por /licenciar-midia.",
          "É proibido tentar acessar o Centro Administrativo sem autorização, alterar dados de terceiros, burlar consentimento, expor localização ou contato que a casa marcou como privado, ou usar o canal de cuidado para emergência médica ou policial.",
        ],
      },
      {
        title: "Conteúdo, crédito e autorização",
        paragraphs: [
          "Cada publicação pública depende de autorização da casa, da pessoa ou da contratante, conforme o caso. Autorização pode ser revista, reduzida ou revogada nos termos combinados.",
          "Créditos de fotografia, equipe e território fazem parte do registro. Removê-los ao republicar é uso indevido.",
          "Materiais comerciais, termos assinados e arquivos restritos não pertencem ao acervo público.",
        ],
      },
      {
        title: "Formulários públicos",
        paragraphs: [
          "Pedidos de planejamento, cobertura, contato, licenciamento, apoio à memória e cuidado documental são solicitações. Não criam contrato automaticamente nem publicam nada no portal.",
          "Informações enviadas devem ser verdadeiras no que for possível. Não envie dados de terceiros sem base legítima para isso.",
        ],
      },
      {
        title: "Contas administrativas",
        paragraphs: [
          "Administradores só operam a própria carteira. Ninguém altera o conteúdo de outro admin. O Super Admin governa o site, a Home, o catálogo nacional e a lixeira.",
          "Papel de administrador comum exige termo de responsabilidade assinado via gov.br. Sessões, auditoria e documentos privados seguem as regras internas da Ojú.",
        ],
      },
      {
        title: "Limitação",
        paragraphs: [
          "O portal pode ficar indisponível por manutenção, falha de rede ou decisão editorial. Conteúdo publicado pode ser despublicado quando a autorização acabar ou a segurança da casa exigir.",
          "A Ojú não é serviço de emergência. Em risco imediato, procure canais públicos de emergência e uma rede local de confiança.",
        ],
      },
      {
        title: "Alterações",
        paragraphs: [
          "Estes termos podem ser atualizados. A data no topo da página vale como referência. O uso continuado do site após a atualização implica ciência da versão vigente.",
        ],
      },
    ],
  },
  privacy: {
    kind: "privacy",
    href: "/privacidade",
    eyebrow: "Privacidade e LGPD",
    title: "Como tratamos dados pessoais.",
    description: "Este aviso descreve o tratamento de dados pessoais no portal e nos formulários da Ojú Mídia, nos termos da Lei nº 13.709/2018 (LGPD). Não substitui contratos, termos de autorização ou o termo de responsabilidade de administradores.",
    sections: [
      {
        title: "Controladora e contato",
        paragraphs: [
          "A controladora é a Ojú Mídia. Pedidos de titular, dúvidas e exercício de direitos: " + OJU_CONTACT_EMAIL + ". WhatsApp institucional: " + OJU_WHATSAPP_LABEL + ".",
          "O encarregado pelo tratamento (art. 41 da LGPD) recebe comunicações no mesmo e-mail institucional, com o assunto “LGPD”.",
        ],
      },
      {
        title: "Quais dados coletamos",
        paragraphs: [
          "Navegação pública: dados técnicos mínimos para exibir o site (por exemplo endereço IP em registros de servidor). Não usamos publicidade comportamental no portal.",
          "Formulários: nome, contato, e-mail, WhatsApp, território informado, contexto da história, tipo de pedido e mensagens que você escreveu. No canal de cuidado, também o tipo de solicitação e o protocolo de acompanhamento.",
          "Contratação e produção: dados necessários à proposta, entrega, autorização editorial, créditos e, quando couber, documentos assinados via gov.br.",
          "Centro Administrativo: identificação da conta autorizada, papel, trilha de auditoria, mídias enviadas e conteúdos criados pela própria pessoa.",
        ],
      },
      {
        title: "Para que usamos e com qual base legal",
        paragraphs: [
          "Responder pedidos de planejamento, cobertura, contato e licenciamento: execução de diligências pré-contratuais ou contrato, e consentimento quando você marca a autorização no formulário.",
          "Cuidado documental e acolhimento reservado: consentimento e, quando aplicável, proteção da vida ou da incolumidade, sem transformar o canal em emergência pública.",
          "Publicar memória autorizada: consentimento da casa ou da pessoa e obrigação de crédito/contexto.",
          "Segurança, auditoria, prevenção a abuso e cumprimento de dever legal: legítimo interesse e obrigação legal, na medida necessária.",
          "Sessão de administradores: execução da relação de trabalho ou colaboração e segurança da operação.",
        ],
      },
      {
        title: "Consentimento, visibilidade e o sagrado",
        paragraphs: [
          "Localização, contato e imagens de casas, celebrações e pessoas só entram no mapa ou no portal no nível de visibilidade escolhido e autorizado.",
          "Você pode pedir revisão, restrição ou retirada do que foi publicado com base na sua autorização. Pedidos passam pelo canal de cuidado ou pelo e-mail institucional.",
          "A Ojú não usa nomes, pontos ou cantos sagrados como enfeite de interface. Material sagrado só circula com autorização expressa da casa.",
        ],
      },
      {
        title: "Compartilhamento",
        paragraphs: [
          "Não vendemos dados pessoais.",
          "Podemos compartilhar com a equipe autorizada da Ojú, Parceiros Ojú no território do pedido, prestadores de hospedagem, armazenamento de mídia e autenticação, e autoridades quando a lei exigir.",
          "Arquivos e termos comerciais restritos não são públicos. Administradores comuns não acessam a carteira de outro admin.",
        ],
      },
      {
        title: "Armazenamento, cookies e retenção",
        paragraphs: [
          "Mídias e dados operacionais ficam em infraestrutura de nuvem contratada. Isso pode envolver tratamento fora do Brasil, com salvaguardas contratuais dos provedores.",
          "Cookies e armazenamentos locais do portal público são técnicos (por exemplo preferência de som do miniclipe). O login administrativo usa cookie de sessão. Não há painel de anúncios baseado em rastreio no site público.",
          "Pedidos comerciais e de cuidado permanecem o tempo necessário para atendimento, obrigação legal, defesa de direitos e segurança da casa. Conteúdo publicado permanece enquanto a autorização e a curadoria permitirem. Lixeiras internas têm prazos próprios definidos pelo Super Admin.",
        ],
      },
      {
        title: "Seus direitos",
        paragraphs: [
          "Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade quando couber, informação sobre compartilhamentos, revogação do consentimento e revisão de decisões automatizadas, se existirem.",
          "A Ojú pode pedir confirmação de identidade e recusar pedidos que exponham terceiros, violem sigilo de outra casa ou prejudiquem segurança.",
          "Também é possível reclamar à Autoridade Nacional de Proteção de Dados (ANPD).",
        ],
      },
      {
        title: "Crianças, adolescentes e segurança",
        paragraphs: [
          "Formulários públicos não se destinam a cadastro autônomo de crianças. Dados de menores só devem ser enviados por responsável ou com base adequada.",
          "Em incidente de segurança que possa gerar risco relevante, a Ojú comunicará os envolvidos e, quando a LGPD exigir, a ANPD.",
        ],
      },
    ],
  },
};

export function mergeLegalFooterItems(items: Array<{ label: string; href?: string }>) {
  const seen = new Set(items.map(item => item.href).filter(Boolean));
  const extra = requiredLegalLinks.filter(item => !seen.has(item.href));
  return [...items.filter(item => item.href), ...extra];
}
