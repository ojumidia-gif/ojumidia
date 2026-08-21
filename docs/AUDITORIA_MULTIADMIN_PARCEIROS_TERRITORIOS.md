# Auditoria técnica — multiadmin, territórios, parceiros, permissões, identidade e monetização

**Data da auditoria:** 21 de agosto de 2026  
**Escopo:** diagnóstico técnico pré-implementação. Nenhuma tabela, rota, permissão, valor financeiro ou fluxo existente foi modificado por esta auditoria.

> **Conclusão central:** a Ojú já possui uma base editorial, comercial e comunitária sólida, com proteção por papel, carteira individual, consentimento, autorização editorial, lixeira e alguns controles de concorrência. Contudo, o sistema **ainda não possui um modelo formal de Parceiro Ojú nem autorização territorial centralizada no backend**. Hoje, o isolamento entre administradores é predominantemente por carteira (`managedByUserId` ou `capturedByUserId`), e não por parceiro + território autorizado. Portanto, a entrada de novos administradores territoriais em escala não deve ocorrer antes de uma evolução estrutural controlada.

## 1. Fonte de verdade e classificação usada

O código e o esquema atual são a fonte de verdade. A documentação anterior e a interface foram usadas apenas como referência de intenção; nenhuma capacidade foi declarada como existente sem confirmação no schema, no router ou no controle de acesso correspondente.

| Status | Definição usada nesta auditoria |
|---|---|
| **IMPLEMENTADO** | Existe no banco e no backend, com regra verificável. |
| **PARCIAL** | Existe, mas não atende completamente ao modelo multiadmin/territorial solicitado. |
| **NÃO IMPLEMENTADO** | Não há entidade, regra ou fluxo correspondente comprovado. |
| **PRECISA DE VALIDAÇÃO** | O código existe, mas exige ensaio operacional ou de carga antes de uma conclusão. |
| **COM RISCO** | O comportamento atual atende ao fluxo pequeno, mas pode falhar ou vazar escopo ao escalar. |

## 2. Arquitetura atual comprovada

A aplicação é uma única plataforma React + Express + tRPC + Drizzle/MySQL-TiDB. O backend aplica autenticação e autorização por procedures tRPC; o armazenamento de arquivos é S3/manus-storage, e o Firebase atual serve como prévia estática até que Cloud Run e autenticação de produção estejam homologados. Não há frontend, banco ou instalação independente por estado.

| Camada | Implementação atual | Status |
|---|---|---|
| Plataforma nacional | Um frontend, um backend Express/tRPC e um modelo de dados comum | **IMPLEMENTADO** |
| Papéis de usuário | `criador`, `editor`, `aprovador`, `administrador` e `administrador principal` | **IMPLEMENTADO** |
| Ativação de administrador | Concessão por e-mail e termo de responsabilidade assinado via gov.br | **IMPLEMENTADO** |
| Conteúdo editorial | Publicações, taxonomias, mídia, versão otimista, status e atividades | **IMPLEMENTADO** |
| Operação comercial | Solicitações, carteira, proposta, contrato, autorização editorial, anúncios e receitas | **IMPLEMENTADO** |
| Rede de execução | Executor independente, fechamento conceitual e miniclip comercial | **IMPLEMENTADO** |
| Territórios como dado | Taxonomia hierárquica com `parentId`, localização e coordenadas | **IMPLEMENTADO** |
| Parceiro Ojú formal | Entidade própria, perfil, identidade, território e associação de membros | **NÃO IMPLEMENTADO** |
| Escopo territorial central | Middleware/guard único por usuário, parceiro, território, recurso e ação | **NÃO IMPLEMENTADO** |

As referências técnicas desta auditoria estão ao final do documento. Elas apontam diretamente para os arquivos que comprovam cada conclusão.

## 3. Modelo real de usuários e permissões

Há cinco papéis reais na tabela `users`. A procedure protegida exige sessão ativa e `adminAccess`; a procedure administrativa exige `administrador` ou `administrador principal`. O Super Admin concede e revoga acessos por `collaboratorAccessGrants`; para o papel de administrador, a ativação depende de termo assinado via gov.br.

| Recurso | Administrador principal | Administrador | Editor | Aprovador | Criador | Público | Situação comprovada |
|---|---|---|---|---|---|---|---|
| Identidade institucional e conteúdo do portal | Total | Não | Não | Não | Não | Leitura pública | **IMPLEMENTADO**: exclusivo do principal |
| Publicações editoriais | Global por papel editorial | Global por papel editorial | Conforme status | Conforme status | Criação e rascunho | Apenas publicadas | **PARCIAL**: não há recorte territorial por administrador |
| Curadoria/Home | Total | Pode usar as rotas administrativas de curadoria | Não | Não | Não | Público | **COM RISCO**: a regra atual não reserva explicitamente a curadoria nacional ao principal |
| Acervo | Total | Lista e administra o Acervo compartilhado | Não | Não | Não | Somente mídia elegível exposta por rotas públicas | **COM RISCO**: `media.list` não filtra por proprietário, parceiro ou território |
| Comunidade | Total | Própria carteira | Não | Não | Não | Somente consentido/publicado | **IMPLEMENTADO por carteira** |
| Comercial, contratos e receitas | Total consolidado | Própria carteira/captação | Não | Não | Não | Não | **IMPLEMENTADO por carteira** |
| Colaboradores e papéis | Total | Não | Não | Não | Não | Não | **IMPLEMENTADO** |
| Parceiros | Não existe módulo formal | Não existe módulo formal | Não existe | Não existe | Não existe | Não existe | **NÃO IMPLEMENTADO** |
| Escopo territorial de recursos | Sem restrição territorial | Não centralizado | Não centralizado | Não centralizado | Não centralizado | Público filtrado | **NÃO IMPLEMENTADO** |

O modelo atual é adequado para uma operação com carteira individual e revisão editorial compartilhada. Ele ainda não atende ao requisito de que um Admin Territorial somente possa criar, editar, publicar, enxergar documentos privados ou administrar clientes dentro dos territórios explicitamente autorizados.

## 4. Territórios: o que existe e o que falta

O território é uma taxonomia genérica, hierárquica e orientada por dados. Ela suporta nome, `slug`, dimensão, `parentId`, coordenadas e visibilidade de mapa. Publicações se relacionam a territórios por `publicationTaxonomies`; Instituições, Eventos, Memórias e pedidos de acolhimento têm `territoryId` direto. Isso permite organizar conteúdo nacional sem hardcode por cidade ou estado.

| Capacidade territorial | Estado atual | Observação |
|---|---|---|
| País, estado, cidade, região e comunidade | **PARCIAL** | A hierarquia é livre por `parentId`; não há níveis obrigatórios nem validação semântica por tipo geográfico. |
| Conteúdo associado a território | **IMPLEMENTADO** | Via relação editorial com taxonomia. |
| Instituição, Evento e Memória associados a território | **IMPLEMENTADO** | Via `territoryId`. |
| Admin autorizado por território | **NÃO IMPLEMENTADO** | Não existe uma tabela de escopo usuário/parceiro/território nem guard de backend correspondente. |
| Parceiro atuando em vários territórios | **NÃO IMPLEMENTADO** | Não existe entidade de parceiro ou relação parceiro–território. |
| Publicação restrita ao território do admin | **NÃO IMPLEMENTADO** | A publicação editorial valida papel e estágio, mas não compara território do recurso com um escopo do administrador. |
| Consulta pública por território | **IMPLEMENTADO** | Busca, Taxonomias, Territórios e diretório comunitário já usam dados reais e filtros públicos. |

## 5. Parceiro Ojú e identidade contextual

O sistema possui `Perfil parceiro` como **plano de visibilidade institucional**. Esse item não é uma entidade de Parceiro Ojú, não contém identidade de operador regional e não concede escopo administrativo. Também existe `networkExecutors`, mas ele representa o profissional executor de uma contratação, e não um parceiro territorial que administra uma operação.

| Requisito de parceiro | Situação | Motivo técnico |
|---|---|---|
| Perfil formal de Parceiro Ojú | **NÃO IMPLEMENTADO** | Não existe tabela com nome profissional, slug, descrição, logo, status, contatos e regras de apresentação. |
| Logo ou imagem contextual do parceiro | **NÃO IMPLEMENTADO** | Não há vínculo entre parceiro e Acervo. |
| Vínculo parceiro–território | **NÃO IMPLEMENTADO** | Não há tabela de associação ou escopo múltiplo. |
| Vínculo parceiro–administrador | **NÃO IMPLEMENTADO** | O vínculo atual é global por papel ou local por carteira. |
| Identidade institucional central Ojú | **IMPLEMENTADO** | Conteúdo global e marca são controlados pelo Super Admin; não há mecanismo de troca global por admin comum. |
| Parede de logos na Home | **NÃO IMPLEMENTADO, sem risco atual** | Não há módulo de parceiros para renderizar logos; a Home permanece institucional. |
| Exibição contextual por território | **NÃO IMPLEMENTADO** | Necessita Partner Ojú formal e resolução por rota/conteúdo/território. |

## 6. Fluxos editorial, comercial e autorização

O ciclo editorial registra criação, edição, aprovação e publicação. A atualização de publicação usa `expectedVersion` e a coluna `version`, impedindo sobrescrita silenciosa na edição concorrente. A autorização editorial comercial é granular e exige entrega privada e termo gov.br assinado antes de liberar uso no portal. A revogação retira o material vinculado do portal e desativa miniclipes comerciais relacionados.

| Fluxo | Estado | Proteção atual |
|---|---|---|
| Rascunho → revisão → aprovada → publicada → arquivada | **IMPLEMENTADO** | Regras por papel e trilha em `editorialActivities`. |
| Edição concorrente de publicação | **IMPLEMENTADO** | Bloqueio otimista por `expectedVersion`. |
| Publicação concorrente | **PARCIAL** | A transição de status não recebe versão esperada; precisa de teste dirigido antes da escala multiadmin. |
| Contratação ≠ publicação | **IMPLEMENTADO** | Autorização granular + termo gov.br + validação antes da publicação. |
| Carteira comercial | **IMPLEMENTADO** | `managedByUserId`; principal tem visão consolidada. |
| Distribuição de solicitação | **IMPLEMENTADO** | Claim e atribuição pelo principal. |
| Carteira comercial por parceiro/território | **NÃO IMPLEMENTADO** | Não há `partnerId` ou escopo territorial nas solicitações. |
| Executor profissional | **IMPLEMENTADO** | `networkExecutors` e `commercialClosings`. |
| Fechamento financeiro conceitual | **IMPLEMENTADO** | Percentuais e versão de política persistidos; não há pagamento bancário integrado. |

## 7. Monetização e proteção da receita

Os valores são persistidos em Anúncios, Assinaturas de Visibilidade Institucional, Contratos, Solicitações Comerciais, Leads de Receita e Fechamentos Comerciais. Políticas comerciais são versionadas e podem fornecer percentuais ativos por escopo. O Super Admin controla políticas e confirmação de repasse; administradores comuns enxergam apenas captações e carteiras próprias.

| Rota/fluxo | Monetizada hoje | Quem gera receita | Estado do modelo |
|---|---|---|---|
| Anúncios e cartões de serviço | Sim | Administrador captador, operação Ojú | **IMPLEMENTADO** por `advertisements` e política comercial |
| Visibilidade institucional/serviços comunitários | Sim | Captador, operação Ojú, desenvolvimento/reserva | **IMPLEMENTADO** por assinatura de visibilidade |
| Cobertura, Documentário e Fotografia contratados | Parcial | Administrador responsável, executor, operação Ojú | **IMPLEMENTADO** no fechamento conceitual; pagamento real não é integrado |
| Licenciamento de mídia e oficinas | Parcial | Carteira de receita | **IMPLEMENTADO** como `revenueLeads`; não há liquidação financeira completa |
| Perfil de Parceiro Ojú | Não | Ainda não definido | **NÃO IMPLEMENTADO** |

As políticas ativas já centralizam percentuais, mas existem valores padrão históricos em `contracts` e entradas manuais de anúncio. Antes de adotar uma regra única como 70% parceiro / 30% Ojú, é necessário definir a base de cálculo, a relação entre executor e parceiro, impostos, arredondamento, reversão, repasse, inadimplência e a fonte jurídica/contábil da regra. Esta auditoria **não altera percentuais**.

## 8. Mídia, upload, concorrência e armazenamento

O endpoint de upload autentica o usuário, limita o corpo a 16 MB, aceita tipos de arquivo restritos e usa inspeção binária com `music-metadata` para validar vídeos de até 60 segundos. O arquivo é enviado ao storage com chave `media/{userId}/{timestamp}-{filename}`. Em seguida, o administrador cria o registro de Acervo com direitos, crédito, autorização, finalidade e estado.

| Regra de mídia | Estado | Observação |
|---|---|---|
| Máximo de 5 fotos por conteúdo/evento | **IMPLEMENTADO** | Validado no backend ao anexar mídia a publicação. |
| Máximo de 2 vídeos por conteúdo/evento | **IMPLEMENTADO** | Validado no backend. |
| Vídeo com no máximo 60 segundos | **IMPLEMENTADO** | Verificação binária antes do storage. |
| Um miniclip ativo por contratação | **IMPLEMENTADO** | `activeRequestKey` único e substituição do anterior. |
| Sequência institucional de fundo vivo | **IMPLEMENTADO** | Máximo de quatro miniclipes ativos do Acervo. |
| Upload simultâneo | **PARCIAL** | Chave inclui usuário e timestamp; reduz colisão entre usuários, mas não implementa idempotência, fila, retomada nem estado de processamento. |
| Estado de processamento | **NÃO IMPLEMENTADO** | Acervo possui `Ativo` e `Arquivado`, não `Pendente/Processando/Falhou`. |
| Propriedade ou escopo territorial da mídia | **NÃO IMPLEMENTADO** | Há `createdBy`, mas `media.list` administra um Acervo global. |
| Prevenção de arquivo órfão | **NÃO IMPLEMENTADO** | Upload ao storage e criação de metadados ocorrem em operações separadas. |
| Fila de transcodificação/processamento | **NÃO IMPLEMENTADO** | Não é necessária para o limite atual de 16 MB/60 s sem evidência de gargalo; deve ser avaliada por métricas antes de adicionar infraestrutura. |

## 9. Auditoria e trilhas de operação

Existem trilhas por domínio, mas não um log de auditoria transversal com parceiro, território, antes/depois e resultado em todas as ações críticas.

| Domínio | Registro atual | Situação |
|---|---|---|
| Editorial | `editorialActivities` com ator, status anterior/posterior e nota | **IMPLEMENTADO** |
| Comercial | `commercialActivities` com ator, tipo, detalhe e data | **IMPLEMENTADO** |
| Conteúdo institucional | `portalContentActivities` com ação, snapshot e ator | **IMPLEMENTADO** |
| Termos e autorização | Datas, responsável, anexos e status próprios | **IMPLEMENTADO** |
| Mídia | Criação e lixeira possuem autor; não há histórico completo de alteração de metadados | **PARCIAL** |
| Comunidade | Campos de criação/lixeira e eventos; sem tabela de atividades completa | **PARCIAL** |
| Permissões | Concessão e termo existem; sem histórico imutável de alterações de papel/escopo | **PARCIAL** |
| Parceiro e território | Não há entidade de parceiro nem log correspondente | **NÃO IMPLEMENTADO** |

## 10. Matriz de riscos priorizada

| Prioridade | Risco | Local | Impacto | Probabilidade | Mitigação proposta |
|---|---|---|---|---|---|
| **P0** | Administrador regional acessar ou operar recurso fora do território | Autorização de todos os routers | Exposição comercial/documental e publicação indevida | Alta ao adicionar parceiros | Criar escopo de parceiro/território e guard reutilizável no backend antes de ativar admins territoriais. |
| **P0** | Acervo compartilhado expor mídia de outro operador | `media.list` e mutações do Acervo | Vazamento de material, direitos e créditos | Alta ao escalar | Associar mídia a parceiro/escopo e filtrar todas as procedures privadas; Super Admin mantém visão global. |
| **P1** | Parceiro ser confundido com plano institucional ou executor | Modelo de dados/UX | Erro operacional, marca inconsistente e monetização equivocada | Alta | Criar entidade Partner Ojú separada de Instituição, Executor e Colaborador. |
| **P1** | Conteúdo regional ser publicado nacionalmente sem curadoria | Editorial/Home | Perda de controle editorial e poluição da Home | Média | Exigir elegibilidade contextual e reservar curadoria nacional ao Super Admin ou a aprovação delegada explícita. |
| **P1** | Conflito de publicação em atualização de status | Editorial | Estado publicado inesperado em concorrência | Média | Estender o bloqueio otimista às transições sensíveis e cobrir cenários concorrentes. |
| **P1** | Upload repetido criar arquivo ou registro duplicado | Endpoint de upload/Acervo | Custos, conteúdo duplicado e referências órfãs | Média | Criar idempotency key, checksum e reconciliação de upload antes de grande volume. |
| **P2** | Falta de contexto visual para operador regional | Centro Administrativo | Erros humanos de território/parceiro | Média | Exibir um cabeçalho fixo de contexto após o escopo existir. |
| **P2** | Log de auditoria fragmentado | Mídia, comunidade, permissões | Investigação incompleta | Média | Centralizar eventos críticos em auditoria transversal progressiva. |
| **P3** | Fila de processamento prematura | Upload e transcodificação | Complexidade desnecessária | Baixa hoje | Medir volume, latência e falhas antes de adotar uma fila. |

## 11. Regressão que não pode ser quebrada

Qualquer evolução posterior deve preservar: ciclo editorial e bloqueio otimista; separação entre contratação e autorização editorial; termo exclusivamente via gov.br; limites de 5 fotos, 2 vídeos e 60 segundos; unicidade de miniclip por contratação; lixeira e restauração; carteiras comerciais privadas; consolidação do Super Admin; consentimento comunitário; proteção geográfica; diretório público; conteúdo institucional administrável; sincronização por eventos; acesso local somente em desenvolvimento; e a Home nacional sem dados fictícios.

## 12. Diagnóstico final

O projeto **não precisa ser reescrito**. A arquitetura existente deve ser preservada e estendida em torno de três mecanismos que ainda não existem: **Parceiro Ojú**, **escopo territorial de associação** e **guard central de acesso ao recurso**. O maior risco não é performance ou visual; é ativar novos administradores com a estrutura atual de papel global + carteira individual e supor que isso já constitui isolamento territorial.

O modelo atual suporta uma equipe pequena e carteiras distribuídas. Para suportar dezenas ou centenas de parceiros, precisa de uma fase de segurança estrutural antes de expor a autonomia territorial. A proposta de implementação está no documento complementar de plano e depende de aprovação explícita antes de qualquer migration.

## Referências internas

[1]: ../drizzle/schema.ts "Schema real: usuários, permissões, editorial, Acervo, comercial, rede, comunidade e portal"
[2]: ../server/_core/trpc.ts "Camada base de procedures protegidas e administrativas"
[3]: ../server/routers/collaborators.ts "Concessão de papéis e termo de responsabilidade via gov.br"
[4]: ../server/routers/editorial.ts "Ciclo editorial, bloqueio otimista, taxonomias e autorização"
[5]: ../server/routers/media.ts "Acervo, fundo vivo, lixeira e elegibilidade de mídia"
[6]: ../server/_core/index.ts "Endpoint autenticado de upload e inspeção binária de vídeo"
[7]: ../server/routers/community.ts "Carteira comunitária, território, consentimento e visibilidade institucional"
[8]: ../server/routers/commercial.ts "Carteira comercial, contratos, autorização editorial, anúncios e repasses"
[9]: ../server/routers/network.ts "Executor, fechamento conceitual e miniclip por contratação"
[10]: ../server/financialGovernance.ts "Políticas financeiras ativas e proteção de repasses"
