# Hospedagem de teste com Firebase

## Decisão arquitetural

O projeto Ojú Mídia não é um site estático simples. Ele utiliza React no cliente e um servidor Express com tRPC, sessão, rotas privadas de documentos, eventos editoriais, integração MySQL/TiDB e armazenamento S3. Portanto, executar apenas `firebase init` seguido de `firebase deploy` para **Firebase Hosting** publicaria os arquivos estáticos, mas não hospedaria o servidor que atende `/api/trpc`, `/api/media/upload`, `/api/editorial/events`, autenticação e documentos protegidos.

> Para testes internos imediatamente, o caminho já compatível é a hospedagem gerenciada do projeto no ambiente atual, pois mantém servidor, banco, armazenamento e segredos conectados. A publicação é feita manualmente pelo botão **Publish** depois de um checkpoint.

## Opções analisadas

| Opção | Compatibilidade com o projeto atual | Uso recomendado |
|---|---|---|
| Hospedagem gerenciada atual | Alta | Teste interno imediato, sem duplicar infraestrutura. |
| Firebase Hosting puro | Baixa | Apenas para uma versão estática, sem as APIs e o fluxo administrativo completos. |
| Firebase Hosting + Cloud Run | Alta | Teste público controlado ou operação futura, mantendo o Express em um contêiner. |
| Firebase App Hosting | Média | Alternativa baseada em repositório/GitHub e Cloud Run; exige validar o buildpack e segredos do projeto. |
| Cloud Functions for Firebase | Média-baixa | Exigiria reestruturar a inicialização Express para exportar um handler/função; não é a rota incremental preferida. |

## Caminho recomendado para Firebase

Para Firebase, a opção mais segura é **Firebase Hosting + Cloud Run**. O contêiner executa a aplicação Node/Express e o Firebase Hosting reescreve as solicitações HTTPS para esse serviço. Isso preserva o servidor atual, em vez de tentar converter tRPC e as rotas privadas em arquivos estáticos ou Functions.

O Firebase documenta que Cloud Run pode receber aplicações containerizadas em Node e que Firebase Hosting pode reescrever as solicitações para o serviço. Essa combinação exige conta de faturamento associada ao projeto, Cloud Run API habilitada e Google Cloud SDK configurado. [1] [2]

## Pré-requisitos que dependem do titular do projeto

1. Confirmar que o projeto Firebase/Google Cloud correto é `ojumidia` ou informar o ID definitivo.
2. Associar uma conta de faturamento e aceitar a mudança para o plano Blaze quando usar Cloud Run.
3. Habilitar a Cloud Run API no projeto Google Cloud.
4. Conceder ao operador autorizado as permissões Google Cloud necessárias para Cloud Run, Artifact Registry, Cloud Build e Firebase Hosting.
5. Definir como os segredos de produção ou teste serão fornecidos ao Cloud Run. `DATABASE_URL`, `JWT_SECRET`, OAuth e chaves de armazenamento não podem ir para `firebase.json`, Git ou imagens públicas.

## Fluxo de teste interno recomendado

1. **Antes de Firebase:** testar tudo no ambiente atual pela prévia e criar um checkpoint. Para expor uma versão temporária pelo ambiente atual, usar o botão **Publish** da interface; a aplicação já recebe as integrações de banco e servidor do projeto.
2. **Ao escolher Firebase:** criar um projeto/ambiente de teste separado, por exemplo `ojumidia-staging`, evitando usar domínio ou dados de produção.
3. Instalar a CLI no computador autorizado e fazer login interativo:

```bash
npm install -g firebase-tools
firebase login
firebase projects:list
```

4. Instalar e configurar o Google Cloud SDK no mesmo computador. Depois de autenticar e escolher o projeto correto:

```bash
gcloud auth login
gcloud config set project SEU_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

5. Preparar um contêiner de produção, configurar variáveis e segredos no Cloud Run, publicar o serviço e somente então criar as regras de rewrite do Firebase Hosting. Não rodar `firebase init` ou `firebase deploy` antes de confirmar qual projeto e ambiente serão usados.

6. Criar um canal de prévia do Hosting para avaliação interna, nunca deployar diretamente no site ao vivo:

```bash
firebase hosting:channel:deploy interno
```

O comando de publicação só deve ser executado pelo titular autenticado ou após confirmação explícita, porque ele altera recursos externos e pode gerar cobrança.

## Roteiro completo no Cursor para Firebase + Cloud Run

> Execute este roteiro **no seu computador**, dentro da pasta extraída do ZIP. Não execute o deploy com `NODE_ENV=development` e nunca use `OJU_LOCAL_DEV_LOGIN_ENABLED=true` fora da máquina local.

### 1. Preparar o projeto local

```bash
corepack enable
pnpm install
pnpm check
pnpm test
pnpm build
```

### 2. Instalar as CLIs e autenticar sua própria conta Google

```bash
npm install -g firebase-tools
firebase login
firebase projects:list

# Instale o Google Cloud SDK se o comando abaixo não existir.
gcloud auth login
gcloud config set project SEU_PROJECT_ID_DE_STAGING
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

### 3. Criar os segredos no Google Cloud

Crie valores novos para staging. **Não** copie os segredos do ambiente gerenciado e não salve valores em arquivos versionados. Para cada segredo, o comando pede a entrada segura no terminal:

```bash
printf 'COLE_A_DATABASE_URL_DE_STAGING' | gcloud secrets create oju-staging-database-url --data-file=-
printf 'COLE_UM_JWT_SECRET_NOVO_E_LONGO' | gcloud secrets create oju-staging-jwt-secret --data-file=-
```

Para o portal público, `DATABASE_URL` e `JWT_SECRET` são obrigatórios. Para testar o Centro Administrativo fora do ambiente gerenciado, é necessário também preparar autenticação externa compatível, descrita na seção **Limite de autenticação** abaixo. Não coloque `OJU_LOCAL_DEV_LOGIN_ENABLED` em Cloud Run.

### 4. Publicar o servidor Express no Cloud Run

O projeto possui `build` e `start` compatíveis com a aplicação Node/Express. O Cloud Run pode construir a partir do código-fonte:

```bash
gcloud run deploy oju-midia-staging \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-secrets DATABASE_URL=oju-staging-database-url:latest,JWT_SECRET=oju-staging-jwt-secret:latest \
  --set-env-vars NODE_ENV=production
```

No primeiro deploy, valide diretamente a URL retornada pelo Cloud Run. O portal público deve abrir; se o banco estiver vazio, ele deve exibir estados vazios sem dados fictícios.

### 5. Conectar Firebase Hosting ao Cloud Run

Inicialize somente o Hosting no projeto Firebase de staging:

```bash
firebase init hosting
```

Durante o assistente, escolha **Use an existing project**, selecione o projeto de staging e não habilite sobrescrita de arquivos do aplicativo. Depois, copie o modelo `firebase.staging.template.json` para `firebase.json`, substitua o identificador do serviço pelo nome efetivamente usado no Cloud Run (`oju-midia-staging`) e confira a região.

Em vez de publicar direto no domínio padrão, crie primeiro um canal interno:

```bash
firebase hosting:channel:deploy interno
```

O comando retorna uma URL de prévia. Compartilhe-a apenas com a equipe interna. Após validar o portal, o próximo passo poderá ser `firebase deploy --only hosting`, executado conscientemente pelo titular.

## Limite de autenticação fora do ambiente gerenciado

> **O Centro Administrativo não funciona em Firebase Hosting estático isolado.** Ele exige o servidor Express para responder `/api/trpc`, executar o callback OAuth, assinar a sessão, consultar permissões e proteger documentos. Sem Cloud Run ou outro servidor compatível, a prévia deve ser tratada como demonstração visual pública. A interface administrativa mostra esse estado explicitamente, em vez de manter uma tela de autenticação sem retorno.

O acesso administrativo atual utiliza o fluxo OAuth do ambiente gerenciado; ele não é transferido automaticamente para Firebase/Cloud Run apenas por instalar o Firebase Web SDK. Assim:

| Cenário externo | Estado atual |
|---|---|
| Portal público com banco e S3 externos configurados | Viável no Cloud Run |
| Centro Administrativo com login local automático | Bloqueado corretamente em produção |
| Centro Administrativo com OAuth do ambiente gerenciado | Exige um provedor externo compatível |
| Firebase Authentication como substituto | **Não implementado**; requer adaptação explícita do servidor para verificar tokens e manter papéis Ojú |

Para testar o fluxo administrativo real no Firebase, a próxima evolução técnica é integrar Firebase Authentication ou um OAuth Google próprio ao servidor, preservando o vínculo de usuários, termos e permissões existentes. Não ative Firebase Authentication sem essa adaptação, pois a interface por si só não cria sessão válida no tRPC.

## Prévia estática sem erros de API

Quando o objetivo for somente demonstrar o portal público no domínio Firebase, use o build específico abaixo. Ele não injeta analytics sem configuração, não abre stream SSE, não executa consultas tRPC e mostra uma mensagem explícita no Centro Administrativo em vez de tentar OAuth sem servidor:

```bash
pnpm build:firebase-preview
```

No Firebase Hosting, use `dist/public` como diretório público. Esse modo é deliberadamente limitado à prévia visual; ele não substitui Cloud Run, banco, S3, autenticação ou operação administrativa.

### Marca e vídeo incluídos no pacote de prévia

O ZIP de entrega contém uma única pasta de projeto, `oju-midia`. Dentro dela, a pasta `firebase-assets` contém exclusivamente os dois ativos oficiais autorizados para a demonstração pública: a marca Ojú (`oju-midia-marca.png`) e o miniclipe de ancestralidade (`orixas-transicao-ritual-cinematografica.mp4`).

O comando `pnpm build:firebase-preview`, executado dentro de `oju-midia`, copia esses dois arquivos para `dist/public/oju-assets`. Assim, a marca e o vídeo são enviados junto com o diretório que o Firebase Hosting publica; a prévia não depende da URL temporária do armazenamento da plataforma.

> Validação realizada: a prévia estática carregou a marca Ojú no cabeçalho e o miniclipe no hero; a rota `/admin` exibiu a orientação de prévia visual, sem uma tela de login sem retorno.

### Acesso do titular no computador local

O ambiente local de desenvolvimento é o caminho de teste ponta a ponta do Super Admin. Ele não usa OAuth externo, não pede senha e não é publicado no Firebase. Dentro da pasta `oju-midia`, crie ou atualize o arquivo `.env` local, preservando as demais variáveis de banco já necessárias para a operação:

```dotenv
OJU_LOCAL_DEV_LOGIN_ENABLED=true
OJU_LOCAL_ADMIN_EMAIL=aquinopratesr@gmail.com
```

O mesmo bloco está disponível em `config/local-superadmin.example.env` para cópia, sem segredos nem chaves de produção.

Depois, inicie a aplicação:

```powershell
pnpm dev
```

Abra `http://localhost:3000` e faça cinco cliques no logotipo no rodapé, ou abra `http://localhost:3000/admin/acesso-local`. Com `NODE_ENV=development` — já definido pelo comando `pnpm dev` — a sessão local é criada automaticamente como **administrador principal** para `aquinopratesr@gmail.com`. O banco configurado localmente continua necessário para testar os dados, publicações e demais fluxos reais.

### Publicação da prévia visual no Windows

No terminal do Cursor, dentro da pasta do projeto, execute:

```powershell
pnpm install
pnpm build:firebase-preview
```

Antes do comando, confirme que `firebase-assets` permanece dentro da pasta `oju-midia`, exatamente como no ZIP entregue.

O ZIP já inclui `firebase.json` configurado para publicar exclusivamente `dist/public`, tratar as rotas como aplicação de página única e enviar os arquivos `.png` e `.mp4` com cache de arquivo estático. Não execute `firebase init`, pois ele pode substituir essa configuração e apontar o deploy para outra pasta. Em seguida, publique somente o Hosting:

```powershell
firebase deploy --only hosting --project ojumidia
```

> O comando `pnpm build:firebase-preview` foi preparado para Windows e PowerShell. Ele não exige `cross-env` nem a sintaxe Unix `VITE_OJU_STATIC_PREVIEW=true`, que falha no Windows.

Esse deploy atualiza o portal visual e exibe uma orientação clara em `/admin`; ele não habilita o Centro Administrativo até existir um servidor compatível e autenticação externa configurada.

### Redeploy quando a marca ou o vídeo não aparecerem

Se uma publicação anterior não exibir a marca ou o fundo vivo, descarte a pasta antiga, extraia o ZIP mais recente e execute exatamente esta sequência dentro de `oju-midia`:

```powershell
pnpm install
pnpm build:firebase-preview
Get-ChildItem .\dist\public\oju-assets
firebase deploy --only hosting --project ojumidia
```

O terceiro comando deve listar `oju-midia-marca.png` e `orixas-transicao-ritual-cinematografica.mp4` antes do deploy. Após a publicação, abra diretamente estas URLs, substituindo o domínio caso esteja usando um canal de prévia:

```text
https://ojumidia.web.app/oju-assets/oju-midia-marca.png
https://ojumidia.web.app/oju-assets/orixas-transicao-ritual-cinematografica.mp4
```

Se as duas URLs abrirem, faça uma recarga forçada da Home (`Ctrl+F5`) para descartar arquivos antigos mantidos no cache do navegador.

## Configuração futura esperada

Quando houver um serviço Cloud Run denominado, por exemplo, `oju-midia-staging`, a configuração Firebase pode encaminhar as rotas à aplicação:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "oju-midia-staging",
          "region": "southamerica-east1",
          "pinTag": true
        }
      }
    ]
  }
}
```

Esse exemplo é um modelo de staging. `serviceId`, região, domínio, ambiente e estratégia de segredos devem ser confirmados antes de criar arquivos de configuração no repositório.

## Limites e cuidados

| Tema | Regra para a Ojú |
|---|---|
| Banco de dados | Manter MySQL/TiDB como fonte de verdade; não migrar dados para Firebase por hospedagem. |
| Arquivos | Manter S3/manus-storage como fonte de verdade; Firebase Storage não deve ser usado em paralelo sem um plano de migração. |
| Autenticação | Preservar o fluxo OAuth e as permissões existentes; não ativar Firebase Authentication como substituto automático. |
| Eventos SSE | Validar o comportamento de conexões longas atrás do Hosting/Cloud Run no ambiente de staging. |
| Cobrança | Cloud Run exige conta de faturamento mesmo havendo quotas gratuitas; estabelecer limite de instâncias e alertas de gasto. |
| Segredos | Usar Secret Manager/variáveis protegidas no Cloud Run. Nunca registrar chaves em `firebase.json`, `.firebaserc` ou Git. |

## Estado atual do projeto `ojumidia`

No momento da preparação deste pacote, o projeto Firebase `ojumidia` não possuía uma conta Cloud Billing vinculada. Por isso, as APIs de Cloud Run, Cloud Build, Artifact Registry e Secret Manager não podem ser habilitadas; esse bloqueio é externo ao código e não é corrigido por `firebase init` ou por uma configuração de domínio.

Enquanto a conta Cloud Billing não estiver ativa, a alternativa suportada é o modo `build:firebase-preview`, que publica somente a demonstração visual pública. A funcionalidade administrativa permanece disponível exclusivamente no ambiente local de desenvolvimento ou em uma implantação futura que forneça, simultaneamente, servidor Express, banco, armazenamento e autenticação externa compatível.

Quando o titular ativar Cloud Billing/Blaze, retome o roteiro na habilitação das APIs. Antes de autorizar domínios ou provedores no Firebase Authentication, implemente e homologue a verificação de tokens no servidor; adicionar um domínio à lista autorizada, isoladamente, não cria uma sessão válida para o tRPC.

## Referências

[1]: https://firebase.google.com/docs/hosting/cloud-run "Firebase Hosting com Cloud Run"
[2]: https://firebase.google.com/docs/hosting/frameworks/express "Integração de frameworks com Express"
[3]: https://firebase.google.com/docs/app-hosting "Firebase App Hosting"
