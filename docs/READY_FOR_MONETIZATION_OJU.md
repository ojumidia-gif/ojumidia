# Prontidão para monetização — Ojú

**PROMPT 3 — auditoria final.**  
**Não é a Etapa 4.** **Não é parecer jurídico/fiscal.**

Declaração desta missão:

**READY FOR MONETIZATION — WITH EXTERNAL VALIDATION DEBT**  
**MONETIZATION = OFF**

O Beta público **pode e deve** crescer (visitantes, profissionais, casas, editorial, território, divulgação). Isso **não** liga cobrança.

Código: `shared/economicFoundation.ts` v1.2.0 · `isRealMonetizationActive() === false` · `isRealPspConnected() === false`.

---

## O que está pronto (arquitetura reutilizável)

O sistema **não precisa ser reconstruído** para receber regras validadas de empresa/advogado/contador/PSP, desde que a Etapa 4 **plugue** PSP + ledger + contratos nas estruturas já existentes:

- Produtos catalogados; Rede gratuita e pay-to-appear **bloqueados** no motor de visibilidade.
- Opportunity freeze + settlement que **não** relê política viva.
- Intent com idempotency + webhook HMAC + `eventId` único (germen de reconciliação).
- Cliente **não** confirma pagamento pelo browser; Production `Concluída` ≠ pago (cobrança só depois; pago da Rede só via webhook no código).
- Ads: valor/% **congelados após rascunho** (PROMPT 3 fechou a brecha de `updateAd`).
- Escopo territorial `assertPartnerScope`; convite amarra `profileId`; captador não edita anúncio alheio.
- Dual rail **mapeado** (`commercialRequestId`); payout classificado como **intenção**.

Ponto de ruptura se a Etapa 4 **ignorar** o mapa e tratar `payoutStatus = Pago` como PIX, ou tributar bruto sem parecer: isso é processo, não falta de schema de Rede.

---

## Checklist READY FOR MONETIZATION

| | Item | Situação |
|---|---|---|
| A | Produto | **READY** (catálogo; gratuidade da Rede) |
| B | Rede | **READY** (crescimento Beta sem checkout) |
| C | Território | **READY** (scope backend) |
| D | RBAC | **READY** com dívida Super Admin “marcar repasse” |
| E | Contratos | **NOT READY** + **EXTERNAL VALIDATION REQUIRED** (PDF; 30/70 dívida; sem vínculo Opportunity) |
| F | Policies | **READY** (versionadas; freeze Rede) |
| G | Opportunity | **READY** (freeze no aceite) |
| H | Production | **READY** (5+1 editorial ≠ financeiro) |
| I | Payment architecture | **FUTURE IMPLEMENTATION REQUIRED** (stub `pix-webhook`) |
| J | Settlement | **READY** como snapshot/estado; **NOT READY** como banco |
| K | Ledger | **FUTURE IMPLEMENTATION REQUIRED** (especificado, sem tabela) |
| L | Reconciliation | **FUTURE IMPLEMENTATION REQUIRED** (especificação abaixo) |
| M | Refund | **READY** na mesa (teto &lt; 100%); Rede **FUTURE** PSP |
| N | Chargeback | **EXTERNAL VALIDATION REQUIRED** + PSP |
| O | Origination | **READY** sem comissão; coluna tipada **FUTURE** |
| P | Licensing | **EXTERNAL VALIDATION REQUIRED** (titularidade; query CMS vs público) |
| Q | Visibility | **READY** (`paymentControlsDirectoryVisibility === false`) |
| R | Audit | **READY** parcial (`auditEvents`; freeze ads agora audita) |
| S | Security | **READY** para Beta; Etapa 4 exige PSP + ledger |
| T | Scale | **READY** até centenas; **FUTURE** originação `notes`, N+1 de scope em listagens admin |
| U | Data hygiene | **READY** (sem seed desta missão) |
| V | External validation | **EXTERNAL VALIDATION REQUIRED** |

Não marcar READY o que depende de parecer inexistente.

---

## Bloqueado / não fazer antes da Etapa 4

PSP, Pix real, split, checkout, wallet, preços, %, MoR, CNAE, ISS, fundo com conta, marketplace, ranking, Home comprada, ledger como carteira, apagar 30/70 trocando %.

## Pode crescer no Beta

Visitantes, profissionais, casas, projetos, territórios, histórias, produções publicadas com curadoria, SEO, Instagram, aquisição orgânica, originação **sem** pagamento.

---

## Segurança econômica (PROMPT 3)

### Corrigido agora

`updateAd` aceitava `ojuSharePercent` / `captorSharePercent` / `contractedAmount` do cliente **depois** de Ativo, inclusive o próprio captador. Create já ignorava % se houvesse política; update não.

**Correção:** freeze após `status !== Rascunho`, baseado no estado **persistido** (voltar para Rascunho no mesmo POST não reabre). Backend recusa mismatch. Auditoria `advertisement-updated-frozen-economics`. UI desabilita campos.

Labels: coluna “Pagamento” → “Repasse operacional”; fallback “Administrador” → “Captador” em earnings.

### Já existente (confirmado)

- IDOR ads: `secureAd` captador. `[CÓDIGO]`
- `updatePayout`: só Super Admin. `[CÓDIGO]`
- Opportunity: `canMutateOpportunityEconomics` só Rascunho/Aberta. `[CÓDIGO]`
- Settlement pago: **não** via browser (`fromWebhook`). `[CÓDIGO]`
- `clientMayConfirmPayment() === false`. `[CÓDIGO]`
- Convite: WRONG_RECIPIENT. `[CÓDIGO]`
- `activeAds` público **sem** valores. `[CÓDIGO]`

### Dívidas de segurança (não inventar regra)

- Super Admin ainda **marca** `payoutStatus` sem PSP — intenção, risco de leitura como dinheiro. Copy melhorou; enum `Pago` permanece (não é % novo).
- `updateAd` de captador ainda pode mudar `capturedByUserId` se for principal; comum não. Principal pode reatribuir captor em rascunho/ativo — **DECISÃO EMPRESARIAL** se Ativo deve congelar captador também. Hoje só economia valor/%.
- Listagem de settlements admin itera scope (possível N+1). Não otimizado (não crítico no Beta).
- Originação em `notes` editável.

---

## Idempotência hoje × futuro

| Operação | Hoje | Futuro |
|---|---|---|
| Opportunity | um aceite; convites superados | manter |
| Production | 1:1 opportunity unique | manter |
| Payment intent | unique provider tx + idempotency key; não recria se Pago/Encerrado | PSP real |
| Webhook | `eventId` unique + HMAC 5 min | provedor real |
| Refund mesa | request + decide | PSP refund id |
| Payout ads | overwrite status | evento compensatório no ledger |
| Chargeback | — | evento + clawback |

Original vs reprocessamento vs compensação: **ledger Etapa 4**.

---

## Reconciliação futura (especificação)

```
PSP txn
↔ operationId (Opportunity/Production ou advertisement id)
↔ contractId (hoje frágil)
↔ policyId+version (freeze)
↔ ledgerEventId
↔ settlementId / intent.providerTransactionId
↔ beneficiary type (não cargo)
↔ territoryId
↔ timestamp
```

IDs internos já: production, opportunity, intent.providerTransactionId, commercialRequestId. **Falta** contrato ligado e ledger.

---

## Ledger

Mantém PROMPT 2: eventos, append, compensação, não wallet, não implementar tabela até contador dizer o que é trânsito vs receita.

---

## Escala (sem cosmética)

| n | Risco real |
|---|---|
| 20–100 | dual rail / linguagem “pago” |
| 500 | `LIKE %OJU_ORIGIN_V1%` full scan |
| 1.000 | conciliação manual; N+1 scope |
| 10.000 | Tigris + auditEvents volume; PSP KYC |
| 50.000 | sem ledger a reconciliação quebra |

Índices existentes em opportunity/production por território/perfil. Public directory alfabético — OK. Não há load-all do portal de ads com valores.

---

## Etapa 4 (somente depois)

Pareceres; MoR por linha; contratos; preços/%; beneficiários; originação remunerada; licença; PSP+KYC+OAuth; webhook real; ledger; settlement/refund/chargeback reais; observabilidade; suporte; procedimento de fechamento; **não** usar o select “Pago” como caixa.

---

## Recomendação final

Seguir o Beta público. Não ligar dinheiro. Levar PROMPT 1–3 + este arquivo ao contador e advogado. Só então Etapa 4.

**QA NÃO EXECUTADO — AMBIENTE INDISPONÍVEL** se `qa:verify` recusar 3307 (registrar no relatório da missão).
