# Implantação full-stack da Ojú Mídia no Render

## Escopo e pré-requisitos

Esta implantação usa **um Web Service Node** para servir a aplicação React, Express, tRPC, OAuth, uploads e rotas SPA pela mesma origem. O projeto continua com MySQL/TiDB via Drizzle e usa Forge Storage ou um bucket S3 compatível; o disco efêmero do Render não é utilizado como Acervo permanente. O Firebase Hosting permanece reservado à prévia estática e não substitui este serviço completo.

> Não publique com acesso local habilitado. `OJU_LOCAL_DEV_LOGIN_ENABLED` deve permanecer ausente ou `false` no Render.

## 1. Preparar repositório e serviço

Envie o conteúdo do projeto para um repositório privado. No Render, crie um **Web Service** com runtime **Node**, conecte o repositório e importe o `render.yaml` ou copie as configurações abaixo.

| Campo              | Valor                                                             |
| ------------------ | ----------------------------------------------------------------- |
| Build command      | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| Pre-deploy command | `pnpm db:migrate`                                                 |
| Start command      | `pnpm start`                                                      |
| Health check       | `/health`                                                         |
| Node               | `22.13.0`, por `.node-version`                                    |

O serviço atende em `0.0.0.0` e usa a porta entregue em `PORT`. O endpoint `GET /health` retorna somente `{ "status": "ok" }` e não depende de autenticação. O endpoint `GET /ready` confirma a disponibilidade do banco e retorna `503` se a dependência não estiver pronta; use `/health` como health check do Render e `/ready` somente no aceite operacional.

## 2. Banco e migrations

Crie ou escolha um **MySQL/TiDB compatível** e defina `DATABASE_URL` no Render. A Ojú não cria Render Postgres no Blueprint, pois isso alteraria o banco já adotado pelo projeto. Antes de cada subida, o Render executa apenas `pnpm db:migrate`; a geração de migration é deliberadamente separada em `pnpm db:generate` para desenvolvimento.

Faça backup do banco antes da primeira aplicação e nunca rode `db:generate` diretamente em produção. As migrations existentes são aditivas e devem ser aplicadas em ordem.

## 3. OAuth, sessão e Super Admin

O login real usa `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` e `JWT_SECRET`. O navegador só abre a rota própria do servidor; o callback cadastrado no Google Cloud deve ser:

```text
https://SEU-SERVICO.onrender.com/api/auth/google/callback
```

Cadastre esta URL no Google Cloud antes de testar o Centro Administrativo. O proxy HTTPS do Render é reconhecido pelo servidor e os cookies de sessão permanecem `httpOnly`, `Secure` e `SameSite=None` em HTTPS.

Para provisionar o Super Admin, preencha `GOOGLE_SUPER_ADMIN_EMAILS` com `ojumidia@gmail.com,aquinopratesr@gmail.com`. Depois que cada titular entrar uma vez, grave os identificadores `google:<sub>` em `GOOGLE_SUPER_ADMIN_SUBS`.

## 4. Storage persistente

Selecione uma única configuração de storage:

| Alternativa         | Variáveis                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Forge/Manus Storage | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`                                                                                         |
| S3 ou compatível    | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`; use `S3_ENDPOINT` e `S3_FORCE_PATH_STYLE=true` se o provedor exigir. |

Os uploads continuam vinculados a usuário, parceiro e território, possuem checksum, idempotência, estados técnicos e aprovação editorial separada. O Render processa a requisição, mas o arquivo permanente permanece no storage.

## 5. Variáveis no Render

Use `docs/ENVIRONMENT_RENDER_TEMPLATE.md` apenas como mapa de chaves. Configure os valores reais na área **Environment** do Render e nunca faça commit de `.env`. As variáveis `VITE_*` são incorporadas durante o build; salve-as antes de disparar a compilação. Variáveis opcionais devem ser adicionadas somente se a respectiva integração estiver ativa.

## 6. Expurgo da Lixeira Editorial

O handler de expurgo é idempotente e protegido por `EDITORIAL_TRASH_CRON_SECRET`. Após a primeira implantação, crie um **Cron Job** no Render com o mesmo repositório, runtime Node, agenda UTC `0 * * * *` e comando:

```text
node scripts/render-editorial-trash-cron.mjs
```

No Cron Job, defina somente `OJU_PUBLIC_BASE_URL=https://SEU-SERVICO.onrender.com` e o mesmo `EDITORIAL_TRASH_CRON_SECRET` do Web Service. Não use `setInterval`, `node-cron` ou disco local. O cron executa fora do processo web e pode ser acionado manualmente pelo Dashboard do Render.

## 7. Teste de aceite após o deploy

Primeiro, abra `https://SEU-SERVICO.onrender.com/health`. Depois valide Home, rota direta `/admin`, login OAuth, logout, Super Admin, Parceiros Ojú, territórios, solicitações, Acervo, upload, publicação, exclusão, restauração e bloqueios entre parceiros. Configure o domínio próprio somente depois que a URL `onrender.com` e o callback OAuth funcionarem.

## Referências

[1] [Blueprint YAML Reference](https://render.com/docs/blueprint-spec)

[2] [Health Checks](https://render.com/docs/health-checks)

[3] [Setting Your Node.js Version](https://render.com/docs/node-version)

[4] [Environment Variables and Secrets](https://render.com/docs/configure-environment-variables)

[5] [Cron Jobs](https://render.com/docs/cronjobs)
