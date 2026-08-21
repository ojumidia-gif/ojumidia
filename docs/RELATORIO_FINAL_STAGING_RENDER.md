# Relatório final — Ojú Mídia preparada para staging Render

**Data de consolidação:** 21 de agosto de 2026  
**Escopo:** preparação cirúrgica de staging full-stack, sem substituir a arquitetura editorial, documental, comercial ou multiadmin já existente.

## A. O que foi analisado

Foi feita uma comparação entre o runtime de produção, as rotas HTTP/tRPC, o modelo de autenticação e sessão, as migrations MySQL/TiDB, o storage de mídia, o RBAC, os limites de upload, o isolamento de Parceiros Ojú, a lixeira editorial e a documentação operacional. A validação também incluiu a diferença arquitetural entre a prévia Firebase estática e a aplicação full-stack necessária para login, API, banco e upload.

| Área       | Situação verificada                                                                                | Resultado                                                          |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Runtime    | Scripts portáveis, Node 22.13.0, bind em `0.0.0.0:$PORT`, build de cliente e servidor.             | Aprovado.                                                          |
| Saúde      | Liveness `/health` e readiness `/ready` com consulta mínima ao banco.                              | Aprovado em produção local.                                        |
| API        | Fallback SPA, resposta JSON para API desconhecida e mutações cross-origin bloqueadas.              | Aprovado em produção local.                                        |
| Sessão     | OAuth com nonce, cookie JWT e acesso local estritamente de desenvolvimento.                        | Implementado; depende de configuração OAuth externa.               |
| Dados      | Drizzle/MySQL/TiDB, migrations 0001–0038 e versões otimistas nos fluxos editoriais críticos.       | Implementado; banco de staging ainda precisa ser provisionado.     |
| Mídia      | Storage persistente, checksum, aprovação separada e limites globais no backend.                    | Implementado; provedor de storage externo precisa ser configurado. |
| Multiadmin | Papéis, carteira, parceiro, território, auditoria, histórico de titularidade e curadoria nacional. | Implementado e coberto por regressão.                              |
| Operação   | Lixeira com 24 h, expurgo idempotente e Central de Pendências.                                     | Implementado; Cron Job externo ainda precisa ser criado.           |

## B. O que foi alterado

### Infraestrutura e runtime

| Arquivo                                              | Alteração consolidada                                                                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                       | Scripts `dev` e `start` multiplataforma via `cross-env`; comandos separados para build e migrations; engines compatíveis com Node 22/pnpm 10.             |
| `.node-version`                                      | Fixa `22.13.0`, a versão usada para validação.                                                                                                            |
| `pnpm-workspace.yaml` e `pnpm-lock.yaml`             | Organização de patches/overrides e lockfile atualizado.                                                                                                   |
| `tsconfig.json`                                      | Remove `baseUrl` deprecado.                                                                                                                               |
| `render.yaml`                                        | Blueprint do Web Service, build, migration pré-deploy, start e health check, sem valores secretos.                                                        |
| `scripts/render-editorial-trash-cron.mjs`            | Execução externa autenticada do expurgo da Lixeira Editorial.                                                                                             |
| `server/_core/index.ts`                              | Bind Render, `/health`, `/ready`, JSON 404 em APIs, fallback SPA protegido, upload rastreável, cron autenticado e bloqueio de mutações de origem cruzada. |
| `server/_core/imageGeneration.ts`                    | Import relativo compatível após a retirada de `baseUrl`.                                                                                                  |
| `server/storage.ts` e `server/_core/storageProxy.ts` | Adaptador de storage persistente e proxy para URLs assinadas.                                                                                             |
| `server/render-runtime.test.ts`                      | Regressões de scripts portáveis, health, readiness, bind, CORS/CSRF de origem e cron.                                                                     |

### Governança editorial, parceira, comercial e operacional

| Arquivo ou conjunto                                                         | Alteração consolidada                                                                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `server/partnerScope.ts`                                                    | Guard central de parceiro, território, taxonomia, associação ativa e auditoria.                      |
| `server/routers/partners.ts`                                                | Gestão exclusiva de Parceiros Ojú, membros, territórios e vigência histórica.                        |
| `server/routers/editorial.ts`                                               | Escopo territorial, concorrência por `expectedVersion`, curadoria nacional e sugestão de destaque.   |
| `server/routers/community.ts`                                               | Isolamento por parceiro/território, consentimento e exclusão auditável.                              |
| `server/routers/media.ts`                                                   | Sessões de upload, estados técnicos, aprovação editorial e regras de mídia.                          |
| `server/routers/commercial.ts`                                              | Isolamento de carteira, distribuição e fluxo comercial sem publicação automática.                    |
| `server/routers/financial.ts` e `server/financialGovernance.ts`             | Reembolso parcial versionado e lançamentos financeiros imutáveis.                                    |
| `server/routers/network.ts`                                                 | Isolamento de executores, contratação e miniclipes.                                                  |
| `server/routers/operations.ts`                                              | Nova Central de Pendências Operacionais, com prioridade e escopo.                                    |
| `server/editorialTrash.ts`                                                  | Retenção de 24 horas, restauração limitada e expurgo definitivo auditável/idempotente.               |
| `drizzle/schema.ts`                                                         | Entidades de parceiros, histórico territorial, upload, sugestões, reembolso e afiliação territorial. |
| `drizzle/0035_tranquil_santa_claus.sql` a `drizzle/0038_glamorous_shen.sql` | Evoluções multiadmin, complementares, afiliação de profissionais e motivo da lixeira.                |

### Interface administrativa e navegação

| Arquivo                                                            | Alteração consolidada                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `client/src/pages/admin/EditorialTrashAdmin.tsx`                   | Lixeira visível com prazo, restauração e expurgo confirmado. |
| `client/src/pages/admin/OperationsCenterAdmin.tsx`                 | Central de Pendências.                                       |
| `client/src/pages/admin/PartnersAdmin.tsx`                         | Gestão de estados e escopo de Parceiros Ojú.                 |
| `client/src/pages/admin/MediaAdmin.tsx`                            | Aprovação de upload separada da publicação.                  |
| `client/src/pages/admin/PublicationsAdmin.tsx`                     | Ações editoriais com versão esperada.                        |
| `client/src/pages/admin/CommercialPoliciesAdmin.tsx`               | Simulação visual e configuração de reembolso.                |
| `client/src/pages/admin/AdminDashboard.tsx`                        | Resumo operacional de pendências.                            |
| `client/src/App.tsx` e `client/src/components/DashboardLayout.tsx` | Rotas e navegação para Lixeira e Pendências.                 |

### Testes e documentação

| Arquivo                                                                                               | Alteração consolidada                                      |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `server/editorial-trash.test.ts`, `server/operations-center.test.ts` e `server/partner-scope.test.ts` | Regressões de lixeira, pendências e isolamento multiadmin. |
| `server/home-hero-sequence.test.ts`                                                                   | Fallback do miniclipe oficial.                             |
| `docs/RENDER-STAGING.md`                                                                              | Guia full-stack de staging, aceite e troubleshooting.      |
| `docs/RENDER_DEPLOY.md`                                                                               | Guia operacional de deploy, atualizado com `/ready`.       |
| `docs/ENVIRONMENT_RENDER_TEMPLATE.md`                                                                 | Lista segura de variáveis sem valores reais.               |
| `docs/MATRIZ_ROTAS_E_ACESSOS.md`                                                                      | Matriz de endpoints, routers, RBAC e escopos.              |
| `docs/AUDITORIA_PRONTIDAO_RENDER.md`                                                                  | Diagnóstico técnico de prontidão.                          |
| `docs/AUDITORIA_CIRURGICA_MULTIADMIN_V2.md`                                                           | Auditoria de Parceiros, território e isolamento.           |
| `docs/LIXEIRA_EDITORIAL_E_EXPURGO.md` e `docs/CENTRAL_DE_PENDENCIAS_OPERACIONAIS.md`                  | Operação dos dois fluxos.                                  |
| `todo.md`                                                                                             | Histórico de requisitos e entrega final.                   |

## C. O que não foi alterado

O trabalho não alterou a natureza da Ojú Mídia como **portal documental afro-brasileiro**, nem a transformou em portfólio. Também foram preservados o ciclo editorial, a taxonomia multidimensional, a separação entre contratação e autorização editorial, a assinatura exclusiva via gov.br, a publicação somente por autorização expressa, a curadoria nacional exclusiva do Super Admin, os limites de mídia, a cadeia financeira imutável, a identidade contextual de Parceiros Ojú e o histórico após desativação/transferência.

Não foram inseridos dados fictícios, avaliações, depoimentos, clientes ou pagamentos reais. Também não foram adicionados Docker, Redis, RabbitMQ, filas internas, scheduler embutido ou integrações bancárias sem necessidade comprovada.

## D. Variáveis de ambiente necessárias

O inventário seguro e completo está em [`ENVIRONMENT_RENDER_TEMPLATE.md`](./ENVIRONMENT_RENDER_TEMPLATE.md). Os valores reais nunca devem ser incluídos no repositório, no ZIP ou em mensagens.

| Grupo         | Variáveis                                                                                                  | Necessidade                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Runtime       | `NODE_ENV`, `PORT`, `OJU_PUBLIC_BASE_URL`                                                                  | `NODE_ENV` obrigatório; `PORT` é fornecida pelo Render; base URL é necessária ao Cron. |
| Banco         | `DATABASE_URL`                                                                                             | Obrigatória. MySQL/TiDB compatível.                                                    |
| Sessão/OAuth  | `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`                  | Obrigatórias para o Centro Administrativo real.                                        |
| Dev local     | `OJU_LOCAL_DEV_LOGIN_ENABLED`, `OJU_LOCAL_ADMIN_EMAIL`                                                     | Somente desenvolvimento; proibidas no Render.                                          |
| Forge Storage | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`                                                         | Uma alternativa para upload.                                                           |
| S3 compatível | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` | Alternativa ao Forge Storage.                                                          |
| Expurgo       | `EDITORIAL_TRASH_CRON_SECRET`                                                                              | Obrigatória se o Cron Job estiver ativado.                                             |
| Opcionais     | `VITE_ANALYTICS_*`, `VITE_FRONTEND_FORGE_*`, `VITE_FIREBASE_*`, `VITE_OJU_STATIC_PREVIEW`                  | Apenas quando as integrações correspondentes estiverem em uso.                         |

## E. Serviços externos necessários

| Serviço                        | Finalidade                                              | Estado no código                                              |
| ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------- |
| Render Web Service             | Staging full-stack, HTTPS, backend e SPA.               | Preparado por `render.yaml`.                                  |
| MySQL ou TiDB                  | Banco persistente.                                      | Obrigatório e externo.                                        |
| Provedor OAuth autorizado      | Login administrativo.                                   | Obrigatório para acesso real.                                 |
| Forge Storage ou S3 compatível | Fotos, vídeos, PDFs e documentos fora do disco efêmero. | Obrigatório para upload.                                      |
| Render Cron Job                | Expurgo da Lixeira após 24 horas.                       | Opcional até o expurgo automático ser ativado; script pronto. |
| Firebase Hosting               | Prévia estática, não substitui o staging full-stack.    | Opcional.                                                     |

## F. Comandos de execução

### Desenvolvimento local

```bash
corepack enable
pnpm install --frozen-lockfile
cp config/local-superadmin.example.env .env
# editar .env somente no computador local
pnpm dev
```

### Validação local

```bash
pnpm check
pnpm test
pnpm build
PORT=3420 pnpm start
curl http://127.0.0.1:3420/health
curl http://127.0.0.1:3420/ready
```

### Migrations

```bash
# Desenvolvimento, após mudança de schema:
pnpm db:generate

# Staging/produção, com DATABASE_URL configurada:
pnpm db:migrate
```

### Deploy Render

Conecte um repositório privado ao Render e aplique o Blueprint. Configure segredos no painel Environment, registre o callback OAuth e então dispare o deploy. O processo segue as práticas de Blueprint, health check e Cron Job documentadas pelo Render.[1][2][3][4][5]

## G. Pendências de configuração externa

| Pendência                                                                  | Responsável                       | Impacto antes de concluir                                                                           |
| -------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Criar banco MySQL/TiDB de staging e `DATABASE_URL`.                        | Titular/infra.                    | `/ready` responderá 503; migrations e dados não funcionam.                                          |
| Registrar OAuth com callback Render e preencher variáveis.                 | Titular/OAuth.                    | Admin não autentica.                                                                                |
| Obter e configurar `OWNER_OPEN_ID`.                                        | Titular/OAuth.                    | Conta do dono não será reconhecida automaticamente como Super Admin.                                |
| Escolher Forge ou S3 e cadastrar credenciais.                              | Titular/infra.                    | Upload, mídia e termos anexos não funcionam.                                                        |
| Criar Cron Job e configurar segredo.                                       | Titular/infra.                    | Lixeira continuará exigindo execução manual; não há expurgo automático.                             |
| Homologar termos e processos gov.br.                                       | Responsável jurídico/operacional. | Publicação autorizada deve permanecer condicionada à validação humana.                              |
| Carregar marca e vídeo via File Storage para gerar checkpoint restaurável. | Titular.                          | Código pode ser entregue em ZIP, mas ainda não haverá snapshot restaurável das alterações recentes. |

## H. Riscos remanescentes

| Nível                              | Risco                                                                                                                                                                                                 | Tratamento recomendado                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Crítico — bloqueador de deploy** | OAuth, banco e storage reais ainda não foram configurados em um serviço Render externo.                                                                                                               | Configurar os três antes de aceitar staging. Não é falha conhecida do código; é dependência externa pendente. |
| **Alto**                           | Sem Cron Job configurado, o expurgo automático de 24 horas não ocorrerá.                                                                                                                              | Criar o cron após o primeiro deploy e testar contra staging.                                                  |
| **Alto**                           | Há dependências transitivas com alertas de severidade alta (`path-to-regexp` por Express 4 e `lodash`/`lodash-es` por Streamdown/Mermaid), sem atualização menor segura disponível no conjunto atual. | Monitorar releases; atualizar em branch de homologação quando houver caminho compatível.                      |
| **Alto**                           | Assinatura por gov.br exige homologação jurídica, operacional e de armazenamento de evidências.                                                                                                       | Validar termo, processo e retenção com assessoria jurídica antes da operação pública.                         |
| **Médio**                          | O bundle principal do cliente excede o aviso de 500 kB minificado.                                                                                                                                    | Planejar code-splitting após aceite funcional, sem bloquear staging.                                          |
| **Médio**                          | CORS, SSL e política de retenção do S3 escolhido ainda são externos ao repositório.                                                                                                                   | Aplicar bucket privado, URLs assinadas, TLS e regras de ciclo de vida revisadas.                              |
| **Baixo**                          | A prévia Firebase continua incapaz de executar API, OAuth, banco ou upload full-stack.                                                                                                                | Usar Firebase apenas para demonstração visual; usar Render para os testes operacionais.                       |

## I. Resultado dos testes e aceite técnico

| Verificação          | Resultado real                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TypeScript           | `pnpm check`: **0 erros**.                                                                                           |
| Testes automatizados | `pnpm test`: **150 testes aprovados em 62 arquivos**.                                                                |
| Build de produção    | `pnpm build`: **aprovado**; gerou `dist/public` e `dist/index.js`.                                                   |
| Health               | `GET /health`: **200** com `{"status":"ok"}`.                                                                        |
| Readiness            | `GET /ready`: **200** com `{"status":"ready"}` contra o banco do ambiente de validação.                              |
| Rota admin           | `GET /admin`: **200**, fallback SPA com `div#root`.                                                                  |
| API inexistente      | `GET /api/not-found`: **404** com `{"error":"api_not_found"}`.                                                       |
| Origem cruzada       | `POST /api/not-found` com origin externo: **403** com `{"error":"cross_origin_mutation_forbidden"}`.                 |
| Origem mesma         | `POST /api/not-found` com origin do servidor: **404** JSON; a request passou pelo guard e chegou ao fallback de API. |
| Processo temporário  | Encerrado após a validação; porta 3420 livre.                                                                        |

## Pacote de entrega verificado

O artefato `Oju-Midia-Staging-Render-Final.zip` foi testado com `unzip -tq`. Ele contém **443 entradas**, incluindo `render.yaml`, `.node-version`, migrations, documentação de staging, a marca oficial e o miniclipe oficial. O pacote não contém `node_modules`, `dist`, `.env*`, logs, `.manus-logs`, apresentações, banco local ou arquivos SQLite.

| Propriedade | Valor                                  |
| ----------- | -------------------------------------- |
| Nome        | `Oju-Midia-Staging-Render-Final.zip`   |
| Tamanho     | 4,8 MB                                 |
| Integridade | `unzip -tq` concluído sem erros.       |

O checksum SHA-256 da cópia definitiva é informado junto ao arquivo entregue, pois o próprio relatório integra o pacote e não deve registrar o hash de uma versão anterior.

## Conclusão

O projeto está **tecnicamente preparado para staging full-stack no Render**, desde que as pendências externas críticas sejam configuradas e homologadas. O pacote final deve ser tratado como artefato de implantação: contém código, migrations, assets oficiais e documentação; não contém segredos, banco, `node_modules`, builds descartáveis nem logs.

## Referências

[1] [Render Blueprints](https://render.com/docs/blueprint-spec)

[2] [Render Health Checks](https://render.com/docs/health-checks)

[3] [Render Node.js Runtime](https://render.com/docs/node-version)

[4] [Render Environment Variables](https://render.com/docs/configure-environment-variables)

[5] [Render Cron Jobs](https://render.com/docs/cronjobs)
