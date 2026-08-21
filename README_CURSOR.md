# Ojú Mídia — Guia completo para Cursor

## O que vem no projeto

O pacote contém portal público, Centro Administrativo, fluxos editoriais, banco com migrações Drizzle, testes, documentação jurídica do piloto e apresentação executiva. O pacote **não** contém banco de produção, mídia privada, `node_modules`, sessões, tokens, credenciais OAuth, chaves Manus ou Firebase.

Leia primeiro [`SECURITY_RULES.md`](./SECURITY_RULES.md). A configuração de Firebase é propositalmente posterior aos testes locais.

## Pré-requisitos

| Item | Versão recomendada |
|---|---|
| Cursor ou VS Code | Versão atual |
| Node.js | 22 LTS |
| Corepack | Incluso no Node 22 |
| pnpm | Gerenciado pelo Corepack e pelo `packageManager` do projeto |
| MySQL | 8.4, se quiser executar fluxos completos com banco |
| Docker Desktop | Opcional; usado pela alternativa com `docker-compose.local.yml` |

## Opção A — Rodar diretamente pelo Cursor

1. Extraia o ZIP e abra a pasta `oju-midia` no Cursor.
2. Abra o terminal integrado do Cursor e execute:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

3. Crie manualmente o arquivo `.env` na raiz e copie o modelo de [`ENVIRONMENT_TEMPLATE.md`](./ENVIRONMENT_TEMPLATE.md). Para validar toda a operação sem OAuth, defina `JWT_SECRET`, `DATABASE_URL`, `OJU_LOCAL_ADMIN_EMAIL=aquinopratesr@gmail.com` e `OJU_LOCAL_DEV_LOGIN_ENABLED=true`. O e-mail `ojumidia@gmail.com` é exclusivamente o canal comercial público e não deve receber papel administrativo. OAuth continua necessário somente quando o acesso externo oficial for conectado.
4. Com MySQL local pronto, crie o banco `oju_midia` e ajuste a `DATABASE_URL`.
5. Aplique as migrações e valide o projeto:

```bash
corepack pnpm db:push
corepack pnpm check
corepack pnpm test
corepack pnpm dev
```

6. Abra `http://localhost:3000` no navegador. No teste local interno, entre no Centro Administrativo pelo gesto reservado no logotipo do rodapé ou por `http://localhost:3000/admin`; a sessão de **administrador principal local** será aberta automaticamente, sem OAuth e sem senha. A sessão dura até oito horas; depois disso, a entrada local automática ocorre novamente.

## Opção B — Rodar com Docker Desktop

Esta alternativa cria um MySQL local e a aplicação sem colocar senha dentro do código.

1. Crie manualmente o `.env` a partir de [`ENVIRONMENT_TEMPLATE.md`](./ENVIRONMENT_TEMPLATE.md) e defina senhas locais exclusivamente para sua máquina:

```bash
# No Cursor, crie o arquivo .env e cole o conteúdo do ENVIRONMENT_TEMPLATE.md.
```

2. Acrescente estas linhas ao final do `.env`, trocando os valores:

```bash
MYSQL_DATABASE=oju_midia
MYSQL_USER=oju_local
MYSQL_PASSWORD=uma-senha-local-forte
MYSQL_ROOT_PASSWORD=outra-senha-local-forte
```

3. Inicie o ambiente:

```bash
docker compose -f docker-compose.local.yml --env-file .env up --build
```

4. Em outro terminal, aplique as migrações dentro do contêiner da aplicação:

```bash
docker compose -f docker-compose.local.yml --env-file .env exec app corepack pnpm db:push
```

5. Abra `http://localhost:3000`. Para desligar:

```bash
docker compose -f docker-compose.local.yml --env-file .env down
```

Para apagar também o banco local de teste, use `docker compose -f docker-compose.local.yml --env-file .env down -v`.

## Rotina de desenvolvimento

| Objetivo | Comando |
|---|---|
| Verificar TypeScript | `corepack pnpm check` |
| Executar testes | `corepack pnpm test` |
| Rodar em desenvolvimento | `corepack pnpm dev` |
| Criar e aplicar migrations | `corepack pnpm db:push` |
| Gerar build de produção | `corepack pnpm build` |
| Rodar build | `corepack pnpm start` |

## Firebase e Cloud Run — staging externo

Depois dos testes locais, a opção externa compatível é **Firebase Hosting + Cloud Run**, não Firebase Hosting estático isolado. O roteiro completo, incluindo staging, segredos, canal interno de prévia, limitações do Centro Administrativo e comandos para o terminal do seu computador, está em [`docs/HOSPEDAGEM_TESTE_FIREBASE.md`](./docs/HOSPEDAGEM_TESTE_FIREBASE.md). Nenhuma chave Firebase, URL de banco, token, sessão ou service account deve ser colocada no repositório.

## Dúvidas comuns

**O acesso administrativo local não aparece ou não funciona.** Confirme que `NODE_ENV=development`, `OJU_LOCAL_DEV_LOGIN_ENABLED=true` e `OJU_LOCAL_ADMIN_EMAIL=aquinopratesr@gmail.com` estão definidos no `.env`; depois, reinicie `corepack pnpm dev`. Abra `http://localhost:3000/admin`; esse modo automático não existe em produção.

**O login administrativo oficial não funciona.** Verifique as variáveis OAuth. O acesso local serve exclusivamente para testes de desenvolvimento e não substitui a autenticação oficial quando o projeto estiver publicado.

**O banco não conecta.** Confira se MySQL está ativo, se o banco existe e se a `DATABASE_URL` aponta para o host correto. No Docker, o host do banco para a aplicação é `db`; fora do Docker costuma ser `127.0.0.1`.

**Uma mídia não envia.** Confirme sessão autenticada, papel autorizado, tipo permitido e limite de 16 MB. Para vídeo, respeite 60 segundos; para material completo, use o campo de link externo.
