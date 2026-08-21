# Auditoria Cirúrgica Multiadmin, Parceiros e Territórios — V2

**Situação:** correções técnicas principais aplicadas; pendências operacionais e contratuais registradas.  
**Escopo:** arquitetura de parceiros, autoridade, território, mídia, comercial, finanças, Home e isolamento transversal.  
**Regra de leitura:** um critério não é considerado atendido por existir somente na interface; requer evidência no servidor, no esquema de dados, em uma rota/procedure e em regressão automatizada.

## Critério de aprovação

Uma capacidade será classificada como **Atendida** somente quando houver evidência de quatro camadas: a estrutura de dados preserva o fato, o backend bloqueia operações indevidas, a interface não induz a operação errada e existe teste que protege a regra. **Parcial** significa que uma ou mais camadas ainda estão ausentes. **Não implementada** significa que a entidade ou o fluxo ainda não existe.

| ID | Critério cirúrgico | Evidência mínima exigida | Estado inicial |
|---|---|---|---|
| A1 | Hierarquia de autoridade | O parceiro não altera o próprio papel, membro, parceiro ou território; o Super Admin é o único gestor dessas associações. | Em auditoria |
| A2 | Território hierárquico | País → estado → cidade → território → comunidade/evento modelado por relação hierárquica, sem reescrita de recursos. | Em auditoria |
| A3 | Upload concorrente | Ciclo explícito `UPLOADING → UPLOADED → PROCESSING → READY → APPROVED → PUBLISHED`, com `FAILED`, `CANCELLED` e `REJECTED`; metadados completos e idempotência. | Em auditoria |
| A4 | Limites no servidor | Rejeição no backend de mais de 5 fotos, mais de 2 vídeos e vídeos acima de 60 segundos. | Em auditoria |
| A5 | Miniclipe distinto | Tipo próprio, vínculo a contratação/contratante/parceiro/território/autorização, apenas um ativo por contratação e curadoria nacional. | Em auditoria |
| A6 | Financeiro imutável | Fechamento registra valor bruto, executor, parceiro/admin, parcela Ojú e reserva por transação, preservando o snapshot após alterações futuras. | Em auditoria |
| A7 | Exceções financeiras | Cancelamento, inadimplência, substituição, alteração e reembolso têm estados e lançamentos compensatórios auditáveis. | Em auditoria |
| A8 | Desativação de parceiro | Estados `RASCUNHO`, `ATIVO`, `SUSPENSO`, `DESATIVADO` preservam histórico como patrimônio operacional da Ojú. | Em auditoria |
| A9 | Transferência territorial | Titularidade possui vigência e encerramento; nova associação não reatribui recursos nem auditoria históricos. | Em auditoria |
| A10 | Auditoria obrigatória | Criação, ativação, suspensão, território, papel, upload, exclusão, publicação, autorização, proposta, contrato e finanças guardam antes/depois, ator, data e escopo. | Em auditoria |
| A11 | Concorrência editorial | Atualização e transição de publicação exigem versão esperada; conflito não sobrescreve o registro. | Em auditoria |
| A12 | Governança da Home | Parceiro apenas sugere; Super Admin aprova/rejeita; publicação nacional não é concedida ao parceiro. | Em auditoria |
| A13 | Marca associada | Ojú permanece plataforma; parceiro tem identidade contextual, nunca white-label. | Em auditoria |
| A14 | Isolamento transversal | Conteúdo, mídia, Acervo, solicitações, propostas, contratos, clientes, executores, financeiro, notificações, relatórios, dashboard, busca e logs filtram no servidor. | Em auditoria |

## Evidência a levantar por camada

| Camada | Pergunta de auditoria | Artefatos prioritários |
|---|---|---|
| Banco | O fato pode ser preservado sem sobrescrever o passado? | `drizzle/schema.ts`, migrations `0032–0034` e consultas de verificação. |
| Backend | Uma chamada direta à API é negada quando o usuário está fora do escopo? | `server/partnerScope.ts`, routers editorial, media, commercial, community e partners. |
| Interface | A tela orienta corretamente sem esconder uma falha de autorização? | Painéis de Parceiros, Conteúdo, Acervo, Comunidade, Comercial e Curadoria. |
| Testes | Há regressão negativa para invasão de escopo, corrida e limites? | `server/partner-scope.test.ts` e testes dos routers afetados. |
| Auditoria | A mutação deixa rastro suficiente para investigação? | `auditEvents`, chamadas de `recordAuditEvent` e testes de serialização. |

## Limites da correção automática

Esta auditoria pode corrigir falhas de autorização, modelo de estado, filtro, concorrência, mídia e rastreabilidade. A decisão operacional recebida nesta rodada foi implementada como política configurável: **5% são deduzidos da parcela bruta do parceiro e registrados para a Ojú; reembolso nunca pode alcançar 100%; a decisão gera lançamento compensatório sem apagar a cobrança original.** Tratamento tributário, redação contratual final, prazo comercial inicial e critérios objetivos de inadimplência continuam sujeitos à validação jurídica e contábil antes de uso externo.

## Sequência de execução

Primeiro são verificadas autoridade, território e titularidade. Em seguida são auditados upload, mídia, miniclipe e concorrência editorial. A terceira frente verifica transações, exceções financeiras e todos os recursos potencialmente expostos fora do escopo. Somente depois dessas evidências serão aplicadas correções estritamente técnicas, acompanhadas de migrations e regressão.

## Achados da fase 2 — Autoridade, território e titularidade

| Critério | Evidência confirmada | Achado cirúrgico | Classificação |
|---|---|---|---|
| A1 — Hierarquia de autoridade | `partners.create`, `partners.update`, `partners.setTerritories` e `partners.setMember` exigem `administrador principal` no servidor. | Um membro de parceiro não possui procedure para elevar o próprio papel, alterar membros ou trocar territórios. A proteção está corretamente no backend. | **Atendida neste módulo** |
| A1/A14 — Conteúdo editorial | O parceiro possui guard próprio nos routers comercial, comunitário e de Acervo. | `editorial.adminList`, `preview`, edição, publicação, taxonomias e relações de mídia ainda operam sem `assertPartnerScope`; um administrador de parceiro pode, portanto, alcançar registros editoriais fora do próprio parceiro por chamada direta. | **Falha crítica** |
| A2 — Hierarquia territorial | `taxonomies.parentId` permite estruturar relações em árvore e os recursos guardam `territoryId` ou vínculos taxonômicos. | O modelo acomoda país, estado, cidade, território e comunidade/evento sem criar novas tabelas para cada nível. Falta validar semanticamente a relação pai-filho e impedir hierarquias incoerentes ou cíclicas. | **Parcial** |
| A8 — Estado de parceiro | Há estados `Rascunho`, `Em revisão`, `Ativo`, `Suspenso` e `Arquivado`; os recursos guardam `partnerId` próprio. | O requisito pede `Desativado`, não `Arquivado`. Falta regra explícita de que parceiro desativado não recebe novos fluxos e que seu acervo histórico permanece sob custódia da Ojú. | **Parcial** |
| A9 — Transferência territorial | Registros preservam `partnerId` e `territoryId` no momento da criação. | `setTerritories` remove todas as linhas atuais e recria associações. Há evento de auditoria, porém não há vigência `início/fim` de titularidade; a associação territorial histórica é sobrescrita. | **Falha crítica** |
| A10 — Auditoria de governança | `recordAuditEvent` registra ator, parceiro, território, recurso, ação, estados anterior/próximo e data. `partners` audita criação, atualização, território e membro. | A estrutura é adequada, mas a cobertura real deve ser estendida a todos os routers; nesta fase, publicação e alterações territoriais editoriais ainda não alimentam o mesmo log central. | **Parcial** |
| A13 — Marca do parceiro | O parceiro tem nome, slug, descrição, logo, mídia de perfil e `publicVisibility`; a identidade é apresentada como contextual. | O router não oferece configuração de marca global, domínio, tema ou navegação própria ao parceiro, preservando a Ojú como plataforma. | **Atendida no modelo atual** |

> **Decisão técnica da auditoria:** nenhum recurso editorial pode ser marcado como multiadmin pronto enquanto as procedures de publicação e taxonomia não aplicarem o mesmo escopo de parceiro e território que já protege as frentes comercial, comunitária e de Acervo.

## Achados da fase 3 — Upload, mídia, miniclipe e concorrência

| Critério | Evidência confirmada | Achado cirúrgico | Classificação |
|---|---|---|---|
| A3 — Upload concorrente | O endpoint limita arquivos a 16 MB, autentica o usuário, valida parceiro/território, registra `userId`, checksum SHA-256, arquivo, tipo, tamanho, duração, erro e data. O `x-upload-id` impede duplicação concorrente pelo mesmo identificador. | O ciclo atual é `Criado → Upload → Validando → Processando → Processado/Falhou`. Faltam os estados de negócio `Pronto`, `Aprovado`, `Publicado`, `Cancelado` e `Rejeitado`; faltam contador de tentativas, progresso e a referência de quem aprovou a publicação. | **Parcial** |
| A4 — Limites no servidor | O endpoint rejeita vídeo com mais de 60 segundos por inspeção binária. `editorial.attachMedia` aplica 5 fotos, 2 vídeos e 5 fotos sem vídeo para Fotografia documental. | A regra é defensiva no upload e no anexo editorial. A verificação de escopo do conteúdo, porém, precisa ser corrigida antes de considerá-la segura em cenário multiadmin. | **Parcial** |
| A5 — Miniclipe distinto | `commercialMiniclips` é entidade separada de `mediaAssets`; exige vídeo ativo, autorizado e até 60 segundos. A chave única `activeRequestKey` e a substituição do anterior preservam um miniclipe ativo por contratação. | O vínculo com contratante, parceiro e território é indireto, via `commercialRequests`; não há snapshot próprio de contexto. Mais grave: `network.assignMiniclip` permite que qualquer administrador da carteira marque `featureOnHome`, embora a Home nacional deva ser exclusiva do Super Admin. | **Falha crítica** |
| A11 — Concorrência em edição | `editorial.update` exige `expectedVersion` e faz atualização condicional por versão; há conflito explícito para a edição de texto. | `advanceStatus`, `unpublish`, `republish`, `archive`, `delete` e `restore` incrementam versão, mas atualizam apenas por `id`. Dois administradores podem transicionar o mesmo registro simultaneamente sem receber conflito. | **Falha crítica** |
| A10 — Auditoria de mídia/publicação | Upload gera `auditEvents`; transições editoriais produzem `editorialActivities`. | Publicação, despublicação, substituição de miniclipe e anexação de mídia não registram uniformemente o evento central com antes/depois, parceiro e território. | **Parcial** |

> **Decisão técnica da auditoria:** upload permanece separado de publicação, como exigido. Contudo, o estado de upload não pode ser apresentado como fluxo completo de aprovação/publicação, e a curadoria nacional não pode ser delegada implicitamente pelo parâmetro `featureOnHome`.

## Achados da fase 4 — Monetização, exceções e isolamento transversal

| Critério | Evidência confirmada | Achado cirúrgico | Classificação |
|---|---|---|---|
| A6 — Cadeia financeira | Políticas comerciais possuem versão; anúncios e visibilidades guardam percentuais e valores; `commercialClosings` guarda valor bruto, executor, responsável, política e percentuais no momento do preparo. | O fechamento pode ser atualizado no mesmo registro sem versão, sem valores monetários calculados por parcela e sem livro de lançamentos. Não há snapshot imutável de profissional, parceiro, taxa Ojú e reserva por transação liquidada. | **Parcial crítico** |
| A7 — Cancelamento, reembolso e inadimplência | Há arquivamento comercial, cancelamento de visibilidade e estados simples de repasse. | Não existem estados, motivo, regras de cálculo, lançamentos compensatórios ou trilha para cancelamento de contratação, não entrega, reembolso total/parcial, inadimplência, substituição de executor ou alteração financeira posterior. | **Não implementada** |
| A10 — Auditoria comercial/financeira | A distribuição e a assunção de solicitação geram atividade e `auditEvents`; políticas e notificações possuem histórico próprio. | `prepareClosing`, contratos, anúncios, alteração de repasse, visibilidade e parte das autorizações não registram uniformemente antes/depois no log central. | **Parcial** |
| A14 — Solicitações e contratos | `claimRequest`, `assignRequest` e `updateStatus` combinam proprietário, parceiro/território e versão. Contratos de carteira filtram por responsável. | `updateRequestOperation`, autorização editorial, termos, contratos e parte dos anúncios validam a carteira, mas não reaplicam consistentemente o escopo de parceiro/território. Mudança de associação ou suspensão pode deixar operações antigas acessíveis por proprietário. | **Falha crítica** |
| A14 — Acervo | A criação, edição, arquivamento e leitura de mídia usam escopo de parceiro; atualização usa versão otimista. | A listagem privilegia parceiro, mas inclui toda mídia criada pelo usuário; `users` expõe a todos os administradores a lista global de contas administrativas. Reativação, lixeira e restauração não mantêm padrão completo de versão e auditoria. | **Parcial** |
| A14 — Comunidade | Criação e atualização de instituições, eventos e memórias chamam o guard de parceiro; mudança de `partnerId` é exclusiva do Super Admin. | Listagens administrativas filtram por proprietário, não por associação de parceiro vigente; parte dos fluxos auxiliares não reaplica o guard. Ainda faltam versão otimista e auditoria central consistentes. | **Parcial crítico** |
| A14 — Profissionais, dashboard e relatórios | Ganhos e notificações são isolados por usuário; Super Admin recebe o consolidado. | `network.executors` devolve todos os executores ativos a qualquer administrador, sem parceiro. O financeiro e relatórios consolidados por usuário não têm dimensão de parceiro; não há perímetro unificado para dashboard, busca e logs. | **Falha crítica** |

### Conclusão provisória da fase 4

O projeto já possui a base correta de carteiras privadas, políticas versionadas, autorização editorial e escopo em recursos importantes. Contudo, **propriedade por usuário não equivale a isolamento por parceiro**. O guard territorial precisa se tornar obrigatório em todas as leituras e escritas associadas a parceiro, e o modelo financeiro precisa de um livro de eventos imutáveis antes de qualquer uso operacional de comissões, devoluções ou repasses.

> **Risco operacional:** declarar a camada pronta agora poderia permitir que um administrador veja ou altere registros próprios mantidos após perda de escopo territorial, que um executor de uma região apareça em outra ou que um destaque nacional seja solicitado diretamente por uma carteira regional.

## Correções aplicadas nesta rodada

| Critério | Correção efetivada | Evidência técnica | Estado após correção |
|---|---|---|---|
| A1 | O router de Parceiros continua exclusivo do Super Admin; associação de membro e território não é exposta ao parceiro. | `partners.ts`, `assertPartnerScope`. | **Atendida** |
| A2/A9 | `partnerTerritories` ganhou estado, início, fim e chave ativa. Remoção passa a encerrar vigência em vez de apagar a associação. | Migration `0035`; `setTerritories` encerra e cria somente novas vigências. | **Atendida no modelo de titularidade** |
| A3 | Upload passa por `Enviando`, `Enviado`, `Processando`, `Pronto`, `Aprovado`, `Publicado`, `Falhou`, `Cancelado` e `Rejeitado`, com tentativa, aprovação, rejeição e publicação rastreáveis. | `uploadSessions`, `server/_core/index.ts`, `media.approveUpload`, `media.rejectUpload`. | **Atendida no backend** |
| A4 | Os limites permanecem no backend; o vínculo editorial agora exige mídia ativa, autorizada e aprovada. | `editorial.attachMedia`, inspeção binária de vídeo e testes de limites. | **Atendida** |
| A5/A12 | Miniclipe recebe snapshot de contratação, parceiro e território; somente o Super Admin pode levá-lo à Home. Publicação territorial pode gerar sugestão de destaque, aprovada ou recusada nacionalmente. | `commercialMiniclips`, `highlightSuggestions`, `network.assignMiniclip`, `editorial.suggestHighlight`. | **Atendida no backend** |
| A6 | Cobrança cria lançamento imutável com bruto, executor, parcela bruta do parceiro, parcela líquida do parceiro e 5% da Ojú. | `commercialTransactions`, `financial.recordCharge`. | **Atendida para nova cobrança registrada** |
| A7 | Política versionada de reembolso possui prazo, teto inferior a 100%, explicação de retenção, decisão e compensação em novo lançamento. | `commercialRefundPolicies`, `commercialRefundRequests`, `requestRefund`, `decideRefund`, `compensateRefund`. | **Atendida para reembolso parcial; demais exceções pendentes** |
| A8 | `Arquivado` de parceiro foi convertido para `Desativado`, sem apagar histórico nem recursos associados. | Migration `0035`, enum de parceiros. | **Atendida** |
| A11 | Avançar, despublicar, republicar, arquivar, excluir e restaurar exigem `expectedVersion` e atualizam condicionalmente. | `editorial.ts`, `PublicationsAdmin.tsx`. | **Atendida** |
| A14 | Conteúdo editorial, comunidade, rede, executor e miniclipe recebem filtros ou guards adicionais de parceiro/território. | `assertPublicationScope`, `requireCommunityPartnerScope`, `secureRequest`, executor territorial. | **Parcial — ver pendências** |

## Pendências que não devem ser tratadas como concluídas

| Frente | Pendência restante | Motivo e próximo passo seguro |
|---|---|---|
| Cancelamento, inadimplência e substituição | Há reembolso parcial compensatório, mas ainda faltam os estados e as regras próprias de não entrega, substituição de executor e inadimplência. | Definir cláusulas operacionais, responsáveis, evidências e impacto de cada evento antes de automatizar. |
| Auditoria transversal | Diversas mutações legadas ainda usam atividade editorial ou comercial sem registrar o mesmo evento central com estado anterior e posterior. | Padronizar um wrapper de auditoria antes de ampliar a operação para muitos parceiros. |
| Parceiro/território em fluxos legados | A Ojú central continua acessível aos administradores atuais para não romper a operação existente; o isolamento rígido aplica-se quando existe `partnerId`. | Ao migrar administradores para parceiros, classificar recursos centrais que devem deixar de ser compartilhados. |
| Comunidade e financeiro analítico | As novas operações são filtradas, mas relatórios históricos por parceiro ainda precisam de dimensão explícita e testes por recuperação de escopo. | Criar relatórios por parceiro a partir de dados reais, sem inferência retroativa. |
| Contratos e texto público | A implementação não constitui cláusula jurídica nem define imposto, consumidor, prazo comercial ou método de pagamento. | Revisão por profissional jurídico e contábil antes de ativar cobrança ou reembolso no público. |

## Validação realizada

O TypeScript foi executado sem erros. A suíte passou em **59 arquivos e 144 testes**, incluindo a regressão atualizada de parceiro, território, upload, curadoria nacional e reembolso parcial. Não foram criados clientes, transações, profissionais, avaliações ou dados fictícios.
