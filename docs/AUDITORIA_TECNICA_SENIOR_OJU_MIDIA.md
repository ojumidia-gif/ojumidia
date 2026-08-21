# Auditoria técnica sênior — Ojú Mídia

**Data da auditoria:** 20 de agosto de 2026  
**Escopo:** estado do repositório em `/home/ubuntu/oju-midia`, migrações até `0024_talented_dexter_bennett.sql`, rotas, modelos Drizzle, documentos operacionais e suíte de testes.  
**Método:** inspeção de código e configuração. Esta auditoria **não introduz alterações de regra econômica, dados, migrações ou comportamento de produção**. Todo status abaixo é baseado em arquivos e procedimentos identificados; o documento não presume que uma tela ou tabela, por si só, tenha sido homologada em uso real.

> **Legenda:** **IMPLEMENTADO** significa que há modelo, procedimento ou interface correspondente no código. **PARCIAL** significa que existe uma parte persistida ou visual, mas falta integração, controle ou validação operacional. **PLANEJADO** registra intenção documentada sem fluxo completo no código. **NÃO IMPLEMENTADO** significa ausência identificada. **PRECISA DE VALIDAÇÃO** indica que há código, mas faltam testes de integração, homologação operacional ou verificação em produção. **COM ERRO** registra inconsistência objetiva identificada nesta auditoria.

---

## 1. Resumo executivo

A Ojú Mídia é um portal documental com Centro Administrativo, fluxo editorial, acervo de mídia, taxonomias territoriais, módulos comunitários e operação comercial privada. A arquitetura é uma aplicação React de página única servida por Express, com APIs tRPC, Drizzle ORM e MySQL/TiDB como fonte de verdade para dados estruturados. O armazenamento de arquivos é S3 mediado por helpers do projeto. O Firebase está apenas configurado de modo opcional no frontend e **não substitui** banco, autenticação, API ou armazenamento.

O projeto possui base funcional relevante: publicação com estados editoriais, autorização editorial granular de trabalhos comerciais, termos assinados via gov.br, controle de carteiras, visibilidade institucional, ganhos de captação, políticas comerciais versionadas e documentos protegidos. A principal fragilidade não é ausência de telas: é a distância entre uma operação de homologação e uma operação financeira/jurídica real. Não há modelagem completa de profissional executor, conciliação bancária, comprovante de repasse, faturamento, política de retenção automatizada, limitação de taxa, observabilidade de produção ou testes end-to-end.

| Área | Status | Evidência principal | Leitura executiva |
|---|---|---|---|
| Portal público e descoberta | **IMPLEMENTADO** | `client/src/App.tsx`, `server/routers/editorial.ts` | Há rotas públicas para histórias, coberturas, documentários, projetos, acervo, fotografia, busca e comunidade. |
| Fluxo editorial | **IMPLEMENTADO** | `server/editorialPolicy.ts`, `server/routers/editorial.ts` | Estados, papéis, auditoria de atividade, prévia e publicação existem. |
| Mídia e direitos | **IMPLEMENTADO / PRECISA DE VALIDAÇÃO** | `server/routers/media.ts`, `server/_core/index.ts` | Há metadados, upload protegido e limites; validação de conteúdo binário e antivírus não existem. |
| Contratação e autorização editorial | **IMPLEMENTADO** | `server/routers/commercial.ts` | Trabalho contratado não é público por padrão; autorização granular e termo gov.br são exigidos. |
| Rede e carteira financeira | **PARCIAL** | `server/routers/financial.ts`, `server/financialGovernance.ts` | Captação, política e repasse existem para anúncios/visibilidade; execução profissional e conciliação ainda não estão modeladas. |
| Comunidade, memória e acolhimento | **IMPLEMENTADO / PRECISA DE VALIDAÇÃO** | `server/routers/community.ts` | Há consentimento, carteira, transcrição e pedido reservado; fluxo humano e conteúdo sensível exigem homologação. |
| Firebase | **PARCIAL** | `client/src/lib/firebase.ts` | SDK e variáveis existem; nenhum recurso Firebase é fonte de verdade nem há regras Firestore/Storage no repositório. |
| Segurança de produção | **PARCIAL** | `server/_core/index.ts`, `SECURITY_RULES.md` | Há controles importantes; faltam rate limit, CSP, proteção antivírus e operação de segredos/monitoramento de produção. |
| Testes | **IMPLEMENTADO / PARCIAL** | `server/**/*.test.ts` | 111 testes em 47 arquivos na última validação; predominam testes de unidade/estrutura, sem E2E real ou banco isolado. |

---

## 2. Visão geral do produto

### 2.1 Conceito atual

O portal combina documentação cultural, jornalismo documental, produção audiovisual e relacionamento territorial. As frentes de conteúdo registradas no código incluem **História**, **Cobertura**, **Documentário**, **Projeto** e **Fotografia documental**. O acervo organiza mídias reutilizáveis com autoria, origem, finalidade e autorização; taxonomias relacionam conteúdo a tipo, tema, localização, território, pessoa/organização, evento e data.

Também há uma camada comercial privada: solicitações públicas entram como oportunidades, passam por carteira, proposta, produção, entrega e autorização editorial. O portal possui mecanismos de contato, apoio a memórias, licenciamento de mídia, cadastro comunitário, agenda, memórias orais e acolhimento reservado.

### 2.2 Limites entre áreas

| Área | O que é visível ou permitido | Dados e limites relevantes |
|---|---|---|
| **Portal público** | Consultar conteúdo publicado, busca, territórios, instituições autorizadas, agenda, memórias públicas, contato e solicitação de cobertura. | Não recebe dados de carteira, valores, contratos, chaves de storage, autorização interna ou identificadores comerciais. |
| **Centro Administrativo** | Criar, editar, revisar, aprovar, publicar, administrar mídias, taxonomias, equipes, comunidade, comercial e configurações. | Exige sessão e papel; a interface é protegida principalmente pela autorização das procedures. |
| **Área comercial** | Solicitações, propostas, contratos, entrega privada, autorizações, anúncios, visibilidade institucional, comissões, ganhos e políticas. | Carteira é isolada por `managedByUserId` ou `capturedByUserId`; Super Admin tem consolidado. |
| **Acervo/editorial** | Mídias, direitos, taxonomias, relações documentais, curadoria e publicação. | Conteúdo comercial exige autorização editorial válida antes de aparecer no portal. |

---

## 3. Mapa de arquitetura real

```text
Navegador React 19 + Wouter + React Query
        │
        ├── Portal público
        └── Centro Administrativo
                │ tRPC / JSON + uploads HTTP
Express 4 / Node 22
        ├── /api/trpc → routers editoriais, comercial, comunidade, financeiro
        ├── /api/media/upload → S3 via Forge
        ├── /api/editorial/events → SSE editorial
        ├── /api/oauth/* e sessão cookie
        ├── /api/local-dev/* (somente desenvolvimento)
        └── rotas protegidas de PDFs assinados
                │
                ├── Drizzle ORM → MySQL/TiDB
                ├── S3/Forge → mídia e documentos
                ├── OAuth/SDK Manus → autenticação de sessão
                └── Firebase Web SDK opcional (não é fonte de verdade)
```

| Tecnologia | Localização e finalidade | Dependentes | Estado e risco |
|---|---|---|---|
| React 19, TypeScript, Vite | `client/src`, `vite.config.ts` | Todas as páginas e componentes | **IMPLEMENTADO**. Aplicação é CSR; SEO e pré-renderização não foram auditados como implementados. |
| Wouter | `client/src/App.tsx` | Rotas públicas e administrativas | **IMPLEMENTADO**. Não há guardas de rota declarativos robustos por rota; o servidor continua sendo a barreira decisiva. |
| TanStack React Query + tRPC 11 | `client/src/lib/trpc.ts`, `server/routers.ts` | Dados de frontend e APIs | **IMPLEMENTADO**. Há invalidação e polling em vários painéis; consistência global depende da procedure e não há controle transacional universal. |
| Express 4 | `server/_core/index.ts` | API, upload, OAuth, SSE e arquivos privados | **IMPLEMENTADO**. `express.json` é limitado a 1 MB e upload bruto a 16 MB. |
| Drizzle ORM + mysql2 | `drizzle/schema.ts`, `server/db.ts` | Dados de todas as áreas | **IMPLEMENTADO**. Não há chaves estrangeiras explícitas no esquema auditado; integridade é majoritariamente lógica na aplicação. |
| MySQL 8.4/TiDB | `DATABASE_URL`, `docker-compose.local.yml` | Fonte de verdade transacional | **IMPLEMENTADO / PRECISA DE VALIDAÇÃO**. Produção, backup e restauração não estão descritos como operação ativa. |
| S3 via Forge | `server/storage.ts`, `server/_core/index.ts` | Uploads e PDFs assinados | **IMPLEMENTADO**. URLs públicas internas e URLs temporárias coexistem; varredura de malware não existe. |
| Manus OAuth / SDK | `server/_core/oauth.ts`, `context.ts`, `db.ts` | Sessão oficial e identidade | **IMPLEMENTADO / PRECISA DE VALIDAÇÃO**. Exige variáveis OAuth reais fora do ambiente local. |
| Firebase Web SDK | `client/src/lib/firebase.ts` | Inicialização opcional | **PARCIAL**. Há `initializeApp`; não há uso de Auth, Firestore, Storage, Analytics, App Check ou Hosting no código auditado. |
| jsPDF | `client/src/lib/*TermPdf.ts` | Termos exportáveis | **IMPLEMENTADO**. A assinatura não é produzida pelo app; o PDF deve voltar assinado via gov.br. |
| SSE editorial | `server/editorialEvents.ts` | Atualização editorial em tempo real | **IMPLEMENTADO / PARCIAL**. É memória do processo, sem persistência, fila ou recuperação após reinício. |

### 3.1 Dependências entre módulos

```text
Publicações ──┬── Taxonomias ── Territórios / busca / filtros
              ├── Mídias ────── Acervo / direitos / capa / miniclipes
              ├── Equipes ───── créditos editoriais
              └── Solicitação comercial (opcional)
                       └── autorização editorial + termo gov.br

Instituições ──┬── Visibilidade institucional ── carteira / captação / repasse
               ├── Eventos comunitários
               └── Memórias orais e localização autorizada

Solicitação comercial ── proposta ── contrato ── entrega privada
                                               └── autorização editorial ── publicação opcional
```

---

## 4. Mapa de rotas do frontend

### 4.1 Rotas públicas

Todas as rotas abaixo estão declaradas em `client/src/App.tsx`. A apresentação é responsiva por CSS/Tailwind nos componentes; a auditoria identificou telas desktop e algumas verificações pontuais mobile, mas **não existe suite automatizada de responsividade**.

| Caminho | Componente | Finalidade e dados principais | Estado |
|---|---|---|---|
| `/` | `Home` | Home cinematográfica, destaques, conteúdo recente e fundo/miniclipe. | **IMPLEMENTADO** |
| `/busca` | `Search` | Busca por palavra, tema, território, tipo e período via editorial. | **IMPLEMENTADO** |
| `/historias` | `StoriesPreview` | Prévia/lista de histórias publicadas. | **IMPLEMENTADO** |
| `/coberturas` | `CoveragesPublic` | Coberturas autorizadas/publicadas. | **IMPLEMENTADO** |
| `/documentarios` | `DocumentariesPublic` | Documentários publicados. | **IMPLEMENTADO** |
| `/projetos` | `ProjectsPublic` | Projetos publicados. | **IMPLEMENTADO** |
| `/territorios` e `/territorios/:slug` | `TerritoriesPreview`, `Taxonomy` | Descoberta territorial baseada em taxonomia. | **IMPLEMENTADO** |
| `/acervo` | `ArchivePreview` | Navegação pelo acervo editorial público. | **IMPLEMENTADO** |
| `/historias/:slug` | `Story` | Detalhe de conteúdo público, mídias e relações. | **IMPLEMENTADO** |
| `/fotografia-documental` | `DocumentaryPhotography` | Coleções de fotografia documental. | **IMPLEMENTADO** |
| `/contrate-sua-cobertura` | `RequestCoverage` | Formulário público de solicitação comercial. | **IMPLEMENTADO** |
| `/contato` | `Contact` | Contato por e-mail, WhatsApp e Instagram; formulário abre mensagem estruturada no cliente de e-mail. | **IMPLEMENTADO** |
| `/apoie-uma-memoria` | `SupportMemory` | Entrada para apoio institucional/documental. | **IMPLEMENTADO** |
| `/licenciar-midia` | `LicenseMedia` | Entrada pública de licenciamento. | **IMPLEMENTADO** |
| `/instituicoes` | `InstitutionExplorer` | Perfis institucionais e mapa conforme consentimento. | **IMPLEMENTADO** |
| `/agenda` | `CommunityDirectory` | Agenda comunitária. | **IMPLEMENTADO** |
| `/memorias` | `OralMemorySearch` | Busca e compartilhamento de memórias orais públicas. | **IMPLEMENTADO** |
| `/cuidado-e-consentimento` | `CareConsent` | Canal reservado de acolhimento e consentimento. | **IMPLEMENTADO** |
| `/acompanhar-acolhimento` | `CareTracking` | Consulta pública de etapa por protocolo. | **IMPLEMENTADO** |
| `/conheca-a-oju` | `AboutOju` | Apresentação institucional. | **IMPLEMENTADO** |

Os componentes utilizam loading, vazios e toasts de maneira distribuída. A presença exata de estado de erro por rota é **PARCIAL**: tRPC oferece erro tipado, mas não existe um padrão único de página de erro para todo o portal.

### 4.2 Rotas administrativas

| Caminho | Módulo | Permissão efetiva observada | Operações principais |
|---|---|---|---|
| `/admin/acesso-local` | `LocalDevLogin` | Somente `NODE_ENV=development` com flag | Sessão local sem OAuth para teste. |
| `/admin` | `AdminDashboard` | Sessão administrativa | Indicadores editoriais e atalhos. |
| `/admin/publicacoes` | `PublicationsAdmin` | Papéis editoriais conforme router | CRUD, status, acesso a edição. |
| `/admin/editar/:id` | `PublicationEdit` | Permissão editorial por publicação | Texto, metadados, mídia, taxa, edição e revisão. |
| `/admin/preview/:id`, `/admin/home-preview/:id` | Pré-visualizações | Papel editorial | Prévia de conteúdo e Home. |
| `/admin/frentes` | `EditorialFrontsAdmin` | Administrativo/editorial conforme procedure | Histórias, coberturas, documentários e projetos. |
| `/admin/taxonomias`, `/admin/territorios` | `TaxonomiesAdmin` | Administrador | CRUD de taxonomia, coordenadas e mídia territorial. |
| `/admin/midias`, `/admin/miniclipes` | `MediaAdmin`, `MiniclipsAdmin` | Administrador | Acervo, direitos, estado e miniclipe ativo. |
| `/admin/destaques` | `HighlightsAdmin` | Administrador | Curadoria e destaque. |
| `/admin/equipes` | `TeamsAdmin` | Administrativo/editorial conforme backend | Equipes e créditos. |
| `/admin/solicitacoes` | `RequestsAdmin` | Administrador, carteira isolada | Contratação, entrega, autorização editorial e termos. |
| `/admin/contratos` | `ContractsAdmin` | Administrador, carteira isolada | Registros contratuais e situação. |
| `/admin/anuncios`, `/admin/anuncios/:id` | `AdsAdmin`, `AdvertisementEdit` | Administrador; repasse pelo Super Admin | Anúncios, captação, comissão e payout. |
| `/admin/receitas` | `RevenueAdmin` | Administrador, carteira isolada | Leads de apoio, licenciamento e oficina. |
| `/admin/ganhos` | `EarningsAdmin` | Administrador; consolidado para Super Admin | Participação esperada, parcial, paga e pendente. |
| `/admin/politicas-comerciais` | `CommercialPoliciesAdmin` | Super Admin | Criar, ativar, substituir e arquivar políticas. |
| `/admin/avisos-repasse` | `PayoutNotificationsAdmin` | Administrador, próprios avisos | Avisos internos de pagamento concluído. |
| `/admin/comunidade` | `CommunityAdmin` | Administrador, carteira isolada | Instituições, eventos e comunidade. |
| `/admin/nova-instituicao` | `InstitutionRegistrationAdmin` | Administrador | Cadastro com consentimento. |
| `/admin/visibilidade-institucional` | `InstitutionVisibilityAdmin` | Administrador; seleção global pelo Super Admin | Vigência, captação, repasse e expiração. |
| `/admin/nova-memoria-oral`, `/admin/revisar-memorias` | Memórias | Administrador, carteira isolada | Upload, IA assistida e revisão humana. |
| `/admin/notificacoes-acolhimento` | `CareNotificationsAdmin` | Administrador, carteira isolada | Acolhimento, nota e encaminhamento. |
| `/admin/distribuicoes-comunidade` | `CommunityAssignmentsAdmin` | Super Admin | Distribuição de carteiras comunitárias. |
| `/admin/colaboradores` | `CollaboratorsAdmin` | Super Admin | Convites, papéis, termo de responsabilidade gov.br e revogação. |
| `/admin/configuracoes` | `SettingsAdmin` | Administrativo conforme procedure | Configurações disponíveis. |

---

## 5. Fluxo editorial e curadoria

### 5.1 Estados realmente codificados

`server/editorialPolicy.ts` estabelece os estados **Rascunho → Em revisão → Aprovada → Publicada → Arquivada**. As transições são verificadas por `canAdvanceStatus` e pelo papel editorial. O conteúdo registra `createdBy`, `editedBy`, `approvedBy`, `publishedAt`, `unpublishedAt`, `unpublishedBy`, `version` e atividades em `editorialActivities`.

```text
Criador: cria Rascunho
       ↓
Editor: Em revisão
       ↓
Aprovador: Aprovada
       ↓
Administrador: Publicada + isPublic
       ↓
Portal, busca, curadoria e destaques
       ↓
Administrador: despublica, republica ou arquiva
```

| Item | Status | Observação verificável |
|---|---|---|
| Criação, equipe e créditos | **IMPLEMENTADO** | `resolveTeamId` aceita equipe selecionada ou crédito textual e cria equipe quando necessário. |
| Revisão e aprovação | **IMPLEMENTADO** | Política de transição por papel. |
| Publicação pública | **IMPLEMENTADO** | `status === Publicada` e `isPublic`; conteúdo comercial exige autorização válida. |
| Despublicação e republicação | **IMPLEMENTADO** | Procedures `unpublish` e `republish`, com incremento de versão e evento SSE. |
| Destaque equilibrado | **IMPLEMENTADO** | `balanceFeaturedPublications` prioriza diversidade de tipo até máximo padrão de seis. |
| Bloqueio otimista de edição | **NÃO IMPLEMENTADO** | Há coluna `version`, mas a atualização não foi identificada com condição `WHERE version = valor esperado`; dois editores podem sobrescrever campos em sequência. |
| Lock de edição / rascunho reservado | **NÃO IMPLEMENTADO** | Não foi identificado. |

### 5.2 Curadoria, território e descoberta

O backend filtra conteúdos públicos por status e autorização comercial. A busca recebe texto, tema, território, tipo e período. Taxonomias são dados e não páginas codificadas; `parentId`, latitude, longitude e `mapVisibility` sustentam relações territoriais crescentes. A Home utiliza destaques/curadoria e recente, não apenas sequência crua de criação.

**Risco de concorrência:** a transmissão SSE em `server/editorialEvents.ts` notifica processos conectados, mas não é fila persistente nem invalidação distribuída entre múltiplas instâncias. Em escala horizontal ou após reinício, o sinal pode ser perdido; o estado definitivo continua sendo o banco e as consultas React Query.

---

## 6. Fluxo comercial e autorização editorial

### 6.1 Fluxo implementado

`commercialRequests` armazena solicitações. O router comercial reconhece as etapas **Solicitação, Em análise, Conversa, Orçamento, Proposta, Aceite, Contratado, Produção, Entrega, Concluído e Arquivado**. Há atividades de solicitação, carteira, status, proposta, contrato, entrega privada e autorização editorial em `commercialActivities`.

```text
Visitante → Solicitação pública
          → carteira de administrador / distribuição do Super Admin
          → proposta e operação privada
          → contrato e produção
          → entrega privada
          → matriz de autorização editorial + termo assinado via gov.br
          → curadoria editorial independente
          → publicação opcional
```

| Etapa | Entidades | Estado |
|---|---|---|
| Solicitação e carteira | `commercialRequests`, `commercialActivities` | **IMPLEMENTADO** |
| Proposta, operação e entrega | `commercialRequests` | **IMPLEMENTADO** |
| Contrato | `contracts` | **IMPLEMENTADO / PARCIAL**: registro, valor e status existem; emissão fiscal e assinatura comercial completa não foram identificadas. |
| Autorização granular | `commercialEditorialAuthorizations` | **IMPLEMENTADO**: foto, vídeo, nome, localização, narrativa, identificação, portal, institucional e redes. |
| Termo via gov.br | `authorizationTerms`, rota privada | **IMPLEMENTADO**: exportação, upload de PDF e requisito de assinatura para ativação. |
| Publicação de trabalho comercial | `publications.commercialRequestId` | **IMPLEMENTADO**: `assertCommercialPublicationCanPublish` bloqueia sem escopo válido. |

### 6.2 Regra estrutural de separação

Uma entrega contratada **não** se torna pública por conclusão. A publicação vinculada a `commercialRequestId` exige autorização atual, uso em portal, tipo de mídia compatível, narrativa permitida e localização permitida quando usada. Revogação remove preventivamente publicações comerciais do portal. Esta é uma das partes mais maduras do sistema e deve permanecer como baseline de regressão.

---

## 7. Mídia, upload, acervo e direitos

### 7.1 Regras efetivas no código

`mediaAssets` guarda tipo, URL/chave, origem, crédito, autorização, finalidade, publicação permitida, projeto/cobertura, termos, expiração, duração, estado e prioridade de fundo. O upload HTTP em `server/_core/index.ts` exige sessão, papel editorial reconhecido, tipo `image/*`, `video/*`, `audio/*` ou PDF e corpo de até 16 MB. O arquivo é enviado para S3 por `storagePut`.

| Regra | Código encontrado | Status |
|---|---|---|
| Tamanho máximo por upload | `express.raw(... limit: "16mb")` | **IMPLEMENTADO** |
| Fotos por publicação | `canAttachWithinMediaLimit`: máximo 5 | **IMPLEMENTADO** |
| Vídeos por publicação | `canAttachWithinMediaLimit`: máximo 2 | **IMPLEMENTADO** |
| Fotografia documental | Máximo 5 fotos, sem vídeo, legenda/local/data/biografia obrigatórios | **IMPLEMENTADO** |
| Vídeo curto | `durationSeconds` máximo 60 | **IMPLEMENTADO**, porém duração é metadado informado; não há análise de arquivo no servidor. |
| Miniclipe ativo | Desativa outros vídeos de fundo antes de ativar um | **IMPLEMENTADO** |
| Direitos de mídia | Origem, crédito, autorização e finalidade obrigatórios no cadastro | **IMPLEMENTADO** |
| Vírus, MIME real, transcoding, thumbnail | Não identificados | **NÃO IMPLEMENTADO** |

### 7.2 Contradição de limite solicitada

O complemento de auditoria menciona “até 25 fotos e 5 vídeos”. Isso **não corresponde ao código atual nem às regras operacionais vigentes**. `server/routers/editorial.ts`, linhas 56–60, aplica **5 fotos e 2 vídeos**; fotografia documental aceita no máximo **5 fotos e zero vídeos**. A documentação futura deve usar os limites implementados até que uma mudança de produto, backend, frontend e testes seja aprovada.

### 7.3 Armazenamento

`server/storage.ts` produz caminhos `/manus-storage/{key}` para mídias e URLs S3 temporárias para leitura privada. PDFs assinados são entregues por rotas Express autenticadas com `Cache-Control: private, no-store`; o servidor verifica Super Admin ou dono de carteira. Não há exclusão física/retention job identificado; armazenamento é fonte de verdade de bytes, enquanto MySQL guarda metadados e chaves.

---

## 8. Comunidade, territórios e memórias

| Módulo | Entidades | Estado | Observações |
|---|---|---|---|
| Instituições | `institutions` | **IMPLEMENTADO** | Tipos incluem Casa de tradição, Ilê/Terreiro, Comunidade, Coletivo, Iniciativa, Centro cultural, Liderança religiosa e Outro. |
| Visibilidade institucional | `institutionVisibilitySubscriptions` | **IMPLEMENTADO / PRECISA DE VALIDAÇÃO** | Vencimento, confirmação, expiração, captação, reserva, política e repasse existem. Não compra curadoria. |
| Agenda e eventos | `communityEvents` | **IMPLEMENTADO** | Vínculo com instituição, território, mídia e publicação conforme consentimento. |
| Memórias orais | `oralMemories` | **IMPLEMENTADO / PARCIAL** | Acesso, consentimento, transcrição/resumo assistido e revisão humana existem; qualidade e custos de IA exigem homologação. |
| Acolhimento | `communityCareRequests` | **IMPLEMENTADO** | Protocolo público, carteira, nota interna e estados. Requer protocolo humano de resposta. |
| Mapa | taxonomias + instituições | **IMPLEMENTADO / PRECISA DE VALIDAÇÃO** | Coordenadas e visibilidade; clustering e uso mobile foram implementados visualmente, sem teste E2E identificado. |

---

## 9. Banco de dados e mapa de entidades

O esquema declara 28 tabelas. Não foram identificadas FKs no trecho de schema auditado; IDs inteiros e índices são usados, com relações validadas por procedures. A tabela abaixo registra campos funcionais e não substitui `drizzle/schema.ts`, que é a referência de tipo completa.

| Grupo | Tabelas | Campos/relacionamentos funcionais principais |
|---|---|---|
| Identidade e governança | `users`, `collaboratorAccessGrants`, `administratorResponsibilityTerms` | `openId`, e-mail, papel, `adminAccess`; convite por e-mail e termo gov.br para ativar administrador. |
| Editorial | `publications`, `editorialActivities`, `teams` | Status, tipo, slug, autoria, aprovação, versão, publicação, equipe e vínculo comercial. |
| Taxonomia e acervo | `taxonomies`, `publicationTaxonomies`, `mediaAssets`, `publicationMedia`, `taxonomyMedia`, `publicationRelations` | Classificação multidimensional, mídias, capa, biografia, localização e relações documentais. |
| Comercial | `commercialRequests`, `commercialActivities`, `contracts`, `commercialEditorialAuthorizations`, `authorizationTerms` | Solicitação, carteira, proposta, entrega, contrato, autorização e PDF assinado. |
| Anúncios e finanças | `advertisements`, `commercialPolicies`, `commercialPayoutNotifications` | Captação, percentuais, status de repasse, política e aviso interno. |
| Comunidade | `institutions`, `institutionVisibilitySubscriptions`, `communityEvents`, `oralMemories`, `communityCareRequests` | Consentimento, território, vigência, valores, memória e acolhimento. |
| Receitas documentais | `revenueLeads`, `revenueLeadActivities` | Apoio, licenciamento, oficina, carteira e histórico. |
| Configuração | `settings` | Chave, valor e timestamps. |

### 9.1 Mapa de relacionamentos efetivos

```text
users ── administra ── collaboratorAccessGrants / administratorResponsibilityTerms
users ── cria/edita/aprova ── publications ── publicationMedia ── mediaAssets
publications ── publicationTaxonomies ── taxonomies ── taxonomyMedia ── mediaAssets
commercialRequests ── commercialActivities / contracts / authorizationTerms
commercialRequests ── commercialEditorialAuthorizations ── publications (opcional)
institutions ── institutionVisibilitySubscriptions / communityEvents / oralMemories
advertisements e visibilidades ── participação de captação ── commercialPayoutNotifications
commercialPolicies ── versão aplicada em anúncios e visibilidades novas
```

---

## 10. Autenticação, autorização e matriz de permissões

`server/db.ts` centraliza a atribuição de papel na entrada do usuário. O Super Admin é reconhecido por `ENV.ownerOpenId`; em desenvolvimento, o e-mail configurado em `OJU_LOCAL_ADMIN_EMAIL` recebe papel principal apenas com `NODE_ENV=development`. Convites autorizados determinam `criador`, `editor`, `aprovador` ou `administrador`; o último só é ativado com termo de responsabilidade assinado via gov.br. O e-mail público comercial não deve receber privilégio automático; essa regra existe em documentos e no fluxo de grants.

| Ação/módulo | Super Admin | Administrador | Criador/Editor/Aprovador | Público |
|---|---:|---:|---:|---:|
| Consolidado de carteiras, políticas e repasses | Sim | Não | Não | Não |
| Própria carteira comercial/comunitária | Sim | Sim | Não | Não |
| Criar/editar conteúdo conforme política editorial | Sim | Sim | Papel específico | Não |
| Aprovar/publicar | Sim | Conforme política | Aprovador na transição | Não |
| Gerir colaboradores e termos | Sim | Não | Não | Não |
| Ler PDFs comerciais próprios | Sim | Sim, se dono | Não | Não |
| Ler termo de responsabilidade próprio | Sim | Sim, se e-mail coincide | Não | Não |
| Consultar portal | Sim | Sim | Sim | Sim |

**Risco:** `mediaRouter.updateRole` ainda existe como caminho direto de alteração de papel por Super Admin. A governança principal foi movida para `collaboratorsRouter`, mas dois caminhos de papel devem ser revisados para evitar ativação administrativa fora do fluxo de termo.

---

## 11. Modelo de Rede Ojú — análise sem implantação econômica adicional

### 11.1 O que já existe

| Conceito solicitado | Estado | Evidência e limite atual |
|---|---|---|
| Super Admin | **IMPLEMENTADO** | `users.role`, `server/db.ts`, routers financeiro/comercial/comunidade. Vê consolidado e controla políticas/repasses. |
| Administrador da plataforma | **IMPLEMENTADO** | Convite, carteira, autorização, termo gov.br e acesso administrativo condicionado. |
| Representante/parceiro de rede | **PARCIAL** | O conceito é operacionalmente próximo do administrador captador; não há entidade, contrato ou papel separado chamado “representante”. |
| Profissional executor | **PLANEJADO / PARCIAL** | A política comercial possui `executorPercent`, mas não há tabela de profissional, vinculação a contratação, valor de executor, payout ou tela operacional correspondente. |
| Solicitação e oportunidade | **IMPLEMENTADO** | `commercialRequests` e `revenueLeads`; carteira pode ser assumida/distribuída. |
| Administrador responsável | **IMPLEMENTADO** | `managedByUserId` e `capturedByUserId` em módulos diferentes. |
| Profissional responsável pela execução | **NÃO IMPLEMENTADO** | Sem `executorUserId`, entidade de execução, aceite ou atribuição no fluxo de cobertura. |
| Contratação e valor bruto | **PARCIAL** | Solicitação, proposta, anúncio e contrato armazenam valores em contextos distintos; não existe um fechamento econômico único para toda produção. |
| Distribuição financeira e histórico | **PARCIAL** | Anúncios e visibilidade possuem percentuais/status/aviso; contratos têm percentuais padrão. Não há razão financeira unificada ou livro-caixa. |
| Participação da operação Ojú | **IMPLEMENTADO em módulos específicos** | Anúncios têm `ojuSharePercent`; visibilidade calcula Ojú/desenvolvimento/captação; contratos guardam percentuais. |
| Reserva de desenvolvimento | **IMPLEMENTADO apenas na visibilidade** | `developmentAmount` e `reserveAmount`; não há prestação de contas de uso da reserva. |
| Origem da contratação | **PARCIAL** | Há `capturedByUserId`, carteira e tipos de lead; não há enum/padronização completa de origem. |

### 11.2 Papéis que não devem ser confundidos

| Papel | Definição correta no modelo | Implementação atual |
|---|---|---|
| **Super Admin** | Dono da governança: acesso global, ativa política, confirma repasse e controla identidade. | **IMPLEMENTADO**. |
| **Administrador da plataforma** | Pessoa com acesso administrativo condicionado a convite e termo de responsabilidade. | **IMPLEMENTADO**. |
| **Representante/parceiro de rede** | Pessoa que capta, atende ou acompanha oportunidade; pode ou não ter permissão editorial. | **PLANEJADO como papel separado**; hoje se confunde com administrador captador. |
| **Profissional executor** | Pessoa que entrega foto, vídeo, edição ou produção; não deve ganhar acesso administrativo só por executar. | **NÃO IMPLEMENTADO como entidade/fluxo**. |
| **Contratante** | Pessoa/instituição que solicita e contrata; pode autorizar ou negar uso editorial. | **IMPLEMENTADO** em solicitações, contratos e instituições, sem cadastro unificado de CRM. |

### 11.3 Modelo econômico em estudo — não aplicado por esta documentação

O modelo conceitual informado para evolução é:

```text
CLIENTE → SOLICITAÇÃO → OJÚ / ADMINISTRADOR RESPONSÁVEL
       → CONTRATAÇÃO → VALOR TOTAL
                         ├── PROFISSIONAL EXECUTOR
                         └── OPERAÇÃO OJÚ
                               └── reserva para desenvolvimento da rede
```

Os percentuais de **70% para profissional executor** e **30% para operação Ojú**, com **5% interno para desenvolvimento da rede**, são **PLANEJADOS / EM ESTUDO**. Eles **não foram aplicados por esta auditoria** e não devem ser descritos como regra jurídica, fiscal ou financeira vigente. O código atual usa percentuais por modalidade: contratos possuem padrão 70/30 administrador/Ojú; anúncios usam divisão Ojú/captor; visibilidade usa política 50/30/20 quando não há outra política ativa. São conceitos diferentes e não equivalem automaticamente ao modelo executor/operação.

### 11.4 Entidades necessárias antes de implantar o modelo executor/operação

| Entidade ou capacidade | Necessidade | Estado |
|---|---|---|
| `networkPartners`/perfil de representante | Separar parceiro comercial de administrador técnico. | **PLANEJADO** |
| `executors` ou perfil de profissional | Identidade, especialidade, documentação, disponibilidade e dados de pagamento. | **NÃO IMPLEMENTADO** |
| `commercialClosings` | Fechamento único com valor bruto, descontos, impostos, base e política congelada. | **NÃO IMPLEMENTADO** |
| `closingAllocations` | Linhas por executor, captador, Ojú, desenvolvimento e reserva com status de repasse. | **NÃO IMPLEMENTADO** |
| Vínculo de execução | Atribuir executor a cobertura/contrato, com aceite e entrega. | **NÃO IMPLEMENTADO** |
| Livro de repasses e comprovante protegido | Valor, data, método, referência, anexo e conciliação. | **PARCIAL**: status e avisos existem, comprovante não. |
| Política por modalidade e vigência | Congelar distribuição aplicada a novo fechamento. | **IMPLEMENTADO PARCIALMENTE**: políticas existem para anúncio e visibilidade; ainda não governam cobertura/execução. |

### 11.5 Decisões jurídicas e contábeis pendentes

Antes de qualquer repasse real em escala, é necessário decidir com advogado e contador brasileiros: quem é contratante e prestador em cada modalidade; quem emite nota/recibo; se administrador é empregado, autônomo, parceiro ou representante; qual base recebe percentuais; tratamento de impostos, deslocamento, descontos, reembolso, chargeback e inadimplência; retenção de documentos; proteção de dados de pagamento; e como rescisão/saída preserva carteira e direitos. Essas decisões são **PLANEJADAS / EXTERNAS AO CÓDIGO**.

---

## 12. Firebase

O arquivo `client/src/lib/firebase.ts` inicializa apenas `firebase/app` quando existem `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID`. O projeto informado é `ojumidia`, Web App “oju midia web”, App ID `1:893190869025:web:6f94318ebd053d4bc79360`.

| Serviço Firebase | Estado no repositório |
|---|---|
| Firebase App/Web SDK | **IMPLEMENTADO** de modo opcional. |
| Firebase Authentication | **NÃO IMPLEMENTADO** como fonte de autenticação. |
| Firestore | **NÃO IMPLEMENTADO**; sem regras. |
| Firebase Storage | **NÃO IMPLEMENTADO**; S3/Forge é o armazenamento do sistema. |
| Analytics | **NÃO IMPLEMENTADO** no código auditado. |
| App Check / Hosting | **NÃO IMPLEMENTADO** no repositório. |

O plano Spark, regras Firebase e limites reais precisam ser confirmados fora do código. Não há motivo técnico para migrar fonte de verdade para Firebase sem decisão de arquitetura e migração explícita.

---

## 13. Segurança, privacidade e observabilidade

### 13.1 Controles existentes

| Controle | Estado | Evidência |
|---|---|---|
| Sessão e autorização de procedures | **IMPLEMENTADO** | `protectedProcedure`, `ctx.user`, verificações de papel/carteira. |
| Cabeçalhos básicos | **IMPLEMENTADO** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. |
| Upload autenticado e limitado | **IMPLEMENTADO** | `POST /api/media/upload`, 16 MB, papéis e tipos permitidos. |
| Documentos assinados privados | **IMPLEMENTADO** | Rotas autenticadas, autorização de dono, redirect temporário S3 e `no-store`. |
| Segredos fora do repositório | **IMPLEMENTADO em documentação** | `.env` e template; efetividade depende do operador. |
| Isolamento comercial no portal público | **IMPLEMENTADO** | Sanitização de `toPortalPublication` e rota pública de anúncios sem campos financeiros. |

### 13.2 Lacunas e riscos

| Prioridade | Problema | Impacto | Recomendação |
|---|---|---|---|
| P1 | Sem rate limiting observado em formulários, login local ou upload. | Abuso, spam e consumo de storage. | Adotar limitação por IP/conta e captcha para entradas públicas quando houver produção. |
| P1 | Upload confia no `Content-Type` enviado pelo cliente; não há antivírus, inspeção de assinatura ou transcoding. | Arquivo malformado, custo e risco de distribuição. | Validar magic bytes, usar processamento assíncrono/antivírus e gerar derivados seguros. |
| P1 | CSP não foi identificado. | Reduz defesa contra XSS em caso de conteúdo futuro inseguro. | Definir CSP compatível, sanitizar renderização rica e revisar links externos. |
| P1 | Sem política de backup/restauração executável no código. | Perda de banco ou metadados. | Definir rotina de backup, RPO/RTO, teste de restauração e retenção. |
| P2 | URLs públicas de `/manus-storage` existem para mídia normal. | Deve haver rigor na classificação de arquivos e no consentimento. | Nunca usar esse fluxo para termo/contrato; manter inventário de acesso. |
| P2 | SSE em memória não autentica o endpoint observado. | Pode revelar que houve evento editorial, embora não exponha conteúdo. | Exigir sessão se o canal passar a transportar dados sensíveis; usar broker para escala. |
| P2 | Acesso local automático é deliberadamente poderoso. | Risco se flag for habilitada fora de ambiente controlado. | Verificação de deploy e teste negativo em produção; remover valores de desenvolvimento. |

### 13.3 Observabilidade

Há logs de servidor e logs locais de desenvolvimento (`.manus-logs/` no ambiente gerenciado), exceções de upload e documentos privados no console, e 111 testes na última execução. Não foram identificados métricas de negócio, tracing distribuído, alerta de erro, painel de saúde de produção, auditoria imutável, monitoramento de storage, orçamento/alerta de custo ou rotina de backup. Portanto, observabilidade é **PARCIAL**.

---

## 14. Docker, desenvolvimento, deploy e operações

### 14.1 Desenvolvimento local

O projeto declara Node 22, pnpm/Corepack, MySQL 8.4, `pnpm dev`, `pnpm check`, `pnpm test`, `pnpm build` e `pnpm start`. O compose local sobe MySQL 8.4 em `3306`, volume `oju_mysql_data`, aplicação em `3000` e volume de `node_modules`. `docker/Dockerfile.local` usa `node:22-bookworm` e `corepack pnpm install --frozen-lockfile`.

| Operação | Comando documentado |
|---|---|
| Instalar | `corepack pnpm install --frozen-lockfile` |
| Migrar | `corepack pnpm db:push` |
| Verificar tipos | `corepack pnpm check` |
| Testar | `corepack pnpm test` |
| Rodar local | `corepack pnpm dev` |
| Docker | `docker compose -f docker-compose.local.yml --env-file .env up --build` |

### 14.2 Deploy

Há script de build e servidor de produção em `dist`, mas a publicação final, domínio `www.ojumidia.com.br`, OAuth oficial, variáveis reais, S3 de produção, DNS, banco gerenciado, backup, observabilidade e homologação formal ainda são **PRECISA DE VALIDAÇÃO / PLANEJADO**. Não foi identificado Dockerfile de produção customizado; a infraestrutura gerenciada deve fornecer o runtime ou ser documentada antes da publicação externa.

---

## 15. Testes, responsividade e pré-visualização

Na última execução registrada, `pnpm check` terminou sem erro e `pnpm test` aprovou **111 testes em 47 arquivos**. Há testes de autenticação local, contratos, autorização editorial, upload/regras de mídia, identidade, comunidade, financeiro e privacidade pública. Muitos testes verificam funções e presença de código/strings de proteção; isso é útil como regressão, mas não substitui transações reais ou navegação E2E.

| Tipo | Estado | Lacuna principal |
|---|---|---|
| Unitário/regras | **IMPLEMENTADO** | Boa cobertura de políticas e contratos lógicos. |
| tRPC com DB real isolado | **NÃO IDENTIFICADO** | Falta validar consultas, índices e migrações contra banco temporário. |
| E2E de navegador | **NÃO IDENTIFICADO** | Falta criar publicação, upload, aprovação e portal com navegador automatizado. |
| Responsividade automatizada | **NÃO IDENTIFICADO** | Há inspeções visuais pontuais; falta matriz de breakpoints e fluxos críticos. |
| Segurança ofensiva | **NÃO IDENTIFICADO** | Falta teste de upload malicioso, rate limit, acesso cruzado e CSP. |

Pré-visualizações de publicação e Home existem (`PublicationPreview`, `HomePreview`), porém a equivalência total com todas as páginas públicas e viewport mobile é **PRECISA DE VALIDAÇÃO**.

---

## 16. Contradições identificadas

| Documento/regra | Código/comportamento encontrado | Impacto | Correção recomendada |
|---|---|---|---|
| Complemento de auditoria cita 25 fotos e 5 vídeos. | Backend editorial aplica 5 fotos e 2 vídeos; fotografia documental aceita 5 fotos. | Regra operacional ambígua. | Definir uma única regra de produto e atualizar todos os documentos após mudança aprovada. |
| `README_CURSOR.md` orientava `OJU_LOCAL_ADMIN_EMAIL=ojumidia@gmail.com`. | `ENVIRONMENT_TEMPLATE.md` apontava `aquinopratesr@gmail.com`; o e-mail comercial é documentado como não administrativo. | Em teste local, e-mail público poderia receber Super Admin. | **Corrigido após a auditoria:** o guia local passou a usar `aquinopratesr@gmail.com` e reforça que `ojumidia@gmail.com` é canal comercial. |
| `REDE_OJU_E_VISIBILIDADE_INSTITUCIONAL.md` descreve políticas versionadas como evolução. | `commercialPolicies`, router financeiro e painel já existem. | Documento estratégico está desatualizado. | Atualizar nota de rede após esta auditoria, preservando executor como planejado. |
| Política de termos restringe ativação de administrador. | `mediaRouter.updateRole` permitia ao Super Admin alterar papel diretamente. | Poderia contornar governança de convite/termo se usado indevidamente. | **Corrigido após a auditoria:** o procedimento direto foi removido e a sincronização de papel está centralizada no router de colaboradores. |

---

## 17. Débitos técnicos e prioridades

| Prioridade | Local | Problema | Impacto | Solução recomendada |
|---|---|---|---|---|
| P0 | Documentação local | E-mail de Super Admin divergente no README. | Teste local com identidade errada. | Corrigir documento e testar acesso local. |
| P1 | Autorização de papel | Dois caminhos para promoção (`collaborators` e `media.updateRole`). | Risco de burlar termo administrativo. | Centralizar promoção em serviço único. |
| P1 | Edição editorial | `version` sem compare-and-set. | Perda silenciosa de alterações simultâneas. | Exigir versão esperada no update e resolver conflito no frontend. |
| P1 | Upload | Sem validação binária/antivírus/derivados. | Segurança, qualidade e custos. | Pipeline de mídia seguro antes de produção. |
| P1 | Operação financeira | Sem comprovante de repasse, conciliação, imposto ou fechamento unificado. | Não adequado para operar pagamentos reais em escala. | Modelar fechamento, alocações e documentos após parecer jurídico/contábil. |
| P1 | Segurança | Sem rate limit/CSP identificado. | Abuso e superfície XSS. | Adicionar controles antes de produção. |
| P2 | SSE | Estado em memória de uma instância. | Sincronização incompleta em escala. | Broker/evento persistente ou polling/invalidations robustas. |
| P2 | Firebase | SDK opcional sem recurso ativado. | Confusão arquitetural. | Manter como opcional ou remover até decisão de uso. |
| P2 | Testes | Sem E2E/DB real. | Regressões de integração podem passar despercebidas. | Criar fluxo E2E crítico e banco temporário. |
| P3 | UX | Navegação extensa do Admin. | Descoberta pode ficar difícil com crescimento. | Agrupar módulos por Editorial, Comercial, Comunidade e Governança. |

---

## 18. Funcionalidades incompletas, não implementadas ou que exigem validação

| Item | Estado | Ação futura |
|---|---|---|
| Profissional executor e participação individual | **NÃO IMPLEMENTADO** | Modelar somente após decisão jurídica/econômica. |
| Fechamento econômico único de produção | **NÃO IMPLEMENTADO** | Criar `commercialClosings` e alocações. |
| Comprovante de repasse protegido | **NÃO IMPLEMENTADO** | Upload PDF/imagem, chave S3, acesso e auditoria. |
| Renovação atribuída a novo atendente | **PARCIAL** | Registrar transferência/causa e política por ciclo. |
| E-mail/WhatsApp transacional | **NÃO IMPLEMENTADO** | Há canais de contato; não há entrega automática transacional auditada. |
| Assinatura comercial completa | **PARCIAL** | Termos de autorização/responsabilidade usam gov.br; contrato comercial geral não tem fluxo completo auditado. |
| Backup, retenção e restauração operacional | **NÃO IMPLEMENTADO** | Definir serviço, procedimento e teste. |
| Rate limit, antivírus e CSP | **NÃO IMPLEMENTADO** | Prioridade antes de produção. |
| Métricas, alertas e monitoramento | **NÃO IMPLEMENTADO** | Definir SLO, logs estruturados e alerta. |
| Mobile E2E | **PRECISA DE VALIDAÇÃO** | Testar breakpoints e telas de tabela/formulário. |

---

## 19. Baseline de regressão — não quebrar

1. Estados editoriais em português e transições por papel.
2. Separação absoluta entre contratação/entrega e autorização de publicação pública.
3. Assinatura exclusiva via gov.br para termos de autorização e de responsabilidade.
4. Isolamento de carteira: administrador não vê carteira de outro; Super Admin vê consolidado.
5. Limites atuais: 5 fotos, 2 vídeos curtos de 60 segundos; fotografia documental com 5 fotos e metadados obrigatórios; somente um miniclipe ativo.
6. Documento assinado privado por rota autenticada e URL temporária, sem chave S3 no cliente.
7. E-mail comercial público não deve ganhar papel administrativo automático.
8. Visibilidade institucional não compra curadoria nem publicação editorial.
9. Revogação editorial despublica preventivamente material comercial vinculado.
10. Políticas novas não devem alterar percentuais de fechamentos já registrados.

---

## 20. Checklist de homologação antes da produção

| Área | Verificação |
|---|---|
| Identidade | Confirmar `OWNER_OPEN_ID`, conta Super Admin, e-mail comercial separado e remoção do acesso local em produção. |
| Conteúdo | Criar, editar, revisar, aprovar, publicar, despublicar e arquivar com papéis distintos. |
| Concorrência | Abrir mesma publicação em duas sessões e validar conflito de versão antes de liberar múltiplos editores. |
| Mídia | Testar 5 fotos, 6ª foto rejeitada, 2 vídeos, 3º rejeitado, vídeo >60 s, 16 MB, tipo inválido e documento PDF privado. |
| Comercial | Solicitação, carteira, proposta, contrato, entrega, autorização granular, termo gov.br e bloqueio no portal. |
| Financeiro | Política rascunho/ativa/substituída, captação própria, Super Admin, pagamento parcial/pago, aviso e leitura. |
| Comunidade | Consentimento, visibilidade, expiração, mapa, memória oral, revisão humana e acolhimento por protocolo. |
| Privacidade | Testar acesso cruzado a termos, carteiras, avisos e dados comerciais. |
| Mobile | Validar Home, busca, edição, tabelas financeiras, upload e menu em 375 px, 768 px e desktop. |
| Deploy | Variáveis, OAuth, banco, S3, DNS, HTTPS, backup, log, monitoramento e domínio final. |

---

## 21. Ordem técnica recomendada

### Fazer agora

1. Corrigir a contradição do e-mail administrativo no `README_CURSOR.md`.
2. Centralizar promoção de papel para impedir desvio do termo de responsabilidade.
3. Adicionar bloqueio otimista de versão na edição editorial.
4. Criar teste de integração de autorização de arquivo, carteira e publicação comercial.

### Fazer antes da produção

1. Rate limiting, CSP, validação binária de upload, antivírus e pipeline de mídia.
2. Backup/restauração, logs estruturados, alertas de erro/custo e monitoramento de banco/storage.
3. Homologar OAuth, domínio, segredos, S3, SMTP/integração de canais se forem necessários e retirar acesso local.
4. Obter parecer jurídico/contábil antes de executar repasses financeiros reais.

### Fazer depois da produção inicial

1. E2E de navegador e matriz automatizada de responsividade.
2. Agrupamento de navegação administrativa e indicadores globais de avisos.
3. Evoluir SSE para arquitetura distribuída se houver múltiplas instâncias/processos.

### Futuro condicionado a decisão de negócio

1. Entidades de representante/parceiro, executor, fechamento único e alocações financeiras.
2. Comprovantes protegidos, conciliação e prestação de contas do fundo de desenvolvimento.
3. Recursos Firebase somente se resolverem uma necessidade aprovada sem duplicar MySQL/S3/OAuth.

---

## 22. Conclusão executiva

1. **O projeto está funcional?** Sim, para fluxos editoriais, comerciais privados, comunidade e gestão administrativa já codificados.
2. **O que está pronto?** Portal, CMS editorial, acervo, taxonomias, mídia, contratação, autorização editorial, termos gov.br, carteiras, visibilidade, ganhos/políticas e avisos internos.
3. **O que está incompleto?** Modelo de profissional executor, fechamento financeiro unificado, repasse comprovado, observabilidade, backup e segurança de upload de produção.
4. **Erros críticos identificados?** A divergência do README sobre e-mail de Super Admin é P0 documental; promoção direta de papel e ausência de lock otimista são P1 arquiteturais.
5. **O que pode quebrar em produção?** OAuth/segredos, ausência de backup, upload malicioso, concorrência editorial, escala do SSE e operação financeira sem conciliação.
6. **O que corrigir antes de lançar?** Segurança de borda/upload, identidade, backup, testes E2E críticos e homologação de infraestrutura.
7. **O que pode esperar?** Firebase funcional, refinamento visual adicional, navegação avançada e rede de executores.
8. **A arquitetura suporta crescimento?** Sim, em dados e módulos; exige reforço de concorrência, observabilidade, storage e transações para grande escala.
9. **Suporta múltiplos administradores?** Parcialmente: carteiras e papéis existem, mas faltam lock de edição e operação distribuída robusta.
10. **Suporta crescimento territorial?** Sim, pois taxonomias e coordenadas são dados relacionais, não cidades codificadas.
11. **Suporta grande volume de mídia?** Parcialmente: S3 suporta arquivos, mas faltam processamento, antivírus, derivados, custos e lifecycle.
12. **Portal e Admin estão sincronizados?** Há consultas, invalidações e SSE editorial; a sincronização é funcional em uma instância, mas requer teste integrado e estratégia distribuída para escala.
13. **O que falta para produção?** Segurança, operação, backup, OAuth/domínio, políticas jurídicas/fiscais e homologação completa.
14. **Ordem recomendada:** estabilizar identidade e concorrência; endurecer segurança e operação; homologar integrações; só então ampliar o modelo econômico de executores.

## Referências internas auditadas

- `client/src/App.tsx`
- `client/src/lib/firebase.ts`
- `server/_core/index.ts`
- `server/_core/localDevAuth.ts`
- `server/db.ts`
- `server/storage.ts`
- `server/privateCommercialFiles.ts`
- `server/editorialPolicy.ts`
- `server/editorialEvents.ts`
- `server/routers/editorial.ts`
- `server/routers/media.ts`
- `server/routers/commercial.ts`
- `server/routers/community.ts`
- `server/routers/financial.ts`
- `drizzle/schema.ts`
- `ENVIRONMENT_TEMPLATE.md`, `README_CURSOR.md`, `SECURITY_RULES.md`, `STORAGE_RULES.md`
