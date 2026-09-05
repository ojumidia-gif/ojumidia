# Ojú Mídia

Portal público e Centro Administrativo da Ojú Mídia: memória territorial, cobertura editorial, Parceiros Ojú e governança por papéis.

```text
GitHub  →  versionamento
Render  →  aplicação (React + Express + tRPC)
Aiven   →  MySQL (DATABASE_URL)
Tigris  →  mídia (S3-compatible)
```

O disco do Render não guarda Acervo. URLs novas de mídia: `/media-storage/{chave}`. A rota `/manus-storage/*` existe só como leitura de links antigos.

## Requisitos

- Node.js 22.13.x
- pnpm (via Corepack)
- MySQL 8 (local) ou Aiven (produção)

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

## Ambiente

Copie `.env.example` para `.env`. Nunca commite `.env`.

Desenvolvimento local sem OAuth Google:

```dotenv
OJU_LOCAL_ADMIN_EMAIL=aquinopratesr@gmail.com
OJU_LOCAL_DEV_LOGIN_ENABLED=true
```

`ojumidia@gmail.com` é o canal comercial público. Ele **não cria, eleva ou recupera privilégios administrativos**. **Contas Google próprias**, autorizadas no banco e na allowlist, é que recebem papel.

`OJU_LOCAL_DEV_LOGIN_ENABLED` deve permanecer ausente ou `false` no Render.

## Comandos

```bash
pnpm db:push    # gerar e aplicar migrations (dev)
pnpm check
pnpm test
pnpm dev
pnpm build
pnpm start
```

Health: `GET /health`. Prontidão do banco: `GET /ready`.

## Identidade e papéis

- Super Admin: e-mail/sub na allowlist (`GOOGLE_SUPER_ADMIN_EMAILS` / `GOOGLE_SUPER_ADMIN_SUBS`) + papel `administrador principal`.
- Administrador territorial: grant + Parceiro Ojú + território. Não define o próprio território.
- Criador / editor / aprovador: etapas editoriais; não publicam sozinhos (publicar exige administrador ou Super Admin).
- Visitante: conteúdo publicado; sem Centro Administrativo.

Convites, permissões, parceiros, territórios, portal, Home, políticas financeiras e auditoria são operados no painel. O backend aplica escopo; o menu escondido não é a defesa.

## Armazenamento

**S3 é a fonte de verdade** para bytes (Tigris em produção). O banco guarda metadados e chaves, não BLOB.

Arquivos contratual/comercial abrem só por rota autenticada. O servidor confere se a pessoa é Super Admin ou a responsável pela carteira antes do URL temporário.

Uploads novos usam Tigris. Firebase Web (`VITE_FIREBASE_*`) é opcional e não substitui o storage de mídia.

## Render

Web Service Node, `render.yaml` na raiz.

| Campo | Valor |
| --- | --- |
| Build | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| Pre-deploy | `pnpm db:migrate` |
| Start | `pnpm start` |
| Health | `/health` |
| Node | `22.13.0` |

Callback OAuth: `https://SEU-SERVICO.onrender.com/api/auth/google/callback`.

Variáveis no Dashboard (não no Git): `DATABASE_URL`, `JWT_SECRET`, OAuth Google, Super Admin, `S3_*` (Tigris), `EDITORIAL_TRASH_CRON_SECRET`, `OJU_PUBLIC_BASE_URL`.

Cron da lixeira (UTC `0 * * * *`): `node scripts/render-editorial-trash-cron.mjs` com o mesmo segredo do Web Service.

Não rode `pnpm db:generate` em produção.
