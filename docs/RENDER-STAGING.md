# Ojú Mídia — staging full-stack no Render

## Objetivo

Este roteiro coloca a Ojú Mídia em **staging real full-stack** no Render. O Web Service executa o backend Express, tRPC, OAuth, SSE, upload, guards multiadmin e o frontend compilado na mesma origem. O Firebase Hosting continua disponível como prévia visual estática, mas não substitui a operação autenticada.

> O staging só é considerado aceito depois de `health`, `ready`, OAuth, Super Admin, parceiro, upload, autorização e isolamento territorial serem validados com configurações externas reais.

## Arquitetura preservada

| Camada       | Componente                            | Papel no staging                                                                                   |
| ------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Interface    | React 19, Vite, Tailwind, React Query | Compilada em `dist/public` e servida pelo Express.                                                 |
| API          | Express 4 e tRPC 11                   | Executa `/api/trpc`, OAuth, SSE, upload, arquivos protegidos e agendamento editorial.              |
| Persistência | Drizzle ORM + MySQL/TiDB              | Recebe migrations e guarda dados editoriais, comerciais, parceiros, auditoria e sessões de upload. |
| Autenticação | OAuth e cookie JWT                    | Exige callback público, nonce e atribuição de papel no backend.                                    |
| Storage      | Forge Storage ou S3 compatível        | Mantém mídia fora do disco efêmero do Render.                                                      |
| Prévia       | Firebase Hosting                      | Permanece como modo estático; não possui login full-stack.                                         |

Não foram removidos Firebase Preview, regras editoriais, mídia documental, Parceiros Ojú, curadoria nacional, comercial, contratos, lixeira, auditoria ou controles de concorrência.

## Pré-requisitos externos

| Serviço             | Necessário para                 | Configuração externa                                                      |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| Render Web Service  | Portal, API, admin e OAuth      | Conectar repositório privado e usar `render.yaml`.                        |
| MySQL/TiDB          | Dados persistentes e migrations | Fornecer `DATABASE_URL` com acesso de staging.                            |
| OAuth               | Login e sessão administrativa   | Registrar callback `https://SEU-SERVICO.onrender.com/api/oauth/callback`. |
| Forge Storage ou S3 | Upload e Acervo                 | Configurar uma única alternativa de storage.                              |
| Render Cron Job     | Expurgo automático da Lixeira   | Configurar depois que o Web Service responder publicamente.               |
| Firebase            | Prévia visual, se desejada      | Mantido separado do staging full-stack.                                   |

## Configuração do Web Service

| Campo Render | Valor                                                             |
| ------------ | ----------------------------------------------------------------- |
| Runtime      | Node                                                              |
| Node         | `22.13.0` via `.node-version`                                     |
| Build        | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| Pre-deploy   | `pnpm db:migrate`                                                 |
| Start        | `pnpm start`                                                      |
| Health check | `/health`                                                         |
| Bind         | `0.0.0.0:$PORT`                                                   |

O `render.yaml` contém somente o Web Service e chaves sem valores. Não informa senha, token, domínio privado, URL de banco ou credenciais de storage.

## Variáveis de ambiente

Use `docs/ENVIRONMENT_RENDER_TEMPLATE.md` como o inventário de chaves. Ele contém somente exemplos seguros. Os valores reais pertencem ao painel **Environment** do Render e não devem ser enviados por chat, commit ou ZIP público.

As chaves mínimas são `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` e `OWNER_OPEN_ID`. Para upload, informe Forge Storage **ou** S3 compatível. Para expurgo, defina `EDITORIAL_TRASH_CRON_SECRET`.

## Banco e migrations

O projeto usa MySQL/TiDB. O banco não pode ser substituído por memória, SQLite local ou Firestore de conveniência. A sequência correta é:

```text
desenvolvimento: pnpm db:generate
staging/produção: pnpm db:migrate
```

Faça backup antes da primeira migration de staging. As migrations são aplicadas de forma ordenada; não use comandos destrutivos ou reexecute geração de migration diretamente no Render.

## OAuth, sessão e Super Admin

O callback é `/api/oauth/callback`. A aplicação usa nonce e cookie `httpOnly`; em HTTPS sob proxy, o cookie é marcado como seguro. O `OWNER_OPEN_ID` é o identificador OAuth do titular, não o e-mail de contato público.

`OJU_LOCAL_DEV_LOGIN_ENABLED` deve estar ausente ou `false` no Render. As rotas locais de desenvolvimento respondem 404 fora de `NODE_ENV=development`.

## Health, readiness e observabilidade

| Endpoint                    | Objetivo                                | Resultado esperado                                           |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| `GET /health`               | Verificar se o processo HTTP está vivo. | `200 {"status":"ok"}`.                                       |
| `GET /ready`                | Verificar conexão mínima com o banco.   | `200 {"status":"ready"}` ou `503` sem expor dados sensíveis. |
| `GET /api/editorial/events` | Sincronização editorial SSE.            | Stream acessível quando o serviço estiver saudável.          |

Os logs registram inicialização e falhas técnicas sem imprimir cookie, token, senha ou segredo. APIs inexistentes sob `/api/*` retornam JSON 404, nunca o HTML da SPA.

## Cron de expurgo da Lixeira Editorial

Depois do Web Service responder em uma URL pública, crie um Cron Job Render com o mesmo repositório:

| Campo                         | Valor                                          |
| ----------------------------- | ---------------------------------------------- |
| Agenda UTC                    | `0 * * * *`                                    |
| Comando                       | `node scripts/render-editorial-trash-cron.mjs` |
| `OJU_PUBLIC_BASE_URL`         | `https://SEU-SERVICO.onrender.com`             |
| `EDITORIAL_TRASH_CRON_SECRET` | O mesmo valor do Web Service.                  |

A chamada usa `POST /api/scheduled/editorial-trash-purge` e é idempotente. Não foram usados timers dentro do processo web, `node-cron`, Redis, RabbitMQ ou worker adicional.

## Roteiro de aceite

1. Abra `/health`, depois `/ready`.
2. Acesse a Home e uma rota direta, como `/admin`, para confirmar o fallback SPA.
3. Inicie OAuth e valide callback, login, logout e sessão expirada.
4. Confirme o Super Admin com a conta cujo `openId` corresponde a `OWNER_OPEN_ID`.
5. Crie ou ative dois Parceiros Ojú com territórios diferentes e confirme que cada administrador só vê o próprio escopo.
6. Envie mídia real autorizada, valide checksum, estado técnico, aprovação, vínculo editorial e publicação separada.
7. Teste edição concorrente da mesma publicação e confirme conflito, sem sobrescrita silenciosa.
8. Teste exclusão, lixeira, restauração e o cron manual do Render somente em staging.

## Troubleshooting

| Sintoma                              | Causa provável                                              | Como resolver                                                                    |
| ------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `OAUTH_SERVER_URL is not configured` | Variáveis OAuth ausentes no build/runtime.                  | Preencher `VITE_APP_ID`, `OAUTH_SERVER_URL` e `VITE_OAUTH_PORTAL_URL`; redeploy. |
| Login volta sem sessão               | Callback ou origin não registrado; cookie HTTPS não aceito. | Registrar o callback `onrender.com`, confirmar HTTPS e limpar cookies antigos.   |
| `/ready` responde 503                | Banco inacessível ou URL incorreta.                         | Revisar `DATABASE_URL`, rede, SSL do provedor e migrations.                      |
| Upload falha                         | Storage não configurado ou credencial inválida.             | Configurar Forge **ou** todas as chaves S3 exigidas.                             |
| Site mostra HTML para API inválida   | Artefato antigo ou servidor não atualizado.                 | Confirmar `pnpm build`, `pnpm start` e a regra `/api` no runtime.                |
| Expurgo não executa                  | Cron ainda não criado ou segredo diferente.                 | Criar o Cron Job, copiar URL pública e usar o mesmo segredo.                     |

## Referências

[1] [Render Blueprints](https://render.com/docs/blueprint-spec)

[2] [Render Health Checks](https://render.com/docs/health-checks)

[3] [Render Node.js Runtime](https://render.com/docs/node-version)

[4] [Render Environment Variables](https://render.com/docs/configure-environment-variables)

[5] [Render Cron Jobs](https://render.com/docs/cronjobs)
