# Modelo de ambiente local

Crie um arquivo chamado `.env` na raiz do projeto e copie as variáveis abaixo, substituindo todos os valores de exemplo. O `.env` nunca deve ser incluído em commits ou distribuído no ZIP.

```dotenv
# Aplicação e sessão
NODE_ENV=development
PORT=3000
JWT_SECRET=troque-por-uma-chave-longa-e-aleatoria-com-32-ou-mais-caracteres

# Banco MySQL local
DATABASE_URL=mysql://oju_local:troque-esta-senha@127.0.0.1:3306/oju_midia

# OAuth necessário para o login administrativo completo
VITE_APP_ID=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=

# Administrador principal local de desenvolvimento
OJU_LOCAL_ADMIN_EMAIL=aquinopratesr@gmail.com

# Acesso automático de administrador para testes internos sem OAuth — NUNCA usar em produção
OJU_LOCAL_DEV_LOGIN_ENABLED=true

# Serviços opcionais; manter em branco até configuração autorizada
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=

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
