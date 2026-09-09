# Auditoria forense — assinatura digital / gov.br no Ojú

**Missão 4.** Auditoria + especificação. Sem implementação, sem migration, sem schema novo, sem bypass, sem PDF/gov.br fabricado, sem alteração de Production, Opportunity, percentuais comerciais, Aiven, deploy ou push.

**Data da auditoria:** 9 de setembro de 2026.  
**Escopo de evidência:** código atual (`drizzle/schema.ts`, migrations 0022–0023 e posteriores), procedures tRPC, UI, PDFs gerados no cliente, testes, `docs/` existentes, script `scripts/homologate-admin-cms.ts` (não oficial de QA).

**Classificação geral desta missão (código + documentação, não parecer jurídico):** **INCONSISTENCY** + **NOT IMPLEMENTED** (arquitetura genérica) + vários **PASS** pontuais + **RISK** operacional + **DECISÃO DE NEGÓCIO/JURÍDICA NECESSÁRIA**.

---

## 0. Resposta às três perguntas centrais

### 0.1 O Ojú possui hoje uma arquitetura de autorização digital coerente com o requisito original, distinguindo Termos de Uso, RBAC, autorização administrativa, consentimento editorial, autorização de uso de conteúdo e assinatura digital formal?

**Não.** O produto **não** possui um modelo único de autorização digital. Existem **mecanismos isolados** que usam vocabulário parecido (termo, consentimento, autorização, gov.br, `adminAccess`) sem um objeto comum (identidade do autorizante, finalidade, objeto, prazo, versão, método, evidência, revogação).

Evidência de isolamento:

| Conceito | Onde vive hoje | É equivalente a assinatura gov.br? |
| --- | --- | --- |
| Identidade | OAuth Google (`users.openId` / e-mail) | Não |
| Autenticação | Sessão; `accountStatus === Ativo` | Não |
| RBAC | `users.role` | Não |
| Gate do Centro Administrativo | `users.adminAccess` em `protectedProcedure` | **Pode depender de gov.br** se o grant for `administrador` |
| Escopo territorial | grant `partnerId`/`territoryId`, `assertPartnerScope` | Não |
| Aceite dos Termos de Uso | Checkbox só na UI de Ser parceiro; **não persistido** | Não |
| Termo de responsabilidade (OJU-AR-1.0) | `administratorResponsibilityTerms` | Sim (provedor único `gov.br`) |
| Autorização editorial comercial (OJU-AE-1.0) | matriz `commercialEditorialAuthorizations` + `authorizationTerms` | Sim para **ativar** a matriz |
| Consentimento comunitário | `consentStatus` em instituições/eventos/memórias | Não (atestação de staff) |
| Autorização de mídia no Acervo | enum `authorization` + `publicationAllowed` | Não |
| Publicação editorial não comercial | `status=Publicada` + `isPublic` | Não (gov.br não entra) |

**PASS (parcial):** a documentação de visibilidade e a Fase 7 já separam identidade ≠ permissão ≠ especialidade (`docs/FASE7_OPERACAO.md`, `docs/ARQUITETURA_VISIBILIDADE_OJU.md`).  
**INCONSISTENCY:** o runtime mistura **gate de painel** (`adminAccess`) com **um** documento gov.br de criador parceiro.  
**NOT IMPLEMENTED:** ledger de aceite de Termos de Uso; verificação criptográfica gov.br/ICP-Brasil; modelo genérico objeto+finalidade+prazo+método.

Não há, no repositório, um documento de requisito original anterior ao código que diga explicitamente “todo administrador assina gov.br”. O que existe é **implementação** + **cópia jurídica do produto** alinhada a essa implementação (Termos de Uso atuais). Ver §1.

### 0.2 O gov.br foi corretamente utilizado apenas nos atos que exigem assinatura digital formal, ou houve acoplamento mais amplo do que o requisito original pretendia?

**Houve acoplamento mais amplo do que um ato formal isolado, mas não é “todo administrador do sistema”.**

Classificação do mecanismo gov.br (não escolher em silêncio): **C + D**.

- **C (mistura):** o mesmo padrão técnico (PDF exportado no portal + anexo pelo Super Admin + status `Assinado via gov.br`) serve a **dois atos diferentes** (termo de responsabilidade de criador parceiro **e** termo de autorização editorial do contratante).
- **D (implementação parcial de algo maior):** não há barramento de consentimento; o mesmo enum `signatureProvider: ["gov.br"]` aparece duas vezes; não há API gov.br; o anexo de PDF **não verifica** a assinatura.

Não é **A puro** (só assinatura administrativa): o fluxo comercial OJU-AE-1.0 **não** altera `adminAccess`.  
Não é **B** (mecanismo genérico de consentimento): comunidade, Acervo e publicação editorial própria usam outros campos.  
Não é **E plenamente correto** (restrito só a atos formais): o termo OJU-AR-1.0 **liga e desliga o Centro Administrativo** para quem tem grant `administrador`.

Cronologia forense (migrations):

1. **`drizzle/0022_superb_the_captain.sql`** — tabela `authorizationTerms` (OJU-AE-1.0), gov.br no **trabalho contratado**.
2. **`drizzle/0023_common_punisher.sql`** — tabela `administratorResponsibilityTerms` (OJU-AR-1.0), gov.br no **grant administrativo**.

Ou seja: gov.br **nasceu primeiro** no ato editorial comercial; **depois** foi replicado como condição de `adminAccess` para o papel `administrador`.

### 0.3 Um administrador comum deveria exercer funções via autenticação + Termos de Uso + RBAC + escopo, sem gov.br, enquanto atos formais específicos usam gov.br?

**O código atual já trata três populações de forma diferente.** A pergunta de “deveria” para o **criador parceiro** é **DECISÃO DE NEGÓCIO/JURÍDICA NECESSÁRIA**; a evidência técnica é a seguinte.

| População | Como entra | `adminAccess` exige termo gov.br OJU-AR-1.0? | Evidência |
| --- | --- | --- | --- |
| Super Admin (`administrador principal`) | allowlist Google / admin local de desenvolvimento | **Não** | `server/db.ts`: `isAuthorizedSuperAdmin` / `isLocalPrimaryAdmin` definem `adminAccess=true` sem consultar `administratorResponsibilityTerms` |
| Equipe Ojú: grant `criador`, `editor`, `aprovador` | Super Admin em Colaboradores | **Não** | `upsertUser` / `synchronizeGrantedAccountRole`: termo só se `grant.role === "administrador"` |
| Criador parceiro (Ser parceiro) | `authorizePartnerCandidate` **sempre** grava grant `role: "administrador"` | **Sim** | `collaborators.ts` retorna `requiresResponsibilityTerm: true`; UI: “O papel de segurança (administrador) continua no grant e no termo gov.br.” |

Portanto:

- **Já existe** no código um “administrador comum” no sentido de **equipe interna** (criador/editor/aprovador): autenticação + grant + RBAC + escopo, **sem** gov.br.
- **Não existe** no onboarding oficial da Rede um parceiro territorial com `adminAccess` sem OJU-AR-1.0, porque o candidato é promovido a grant `administrador`, não a `editor`/`criador`.
- `adminAccess === true` **não** implica, por si, que a pessoa assinou gov.br (Super Admin e equipe interna).
- Assinar gov.br **no fluxo de parceiro** é o que **liga** `adminAccess` para essa população — e, como `protectedProcedure` exige `adminAccess`, isso **bloqueia** Opportunity `accept`, Production, editorial interno, etc., mesmo quando o ato operacional não é o termo.

A Missão 3 é consequência **mecânica** desse gate, não de uma regra “aceitar convite exige assinatura digital”.

---

## 1. Requisito original encontrado (o que o repositório prova)

Não foi encontrado um PRD histórico separado do código que defina, em termos jurídicos, “quais atos exigem ICP-Brasil”. O “requisito original” recuperável é a **soma** de:

1. **Dois templates de PDF no cliente**, com finalidade explícita no texto:
   - `OJU-AR-1.0` — “TERMO DE RESPONSABILIDADE — CRIADOR PARCEIRO OJÚ”, assinatura exclusiva gov.br, fora do portal (`client/src/lib/responsibilityTermPdf.ts`).
   - `OJU-AE-1.0` — “TERMO DE AUTORIZAÇÃO EDITORIAL” do **contratante**, escopo granular, não compra Home/curadoria (`client/src/lib/authorizationTermPdf.ts`).
2. **Cópia dos Termos de Uso** (`client/src/lib/legalDocuments.ts`, `LEGAL_UPDATED_AT` 6 set 2026): “Acesso de criador parceiro, quando exigido, passa por termo de responsabilidade assinado via gov.br.” O aviso de privacidade diz que gov.br entra “quando couber” em contratação/produção e **não substitui** termos de autorização nem o termo do criador parceiro.
3. **Schema:** `signatureProvider` só admite `gov.br` nos dois termos; não há provedor alternativo.
4. **Fase 7:** identidade ≠ permissão; Super Admin não delegável; **não** afirma que todo administrador territorial assina gov.br.
5. **Testes que cristalizam a interpretação atual:** `server/administrator-responsibility-terms.test.ts` — “não ativa papel administrativo sem termo assinado”.

**Interpretação atual (runtime):** gov.br do OJU-AR-1.0 = **condição de habilitação do Centro Administrativo** para grant `administrador` (na prática, todos os parceiros do fluxo Ser parceiro).

**Possível desvio arquitetural (hipótese da missão, sustentada pelo código):** o documento OJU-AR-1.0 fala de **deveres de criador parceiro** (editorial, privacidade, carteira). O **efeito** no sistema é `users.adminAccess = true`, que é o **mesmo bit** usado como substituto de “pode chamar qualquer `protectedProcedure`”. Isso **transforma um ato formal de responsabilidade** em **chave mestra de RBAC de painel**.

Não se conclui juridicamente se o OJU-AR-1.0 **deve** existir; conclui-se que **foi ligado ao lugar errado da pilha** se o requisito de negócio era “atos formais específicos”, e não “entrar no Centro Admin”.

---

## 2. Distinção de conceitos — estado atual vs. princípio

| Conceito | Implementado? | Persistência | Autoridade backend |
| --- | --- | --- | --- |
| Identidade | Sim (Google) | `users` | Sim |
| Autenticação | Sim | sessão | Sim |
| Papel / RBAC | Sim | `users.role`, grants | Sim (`requirePrincipal`, `requireStaff`, etc.) |
| Escopo territorial | Sim | grants, partners | Sim |
| Aceite Termos de Uso | Só UI Ser parceiro | **Não** (join request não grava checkbox) | **Não** — backend `joinRequests.submit` não recebe aceite |
| Grant administrativo | Sim | `collaboratorAccessGrants` | Sim |
| `adminAccess` | Sim | `users.adminAccess` default false | Sim — **gate universal** de `protectedProcedure` |
| Consentimento comunitário | Sim (flag) | `consentStatus` | Sim para publicar; **quem** autorizou não é o titular necessariamente |
| Autorização de uso de mídia | Parcial (enum + flag) | `mediaAssets` | Operador autenticado com `adminAccess` declara; sem objeto assinável |
| Autorização editorial comercial | Sim, objeto+escopo+prazo+revogação | matriz + termo | Sim; publicação comercial exige `canUseOnPortal` |
| Assinatura digital formal | Parcial | URL/key de PDF + status | **Confiança no Super Admin** que anexa; sem validação gov.br |
| Autorização de terceiros (imagem/voz de pessoas retratadas) | **Não como entidade** | no máximo texto `terms` / notas | NOT IMPLEMENTED |
| Ledger de versão de política | Só `templateVersion` nos dois termos e `LEGAL_UPDATED_AT` no front | usuários **não** têm versão aceita | NOT IMPLEMENTED |

---

## 3. Investigação gov.br (localização exata)

### 3.1 Procedures e rotas

| Superfície | Função | Efeito |
| --- | --- | --- |
| `collaborators.createResponsibilityTerm` | Super Admin gera linha `Aguardando assinatura gov.br` | Não liga `adminAccess` |
| `collaborators.attachSignedResponsibilityTerm` | Super Admin anexa PDF; status `Assinado via gov.br`; `synchronizeGrantedAccountRole` | **Liga `adminAccess`** se grant autorizado |
| Download PDF privado | `/api/governance/administrator-responsibility-terms/:termId/document` | Sessão; Super Admin ou o próprio administrador (`sameAdministrator`) |
| `commercial.createAuthorizationTerm` | Exporta OJU-AE-1.0 após entrega privada + matriz | Status aguardando gov.br |
| `commercial.attachSignedAuthorizationTerm` | Anexa PDF | Não publica sozinho |
| `commercial.saveEditorialAuthorization` | Ativar Autorizada/parcial **exige** termo `Assinado via gov.br` | Liga `editorialAuthorized`; sem portal se `canUseOnPortal` falso; revogação **despublica** |

Não há SDK gov.br, webhook gov.br, validação de certificado, hash do PDF contra o template, nem JWT de assinatura.

`scripts/homologate-admin-cms.ts` **fabrica** o estado `Assinado via gov.br` + `adminAccess` para homologação de CMS. **Não é fluxo oficial de QA** e **não deve** ser usado para simular a Missão 3/4.

### 3.2 Schema

`administratorResponsibilityTerms`: `roleSnapshot` enum **somente** `administrador`; `signatureProvider` somente `gov.br`; `templateVersion` default `OJU-AR-1.0`.

`authorizationTerms`: ligado a `requestId` (contratação); `templateVersion` default `OJU-AE-1.0`.

### 3.3 Relação gov.br × `adminAccess`

**Por que o fluxo atual exige `adminAccess`?**  
Porque quase toda operação interna (Opportunity accept, Production, editorial, mídia, comunidade, comercial interno) é `protectedProcedure`, cujo middleware recusa `adminAccess === false` (`server/_core/trpc.ts`).

**`adminAccess` deveria depender de gov.br?**  
No código, **somente** quando `grant.role === "administrador"`. Super Admin e equipe interna **não**. Parceiro Ser parceiro **é forçado** a esse papel.

**Gov.br substitui autenticação/RBAC?**  
**Parcialmente, sim, para parceiros:** o OAuth Google autentica a pessoa, mas o painel só abre após o anexo do PDF. Isso é **assinatura como habilitação de papel**, não como evidência de um ato pontual (publicar X, ceder mídia Y).

**Acoplamento indevido?**  
**INCONSISTENCY:** `adminAccess` (capacidade de chamar APIs internas) ≠ “assinou o OJU-AR-1.0”. O segundo foi usado para produzir o primeiro.

**O termo é de todas as contas administrativas ou de um nível?**  
Evidência: **apenas grant `administrador`**, não Super Admin, não criador/editor/aprovador. O texto do PDF é de **criador parceiro**, não de “qualquer admin CMS”.

---

## 4. Mapa de publicação pública (quem autoriza o quê)

Regra observada: **backend é autoridade**; “publicado + isPublic” **não** é suficiente no caminho **comercial** (`commercialRequestId` preenchido). No caminho **editorial próprio / não contratado**, `publicationEligibleForPortal` usa status, `isPublic`, quarentena, delete — **sem** termo gov.br.

| Caminho até o site | Quem autoriza hoje | O que o backend valida | Gov.br? |
| --- | --- | --- | --- |
| História/cobertura/documentário/projeto **sem** `commercialRequestId` | Equipe com papel que publica (`canPublishStraight` / ciclo) | texto, território, capa, 5+1, `isPublic` | Não |
| Mesmo tipo **com** `commercialRequestId` | Contratante (matriz + termo) **e** editorial | `assertCommercialPublicationCanPublish` → `canUseOnPortal` | Sim (para ativar matriz) |
| Home / destaques | Curadoria; miniclipe comercial exige `authorizedForHome` + portal | Não é pay-to-appear | Comercial: gov.br indireto via autorização |
| Diretório Rede / perfil profissional | `publicVisible` + regras de visibilidade | Sem termo gov.br | Não |
| Instituição pública | Staff marca `consentStatus=Autorizado` + `Publicada` | Consentimento + mídia elegível | Não |
| Evento público | Idem | Idem | Não |
| Memória oral pública | `createMemoryWithConsent` (checkbox staff + nota ≥12) + publicar | `consentStatus` + `accessLevel=Público` | Não |
| Anúncio ativo | Comercial interno | datas/status; **sem** OJU-AE | Não (RISK se anúncio usar imagem de terceiros) |
| Originação (`originateLead`) | Profissional autenticado **sem** `adminAccess` | Sessão + perfil | Não |

**CommunityLifecycleActions:** um clique “Autorizar e publicar” pode setar `consentStatus=Autorizado` e em seguida publicar. É **atestação operacional**, não assinatura do titular da casa/voz.

---

## 5. Matriz por fluxo

Legenda de classificação: PASS / FAIL / RISK / INCONSISTENCY / NOT IMPLEMENTED / DECISÃO NECESSÁRIA.

Campos comuns omitidos quando “n/a”: revogação inexistente; evidência = o que o banco grava.

### 5.1 Autenticação / login Google

| Campo | Valor |
| --- | --- |
| Fluxo | Login OAuth |
| Objeto | Conta |
| Tipo | Autenticação |
| Só aceite? | Não |
| Assinatura / gov.br | Não |
| Evidência | sessão, `lastSignedIn` |
| Estado atual | PASS (identidade) |
| Risco | Não confundir com autorização de conteúdo |

### 5.2 Aceite dos Termos de Uso (Ser parceiro)

| Campo | Valor |
| --- | --- |
| Fluxo | `BePartner` checkbox “Li os Termos…” |
| Objeto | Políticas gerais do portal |
| Quem autoriza | Candidato (UI) |
| Persistido? | **Não** em `joinRequests.submit` |
| Bloqueio backend | **Não** (só o front exige o check para enviar) |
| Estado atual | **INCONSISTENCY** / **NOT IMPLEMENTED** (ledger) |
| Decisão | Se aceite precisa de versão, IP, timestamp, reaceitação |

### 5.3 Pedido Ser parceiro

| Campo | Valor |
| --- | --- |
| Procedure | `joinRequests.submit` (`publicProcedure`) |
| Não cria login | Correto |
| Gov.br | Não neste passo |
| Estado | PASS como captação; aceite legal só no cliente |

### 5.4 Autorização da candidatura (Super Admin)

| Campo | Valor |
| --- | --- |
| Procedure | `authorizePartnerCandidate` |
| Grant | **sempre** `administrador` |
| Perfil profissional | especialidades + bond; **não** é RBAC |
| Termo | `requiresResponsibilityTerm: true` |
| adminAccess imediato | Não (até anexo OJU-AR-1.0) |
| Estado | **INCONSISTENCY** de modelo: UI “Criador parceiro” vs papel de segurança `administrador` |
| Decisão | Parceiro territorial deveria ser grant `administrador` ou papel de equipe + escopo? |

### 5.5 Colaborador interno (criador / editor / aprovador)

| Campo | Valor |
| --- | --- |
| Procedure | `collaborators.authorize` com role de equipe |
| Termo gov.br | Não (`requiresResponsibilityTerm` só se `administrador`) |
| adminAccess | Sim, após grant Autorizado (e conta operável) |
| Estado | **PASS** relativamente à regra “admin comum ≠ gov.br” |
| Risco | Podem operar o Centro Admin **sem** OJU-AR-1.0 — alinhado à hipótese da missão |

### 5.6 Termo de responsabilidade OJU-AR-1.0

| Campo | Valor |
| --- | --- |
| Documento | Criador parceiro (deveres, carteira 70/30 no PDF, gov.br exclusivo) |
| Quem assina (texto) | O criador parceiro via gov.br **fora** do portal |
| Quem anexa | Super Admin |
| Validade / revogação do termo | Status Arquivado existe; **não** há expiração própria; revogar grant tira `adminAccess` |
| Evidência | PDF URL/key; **sem** prova criptográfica |
| Bloqueio | `synchronizeGrantedAccountRole` / `upsertUser` |
| Estado | **RISK** (confiança no upload) + **INCONSISTENCY** (efeito = painel inteiro) |
| Decisão | O 70/30 no PDF vs política comercial viva; se o termo deve continuar a ligar `adminAccess` |

### 5.7 Opportunity (criar / convite / aceite)

| Campo | Valor |
| --- | --- |
| Aceite | `opportunities.accept` = `protectedProcedure` |
| Quem deve autorizar o aceite | O profissional convidado (perfil) |
| Gov.br no ato de aceite | **Não** |
| Bloqueio real | `adminAccess` (parceiro sem termo) **e** match de perfil (Super Admin não aceita convite alheio — Missão 3) |
| Estado | **INCONSISTENCY** de produto: ato operacional bloqueado por termo de **outro** objeto (responsabilidade de parceiro) |
| Decisão | Aceite de convite exige assinatura formal? (não há evidência de que o requisito original fosse esse) |

### 5.8 Production / upload de mídia da produção

| Campo | Valor |
| --- | --- |
| Limite 5+1 | Por produção (preservar) |
| `publicationAllowed` no attach | Não torna público |
| Gov.br | Não no attach |
| Estado | PASS operacional; exposição pública continua editorial/comercial |
| Decisão | Cessão/licença de cada arquivo precisa de termo assinado? |

### 5.9 Acervo (`media.create` / `update`)

| Campo | Valor |
| --- | --- |
| Tipo | Declaração do operador: Cessão / Licença / Domínio público / Autoral própria / Pendente |
| `publicationAllowed` | Boolean do operador |
| Assinatura | Não |
| Procedure | `protectedProcedure` → exige `adminAccess` |
| Estado | **NOT IMPLEMENTED** como autorização formal; **RISK** se a declaração for tratada como prova jurídica |
| Decisão | Quem é o autorizante (titular da imagem/voz vs casa vs profissional) |

### 5.10 Editorial `publishDirect` / ciclo / Home

| Campo | Valor |
| --- | --- |
| Não comercial | publicado + isPublic (+ elegibilidade) |
| Comercial | + autorização vigente `allowPortal` + foto/vídeo/story |
| Home | não automático; miniclipe comercial tem flags próprias |
| Estado | PASS comercial granular; **DECISÃO** se história própria da Rede exige termo de pessoas retratadas |

### 5.11 Autorização editorial comercial OJU-AE-1.0

| Campo | Valor |
| --- | --- |
| Objeto | Uma `commercialRequest` (contratação), não “qualquer mídia futura da casa” |
| Quem autoriza (registro) | `authorizedByName` / role (texto) + PDF gov.br |
| Momento | Após entrega privada |
| Validade | `expiresAt`; revogação retira portal e Home |
| Reuso fora do escopo | Matriz por request; **não** autoriza outro documentário automaticamente (**PASS** de escopo comercial) |
| Outro método | Schema **não** permite; só gov.br |
| Estado | **PASS** como o fluxo mais próximo de “ato formal + objeto + finalidade”; **RISK** verificação do PDF; **DECISÃO** validade jurídica do método |

### 5.12 Instituições / casas / visibilidade institucional

| Campo | Valor |
| --- | --- |
| Consentimento | Flag staff |
| Publicação | Exige Autorizado |
| Plano de visibilidade | Assinatura comercial de serviço ≠ consentimento de imagem |
| Estado | **INCONSISTENCY**: “assinatura” de plano de visibilidade não é gov.br; consentimento não é o titular |
| Decisão | Casa assina o quê (perfil, mapa, fotos de terreiro, terceiros) |

### 5.13 Agenda / cobertura comunitária / evento

Igual instituições: flag + publicar. **NOT IMPLEMENTED** autorização por evento distinta da casa. Risco de reuso indevido de consentimento.

### 5.14 Memória oral / voz

| Campo | Valor |
| --- | --- |
| `createMemoryWithConsent` | `consentAccepted: true` + nota ≥12 + `consentStatus=Autorizado` |
| Quem clica | Staff com `adminAccess` |
| Gov.br | Não |
| Público | `Publicada` + Autorizado + `accessLevel=Público` |
| Estado | **RISK** / **DECISÃO**: voz e identificação (`speakerNameVisibility`) sem evidência do falante |

### 5.15 Fotografia documental / créditos / perfil público

Visibilidade de fotógrafo (`publicVisible`) é flag editorial/operacional, não termo. **NOT IMPLEMENTED** autorização de modelo.

### 5.16 Licenciamento público (`revenue.createPublic`)

Pedido público de licença de mídia; não prova que a mídia tinha autorização formal. **DECISÃO** encadeamento jurídico.

### 5.17 Conteúdo comercial / anúncio

Anúncio ativo no portal **não** passa por `authorizationTerms`. **RISK** se o criativo contém pessoas/casas.

### 5.18 Contratos de cobertura (`contracts`)

Registro operacional de contrato (status rascunho/enviado/assinado). **Não** é o mesmo que `authorizationTerms`. Campo “assinado” pode ser **INCONSISTENCY** semântica (assinatura contratual vs gov.br).

### 5.19 Cuidado / formulários públicos

`createCareRequest` público; sem termo. Adequado a denúncia/pedido. PASS como canal; não é autorização de mídia.

### 5.20 Administração comum (criar colaboradores, grants)

Super Admin: autenticação + RBAC `administrador principal` + **sem** OJU-AR-1.0. **PASS** para a regra “Super Admin ≠ termo de parceiro”.

---

## 6. O que já está correto (PASS, como implementado)

- Super Admin não passa pelo termo de criador parceiro.
- Equipe interna criador/editor/aprovador pode ter `adminAccess` sem gov.br.
- Trabalho contratado permanece privado até matriz + termo gov.br + `canUseOnPortal`.
- Revogação editorial comercial despublica e tira miniclipe da Home.
- Autorização comercial é por `requestId` (escopo de contratação), não “a casa autorizou a Rede para sempre”.
- `publicationAllowed` sozinho não publica Production.
- Especialidade profissional não concede RBAC (`FASE7`).
- Originação profissional não exige `adminAccess`.
- Portal não coleta a assinatura gov.br (PDF externo) — alinhado aos templates.
- Testes de segurança que exigem termo para grant `administrador` **passam** e descrevem o comportamento atual; isso **não** prova que o requisito de negócio original era esse.

## 7. O que está incompleto (NOT IMPLEMENTED)

- Integração real gov.br / verificação de assinatura.
- Modelo genérico: autorizante, finalidade, objeto, escopo, prazo, versão, método, evidência, revogação.
- Ledger de Termos de Uso / privacidade por usuário.
- Consentimento comunitário e memória oral como ato do titular (hoje: staff).
- Autorização de terceiros (pessoas em foto/vídeo) como entidade.
- Provedor de assinatura diferente de gov.br (enum fechado).
- Diferenciar no backend “usuário autenticado da Rede” vs “operador de painel” sem usar o mesmo `adminAccess` para quase tudo.

## 8. O que está conceitualmente errado ou misturado (INCONSISTENCY)

1. **Grant `administrador` = criador parceiro** no onboarding, enquanto a UI e o PDF falam “criador parceiro” e a equipe interna já tem papéis sem termo.
2. **`adminAccess` como sinônimo operacional de “assinou o termo”** para essa população, e ao mesmo tempo **não** para Super Admin/equipe.
3. **Aceite de Termos de Uso** (checkbox) vs **assinatura formal** (PDF gov.br) vs **consentimento comunitário** (select) vs **autorização de mídia** (enum) — mesmos verbos, provas diferentes.
4. Nome de ficheiro `termo-responsabilidade-administrativa-oju-*.pdf` vs título “criador parceiro”.
5. Staff pode marcar consentimento e publicar no mesmo gesto.
6. Dois termos gov.br compartilham máquina de estados, mas um liga painel e o outro liga portal comercial.

## 9. Riscos

| ID | Risco | Tipo |
| --- | --- | --- |
| R1 | PDF anexado sem validação gov.br | Operacional / **DECISÃO** jurídica |
| R2 | Parceiro não opera Rede (Opportunity/Production) até um termo de **responsabilidade administrativa**, não um termo do convite | Produto |
| R3 | Consentimento comunitário/memória oral atribuído ao staff | Jurídico — **DECISÃO** |
| R4 | Enum de mídia tratado como prova de cessão | Jurídico — **DECISÃO** |
| R5 | Publicação não comercial sem autorização formal de retratados | **DECISÃO** — não concluir que “público ⇒ gov.br” |
| R6 | Script de homologação fabricando assinatura | Operacional (não usar em QA) |
| R7 | Texto 70/30 no OJU-AR-1.0 vs política comercial versionada | Produto — não alterar percentuais agora |
| R8 | Anúncios e diretórios públicos sem matriz OJU-AE | **DECISÃO** de quais exposições exigem ato formal |

---

## 10. Impactos (apontar, não alterar)

### Publicação pública

Dois regimes: editorial próprio (`publicado+isPublic`) vs comercial (`canUseOnPortal`). Gov.br **não** é o gate universal do site.

### Production

Nasce só após aceite (`protectedProcedure`). Parceiro sem OJU-AR-1.0 **não chega** à Production. Isso **não** é regra de mídia da Production; é o gate de painel.

### Acervo

Registro de autorização é declaração de operador com `adminAccess`. Sem objeto assinável. Upload exige o mesmo gate.

### Memória oral / imagem / voz

Há flags e notas; **não** há assinatura do falante/retratado. **DECISÃO** se algum desses atos exige gov.br ou outro instrumento.

### Instituições / casas

Consentimento de perfil ≠ autorização de todos os participantes da casa (princípio da missão; o código **não** modela participantes da casa como autorizantes).

---

## 11. Arquitetura recomendada (especificação — não implementar agora)

Separar **quatro planos** que hoje colidem no bit `adminAccess` e na palavra “termo”:

```text
A. Conta e painel
   autenticação + aceite versionado dos Termos de Uso + grant RBAC + escopo
   → adminAccess / operações administrativas
   → gov.br NÃO é requisito deste plano, salvo decisão explícita de um cargo

B. Documentos formais (quando o negócio/jurídico exigir)
   documento (código + versão) + autorizante + método (gov.br ou outro) + evidência
   → efeito JURÍDICO daquele documento (não “abrir o CMS”)

C. Autorizações de conteúdo (objeto + finalidade + prazo + revogação)
   mídia, publicação, memória, instituição, contratação comercial
   → o OJU-AE-1.0 já é o melhor protótipo deste plano (reaproveitar)

D. Atestação operacional
   staff declara que viu um papel/assinatura offline
   → nunca equivaler automaticamente a C sem evidência
```

**Reaproveitar:** máquina de estados dos termos (Gerado / Aguardando / Assinado / Arquivado); matriz comercial (`allowPhotos`…); `canUseOnPortal`; despublicação na revogação; PDF gerado no cliente + armazenamento privado; auditoria `auditEvents`; territorial scope; 5+1; Opportunity/Production; QA guards.

**Desacoplar:** `attachSignedResponsibilityTerm` → `adminAccess`; `authorizePartnerCandidate` sempre `role: administrador`; `protectedProcedure` como único critério de “é da Rede”.

**Administrador comum (especificação alvo, pendente de decisão de papéis de parceiro):**

```text
login Google → aceite Termos (ledger) → grant (criador|editor|aprovador|administrador territorial)
→ escopo → operações do papel
```

Gov.br apenas se existir **documento** cujo efeito seja aquele ato (ex.: OJU-AE para portal comercial; eventualmente um termo de parceiro **se** o jurídico exigir, mas com efeito no **vínculo de responsabilidade**, não necessariamente em todas as `protectedProcedure`).

---

## 12. Modelo genérico de autorização (proposta futura — sem tabela agora)

Campos mínimos de um registro (quando autorizado a criar schema):

- `subjectType` / `subjectId` (quem autoriza)
- `actorUserId` (quem autenticou / quem registrou)
- `objectType` / `objectId` (produção, mídia, publicação, instituição, request, memória…)
- `purpose` (portal, institucional, social, pesquisa, acervo restrito…)
- `scope` (território, canais, identificação de pessoas)
- `documentCode` + `documentVersion`
- `method` (`gov.br` | futuro)
- `evidenceStorageKey` / hash
- `validFrom` / `expiresAt` / `revokedAt`
- `recordedBy` vs `signedBy` (não misturar)

**Não criar agora** `consents`, `signatures`, `digital_signatures`, `authorizations`.

### Migrations futuras (somente catálogo)

Possíveis, **depois** de decisão humana: ledger de aceite de Termos; desacoplar `adminAccess` do termo; `signatureProvider` aberto; evidência de hash; autorizante ≠ recorder no comunitário. **Nenhuma nesta missão.**

---

## 13. O que NÃO deve ser feito agora

- Não alterar Production, Opportunity, percentuais, 5+1, RBAC territorial, visibility engine, cleanup, QA guard, Aiven 0053, QA 0054, OAuth.
- Não criar bypass de `adminAccess`.
- Não anexar PDF de laboratório nem homologate-admin-cms em QA.
- Não concluir que “conteúdo público ⇒ gov.br”.
- Não implementar o modelo da §11.

---

## 14. Plano de implementação futura (fases)

1. **Decisões humanas** (lista §16) — bloqueante.
2. **Desenho de papéis de parceiro:** grant de equipe vs `administrador` vs documento OJU-AR.
3. **Desacoplar painel** de OJU-AR **se** a decisão for que o termo não habilita CMS (migration + `protectedProcedure` seletiva para atos da Rede sem painel completo).
4. **Generalizar o padrão OJU-AE** para outros objetos **somente** onde o jurídico exigir assinatura.
5. **Consentimento comunitário/memória:** distinguir atestação vs assinatura do titular.
6. **Verificação gov.br** (integração) — só depois do modelo de evidência.
7. Testes: unitários de predicados; e2e sem fabricar assinatura; QA cleanup inalterado.

## 15. Testes necessários (futuro)

- Grant `editor` opera `protectedProcedure` sem linha em `administratorResponsibilityTerms` (já é o contrato do código; manter).
- Grant `administrador` sem termo continua sem `adminAccess` **até** decisão de desacoplar.
- Comercial: sem termo assinado não ativa matriz; revogação despublica.
- Publicação sem `commercialRequestId` não consulta `authorizationTerms`.
- Join request sem campo de aceite (hoje) — quando houver ledger, recusar submit sem versão.
- Proibir testes que chamem `attachSigned*` com PDF de laboratório como se fossem gov.br.

## 16. DECISÃO DE NEGÓCIO/JURÍDICA NECESSÁRIA

Não é parecer jurídico. O responsável precisa definir:

1. O criador parceiro **precisa** assinar OJU-AR-1.0? Se sim, o efeito é **vínculo de responsabilidade** ou **acesso ao CMS**?
2. Administrador territorial da Rede é o mesmo cargo que “administrador” do grant atual?
3. Aceite de Opportunity / criação de Production exigem algum documento formal, ou só conta autenticada + convite?
4. Publicação editorial **não contratada** exige autorização de retratados? Com que método?
5. Memória oral e perfil de casa: quem é o autorizante e qual prova?
6. gov.br é o único método aceito para OJU-AE e OJU-AR, ou haverá outro?
7. Upload de PDF pelo Super Admin é evidência suficiente até existir API gov.br?
8. Anúncios e diretórios: precisam de matriz de autorização?
9. Reaceitação de Termos de Uso quando `LEGAL_UPDATED_AT` muda?

---

## 17. Classificação consolidada da missão

| Tema | Classificação |
| --- | --- |
| Arquitetura única coerente de autorização digital | **NOT IMPLEMENTED** |
| Distinção conceitual no código | **INCONSISTENCY** |
| Gov.br só em atos formais pontuais | **INCONSISTENCY** (OJU-AR liga painel; OJU-AE é o uso pontual) |
| Super Admin e equipe interna sem OJU-AR | **PASS** |
| Comercial portal + matriz + termo | **PASS** (com RISK de evidência) |
| Termos de Uso persistidos | **NOT IMPLEMENTED** |
| Comunidade / memória como assinatura do titular | **NOT IMPLEMENTED** / **RISK** |
| Verificação criptográfica gov.br | **NOT IMPLEMENTED** |
| Fabricar assinatura / mudar Production nesta missão | Não feito (**PASS** de escopo da missão) |
| Questões de validade jurídica | **DECISÃO NECESSÁRIA** |

---

## 18. Parar aqui

Esta missão **não** altera schema, migrations, Aiven, fluxos, dados de produto nem percentuais. Qualquer implementação depende das decisões da §16 e de autorização posterior.
