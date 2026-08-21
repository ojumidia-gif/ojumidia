# Modelo seguro de variáveis de ambiente

Copie somente as chaves necessárias para o ambiente escolhido no painel **Environment** do Render ou para um arquivo `.env` local que permaneça fora do controle de versão. Os valores abaixo são propositalmente vazios e não representam credenciais.

```dotenv
# Runtime
NODE_ENV=production
PORT=3000
OJU_PUBLIC_BASE_URL=https://SEU-SERVICO.onrender.com

# Banco MySQL/TiDB
DATABASE_URL=mysql://USER:PASS@HOST:3306/DB_NAME

# OAuth, sessão e Super Admin
JWT_SECRET=GERAR_UM_SEGREDO_LONGO
VITE_APP_ID=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=

# Desenvolvimento local apenas; nunca habilitar no Render
OJU_LOCAL_DEV_LOGIN_ENABLED=false
OJU_LOCAL_ADMIN_EMAIL=

# Escolha Forge Storage OU S3 compatível
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false

# Cron externo da Lixeira Editorial
EDITORIAL_TRASH_CRON_SECRET=GERAR_SEGREDO_DISTINTO

# Integrações opcionais já referenciadas pelo frontend
VITE_OJU_STATIC_PREVIEW=false
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
```

| Grupo                                | Obrigatório em produção                     | Observação                                                                           |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Banco                                | Sim                                         | `DATABASE_URL` deve usar MySQL/TiDB compatível com o schema Drizzle atual.           |
| Sessão e OAuth                       | Sim para acesso administrativo real         | Sem essas chaves, o portal público pode responder, mas login e sessão não funcionam. |
| Super Admin                          | Sim na primeira ativação                    | `OWNER_OPEN_ID` é o identificador OAuth real do titular, não o e-mail público.       |
| Storage                              | Sim para uploads                            | Configure Forge **ou** S3 compatível; não armazene mídias no disco do Render.        |
| Cron editorial                       | Sim se o expurgo automático estiver ativado | O mesmo segredo deve ser usado somente pelo Web Service e pelo Cron Job.             |
| Firebase, analytics e Forge frontend | Condicional                                 | Só informe quando a integração correspondente estiver ativa.                         |

> Nunca envie este conjunto de valores por chat, commit, ZIP público ou `render.yaml`. O Render permite cadastrar valores diretamente no Dashboard e compartilhar grupos de ambiente quando necessário.
