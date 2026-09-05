# Matriz de rotas e acessos — staging Render

## HTTP

| Rota                                        |         Público |          Auth | Papel/escopo                           | Parceiro/Território                          | Observação                                                          |
| ------------------------------------------- | --------------: | ------------: | -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `GET /health`                               |             Sim |           Não | Nenhum                                 | Não                                          | Liveness; não consulta banco.                                       |
| `GET /ready`                                |             Sim |           Não | Nenhum                                 | Não                                          | Readiness; confirma a dependência de banco.                         |
| `GET /api/auth/google/start`                |             Sim |           Não | Inicia OAuth Google                    | Não                                          | Monta `state`/`nonce` no servidor e redireciona ao Google.          |
| `GET /api/auth/google/callback`             |             Sim |           Não | Valida `state` e ID token              | Não                                          | Cria sessão JWT somente após troca válida de código.                |
| `GET /api/editorial/events`                 |             Sim |           Não | Nenhum                                 | Eventos públicos editoriais                  | SSE para atualização do portal.                                     |
| `POST /api/media/upload`                    |             Não |           Sim | Criador, editor, aprovador ou admin    | Validado no backend para parceiro/território | Limite de 64 MB, checksum, sessão rastreável e publicação separada. |
| `/media-storage/*`                          |      Controlado |      Indireto | URL assinada para Tigris               | Chave de storage                             | Leitura de mídia; não usa disco Render.                             |
| `/manus-storage/*`                          |      Controlado |      Indireto | Alias legado                           | Chave de storage                             | Compatibilidade temporária com URLs antigas.                        |
| Arquivos comerciais privados                |             Não |           Sim | Super Admin ou responsável da carteira | Validado por registro                        | Não entram em payload público.                                      |
| `POST /api/scheduled/editorial-trash-purge` |             Não |  Cron/segredo | Serviço autorizado                     | Não                                          | Idempotente; exige Bearer secreto ou identidade cron.               |
| `/api/local-dev/*`                          | Não em produção | Local somente | `NODE_ENV=development`                 | Não                                          | Responde 404 no Render.                                             |
| `/api/trpc/*`                               |           Misto | Por procedure | Zod, RBAC e guards server-side         | Conforme recurso                             | Mutação de mesma origem; cron possui exceção autenticada.           |

## Routers tRPC

| Router                  | Leitura pública                                                       | Auth/RBAC de escrita                                | Parceiro/Território                              | Dados protegidos                                           |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `auth`                  | `me` e logout controlam a sessão atual.                               | Conforme sessão.                                    | Não.                                             | Cookie não é exposto ao cliente.                           |
| `editorial`             | Conteúdo somente quando publicado e autorizado.                       | Papéis editoriais; ações sensíveis são Super Admin. | Guard e versão esperada em recursos de parceiro. | Revisão, lixeira e auditoria não entram no portal.         |
| `media`                 | Somente mídias elegíveis/publicadas.                                  | Administração conforme papel.                       | Autor, parceiro e território são validados.      | Sessões, storage e aprovação são privados.                 |
| `commercial`            | Solicitação pública controlada.                                       | Carteira e Super Admin.                             | Distribuição obrigatória e escopo de parceiro.   | Propostas, contratos, entrega e observações são privados.  |
| `revenue` e `financial` | Não.                                                                  | Super Admin e responsável autorizado.               | Carteira/partner scope.                          | Lançamentos, repasses e reembolsos imutáveis.              |
| `community`             | Instituições, Agenda e Memórias somente com consentimento/publicação. | Administração comunitária autorizada.               | Território e parceiro.                           | Acolhimento e informações reservadas não são públicas.     |
| `collaborators`         | Não.                                                                  | Super Admin.                                        | Não delegável pelo colaborador.                  | Papéis e termos administrativos.                           |
| `network`               | Contextos públicos aprovados.                                         | Comercial/administrativo autorizado.                | Parceiro e contratação.                          | Executor, vínculo e miniclipe não autorizam Home nacional. |
| `portalContent`         | Blocos visíveis.                                                      | Super Admin.                                        | Nacional.                                        | Ordem, exclusão e auditoria internas.                      |
| `partners`              | Contexto publicado limitado.                                          | Super Admin.                                        | Entidade, membros e territórios ativos.          | Não permite autoelevação ou vínculo próprio.               |
| `operations`            | Não.                                                                  | Admin dentro do próprio escopo; Super Admin global. | Parceiro, território e carteira.                 | Central não revela pendências de outra operação.           |

> A interface não concede acesso. A decisão final está no backend por `protectedProcedure`, `adminProcedure`, escopo de parceiro, carteira, território, propriedade, validação Zod e versão otimista quando aplicável.
