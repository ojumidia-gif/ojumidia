# QA-AUTO — robô operacional Playwright

## Ambientes

| | Compose | MySQL | Database | Volume |
| --- | --- | --- | --- | --- |
| **DEV** | `docker-compose.local.yml` | `127.0.0.1:3306` | `oju_midia` | `oju_mysql_data` |
| **QA** | `docker-compose.qa.yml` | `127.0.0.1:3307` | `oju_midia_qa` | `oju_qa_mysql_data` |
| **BETA** | — | Aiven | dados reais | Tigris / Render |

`pnpm test:e2e` (público) ainda pode herdar o `.env` da máquina. **Migrate, mutação e captura OAuth de QA usam somente `.env.qa`.**

`pnpm qa:migrate` aplica os SQL oficiais `0000`–`0054` statement a statement. Não usa `drizzle-kit migrate` (o kit envia arquivos multi-statement numa query só). Não usa `db:push` e não gera SQL novo. Aiven/Beta permanecem em 0053 até autorização explícita.

O envGuard aborta Aiven mesmo se o hostname Aiven estiver na allowlist. Também recusa `oju_midia` e porta 3306 quando `E2E_DATABASE_NAME` / `E2E_DATABASE_PORT` exigem QA.

## Comandos QA

```bash
cp .env.qa.example .env.qa   # senhas locais; NÃO copiar DATABASE_URL nem Tigris do .env

docker compose --env-file .env.qa -f docker-compose.qa.yml config
pnpm qa:up
pnpm qa:ps

pnpm qa:migrate   # SQL oficial 0000–0053 via .env.qa (não usa drizzle-kit migrate)
pnpm qa:verify

pnpm test:e2e:qa
pnpm qa:chrome
# PowerShell: $env:E2E_AUTH_CAPTURE="1"; $env:E2E_AUTH_PERSONA="super-admin"; pnpm test:e2e:auth

pnpm qa:down
# reset duro SOMENTE oju_qa_mysql_data (nunca Aiven, nunca oju_mysql_data):
pnpm qa:reset
```

## Isolamento mutante

1. `E2E_ALLOW_MUTATION=1`
2. `baseURL` `http://127.0.0.1:3100`
3. `DATABASE_URL` → `127.0.0.1:3307/oju_midia_qa`
4. `E2E_DATABASE_ALLOWED_HOSTS=127.0.0.1`
5. `E2E_DATABASE_NAME=oju_midia_qa`
6. `E2E_DATABASE_PORT=3307`
7. Storage: `LOCAL_STORAGE_DIR=.qa-storage`, `E2E_STORAGE_ISOLATED=1`, prefixo `qa-auto/<runId>/`
8. WebServer QA zera `S3_*` / `TIGRIS_*`

## Storage

QA: `.qa-storage/`. Dev: `.local-storage/`. Produção: Tigris. Cleanup só keys do TestLedger.

## storageState

O Google recusa Chromium/Chrome **lançado pelo Playwright** (`navigator.webdriver`, `--enable-automation`) com «Esse navegador ou app pode não ser seguro». Isso não é `redirect_uri_mismatch`.

```powershell
pnpm qa:chrome
# na outra janela, com o servidor QA (o próprio test:e2e:auth sobe a 3100):
$env:E2E_AUTH_CAPTURE="1"
$env:E2E_AUTH_PERSONA="super-admin"
pnpm test:e2e:auth
```

1. `pnpm qa:chrome` abre o Chrome do Windows com CDP (`E2E_AUTH_CDP_PORT`, padrão 9222) e perfil `QA_CHROME_PROFILE` (padrão `.qa-chrome-profile/`, gitignored). Para o participante, use perfil e porta distintos do Super Admin (`.qa-chrome-profile-participant` / 9223) para não reutilizar a sessão Google administrativa.
2. `pnpm test:e2e:auth` sobe a app QA, **conecta** a esse Chrome (não lança o Chromium) e abre `/admin`.
3. Complete o Google **nessa** janela até o painel com «Sair».
4. O teste grava `e2e/.auth/super-admin.json` só com cookie `app_session_id` + `auth.me` Super Admin.

Sem JWT/cookie fabricado. `GOOGLE_SUPER_ADMIN_EMAILS` / `SUBS` não são alterados. No Console Google: OAuth client tipo Web, redirect `http://127.0.0.1:3100/api/auth/google/callback`, e-mail Super Admin na lista de testers se o consent estiver em Testing.

## Classificação tRPC (robô)

READ-ONLY SAFE vs QUERY COM EFEITO COLATERAL (8 da denylist) vs MUTATION. Ver `e2e/lib/writeOnRead.ts`.

## Projetos

- `pnpm test:e2e` — public / professional (skip) / placeholders / infra (config padrão)
- `pnpm test:e2e:qa` — infra + Super Admin contra Docker QA (`--project=infra` e `super-admin`)
- `pnpm test:e2e:qa:all` — infra + mapa público + segurança + Super Admin + rotas admin + jornada da Rede + gates de identidade/comercial
- `pnpm test:e2e:qa:fase2` — jornada da Rede somente
- `pnpm test:e2e:auth` — captura OAuth headed, projeto `auth-capture`

## Relatórios

list + HTML + JSON gitignored. Cleanup failure = FAIL.
