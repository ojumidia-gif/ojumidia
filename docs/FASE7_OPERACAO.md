# Operação Ojú — Fase 7

Documento operacional. Não substitui o princípio do produto: **rede territorial de visibilidade, memória, cultura e conexão**. Não é portfólio, marketplace, feed, depósito nem pay-to-appear.

Janela editorial pública: **5 JPG + 1 miniclip ≤ 60 s**.

## Arquitetura

```text
GitHub     versionamento
Render     app (React + Express + tRPC)  — ojumidia.onrender.com
Aiven      MySQL (DATABASE_URL)
Tigris     mídia S3-compatible (S3_* / TIGRIS_*)
Google     OAuth admin
```

Domínios públicos validados anteriormente: `ojumidia.onrender.com`, `ojumidia.com.br`, `www.ojumidia.com.br`.

O disco do Render **não** é Acervo. Bytes novos: Tigris. Metadados: Aiven.

## Identidade ≠ permissão

```text
users.role          RBAC (criador, editor, aprovador, administrador, administrador principal)
professionalProfiles  identidade na Rede
professionalProfileSpecialties  catálogo de especialidades (não é RBAC)
networkBond         criador-parceiro | parceiro-midia
territory           escopo geográfico
```

`users.role` e `adminJoinRequests.practice` **não** são profissão nem matching.

Super Admin (`administrador principal` + allowlist Google) é nacional e **não delegável**.

Administrador territorial opera só o Parceiro/território autorizado no backend (`assertPartnerScope`).

## Fluxos da Rede (internos)

```text
Pedido comercial / mesa
  → Opportunity (snapshot da commercialPolicy)
  → convite / matching determinístico (especialidade + território + vínculo + status)
  → aceite congela valores
  → Production (1:1 com Opportunity aceita)
  → mídia via mediaAssets (um Acervo)
  → editorialReady ≠ publicação
  → publicação no CMS existente
  → settlement a partir do snapshot congelado
  → PaymentProvider isolado + webhook HMAC
```

Opportunity **não** é marketplace público. Pagamento **não** controla diretório nem Home.

## Pagamentos

Abstração: `shared/paymentProvider.ts` (`PixWebhookProvider` stub). Sem SDK de gateway no `package.json`.

Webhook: `POST /api/payments/webhook` — HMAC `x-oju-payment-signature` + `x-oju-payment-timestamp`, janela 5 min, `eventId` único.

Variáveis (nomes apenas; sem valor inventado):

- `PAYMENT_PROVIDER`
- `PAYMENT_WEBHOOK_SECRET`

Não armazenar cartão, CVV nem senha bancária.

## Variáveis de ambiente

Separar development / staging / production no Dashboard (Render) e no `.env` local. **Nunca commitar `.env`.**

| Nome | Papel | Relatório (sem valor) |
| --- | --- | --- |
| `NODE_ENV` | runtime | necessário |
| `PORT` | listen | necessário (Render injeta) |
| `DATABASE_URL` | Aiven | necessário em produção |
| `JWT_SECRET` | sessão | necessário |
| `GOOGLE_CLIENT_ID` | OAuth | necessário produção |
| `GOOGLE_CLIENT_SECRET` | OAuth | necessário produção — nunca no frontend |
| `GOOGLE_OAUTH_REDIRECT_URI` | callback canônico | necessário produção |
| `GOOGLE_OAUTH_REDIRECT_URIS` | callbacks extras | opcional |
| `GOOGLE_SUPER_ADMIN_EMAILS` | allowlist | necessário produção |
| `GOOGLE_SUPER_ADMIN_SUBS` | allowlist sub | opcional |
| `OJU_LOCAL_DEV_LOGIN_ENABLED` | login local | **false/ausente no Render** |
| `OJU_LOCAL_ADMIN_EMAIL` | login local | só desenvolvimento |
| `S3_BUCKET` / `TIGRIS_BUCKET` | storage | necessário produção |
| `S3_ENDPOINT` / `TIGRIS_ENDPOINT` | storage | necessário produção |
| `S3_ACCESS_KEY_ID` / `TIGRIS_ACCESS_KEY_ID` | storage | necessário produção |
| `S3_SECRET_ACCESS_KEY` / `TIGRIS_SECRET_ACCESS_KEY` | storage | necessário produção — nunca no frontend |
| `S3_REGION` | storage | `auto` |
| `S3_FORCE_PATH_STYLE` | storage | `true` |
| `EDITORIAL_TRASH_CRON_SECRET` | cron | necessário se cron ativo |
| `OJU_PUBLIC_BASE_URL` | URLs públicas / cron | necessário produção |
| `PAYMENT_WEBHOOK_SECRET` | webhook | ausente até gateway autorizado |
| `PAYMENT_PROVIDER` | provedor | ausente até autorização |
| `VITE_*` | bundle público | só chaves públicas de analytics/prévia |

Este repositório **não** contém `.env` versionado.

## Estado confirmado no Aiven (somente leitura)

Consulta em 2026-09-07: `START TRANSACTION READ ONLY` em `defaultdb` (SSL). Sem INSERT/UPDATE/DELETE/DDL/migrate.

- `__drizzle_migrations`: **54 linhas** (ids 1–54). Hashes **0000–0047 intactos**. 0048–0053 registrados após aplicação controlada (2026-09-07).
- `pnpm db:migrate` sozinho **não** executa arquivos com vários statements (mysql2/drizzle envia o ficheiro inteiro). 0048 (um CREATE) foi via `drizzle-kit migrate`. 0049–0053 foram aplicadas statement a statement a partir do SQL **inalterado**, depois INSERT do hash SHA-256.
- Tabelas da Rede **existem**. Contagens da Rede = 0 (sem órfãos).

## Migrations

`drizzle-kit migrate` só aplica o que está em `drizzle/meta/_journal.json`.

**Journal atual: 0000 … 0047.** Último tag: `0047_governance_beta`. **Confirmado no Aiven.**

Arquivos SQL **locais, fora do journal** (não aplicados pelo pre-deploy do Render):

| Arquivo | Depende de | Conteúdo |
| --- | --- | --- |
| `0048_coverage_offer_declines.sql` | 0047 | `coverageOfferDeclines` |
| `0049_professional_network.sql` | 0047 | `professionalProfiles`, especialidades, `mediaOutlets`, colunas em `adminJoinRequests`, `networkExecutors.professionalProfileId` |
| `0050_network_opportunities.sql` | 0049 | Opportunity + convites |
| `0051_network_productions.sql` | 0050 | Production + `networkProductionMedia` |
| `0052_network_operations.sql` | 0051 | notificações, settlements, deliveries |
| `0053_network_payments_directory.sql` | 0049 (ALTER perfil) + 0052 (settlement id) | Pix intents, receipts, `publicSlug` |

Snapshots Drizzle param em `0038_snapshot.json`. 0039–0047 estão no journal **sem** snapshot correspondente. **Não reescrever histórico aplicado. Não gerar migration artificial só para “arrumar” journal.**

Há DDL em runtime legado:

- `server/joinRequestsTable.ts` (`CREATE TABLE IF NOT EXISTS` + `ALTER practice`)
- `server/coverageOfferDeclinesTable.ts` (`CREATE TABLE IF NOT EXISTS`)

Isso **não** substitui 0046/0048. Remover o DDL em runtime **antes** da tabela existir no Aiven quebraria o fluxo. Correção: aplicar 0048 com autorização e então retirar o `CREATE` de runtime.

### Plano de aplicação (NÃO executar nesta fase)

1. Backup Aiven (snapshot do provedor).
2. `__drizzle_migrations` já confirmado até 0047 (leitura 2026-09-07). Repetir backup imediatamente antes de aplicar.
3. Aplicar **0048** → validar tabela `coverageOfferDeclines`.
4. Aplicar **0049** → validar `professionalProfiles`.
5. Aplicar **0050** → validar `networkOpportunities`.
6. Aplicar **0051** → validar unique `network_production_opportunity_unique`.
7. Aplicar **0052** → validar unique settlement por produção.
8. Aplicar **0053** → validar `publicSlug` e `networkPaymentIntents`.
9. Só então, se a política for usar drizzle-kit, **incluir as tags no journal** com hashes reais. Até lá, **não** adicionar 0048–0053 ao journal: o pre-deploy `pnpm db:migrate` ficaria no-op (hoje) ou aplicaria cegamente (se o journal for alterado).
10. Smoke: `/health`, `/ready`, login OAuth, Acervo, `/rede`.

Rollback por arquivo está comentado no cabeçalho de cada SQL. Rollback de 0053 **antes** de dropar 0049.

## Deploy

Render (`render.yaml`): build `pnpm build`, pre-deploy `pnpm db:migrate` (hoje só 0000–0047), start `pnpm start`, health `/health`.

**Não** `pnpm db:generate` em produção. **Não** `db:push` em Aiven.

Não alterar OAuth, Tigris, DNS ou Render sem incidente concreto.

## SEO

- Portal: `PageMeta` (title, description, OG, canonical).
- Admin/API: `X-Robots-Tag: noindex, nofollow` + `client/public/robots.txt`.
- Sitemap estático de rotas públicas: `client/public/sitemap.xml` (não lista Opportunity, admin, financeiro).
- Perfis da Rede só quando `publicVisible` + status `Ativo` (e equivalentes publicados com consentimento).

## Auditoria

Reutilizar `auditEvents`. Ações da Rede incluem `opportunity_*`, `production_*`, `payment_*`, `directory_profile_*`, `settlement_*`. Não gravar secrets nem PAN/CVV.

## Testes locais

```bash
pnpm check
pnpm test
pnpm build
```
