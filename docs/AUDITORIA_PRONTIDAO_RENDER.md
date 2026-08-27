# Auditoria de prontidão para Render — Ojú Mídia

**Data da validação:** 21 de agosto de 2026  
**Escopo:** preparar o serviço full-stack para Render sem recriar arquitetura, trocar banco, retirar Firebase Preview, alterar regras editoriais ou enfraquecer a segurança multiadmin.

## Arquitetura confirmada

| Camada      | Estado verificado                                                                | Decisão de implantação                                                          |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Frontend    | React 19 + Vite + Wouter; build em `dist/public`.                                | O mesmo Express serve arquivos estáticos e fallback SPA.                        |
| Backend     | Express 4 + tRPC 11; APIs sob `/api/*`.                                          | Um único Web Service Node atende portal, admin, API, OAuth e SSE.               |
| Autorização | Contexto autenticado, RBAC editorial e guards de Parceiro/território no backend. | Preservado; o Render não recebe qualquer bypass administrativo.                 |
| Banco       | Drizzle com dialeto MySQL e migrations `0000` a `0038`.                          | `DATABASE_URL` deve apontar a MySQL/TiDB existente; não há troca para Postgres. |
| Storage     | Forge Storage existente e alternativa S3 compatível.                             | O Render não guarda Acervo no disco local.                                      |
| Firebase    | `firebase.json` e `build:firebase-preview` permanecem.                           | Continua sendo prévia estática; o Render atende o ambiente completo.            |
| OAuth       | Callback real, nonce, cookie de sessão `httpOnly` e JWT.                         | Requer URL pública e credenciais reais configuradas no Render.                  |

## Problemas encontrados e correções aplicadas

| Achado                                                           | Correção aplicada                                                                                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev` e `start` usavam atribuição Unix de `NODE_ENV`.            | `cross-env` passou a comandar ambos os scripts, funcionando em PowerShell, Linux e Render.                                                            |
| O processo podia trocar a porta fornecida por `PORT`.            | Em produção, o servidor usa obrigatoriamente a porta de `process.env.PORT`, faz bind em `0.0.0.0` e falha de forma explícita se a porta for inválida. |
| Não havia endpoint HTTP simples para health check.               | Criado `GET /health`, público e sem dados sensíveis.                                                                                                  |
| Fallback SPA poderia devolver `index.html` para API inexistente. | `/api/*` não encontrado retorna JSON 404 antes do fallback de SPA.                                                                                    |
| Cookies HTTPS dependiam de proxy.                                | `trust proxy` foi habilitado e a lógica atual de `x-forwarded-proto` foi preservada.                                                                  |
| O storage só reconhecia Forge.                                   | Forge foi preservado; deployments externos podem usar S3 compatível com URL assinada e as mesmas URLs internas `/manus-storage/*`.                    |
| O expurgo editorial só tinha callback preparado.                 | Criado acionador externo idempotente para Cron Job do Render, autenticado por segredo dedicado.                                                       |
| O pnpm avisava que patches e overrides não eram lidos.           | Criado `pnpm-workspace.yaml`; `pnpm install --frozen-lockfile` foi validado.                                                                          |
| Não havia Blueprint/guia Render.                                 | Criados `render.yaml`, guia de deploy, modelo seguro de ambiente e referências oficiais.                                                              |

## Variáveis efetivamente usadas

| Variável                                                                                  | Obrigatória                     | Finalidade                                                          | Onde configurar                            |
| ----------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `DATABASE_URL`                                                                            | Sim fora da prévia estática     | MySQL/TiDB para Drizzle, usuários, conteúdo, parceiros e auditoria. | Render Web Service.                        |
| `JWT_SECRET`                                                                              | Sim                             | Assina e valida sessão.                                             | Render Web Service; usar valor gerado.     |
| `GOOGLE_CLIENT_ID`                                                                        | Sim para OAuth                  | Cliente Google OAuth no servidor.                                   | Render Web Service.                        |
| `GOOGLE_CLIENT_SECRET`                                                                    | Sim para OAuth                  | Segredo Google; nunca com prefixo `VITE_`.                          | Render Web Service.                        |
| `GOOGLE_OAUTH_REDIRECT_URI`                                                               | Sim para OAuth                  | Callback exato cadastrado no Google Cloud.                          | Render Web Service.                        |
| `GOOGLE_SUPER_ADMIN_EMAILS`                                                               | Sim para o primeiro Super Admin | Lista de e-mails titulares autorizados.                             | Render Web Service.                        |
| `GOOGLE_SUPER_ADMIN_SUBS`                                                                 | Depois do primeiro acesso       | Identificadores `google:<sub>` dos titulares.                       | Render Web Service.                        |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`                                        | Uma alternativa de storage      | Forge Storage existente.                                            | Ambiente gerenciado, quando disponível.    |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`                      | Uma alternativa de storage      | Bucket S3/compatível para mídias externas.                          | Render Web Service.                        |
| `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`                                                      | Condicional                     | Provedores S3 compatíveis que exigem endpoint próprio.              | Render Web Service.                        |
| `EDITORIAL_TRASH_CRON_SECRET`                                                             | Sim se o cron for ativado       | Protege o expurgo automático.                                       | Web Service e Cron Job.                    |
| `OJU_PUBLIC_BASE_URL`                                                                     | Apenas no Cron Job              | URL pública do serviço a chamar.                                    | Render Cron Job.                           |
| `OJU_LOCAL_DEV_LOGIN_ENABLED`, `OJU_LOCAL_ADMIN_EMAIL`                                    | Local somente                   | Acesso local de desenvolvimento.                                    | Nunca habilitar em produção.               |
| `VITE_ANALYTICS_*`, `VITE_FIREBASE_*`, `VITE_FRONTEND_FORGE_*`, `VITE_OJU_STATIC_PREVIEW` | Condicional                     | Integrações opcionais já presentes no frontend.                     | Somente quando a integração estiver ativa. |

O modelo sem valores está em `docs/ENVIRONMENT_RENDER_TEMPLATE.md`. Ele substitui a distribuição de arquivos de ambiente contendo qualquer segredo.

## Autenticação, Super Admin e isolamento

O callback usa `https://SEU-SERVICO.onrender.com/api/auth/google/callback`, `state`/`nonce` de uso único e cookie seguro. O Super Admin depende de `GOOGLE_SUPER_ADMIN_EMAILS` e, após o primeiro acesso, de `GOOGLE_SUPER_ADMIN_SUBS`. Usuários autenticados sem essa autorização ou concessão de colaborador não recebem privilégio. O acesso local de desenvolvimento retorna 404 fora de `NODE_ENV=development`.

Os testes existentes continuam cobrindo separação de parceiros/territórios, RBAC, lixeira, upload rastreável, concorrência otimista, curadoria nacional, comercial e reembolsos. O deploy não substitui esses guards por regras de frontend.

## Validações executadas

| Comando ou teste                 | Resultado                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Aprovado.                                                                                                |
| `pnpm check`                     | Aprovado, sem erro TypeScript.                                                                           |
| `pnpm test`                      | **150 testes aprovados em 62 arquivos**; nenhuma falha.                                                  |
| `pnpm build`                     | Aprovado; gera `dist/public` e `dist/index.js`.                                                          |
| Produção local                   | `PORT=3416 pnpm start` respondeu `200` em `/health`, `200` em `/admin` e `404` JSON em `/api/not-found`. |
| Carga controlada                 | 12 requisições concorrentes a `/health`, todas com `200`.                                                |
| Auditoria de dependências        | Sem alertas críticos após atualização do SDK AWS, tRPC, Axios, Drizzle e Nanoid.                         |

## Segurança: risco remanescente conhecido

A auditoria de produção ainda informa **40 advisories: 3 altos, 30 moderados e 7 baixos**, todos transitivos ou dependentes de atualização major. Os alertas altos restantes são `path-to-regexp` da cadeia Express 4 e `lodash`/`lodash-es` pela cadeia Streamdown → Mermaid.

Esses itens não foram atualizados de modo forçado porque exigiriam migração de Express ou atualização major de Streamdown/Mermaid, com risco desnecessário aos fluxos existentes. Eles permanecem registrados para uma frente específica de atualização de dependências, com testes dedicados. Não há alerta crítico no estado final.

## Pendências externas reais

1. Provisionar MySQL/TiDB acessível pelo Render e realizar backup antes da primeira migration.
2. Cadastrar no Google Cloud o callback da URL `onrender.com` e depois o domínio próprio.
3. Informar valores reais de Google OAuth, sessão, `GOOGLE_SUPER_ADMIN_EMAILS` e uma alternativa de storage no Render.
4. Criar o Cron Job do Render para expurgo editorial após a URL pública responder.
5. Homologar com contas OAuth reais: Super Admin e pelo menos dois parceiros de territórios distintos.

## Referências

[1] [Blueprint YAML Reference](https://render.com/docs/blueprint-spec)

[2] [Health Checks](https://render.com/docs/health-checks)

[3] [Setting Your Node.js Version](https://render.com/docs/node-version)

[4] [Environment Variables and Secrets](https://render.com/docs/configure-environment-variables)

[5] [Cron Jobs](https://render.com/docs/cronjobs)
