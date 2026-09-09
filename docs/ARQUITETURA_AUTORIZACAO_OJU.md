# Arquitetura de autorização da Ojú

Este documento descreve a separação obrigatória entre conta, Termos de Uso, Rede, RBAC, Centro Administrativo, documentos formais e gov.br.

**adminAccess não é assinatura gov.br.**  
**Termos de Uso não são assinatura gov.br.**  
**Participação na Rede não é automaticamente acesso administrativo global.**  
**Autorização editorial não é autorização administrativa.**

---

## A. Conta / acesso

```text
autenticação (Google OAuth)
→ conta Ativa
→ aceite versionado dos Termos de Uso (OJU-TU, ledger termsOfUseAcceptances)
→ papel/RBAC (users.role + collaboratorAccessGrants)
→ escopo territorial (partnerMembers / grant partnerId+territoryId)
→ permissões da operação
```

- `authenticatedProcedure`: sessão + conta Ativa. **Não** exige `adminAccess`.
- `protectedProcedure`: sessão + `adminAccess` + conta Ativa. Centro Administrativo.
- Super Admin (`administrador principal` + allowlist) recebe `adminAccess` sem OJU-AR.
- Equipe interna `criador` / `editor` / `aprovador`: grant autorizado liga `adminAccess` **sem** gov.br.
- Grant `administrador` (criador parceiro no CMS): `adminAccess` só após OJU-AR-1.0 `Assinado via gov.br`.

O aceite de Termos é versionado (`TERMS_OF_USE_VERSION`). Não cria assinatura formal.

## B. Documento formal

```text
documento (código + versão)
→ finalidade
→ objeto
→ autorizante / signatário
→ método (hoje: gov.br, evidência = PDF externo anexado)
→ validade / revogação
```

| Documento | Código | Objeto | Efeito |
| --- | --- | --- | --- |
| Termo de responsabilidade do criador parceiro | OJU-AR-1.0 | grant `administrador` | Vínculo/responsabilidade + **CMS** (`adminAccess`) |
| Termo de autorização editorial | OJU-AE-1.0 | `commercialRequest` | Ativa matriz; `canUseOnPortal`; não liga `adminAccess` |

O portal **não** valida criptograficamente o gov.br. O Super Admin anexa o PDF. Integração oficial gov.br permanece dependência externa.

## C. Autorização de conteúdo

Objeto + finalidade + escopo + prazo. Publicação só quando as regras **daquele** contexto forem satisfeitas.

- Editorial próprio: ciclo editorial + `publicado` + `isPublic`. **Não** exige gov.br por existir conteúdo público.
- Comercial: matriz `commercialEditorialAuthorizations` + termo OJU-AE + `canUseOnPortal`.
- Acervo: enum `authorization` + `publicationAllowed` são declaração operacional, **não** prova de assinatura.
- Memória oral / casa: `consentStatus` + `consentEvidenceKind` (`staff_attestation` por padrão). **Não** é assinatura do titular. Autorização da casa **não** autoriza todas as pessoas retratadas.
- Production operacional: `productions.registerOperationalMedia` para o perfil dono da Production, com `publicationAllowed=false`.

## D. Assinatura digital e E. gov.br

Assinatura digital é propriedade de um **ato/documento**, não da conta.

gov.br é o método atualmente enumerado nos dois termos formais. Não é login, RBAC, membro da Rede, autorização de mídia nem chave universal.

## Rede vs CMS

```text
Participação na Rede = perfil profissional Ativo + Termos + operações próprias
  (convites, Production, originação)
Centro Administrativo = adminAccess + RBAC + escopo
OJU-AR = documento formal para o CMS do grant administrador
```

`authorizePartnerCandidate` ainda grava grant `administrador` e `requiresResponsibilityTerm` para o **CMS**. Membership territorial (`partnerMembers`) pode existir **sem** termo. `opportunities.accept` usa `authenticatedProcedure` + perfil do convite, não `adminAccess`.

## Publicação (por contexto)

Não existe regra «todo conteúdo público precisa gov.br».

| Contexto | Autorização hoje | Assinatura formal / gov.br |
| --- | --- | --- |
| Editorial próprio | Ciclo editorial + publicado + isPublic | Não |
| Comercial | OJU-AE + matriz + canUseOnPortal | gov.br no PDF anexado ao termo daquele pedido (dependência externa) |
| Acervo | authorization enum + publicationAllowed (operacional) | Não prova assinatura |
| Memória oral / voz | consentAccepted + nota + consentEvidenceKind | DECISÃO NECESSÁRIA se exigirá assinatura do titular |
| Casa / instituição | consentimento do perfil | Não autoriza pessoas retratadas nem voz |
| Production operacional | dono da Production + Termos de Uso | Não é portal; publicationAllowed=false |

## Matriz de autorização (Missão 5.1)

| Conceito | Significa | Não significa | Principal uso |
| --- | --- | --- | --- |
| Autenticação (OAuth) | Identidade da conta Google | CMS, Rede, gov.br, autorização de mídia | `authenticatedProcedure` / sessão |
| Termos de Uso (OJU-TU) | Aceite versionado da plataforma | Assinatura gov.br, OJU-AR, OJU-AE | Ledger `termsOfUseAcceptances`; operações da Rede |
| `partnerMembers` | Membership territorial da Rede | CMS, adminAccess, gov.br | Escopo de parceiro/território |
| `professionalProfiles` | Identidade profissional (ofício, especialidades) | Papel RBAC de CMS | Matching, convite, aceite, Production própria |
| `users.role` | Papel RBAC da conta (equipe vs grant) | Membership da Rede; assinatura | Transições editoriais, `adminProcedure`, staff |
| `adminAccess` | Acesso operacional ao CMS | Assinatura gov.br; ser da Rede | `protectedProcedure` / `requireCmsAccess` |
| `authenticatedProcedure` | Sessão válida + conta Ativa | Admin, CMS, gov.br | Convites/Production próprias, Termos, notificações |
| `protectedProcedure` | Sessão + `adminAccess` + conta Ativa | gov.br; qualquer autenticado | Centro Administrativo |
| `adminProcedure` | CMS + papel `administrador` ou Super Admin | Equipe criador/editor/aprovador | Rotas de administrador estrito |
| Escopo territorial | Parceiro + território autorizados | Autorização de conteúdo de terceiros | Mutations territoriais |
| OJU-AR-1.0 | Termo formal de responsabilidade do grant `administrador` | Membership; aceite de Opportunity; Production | Liga `adminAccess` desse grant |
| OJU-AE-1.0 | Autorização comercial/editorial do **pedido** | Autorização administrativa; casa/voz/retratos globais | `canUseOnPortal` + matriz |
| gov.br | Método de assinatura de um ato formal | Login, RBAC, Rede, CMS universal | Evidência PDF anexada (dependência externa) |

**adminAccess não é assinatura gov.br.**  
**Termos de Uso não são assinatura gov.br.**  
**Participação na Rede não é automaticamente acesso administrativo global.**  
**Autorização editorial não é autorização administrativa.**

## role `administrador` (dívida semântica, sem refatoração)

`authorizePartnerCandidate` ainda grava `collaboratorAccessGrants.role = administrador` e `requiresResponsibilityTerm = true`. Isso é o papel **técnico histórico do grant que pode virar CMS**, não a identidade da Rede.

A identidade na Rede já está em `professionalProfiles` + especialidades + `partnerMembers` + território + `authenticatedProcedure`.

| Pergunta | Resposta |
| --- | --- |
| `role: administrador` representa o participante da Rede? | Não. Representa o grant que *pode* liberar CMS após OJU-AR. |
| Uso histórico como papel técnico de CMS? | Sim. |
| Membership já está representada sem CMS? | Sim: perfil + membership + território + Termos. |
| `role=administrador => CMS`? | Não no tRPC: CMS exige `adminAccess`. `adminProcedure` exige **os dois**. |
| `role=administrador => gov.br`? | Não automaticamente. gov.br só no documento OJU-AR daquele grant. |
| Gates que usam `role` onde o conceito certo seria outro? | Sim, em trechos pontuais (ver dívida). |
| Risco de novo participante receber `users.role=administrador` indevido? | Mitigado hoje: sem OJU-AR, `synchronizeGrantedAccountRole` e `db.upsertUser` gravam `users.role=criador` e `adminAccess=false`. |
| Pode permanecer no Beta? | Sim, sem risco funcional/de segurança **desde que** `adminAccess` continue sendo o gate de CMS. |

Dívida futura (não implementar agora): nomear o grant de parceiro de forma distinta de `administrador`, ou um papel de Rede dedicado. Enquanto `users.role` não for promovido a `administrador` sem termo, o CMS permanece fechado.

Atenção residual: `server/privateCommercialFiles.ts` e `community.requireStaff` olham `users.role === administrador` (além de sessão). Com o sync atual isso não abre CMS nem PDF a parceiro sem termo, porque a conta permanece `criador`.

## ESTADO APROVADO APÓS MISSÃO 5

Arquitetura aprovada para Beta com dívida semântica documentada (grant `administrador`).

Separação vigente:

```text
identidade        → users + OAuth
autenticação      → sessão + conta Ativa
Terms             → OJU-TU versionado
membership        → partnerMembers + professionalProfiles + território
RBAC              → users.role + collaboratorAccessGrants
scope             → partnerId + territoryId
CMS               → adminAccess (+ adminProcedure quando couber)
atos formais      → OJU-AR (CMS do grant) / OJU-AE (pedido comercial)
autorização conteúdo → objeto + finalidade + escopo + prazo
método assinatura → gov.br quando o ato exigir (dependência externa)
```

### Auditoria dos 2 auditEvents (QA, Missão 5.1)

| id | Tipo | Actor | Entidade | Quando (UTC) | Origem | Veredito |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `auth` / `login-success` | Super Admin `users.id=1` | a própria conta | 2026-09-09 00:42:39 | Captura OAuth FASE 1 / framework QA | **LEGÍTIMO** — deve sobreviver. Super Admin QA não é apagado. |
| 532 | `network-notification` / `notification_created` | Super Admin (ator da conclusão) | `resourceId=51` (notificação já inexistente); `production_completed` / Production 4; destinatário 2719 (já removido); partner/territory 39 (já removidos) | 2026-09-09 21:04:59 | Missão 3 / `productions.approveReview` | **GHOST DATA** — órfão de cleanup |

Conclusão: **AUDIT RESIDUAL = GHOST DATA CORRIGIDO** (532) + **LEGÍTIMO preservado** (1).

Causa: `production_completed` nascia depois do `ledger.add("notification")` do aceite; o handler de `user` apagava `networkNotifications` do destinatário sem apagar `auditEvents` cujo `actorId` é o Super Admin. Correção no TestLedger: apagar auditorias `network-notification` **antes** da linha da notificação (handlers `user`, `production`, `opportunity`). O id 532 foi removido só com impressão forense (tipo + resourceId 51 + notificação ausente). O id 1 permanece.

Leitura forense (somente SELECT): `pnpm exec tsx scripts/qa-inspect-audit.ts`.

### Migrations

- **Aiven / Beta = 0053.** 0054 e 0055 **não** foram aplicadas em Aiven.
- **QA = 0055.**

### O que não fazer

- Não fabricar PDF/gov.br/JWT/webhook.
- Não tratar `publicado + isPublic` como autorização comercial.
- Não aplicar migration 0055 em Aiven sem autorização (Aiven permanece 0053; QA aplica 0054 e 0055).
- Não apagar `auditEvents` de login do Super Admin QA para “zerar” o contador.
