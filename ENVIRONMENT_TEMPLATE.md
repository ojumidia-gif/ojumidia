# Modelo de ambiente local

Crie um arquivo chamado `.env` na raiz do projeto e copie as variáveis abaixo, substituindo todos os valores de exemplo. O `.env` nunca deve ser incluído em commits ou distribuído no ZIP.

```dotenv
# Aplicação e sessão
NODE_ENV=development
PORT=3000
JWT_SECRET=troque-por-uma-chave-longa-e-aleatoria-com-32-ou-mais-caracteres

# Banco MySQL local
DATABASE_URL=mysql://oju_local:troque-esta-senha@127.0.0.1:3306/oju_midia

# OAuth Google no servidor e sessão própria
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_SUPER_ADMIN_EMAILS=ojumidia@gmail.com,aquinopratesr@gmail.com
GOOGLE_SUPER_ADMIN_SUBS=

# Administrador principal local de desenvolvimento
OJU_LOCAL_ADMIN_EMAIL=aquinopratesr@gmail.com

# Acesso automático de administrador para testes internos sem OAuth — NUNCA usar em produção
OJU_LOCAL_DEV_LOGIN_ENABLED=true

# Storage de desenvolvimento local (NUNCA em produção)
# Sem S3/Forge, o servidor grava em .local-storage apenas quando NODE_ENV=development
LOCAL_STORAGE_DIR=.local-storage

VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=

# Storage persistente (produção ou homologação). Em desenvolvimento local, deixe em branco para usar .local-storage
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false

# Firebase Web SDK — configuração pública centralizada; não adicionar service accounts ou private keys
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=ojumidia
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Somente se usar Docker local
MYSQL_DATABASE=oju_midia
MYSQL_USER=oju_local
MYSQL_PASSWORD=troque-por-uma-senha-local-forte
MYSQL_ROOT_PASSWORD=troque-por-outra-senha-local-forte
```
