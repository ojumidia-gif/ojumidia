# Guia operacional — Blaze, Cloud Run e Centro Administrativo

Este guia é executado **somente depois** que o projeto Firebase `ojumidia` estiver no plano Blaze e com uma conta de faturamento ativa. Ele prepara uma publicação real com Firebase Hosting + Cloud Run, preservando o servidor Express/tRPC, o banco MySQL/TiDB, o armazenamento S3 e as regras de acesso da Ojú.

> **Ativar Blaze não libera login automático.** O atalho de Super Admin existe somente em desenvolvimento local. No site hospedado, `aquinopratesr@gmail.com` precisa concluir uma autenticação Google/OAuth configurada para produção e receber o papel `administrador principal` no banco.

## 1. Antes de iniciar

Confirme que o projeto correto é `ojumidia` e que você está no diretório raiz extraído do pacote, `oju-midia`. Não execute o processo com `NODE_ENV=development` e não publique a variável `OJU_LOCAL_DEV_LOGIN_ENABLED=true`.

| Verificação | Resultado necessário |
|---|---|
| Conta Google | Login com `aquinopratesr@gmail.com` no Firebase e no Google Cloud SDK. |
| Plano | Firebase Blaze ativo e conta Cloud Billing vinculada. |
| Projeto | `ojumidia` selecionado no Firebase CLI e no `gcloud`. |
| Código | ZIP mais recente extraído; `firebase-assets/` contém a marca e o miniclipe oficiais. |
| Dados | URL de banco de produção ou staging disponível de forma segura. |
| Autenticação | Provedor OAuth de produção e URLs de callback definidos. |

## 2. Preparar o computador

No PowerShell ou no terminal do Cursor, execute:

```powershell
corepack enable
pnpm install
pnpm check

npm install -g firebase-tools
firebase login
firebase projects:list

gcloud auth login
gcloud config set project ojumidia
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

Se a etapa de serviços falhar com uma mensagem de faturamento, o Blaze ainda não foi finalizado no projeto correto. Pare nesse ponto, confirme o vínculo da conta Cloud Billing e execute novamente apenas o último comando.

## 3. Registrar segredos fora do código

Nunca coloque valores reais em `.env` enviado ao Git, em `firebase.json`, no comando de deploy, em capturas de tela ou neste guia. Crie segredos no Secret Manager pelo terminal; o PowerShell pedirá o valor de forma interativa.

```powershell
gcloud secrets create oju-production-database-url --replication-policy=automatic
gcloud secrets versions add oju-production-database-url --data-file=-

gcloud secrets create oju-production-jwt-secret --replication-policy=automatic
gcloud secrets versions add oju-production-jwt-secret --data-file=-
```

Os valores obrigatórios do servidor são `DATABASE_URL` e `JWT_SECRET`. Para o login de produção, registre também as variáveis do provedor OAuth adotado, incluindo a URL do servidor OAuth, o identificador da aplicação e a URL do portal de autenticação quando aplicável. A lista exata deve ser revisada no arquivo `server/_core/env.ts` antes do deploy, sem expor os valores.

| Variável ou grupo | Finalidade | Pode ir para o Git? |
|---|---|---|
| `DATABASE_URL` | Banco MySQL/TiDB da Ojú | Não |
| `JWT_SECRET` | Assinatura da sessão do servidor | Não |
| OAuth de produção | Login Google/OAuth e callback do Centro Administrativo | Não |
| Chaves de armazenamento | Upload, leitura e documentos protegidos | Não |
| `NODE_ENV=production` | Modo seguro do servidor | Sim, mas deve ser fornecido apenas no ambiente Cloud Run |

## 4. Publicar o backend no Cloud Run

O projeto já possui scripts Node para compilar e iniciar o servidor Express. Não é necessário criar um Dockerfile customizado para o primeiro deploy. Execute, ajustando o nome do serviço se optar por staging:

```powershell
gcloud run deploy oju-midia-production `
  --source . `
  --region southamerica-east1 `
  --allow-unauthenticated `
  --set-secrets DATABASE_URL=oju-production-database-url:latest,JWT_SECRET=oju-production-jwt-secret:latest `
  --set-env-vars NODE_ENV=production
```

Guarde a URL HTTPS retornada pelo Cloud Run. Antes de conectar o Hosting, valide na própria URL que a Home abre e que as rotas públicas retornam estados vazios seguros caso ainda não exista conteúdo publicado.

## 5. Conectar Firebase Hosting ao Cloud Run

Mantenha o atual `firebase.json` para a prévia estática. Para a publicação integral, copie o arquivo-modelo e informe o serviço que acabou de criar:

```powershell
Copy-Item .\firebase.staging.template.json .\firebase.cloudrun.json
```

No arquivo copiado, defina o `serviceId` como `oju-midia-production` e confirme a região `southamerica-east1`. Em seguida, faça a primeira publicação em um canal privado usando temporariamente o arquivo como `firebase.json` ou aplicando a mesma regra de rewrite ao arquivo de Hosting de produção:

```powershell
firebase hosting:channel:deploy interno --project ojumidia
```

O rewrite deve encaminhar toda rota ao Cloud Run. Isso é necessário para que `/api/trpc`, `/api/editorial/events`, `/api/auth/google/start`, `/api/auth/google/callback`, documentos protegidos e as rotas da aplicação cheguem ao Express, em vez de serem respondidos somente como arquivos estáticos.

## 6. Configurar o login do Super Admin

O ambiente publicado **não usa** a rota local `/admin/acesso-local`. O fluxo esperado é:

```text
Cinco cliques no logotipo do rodapé ou /admin
        ↓
Autenticar com Google/OAuth de produção
        ↓
Callback HTTPS autorizado no servidor
        ↓
Sessão assinada pelo Cloud Run
        ↓
Verificação do papel no banco
        ↓
aquinopratesr@gmail.com e ojumidia@gmail.com como administradores principais
```

Antes de testar, cadastre no Google Cloud os domínios e o callback `https://SEU-DOMINIO/api/auth/google/callback`. O callback deve ser HTTPS e apontar para a rota que o servidor expõe.

Depois da primeira autenticação bem-sucedida, confira no banco se as contas titulares possuem o papel `administrador principal` e grave os `google:<sub>` em `GOOGLE_SUPER_ADMIN_SUBS`.

## 7. Roteiro de homologação antes do domínio final

Realize a avaliação no canal interno e registre o resultado antes de executar `firebase deploy --only hosting` no domínio padrão.

| Caso | Resultado esperado |
|---|---|
| Home e navegação | Marca e miniclipe carregam; as 10 entradas editoriais abrem suas rotas. |
| Publicação editorial | Um rascunho segue revisão, aprovação e publicação sem aparecer antes no portal. |
| Direitos de mídia | Mídia privada, arquivada ou na lixeira não pode virar capa pública. |
| Comunidade | Instituições, Agenda e Memórias exigem consentimento e respeitam visibilidade de contato/localização. |
| Lixeira | Publicação, mídia ou registro comunitário removido some do portal; a restauração volta como rascunho quando aplicável. |
| Sincronização | Alteração administrativa atualiza a página pública relacionada sem recarga manual. |
| Super Admin | A conta principal entra por OAuth e enxerga todos os painéis; a conta comercial não entra no admin. |
| Celular | Cabeçalho, formulários, filtros, mapa e ações administrativas permanecem utilizáveis. |

## 8. Só depois da homologação: deploy do Hosting padrão

Quando todos os casos da tabela anterior estiverem aprovados, o titular pode executar:

```powershell
firebase deploy --only hosting --project ojumidia
```

O domínio final `www.ojumidia.com.br` deve ser associado somente após a validação do canal interno e da autenticação. Ao alterar domínios, repita a configuração de callback OAuth e a verificação do login administrativo.

## Referências

[1]: https://firebase.google.com/docs/hosting/cloud-run "Firebase Hosting com Cloud Run"
[2]: https://cloud.google.com/run/docs/deploying-source-code "Implantar a partir do código-fonte no Cloud Run"
[3]: https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets "Criar e acessar segredos com Secret Manager"
