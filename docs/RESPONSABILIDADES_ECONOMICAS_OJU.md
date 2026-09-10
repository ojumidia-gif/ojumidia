# Responsabilidades econômicas do Ojú

**PROMPT 2.** Papel × permissão × efeito econômico.  
**Administrador ≠ beneficiário.** **createdBy ≠ valor econômico.**  
Beta sem cobrança real.

---

## 1. Distinções obrigatórias `[CONFIRMADO NO CÓDIGO]` / `[CONFIRMADO NA DOCUMENTAÇÃO]`

| Identidade | Fonte | Efeito econômico automático |
|---|---|---|
| `users.role` / `adminAccess` | RBAC | **nenhum** |
| `professionalProfiles` | Rede | **nenhum** até ser executor/captor **daquela** operação |
| `OJU_ORIGIN_V1.originatedByProfessionalProfileId` | `notes` | **nenhum** no Beta |
| `capturedByUserId` (ads/visibilidade) | mesa | fatia **escritural** de captação; payout = aviso |
| `managedByUserId` | carteira | operação, não receita |
| `createdBy` Opportunity | admin que gravou | **não** originador |
| `acceptedProfessionalProfileId` | aceite | candidato a executor |
| `networkProductions.professionalProfileId` | execução | `professionalValue` no freeze — **não** é pagamento |

---

## 2. Matriz PAPEL × RESPONSABILIDADE × PERMISSÃO × EFEITO ECONÔMICO

Efeito no Beta = escritural/operacional, **nunca** PIX. `[CONFIRMADO NO CÓDIGO]`

| Papel | Responsabilidade | Permissão hoje | Efeito econômico |
|---|---|---|---|
| **Cliente / contratante** | Pedir cobertura, pagar **no futuro** | Formulários públicos; **não** confirma pagamento | Pagador hipotético; não é beneficiário |
| **Ojú (organização)** | Operar Rede, curadoria, mesas | Super Admin / equipe | Fatia `ojuValue`/`ojuAmount` — **não** = receita contábil `[DEPENDE DE VALIDAÇÃO EXTERNA]` |
| **Administrador** (`users.role`) | CMS/editorial conforme RBAC | Centro Admin se `adminAccess` | **Não** beneficiário |
| **Administrador territorial** | Escopo `assertPartnerScope` | Opportunity/Production no território | **Não** 70% por ser admin `[DÍVIDA]` `contracts` |
| **Super Admin** | Políticas, refund decide, payout **marcar** pago, consolidado | `administrador principal` | Pode **registrar** intenção de repasse; não liquida banco `[CONFIRMADO NO CÓDIGO]` `canUpdatePayout` |
| **Profissional** | Perfil Rede, originação, aceite, execução | `/rede/originar`, convites | Só se executor/captor **da operação** |
| **Executor** | Produzir, entregar mídia 5+1 editorial | Production do próprio recorte; ver settlement se for o perfil `[CONFIRMADO NO CÓDIGO]` `assertProductionCommerceScope` | `professionalValue` freeze |
| **Originador** | Identificar demanda | Stamp em notes | `captorValue` se policy &gt; 0 — **sem pagamento Beta**; não pagar lead `[DECISÃO EMPRESARIAL]` |
| **Parceiro** | Membership territorial | `partnerMembers` | `partnerGross/Net` na **mesa** transação — natureza `[DEPENDE DE VALIDAÇÃO EXTERNA]` |
| **Casa / instituição** | Presença, consentimento | Perfil publicado | Não titular automático da mídia `[DEPENDE DE VALIDAÇÃO EXTERNA]` |
| **Beneficiário** | Receber fatia **futura** | Sem saque | Só se papel na policy/snapshot da **aquela** linha |
| **Operador** | Mudar estado operacional | Admin comercial / território | Sem fatia por operar |
| **Prestador** | Entregar o objeto do contrato | Depende da linha | `[DEPENDE DE VALIDAÇÃO EXTERNA]` se Ojú ou profissional |
| **Titular de direito** | Autorizar uso/licença | `mediaAssets.authorization`, termos, editorial auth | Licença ≠ autorização portal `[HIPÓTESE]` jurídica |
| **PSP futuro** | Captura, split, chargeback | **Não conectado** | Não escolhido |

`earnings` da mesa rotula o captor como `"Administrador"` no nome de exibição se faltar `users.name`. `[CONFIRMADO NO CÓDIGO]` `financial.ts` — **não** interpreta o cargo como tipo de beneficiário; é rótulo de UI. Risco de leitura errada. `[DÍVIDA ARQUITETURAL]` de linguagem.

---

## 3. Fluxos: quem faz o quê

### Mesa `commercialRequests`

1. Inicia: visitante, visitante→profissional, profissional (originar), admin. `[CONFIRMADO NA DOCUMENTAÇÃO]` autonomia.  
2. Cria registro: API `requestCoverage` / originação / carteira.  
3. Administra: `managedByUserId` (nulo até a mesa assumir).  
4. Aceita: status `Aceite`/`Contratado` — **admin**, não o profissional sozinho. `[CONFIRMADO NA DOCUMENTAÇÃO]`  
5. Executa: depois Opportunity/Production **ou** só mesa (cobertura sem Rede). `[INFERÊNCIA]` dual path.  
6. Entrega: `deliveredAt` / entrega privada.  
7. Recebe (econômico): indefinido até MoR.  
8. Cancela: status `Arquivado` — admin comercial.  
9. Reembolso: staff financeiro `requestRefund`; decide Super Admin. `[CONFIRMADO NO CÓDIGO]`  
10. Evento: `commercialActivities` + `auditEvents`.  
11. Estado: `requireCommercial`.  
12. Visualiza: dono da carteira ou Super Admin.  
13. Território: `territoryId` / `partnerId`.  
14. Ref. econômica: `proposalAmount`, transações.  
15. Ref. operacional: `id` do request.

### Rede Opportunity → Production

1. Inicia: admin cria Opportunity (pode copiar request).  
2. `createdBy` = ator do sistema. Originador pode estar só no JSON.  
3. Convite: admin. Aceite: profissional do convite (`canAcceptInvite` WRONG_RECIPIENT). `[CONFIRMADO NO CÓDIGO]`  
4. Executa: perfil da Production.  
5. Entrega: mídia + deliveries; **não** publica. `[CONFIRMADO NO CÓDIGO]` `deliveryPublishesMedia() === false`.  
6. Cobrança: admin `createProductionPayment` após `Concluída`. `[CONFIRMADO NO CÓDIGO]`  
7. Cancela: admin Opportunity/Production.  
8. Auditoria: `auditEvents`, notificações Rede.  
9. Território: `territoryId` + `assertPartnerScope`.  
10. Economia: freeze; settlement 1:1 Production.

### Ads / visibilidade

Captor = `capturedByUserId` (admin da mesa, **não** automaticamente territorial). Super Admin marca `payoutStatus`. Notificação ao captor. `[CONFIRMADO NO CÓDIGO]`

### Originação

`createdByUserId` no JSON vs `originatedByProfessionalProfileId` vs `requestedProfessionalProfileId`. `[CONFIRMADO NA DOCUMENTAÇÃO]`  
Não Opportunity, não intent, não Home.

---

## 4. Segurança econômica (antes da Etapa 4)

| Risco | Controle hoje | Lacuna |
|---|---|---|
| IDOR settlement | scope território **ou** executor da production `[CONFIRMADO NO CÓDIGO]` | listagens globais Super Admin |
| Amount do cliente | freeze; mismatch rejeita `[CONFIRMADO NO CÓDIGO]` | stub não cobra |
| Beneficiário | policy snapshot | `contracts` 70% admin `[DÍVIDA]` |
| Policy retroativa | freeze + settlementUsesCurrentPolicy false | mesa/ads updates de % em `updateAd` **podem** alterar linha existente `[CONFIRMADO NO CÓDIGO]` `updateAd` aceita novos percents — **dívida** se usado após captação |
| Contrato | `secureOwner` managedBy | sem vínculo Opportunity |
| Pagamento duplicado | intent Pago/Encerrado bloqueia nova `[CONFIRMADO NO CÓDIGO]` | dual rail pode “pagar” nas duas mesas |
| Webhook replay | HMAC + 5 min + `eventId` unique `[CONFIRMADO NO CÓDIGO]` | provider fake |
| Race | idempotency key | QA/prod sem PSP |
| Impersonation | OAuth admin; convite amarra profileId | — |
| Fraude interna | Super Admin marca payout sem comprovante | **alto** se Etapa 4 usar o mesmo botão |
| Auditoria | `auditEvents` | não reconstrói ledger |

Nunca confiar só no frontend, só em `users.role`, só em amount do cliente.

---

## 5. Fundo da Rede

`developmentPercent` / `networkFundValue` no freeze. `[CONFIRMADO NO CÓDIGO]`  
**Não** criar conta, %, beneficiário, entidade nesta missão.

Possível finalidade `[HIPÓTESE]`: manutenção da plataforma, memória, caixa de chargeback.  
Origem possível: fatia da produção.  
Governança, titularidade, prestação de contas, tratamento fiscal: **`[DECISÃO EMPRESARIAL]` + `[DEPENDE DE VALIDAÇÃO EXTERNA]`**. Sem personalidade, é centro de custo ou passivo oculto. `[HIPÓTESE]`

---

## 6. MoR — cenários, sem escolha

| | A Intermediação | B Ojú contratante | C Híbrido por produto | D Outro validado |
|---|---|---|---|---|
| Quem o cliente contrata | profissional (+Ojú plataforma) | Ojú | depende da linha | parecer |
| Quem presta | profissional | Ojú (subcontrata) | misto | — |
| Quem recebe no PSP | split / professional seller | Ojú | misto | — |
| Quem emite NF | `[DEPENDE DE VALIDAÇÃO EXTERNA]` | Ojú ao cliente; profissional à Ojú `[HIPÓTESE]` | por linha | — |
| Quem responde chargeback | recebedor PSP | Ojú | por linha | — |
| O que entra | bruto transitado + taxa | bruto | misto | — |
| O que transita | fatia executor | custo | — | — |
| Receita própria potencial | comissão/taxa | bruto (menos custos) | `ojuValue` vs bruto do anúncio | — |
| Risco | analogia COSIT marketplace **não** automática | tributo sobre bruto | complexidade | — |

Nenhum cenário é “o correto”. `[DEPENDE DE VALIDAÇÃO EXTERNA]`

---

## 7. Escala de responsabilidades

20: Super Admin vê tudo.  
500: conflito admin=captor=executor na mesma Opportunity — precisa regra de alçada `[DECISÃO EMPRESARIAL]`.  
10.000: botão “marcar pago” sem PSP é fraude operacional.
