# Contratos econômicos do Ojú

**PROMPT 2.** Auditoria de `contracts` e mapa contratual futuro.  
**Não** redige cláusula legal. **Não** troca 30/70 por outro percentual.

---

## 1. O que `contracts` é hoje `[CONFIRMADO NO CÓDIGO]`

Tabela `contracts`:

| Campo | Papel |
|---|---|
| `contractor` | nome do contratante (string) |
| `documentUrl` / `storageKey` | arquivo |
| `publicationId` | **obrigatório no input da API** |
| `requestId` | opcional — mesa |
| `managedByUserId` | dono da carteira |
| `partnerId` | escopo |
| `contractAmount` | valor opcional |
| `ojuServicePercent` | default **30.00** |
| `administratorSharePercent` | default **70.00** |
| `payoutStatus` | Pendente / Parcial / Pago |
| `status` | Rascunho / Enviado / Assinado / Arquivado |
| `signedAt` | data |

API `saveCoverageContract`: `contractInput` **não envia** os percentuais. Insert usa **defaults do schema**. `[CONFIRMADO NO CÓDIGO]` `server/routers/commercial.ts`.

**Não há** `opportunityId`, `productionId`, `commercialPolicyId`, `originatedBy`, `executor`, `professionalProfileId`.

Atividade: `commercialActivities` tipo `Contrato`.

---

## 2. Dívida de governança econômica — 30/70

**Classificação:** `DÍVIDA DE GOVERNANÇA ECONÔMICA`.  
`contractsAdministratorShareIsApprovedEconomicRule() === false`. `[CONFIRMADO NO CÓDIGO]` fundação.

### Onde existe
Defaults Drizzle em `drizzle/schema.ts` (`ojuServicePercent` 30, `administratorSharePercent` 70). Qualquer contrato criado sem override herda isso no MySQL.

### Quem é afetado
- `managedByUserId` da carteira (frequentemente o admin que registrou o PDF).  
- Interpretação de UI/relatório se alguém somar esses campos como “participação do administrador territorial”.  
- **Não** o freeze da Opportunity (trilho Rede usa `commercialPolicies` executor/oju/development/captor). `[CONFIRMADO NO CÓDIGO]` — **dois modelos de split no mesmo produto.**

### Interpretação que o código dá
Há uma **coluna** chamada participação do administrador e um default 70. `payoutStatus` no contrato é o mesmo enum de ads (intenção). Não há job que pague 70% a ninguém.

### Interpretação que **não** pode ser assumida
- Que a empresa decidiu 70% para admin territorial.  
- Que admin = executor = originador.  
- Que isso é a política da Rede.  
- Que é CNAE, ISS ou regra fiscal.

### Opções empresariais `[DECISÃO EMPRESARIAL]` (não escolher agora)
1. Deprecar os campos; contrato vira só evidência de PDF ligado ao request.  
2. Alinhar contrato ao snapshot da Opportunity (quando houver).  
3. Manter como legado da mesa antiga e **nunca** usar na Etapa 4.  
4. Outra regra **depois** de parecer — **sem inventar % neste documento.**

### Validações externas
Advogado: partes, objeto, subcontratação. Contador: se o PDF gera fato contábil. Trabalho: admin territorial vs vínculo.

**Não apagar silenciosamente. Não substituir por outro %.**

---

## 3. Vínculos ausentes / parciais

| Relação | Existe? |
|---|---|
| Opportunity | **Não** |
| Production | **Não** |
| Policy comercial | **Não** (a Rede congela na Opportunity) |
| Território | só via `partnerId` no contrato; request tem `territoryId` |
| Profissional / executor / originador | **Não** |
| Publicação | `publicationId` — mistura evidência editorial com instrumento comercial `[DÍVIDA]` |

Join possível hoje: `contracts.requestId` = `commercialRequests.id` = `networkOpportunities.commercialRequestId`. **Perde-se** se Opportunity nascer sem request ou contrato sem request. `[CONFIRMADO NO CÓDIGO]` campos opcionais.

---

## 4. Mapa contratual futuro (conceito)

```
CLIENTE → PRODUTO → CONTRATO → EXECUTOR → ENTREGA → PAGAMENTO → LIQUIDAÇÃO → ENCERRAMENTO
PROFISSIONAL → ORIGINAÇÃO → OPPORTUNITY → EXECUÇÃO → EVENTUAL REMUNERAÇÃO
CASA/INSTITUIÇÃO → PRESENÇA → VISIBILIDADE → EVENTUAL PRODUTO COMERCIAL
```

Um instrumento por operação deveria citar: produto, política+versão, território, cliente, executor, originador (se houver), freeze, autorização de mídia **separada**, regra de cancelamento/chargeback. `[HIPÓTESE]` de produto — texto jurídico `[DEPENDE DE VALIDAÇÃO EXTERNA]`.

Não checkout.

---

## 5. Licenciamento vs autorização editorial

| Camada | Superfície `[CONFIRMADO NO CÓDIGO]` | O que **não** é |
|---|---|---|
| Autorização editorial | `commercialEditorialAuthorizations` após entrega privada; `canUseOnPortal` | licença comercial onerosa |
| Crédito / uso de mídia | `mediaAssets.credit`, `authorization`, `publicationAllowed`, `usageExpiresAt` | titularidade completa |
| Pedido de licença | `revenueLeads` tipo Licenciamento; `/licenciar-midia` | concessão automática (copy da página confirma) |
| Elegibilidade CMS | `mediaEligibleForLicense` **protectedProcedure** | visitante autenticado-CMS; formulário público pode falhar a query `[DÍVIDA]` |

Não assumir: fotógrafo = todos os direitos; casa = titular; Ojú pode sublicenciar. `[DEPENDE DE VALIDAÇÃO JURÍDICA]`

---

## 6. Políticas e contrato

Fluxo alvo: Opportunity ← policy vigente ← aceite ← freeze ← contract ← Production ← settlement futuro.

Hoje o **PDF `contracts` está fora desse encadeamento**. A condição comercial da Rede está na Opportunity. `[CONFIRMADO NO CÓDIGO]`

Ads: policy Anúncio no create; `updateAd` ainda aceita percentuais no input — risco de alterar captação já registrada. `[CONFIRMADO NO CÓDIGO]`

---

## 7. Ledger futuro (especificação — não implementar)

**Event-based, auditável, idempotente, append-only, referencial, reversível por evento compensatório. Não é wallet. Não é plano de contas oficial.**

Cada evento futuro aponta para: operação, produto, contrato, policy+versão, cliente, executor, originador, operador, beneficiário (tipo, não cargo), território, valor, moeda BRL, evento anterior, timestamp, ator, motivo, referência PSP, estado.

Correção = novo evento. Não DELETE do passado.

Reutiliza germen: `networkPaymentWebhookReceipts.eventId` unique; `auditEvents`. **Insuficiente** para `+bruto −PSP −partes`.

Implementar tabela agora **depende** de como o contador vai escriturar trânsito vs receita. **Não criar tabela nesta missão.** `[DEPENDE DE VALIDAÇÃO EXTERNA]` + decisão de PROMPT 3 sobre schema.

---

## 8. Migration proposta (NÃO aplicar)

Já descrita na autonomia comercial e em `proposedMigrationsNotToApply`: colunas tipadas de originação. Sem arquivo SQL neste prompt. Sem Aiven/Beta.

Eventual `contracts.opportunityId` é **PROMPT 3 / decisão empresarial**, não agora.

---

## 9. PSP

Requisitos iguais ao PROMPT 1. **Não conectar. Não escolher.**
