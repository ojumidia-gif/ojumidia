# Jornada comercial e privacidade editorial — Ojú Mídia

## Princípio operacional

Uma contratação e uma publicação editorial são objetos diferentes. A solicitação, a proposta, os valores, o contrato, a entrega privada e a autorização editorial são administrados na **carteira comercial**. Somente depois de uma autorização editorial expressa o material contratado pode percorrer o ciclo público da Ojú Mídia.

> **Regra central:** a entrega ao contratante não é uma autorização automática de divulgação, reaproveitamento editorial ou publicação no portal.

## Fluxo de trabalho

| Etapa | Espaço de operação | Registro principal | Resultado esperado |
|---|---|---|---|
| Solicitação | Formulário público | Contexto, formato, data, local, contato e necessidade | Demanda recebida sem preço ou pacote fixo. |
| Em análise e conversa | Carteira comercial | Responsável pela carteira, observações internas e alinhamento | Demanda qualificada e responsável definido. |
| Orçamento e proposta | Carteira comercial | Resumo da proposta, valor e data de envio | Proposta personalizada para a necessidade do contratante. |
| Aceite e contratação | Carteira comercial e Contratos | Data de aceite, contrato, contratante e situação da assinatura | Escopo formalizado para produção. |
| Produção | Carteira comercial e Editorial | Início da produção, equipe, mídias, direitos e relações documentais | Material produzido dentro do escopo acordado. |
| Entrega privada | Carteira comercial | Data, detalhes e link privado de entrega | Material entregue ao contratante sem exposição pública. |
| Autorização editorial opcional | Carteira comercial | `editorialAuthorized` e data de autorização | Permissão expressa para avaliar uso no acervo público. |
| Publicação editorial | Centro Administrativo | Rascunho → Em revisão → Aprovada → Publicada → Arquivada | Conteúdo disponibilizado somente após autorização e aprovação editorial. |

## Barreiras de privacidade implementadas

| Situação do material | Home, busca, fotografia documental e página pública | Centro Administrativo |
|---|---|---|
| Cobertura editorial independente publicada | Pode aparecer conforme a curadoria. | Segue o fluxo editorial normal. |
| Cobertura vinculada a contratação sem autorização editorial | Não aparece, mesmo que esteja marcada como Publicada internamente. | Exibe aviso de guarda privada e bloqueia publicação/republicação. |
| Cobertura vinculada com autorização editorial expressa | Pode aparecer após aprovação e publicação editorial. | Exibe a confirmação e a data da autorização. |
| Entrega, proposta, contrato, link privado e valor | Nunca são retornados nos endpoints públicos. | Visíveis somente na carteira comercial autorizada. |

## Controles técnicos de segurança

As consultas públicas de destaque, busca, fotografia documental e leitura por endereço verificam simultaneamente o status **Publicada**, a flag de visibilidade pública e, quando houver vínculo comercial, a autorização editorial vigente. A busca pública não aceita mais nenhum parâmetro que libere rascunhos ou conteúdos não publicados.

Quando uma publicação já pública é vinculada a uma contratação ainda sem autorização editorial, ela é retirada do portal imediatamente e o histórico editorial registra o motivo. A publicação ou republicação fica bloqueada até que a autorização seja registrada na carteira comercial.

As respostas públicas incluem, quando aplicável, apenas um indicador seguro de que o material contratado foi autorizado editorialmente. Elas não expõem identificador de solicitação, contato, proposta, valores, contrato, entrega ou link privado.

## Trilha operacional privada

Cada contratação possui uma trilha cronológica, acessível apenas na carteira comercial do responsável ou do administrador principal. A trilha é criada desde a solicitação pública e registra a distribuição de carteira, as mudanças de etapa, a atualização de proposta, o registro do contrato, a entrega privada e qualquer concessão ou retirada de autorização editorial.

| Evento | Exemplo de registro | Visibilidade |
|---|---|---|
| Solicitação | Solicitação pública recebida e aguardando análise | Centro Administrativo autorizado |
| Carteira | Responsável atribuído, removido ou alterado | Centro Administrativo autorizado |
| Status | Mudança entre Solicitação, Conversa, Proposta, Produção ou Entrega | Centro Administrativo autorizado |
| Proposta | Escopo ou valor alterado | Centro Administrativo autorizado |
| Contrato | Registro de contrato criado ou atualizado | Centro Administrativo autorizado |
| Entrega privada | Entrega confirmada ou dados de acesso ajustados | Centro Administrativo autorizado |
| Autorização editorial | Permissão expressa concedida ou retirada | Centro Administrativo autorizado |

O portal não possui endpoint para consultar essa trilha. Além disso, as respostas preparadas para o portal removem o vínculo interno de contratação antes de serem devolvidas ao navegador.

## Operação recomendada

Antes de marcar uma Cobertura como pública, a equipe deve confirmar que o aceite comercial e os direitos de mídia estão registrados. Se o contratante autorizar o reaproveitamento, o administrador responsável registra a autorização na carteira comercial. Em seguida, o conteúdo continua o ciclo editorial regular, com revisão, aprovação, curadoria e identificação de divulgação contratada quando aplicável.
