import { siteDestinations } from "./siteDestinations";

export type OjuBotFaq = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  href?: string;
};

export const ojuBotFaqs: OjuBotFaq[] = [
  {
    id: "publicar-historia",
    question: "Como publico uma história no site?",
    answer: "Novo → tipo e título. Três passos: texto, cidade e capa. Publicar no site. Não entra sozinho na Home.",
    tags: ["história", "publicar", "criar", "site"],
    href: "/admin/publicacoes?tipo=História&novo=1",
  },
  {
    id: "cobertura",
    question: "Como publico uma cobertura?",
    answer: "Novo → Cobertura. Ligue a cidade e as fotos. Marque a capa. Publicar no site. Aparece em /coberturas.",
    tags: ["cobertura", "foto", "publicar"],
    href: "/admin/publicacoes?tipo=Cobertura&novo=1",
  },
  {
    id: "home",
    question: "Por que não aparece na Home?",
    answer: "Publicar no site e aparecer na Home são coisas diferentes. A Equipe Ojú escolhe a vitrine nacional. O conteúdo publicado já está no endereço público.",
    tags: ["home", "destaque", "vitrine", "site"],
    href: "/admin/guia",
  },
  {
    id: "o-que-falta",
    question: "O que falta para publicar?",
    answer: "Em geral: texto, cidade de atuação e foto de capa. Crédito e subtítulo vêm depois, já no ar.",
    tags: ["falta", "capa", "território", "texto", "publicar"],
  },
  {
    id: "territorio",
    question: "Como cadastro uma cidade de atuação?",
    answer: "Cidades → estado e município. Se não estiver na lista, Outro. Depois ligue nas publicações. O mapa só com autorização da casa.",
    tags: ["cidade", "território", "mapa", "lugar"],
    href: "/admin/territorios",
  },
  {
    id: "carteira",
    question: "Posso editar o conteúdo de outro parceiro?",
    answer: "Não. Cada criador parceiro só vê e altera o que criou. Cidade do catálogo nacional dá para ligar, não para mudar. A Home e o site inteiro ficam com a Equipe Ojú.",
    tags: ["admin", "parceiro", "editar", "outro", "meu", "carteira"],
  },
  {
    id: "fotografo",
    question: "Como publico um fotógrafo?",
    answer: "Fotógrafos → nome e apresentação. Cadastrar e publicar. O crédito na foto do Acervo vale mesmo sem ficha pública.",
    tags: ["fotógrafo", "ficha", "crédito"],
    href: "/admin/fotografos",
  },
  {
    id: "acervo",
    question: "Como envio foto para o conteúdo?",
    answer: "Acervo: envie com crédito. Na edição do conteúdo, ligue a foto e marque a capa. O site só mostra o que está em matéria publicada.",
    tags: ["acervo", "mídia", "foto", "vídeo", "capa"],
    href: "/admin/midias",
  },
  {
    id: "comunidade",
    question: "Como publico casa, agenda ou memória?",
    answer: "Comunidade: nome + consentimento. No card, Autorizar e publicar ou Publicar no site. Sem consentimento não vai ao portal.",
    tags: ["casa", "instituição", "agenda", "memória", "consentimento"],
    href: "/admin/comunidade",
  },
  {
    id: "lixeira",
    question: "Como excluo uma publicação de vez?",
    answer: "Essa exclusão definitiva fica com a Equipe Ojú. Você publica e edita o que criou; a lixeira nacional não é do criador parceiro.",
    tags: ["lixeira", "excluir", "apagar", "definitivo"],
  },
  {
    id: "miniclipe",
    question: "Miniclipe vai para a Home?",
    answer: "O miniclipe da contratação liga-se ao pedido. A sequência da Home nacional fica com a Equipe Ojú.",
    tags: ["miniclipe", "home", "vídeo", "contratação"],
    href: "/admin/miniclipes",
  },
  {
    id: "parceiro",
    question: "Como alguém vira Parceiro Ojú?",
    answer: "Pelo site público em Ser parceiro. O pedido não cria login. A Equipe Ojú conversa, convite Google e termo gov.br quando couber. Quem não produz pode perder o acesso; o painel mostra o pulso, sem corte automático.",
    tags: ["parceiro", "candidatura", "admin", "convite", "banir"],
    href: "/admin/candidaturas",
  },
  {
    id: "lgpd",
    question: "Onde estão os termos e a LGPD?",
    answer: "No rodapé: Termos de uso e Privacidade e LGPD. Formulários públicos só usam seus dados para responder o pedido.",
    tags: ["lgpd", "privacidade", "termos", "dados", "lei"],
    href: "/privacidade",
  },
  ...siteDestinations.map(dest => ({
    id: `fluxo-${dest.id}`,
    question: `Fluxo de ${dest.label}`,
    answer: `${dest.how} ${dest.steps.map((step, index) => `${index + 1}. ${step}`).join(" ")}`,
    tags: [dest.label.toLowerCase(), dest.id, "fluxo", "guia"],
    href: dest.adminHref,
  })),
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function matchOjuBotFaqs(query: string, limit = 6) {
  const needle = normalize(query.trim());
  if (!needle) return ojuBotFaqs.slice(0, limit);
  const scored = ojuBotFaqs.map(faq => {
    const hay = normalize([faq.question, faq.answer, ...faq.tags].join(" "));
    const words = needle.split(/\s+/).filter(Boolean);
    const hits = words.filter(word => hay.includes(word)).length;
    return { faq, hits };
  });
  const matched = scored.filter(item => item.hits > 0).sort((a, b) => b.hits - a.hits);
  return matched.slice(0, limit).map(item => item.faq);
}

export function makeDeskErrorCode() {
  return `OJU-${Date.now().toString(36).toUpperCase()}`;
}
