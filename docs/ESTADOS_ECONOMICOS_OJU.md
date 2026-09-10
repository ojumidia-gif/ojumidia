# Estados econômicos do Ojú

**PROMPT 2.** Não ativa monetização. Não é parecer jurídico.  
Norma-mãe: `docs/ARQUITETURA_ECONOMICA_OJU.md`.  
Invariantes: `shared/economicFoundation.ts` (`stateLayers`, `futureEconomicStates`).

**Regra:** Production `Concluída` ≠ Payment `Pago` ≠ Settlement liquidado em banco. `[CONFIRMADO NO CÓDIGO]` cobrança da Rede só *depois* de Production concluída; provider é stub.

---

## 1. Quatro camadas (não misturar)

| Camada | Pergunta | Exemplos atuais `[CONFIRMADO NO CÓDIGO]` |
|---|---|---|
| **Operacional** | O trabalho avançou? | `commercialRequests.status`; Production `Planejada`…`Concluída`; Opportunity `Aberta`/`Aceita` |
| **Econômica** | Qual condição comercial está congelada? | freeze `totalValue`/`ojuValue`/… + `commercialPolicyId`+`version`; `proposalAmount` na mesa |
| **Pagamento** | Houve tentativa de cobrança? | `networkPaymentIntents.status`; transação mesa `Cobrança` `Registrada` |
| **Liquidação / repasse** | Dinheiro saiu para beneficiário? | **Não existe no Beta.** `payoutStatus` = intenção operacional `[CONFIRMADO NO CÓDIGO]` UI de avisos |

---

## 2. Máquina conceitual futura (alvo, não schema)

`DRAFT → PROPOSED → ACCEPTED → CONTRACTED → PAYMENT_PENDING → PAID → IN_PROGRESS → COMPLETED → SETTLED → CLOSED`

Exceções: `CANCELLED` (cliente / Ojú / profissional) · `REFUND_REQUESTED` · `REFUNDED_PARTIAL` · `REFUNDED_FULL` · `PAYMENT_FAILED` · `EXPIRED` · `CHARGEBACK` · `DISPUTED` · `REVERSED`

**Não** todos os produtos usam a mesma máquina. Rede gratuita não tem PAYMENT. Anúncio não tem Production. Licença não tem Opportunity.

`[HIPÓTESE]` de convergência — sem migration nesta missão.

---

## 3. Equivalência por produto (hoje × futuro)

### 3.1 Produção (mesa + Rede)

| Conceito futuro | Mesa `[CONFIRMADO NO CÓDIGO]` | Rede `[CONFIRMADO NO CÓDIGO]` |
|---|---|---|
| DRAFT | `Solicitação` / `Em análise` | Opportunity `Rascunho` |
| PROPOSED | `Orçamento` / `Proposta` | Opportunity `Aberta` + convites |
| ACCEPTED | `Aceite` | Opportunity `Aceita` + `frozenAt` |
| CONTRACTED | `Contratado`; `contracts.status` `Assinado` (opcional, **não** liga Opportunity) | — |
| PAYMENT_PENDING | transação `Cobrança` | settlement `Aguardando pagamento`; intent `Aguardando`/`Iniciado`/`Pendente` |
| PAID | transação `Compensada` **escritural** | intent `Pago` **no stub** |
| IN_PROGRESS | `Produção` | Production `Confirmada`…`Em revisão` |
| COMPLETED | `Entrega` / `Concluído` | Production `Concluída`; `editorialReady` ≠ publicado |
| SETTLED | **não** | **não** (banco) |
| CLOSED | `Arquivado` | settlement/intent `Encerrado` |
| EXPIRED | — | Opportunity `Expirada` (prazo convite) |
| CANCELLED | `Arquivado` (genérico) | Opportunity/Production `Cancelada` |

**Perda:** mesa não expressa chargeback. Rede não expressa reembolso da mesa (`commercialRefundRequests`). `[DÍVIDA ARQUITETURAL]`

### 3.2 Anúncio / visibilidade institucional

Operacional: `Rascunho`/`Ativo`/`Pausado`/`Encerrado` (ads); assinatura `Rascunho`…`Cancelada`.  
Econômico: `contractedAmount` + % snapshot.  
Pagamento: campo `paidAt` / `paymentReference` **sem PSP**. `[CONFIRMADO NO CÓDIGO]`  
Repasse: `payoutStatus` / `captorPayoutStatus` = **INTENÇÃO**.

### 3.3 Licença / apoio / oficina

Só pipeline `revenueLeads.status` (`Solicitação`…`Arquivado`). Sem intent, sem settlement. `[CONFIRMADO NO CÓDIGO]`

---

## 4. Freeze de política

Opportunity: valores + `commercialPolicyId` + `commercialPolicyVersion`; mutação econômica só `Rascunho`/`Aberta`. `[CONFIRMADO NO CÓDIGO]` `canMutateOpportunityEconomics`.  
Aceite grava `frozenAt`. `[CONFIRMADO NO CÓDIGO]`  
Settlement **não** relê política vigente. `[CONFIRMADO NO CÓDIGO]` `settlementUsesCurrentPolicy() === false`.  
Mesa: transação guarda `commercialPolicyId/Version` e refund policy. `[CONFIRMADO NO CÓDIGO]`  
UI: “fechamentos antigos preservam a versão”. `[CONFIRMADO NA DOCUMENTAÇÃO]` `CommercialPoliciesAdmin.tsx`.

---

## 5. Cancelamento, reembolso, chargeback (modelo, não regra de $)

Quem absorve custo = `[DECISÃO EMPRESARIAL]` + `[DEPENDE DE VALIDAÇÃO EXTERNA]`. Evento a auditar sempre: ator, motivo, IDs, valores **congelados**.

| Situação | Quem pode iniciar (hoje / futuro) | Camadas que mudam | Valores futuros | Custo |
|---|---|---|---|---|
| Antes da contratação | Cliente, Ojú, profissional recusa convite `[CONFIRMADO NO CÓDIGO]` | operacional | nenhum | Ojú operacional `[HIPÓTESE]` |
| Após aceite, antes de pagamento | Admin Opportunity cancel; Production cancel | operacional + econômica (freeze permanece histórico) | nenhum PSP | `[DECISÃO EMPRESARIAL]` |
| Após pagamento escritural, antes da execução | Mesa: `requestRefund` (staff) `[CONFIRMADO NO CÓDIGO]`; cliente **não** tem rota pública | pagamento + refund request | teto `maximumRefundPercent` **&lt; 100** da cobrança `[CONFIRMADO NO CÓDIGO]` | retenção explicada na policy |
| Durante execução | partes | operacional; se já “pago” no stub, hold futuro | proporcional `[HIPÓTESE]` | `[DEPENDE DE VALIDAÇÃO EXTERNA]` |
| Após execução | reclamação / chargeback futuro | pagamento + liquidação | clawback | MoR `[DEPENDE DE VALIDAÇÃO EXTERNA]` |
| Pagamento falhou / expirado | PSP futuro / timeout | só pagamento | — | — |
| Duplicado | idempotency intent `[CONFIRMADO NO CÓDIGO]` | pagamento | não gerar 2ª cobrança se Pago/Encerrado | — |
| Parcial | intent `Parcial`; transação ajuste | pagamento | `[HIPÓTESE]` | — |
| Chargeback | PSP futuro | pagamento + disputa | regresso contratual | `[DEPENDE DE VALIDAÇÃO EXTERNA]` |

Decisão de refund da mesa: Super Admin `decideRefund`. `[CONFIRMADO NO CÓDIGO]`  
Cliente público **não** confirma pagamento. `[CONFIRMADO NO CÓDIGO]`

---

## 6. Escala dos estados

20–100: estados manuais da mesa bastam.  
500+: dualidade mesa/Rede gera suporte (“está pago na mesa, não na Rede”).  
10.000+: sem camada única e sem ledger, relatórios mentem. `[HIPÓTESE]` operacional — não otimizar agora.

---

## 7. Não implementar agora

Não criar enum único no MySQL. Não FinancialEngine. Não wallet. Equivalência permanece documental + `dualRailJoinHints` no código compartilhado.
