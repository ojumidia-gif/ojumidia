# Arquitetura econômica oficial do Ojú

**PROMPT 1 — Fundação de produtos.** **PROMPT 2 — Contratos, responsabilidades, estados e operação** (este ciclo).  
**Não é parecer jurídico, fiscal ou contábil.**  
**Não é a Etapa 4 (ativação de monetização).**  
**Beta:** site público real; **monetização real desligada.**

Código-espelho: `shared/economicFoundation.ts` (v1.1.0-beta-prep-prompt2).

Complementos: `docs/ESTADOS_ECONOMICOS_OJU.md` · `docs/RESPONSABILIDADES_ECONOMICAS_OJU.md` · `docs/CONTRATOS_ECONOMICOS_OJU.md` · `docs/READY_FOR_MONETIZATION_OJU.md` (PROMPT 3).

Estudo estratégico (não substitui): `docs/ESTUDO_ESTRATEGICO_MOR_HIBRIDO_OJU.md`.

Classificação de evidência: `[CÓDIGO]` · `[DOC]` · `[HIPÓTESE]` · `[DEPENDE DE VALIDAÇÃO EXTERNA]` · `[DECISÃO EMPRESARIAL]` · `[DÍVIDA]`.

`isRealMonetizationActive() === false` · `isRealPspConnected() === false` · `clientMayConfirmPayment() === false` · `paymentControlsDirectoryVisibility() === false`. `[CÓDIGO]`

Nenhum PSP (Mercado Pago, Stripe, Asaas, Pagar.me) consta em `package.json`. `[CÓDIGO]`

---

## 1. Diagnóstico da arquitetura atual

O Ojú já opera **duas frentes** que falam de dinheiro sem liquidar banco:

| Trilho | Núcleo | O que registra | O que não faz |
|---|---|---|---|
| **Mesa** | `commercialRequests` → `commercialTransactions` / refunds / `contracts` | Pedido, proposta, cobrança/reembolso **escriturados**, split partner/Ojú/executor em colunas | PIX, saque, PSP |
| **Rede** | `networkOpportunities` freeze → `networkProductions` → `networkProductionSettlements` → `networkPaymentIntents` | Snapshot de política, intent, webhook HMAC | Provider é `PixWebhookProvider` **em memória**; cliente não confirma pagamento `[CÓDIGO]` |

Há ainda produtos **rotulados** (`advertisements`, `institutionVisibilitySubscriptions`) com `payoutStatus` e `commercialPayoutNotifications` — **notificação de status, não TED/Pix**. `[CÓDIGO]`

Há **leads** (`revenueLeads`: Apoio, Licenciamento, Oficina) sem settlement da Rede. `[CÓDIGO]`

**Conclusão PROMPT 1:** fundação operacional existe; financeira real não.  
**Conclusão PROMPT 2:** mapa de convergência mesa↔Rede, 30/70 como dívida de governança (não substituída), payout classificado como intenção, ledger especificado sem tabela, MoR sem decisão. Sem migration em Aiven/Beta.

Migrations no journal: `0000`–`0056` (`0056_network_voices`). Pagamentos da Rede: `0053_network_payments_directory`. **Nenhuma migration nova nesta missão. Nada aplicado em Aiven/Beta.**

---

## 2. Papéis econômicos (nunca sinônimos)

| Papel | Onde vive hoje | Não confundir com |
|---|---|---|
| `createdBy` | Opportunity, Production, ads, originação JSON | originador |
| `originatedBy` | `OJU_ORIGIN_V1.originatedByProfessionalProfileId` em `notes` `[CÓDIGO]` | executor, admin, beneficiário |
| `acceptedBy` | `acceptedProfessionalProfileId` / `acceptedUserId` | quem criou o lead |
| `executedBy` | `networkProductions.professionalProfileId` (+ legado `executorId`) | admin territorial |
| `contractedBy` | implícito: cliente da mesa / casa; **sem campo único** | `managedBy` |
| `managedBy` | `commercialRequests.managedByUserId` | beneficiário |
| `beneficiary` | freeze `professionalValue` / `ojuValue` / `captorValue` / `networkFundValue`; ads Ojú+captor | `users.role` |
| `operator` | admin com `assertPartnerScope` / Super Admin | split |
| `client` | `clientName` na mesa; contratante institucional | visitante do portal |
| `professional` | `professionalProfiles` (não é `users.role`) `[DOC]` Fase 7 | administrador |
| `partner` | `partners` / `partnerMembers` | casa (`institutions`) |
| `oju` | fatia `ojuValue` / `ojuAmount` — **não é automaticamente receita contábil** `[DEPENDE DE VALIDAÇÃO EXTERNA]` | tesouraria de terceiros |

`users.role` + `adminAccess` = RBAC. **Nunca** membership econômico. `[DOC]` `docs/FASE7_OPERACAO.md`.

---

## 3. Mapa de produtos

### 3.1 Rede gratuita

- **Natureza:** bem da Rede, não SKU. Stance: **never** monetizar existência.
- **Cliente / usuário:** participantes e visitantes.
- **Executor / originador / beneficiário:** não se aplica como cobrança.
- **Ojú entrega:** diretório, território, conexão, convites internos.
- **Não entrega:** loja, ranking, checkout.
- **Não monetizar:** perfil, participação, território, descoberta orgânica, Home editorial, inclusão básica no diretório. `[DECISÃO EMPRESARIAL]` alinhada a `[CÓDIGO]` visibilidade.
- **Contrato / política / estados econômicos:** não.
- **Risco:** pressa comercial transformar gratuidade em paywall.
- **Dependências:** nenhuma fiscal nesta linha.

### 3.2 Presença territorial básica

- Consentimento + publicação de casa/parceiro/profissional Ativo+`publicVisible`. `[CÓDIGO]`
- **Never** cobrar por existir no mapa.
- Distinta de **presença comercial territorial** (serviço comunitário + plano rótulo).

### 3.3 Produção / cobertura

- Fluxo: Cliente → mesa ou `/contrate-sua-cobertura` → (admin) Opportunity → profissional (invite/aceite) → Production → entrega privada → autorização editorial opcional → **futura** liquidação.
- **Janela 5 JPG + 1 miniclip ≤ 60s:** por **unidade editorial/produção**, não cota financeira, não por profissional, não storage global. `[CÓDIGO]` `PRODUCTION_PHOTO_CAP`.
- **Política:** scope Cobertura / Documentário / Fotografia / Outro; freeze na Opportunity; settlement **não** relê política vigente. `[CÓDIGO]` `settlementUsesCurrentPolicy() === false`.
- **Receita futura:** possível. Valor pago ≠ receita Ojú até validação. `[DEPENDE DE VALIDAÇÃO EXTERNA]`
- **Cancelamento / reembolso / chargeback:** estados da Opportunity/Production + refund **da mesa** (trilho separado). `[DÍVIDA]`
- **MoR:** hipótese, não fato. `[DEPENDE DE VALIDAÇÃO EXTERNA]`

### 3.4 Documentação / memória

- `oralMemories`, `networkVoices`, publicações. Participação **não** é produto cobrado.
- Apoio institucional é linha **aparte** (`revenueLeads`).

### 3.5 Visibilidade comercial identificada (anúncio)

- `advertisements`; formatos Cartão / Banner / Destaque de parceiro; política **só Ojú + captor** (executor e development = 0). `[CÓDIGO]`
- **Não** compra Home nem diretório. `[CÓDIGO]`
- Beta: **não cobrar**. Escrituração de `contractedAmount` não é PIX.

### 3.6 Presença comercial territorial

- `institutions.directoryScope = Serviço comunitário`; ordem pública **não** privilegiada por plano. `[CÓDIGO]` / `[DOC]` Missão 6.1.
- Descoberta → contexto → contato. **Não** catálogo → preço → checkout → avaliação → ranking.
- Risco identitário se virar classificado (inclusive ofícios/sagrado). `[DECISÃO EMPRESARIAL]`

### 3.7 Visibilidade institucional

- `institutionVisibilitySubscriptions`; planos `Piloto solidário` | `Visibilidade institucional` | `Perfil parceiro`. `[CÓDIGO]`
- Política sem executor. `[CÓDIGO]`
- Beta: sem cobrança real (`paidAt` / `paymentReference` são campos, não PSP). `[CÓDIGO]`

### 3.8 Projetos institucionais

- Publicações `Projeto` + mesa + Apoio. Prestação Ojú é **hipótese** contratual. `[DEPENDE DE VALIDAÇÃO EXTERNA]`

### 3.9 Licenciamento

- Lead público; `mediaEligibleForLicense` é `protectedProcedure` — assimetria CMS vs formulário. `[DÍVIDA]`
- Titularidade: fotógrafo, retratado, casa, Ojú — **indefinida**. `[DEPENDE DE VALIDAÇÃO EXTERNA]`

### 3.10 Originação

- `ORIGINAÇÃO ≠ OPPORTUNITY ≠ EXECUÇÃO ≠ PAGAMENTO`. `[DOC]` `docs/AUTONOMIA_COMERCIAL_REDE_OJU.md`
- Beta: profissional origina; Ojú cria Opportunity; **zero remuneração**. Não pagar lead.
- Futuro: identificar `originatedByProfessional` (coluna tipada **proposta**, não aplicar agora).
- **Não decidir:** %, valor, momento, elegibilidade. PROMPT 2+ e validação externa.

### 3.11 SaaS futuro

- Não é produto atual. Não criar ferramenta cobrada como porta da Rede.

### 3.12 Outros já no código

| Superfície | Natureza |
|---|---|
| `revenueLeads` Oficina / Apoio | pipeline, não caixa |
| `communityCareRequests` | cuidado, não checkout |
| `contracts` 30/70 admin | **dívida** — não é modelo alvo |
| `networkExecutors` / `/fotografos` | legado paralelo ao perfil Rede |
| `commercialClosings` | mesa de cobertura, não PSP |

---

## 4. Matriz Produto × papéis × receita futura × risco

| Produto | Cliente | Executor | Originador | Operador | Beneficiário futuro | Receita futura | Risco |
|---|---|---|---|---|---|---|---|
| Rede gratuita | — | — | — | Ojú / admin território | — | **Não** | paywall |
| Presença básica | — | — | — | Ojú | — | **Não** | classificado |
| Produção | contratante | profissional | opcional | Ojú | executor + ?Ojú + ?captor + ?fundo | possível | MoR / dual rail / chargeback |
| Memória (participação) | — | narrador | — | Ojú | — | **Não** | exposição |
| Anúncio | anunciante | — | captor mesa | Ojú | Ojú + captor | possível | Home contaminada |
| Presença comercial | estabelecimento | — | captor | Ojú | Ojú + captor | possível | marketplace |
| Visib. institucional | instituição | — | captor | Ojú | Ojú + captor + fundo? | possível | confusão com curadoria |
| Projeto institucional | organização | misto | misto | Ojú | `[DEPENDE DE VALIDAÇÃO EXTERNA]` | possível | ciclo longo |
| Licença | licenciante | — | — | Ojú | titulares | possível | direitos |
| Originação | — | — | profissional | Ojú | só no sucesso futuro | incentivo, não motor | spam de lead |
| SaaS | profissional | — | — | Ojú | Ojú | depois | diluição |
| Apoio / oficina | apoiador | — | — | Ojú | `[DEPENDE DE VALIDAÇÃO EXTERNA]` | possível | compra de editorial |

---

## 5. Fluxos financeiros **futuros** (não ativos)

**Produção (alvo conceitual):**  
Cliente → (PSP futuro) → hold até Production `Concluída` → alocação segundo **snapshot** da Opportunity → payout executores/captor **somente após** política de hold → conciliação ledger × PSP.

**Anúncio / visibilidade:**  
Cliente → PSP futuro com Ojú como recebedora **hipotética** daquele produto → captor como terceiro ou despesa — `[DEPENDE DE VALIDAÇÃO EXTERNA]`.

**Licença / institucional:** contrato próprio; não reutilizar split de cobertura sem parecer.

**Beta hoje:** nenhum desses fluxos move banco. Intent da Rede chama stub `pix-webhook`. `[CÓDIGO]`

Separar **PSP** (meio) de **regra empresarial** (quem deve receber). Escolha de provedor: **não nesta missão**.

---

## 6. Estados econômicos futuros (modelo conceitual)

Operação futura deveria poder estar em:

`Rascunho → Proposta → Aceita → Contratada → Aguardando pagamento → Pagamento confirmado → Em execução → Concluída → Liquidada`

Exceções: Cancelada (cliente / Ojú / profissional); Pagamento falhou / expirado; Reembolso solicitado / parcial / total; Chargeback; Em disputa; Resolvida; Reversão; Encerrada.

**Hoje (não unificado):**

- Mesa: `Solicitação` … `Concluído` / `Arquivado`. `[CÓDIGO]`
- Opportunity: `Rascunho` `Aberta` `Aceita` `Cancelada` `Expirada`.
- Production: `Planejada` … `Concluída` `Cancelada`.
- Settlement: `Aguardando pagamento` … `Encerrado`.
- Intent: `Aguardando` … `Encerrado`.

PROMPT 2 deve mapear equivalências **sem** inventar máquina de estados no schema agora.

---

## 7. Cancelamento / reembolso / chargeback (conceito)

| Fase | Quem pode abortar | Dinheiro no Beta | Futuro a decidir `[DECISÃO EMPRESARIAL]` + `[DEPENDE DE VALIDAÇÃO EXTERNA]` |
|---|---|---|---|
| Lead / proposta | cliente, Ojú | nenhum | custo operacional Ojú |
| Aceite Opportunity | partes | freeze só econômico | não gerar intent |
| Execução | partes | nenhum PSP | retenção se já cobrado |
| Após conclusão | contestação | stub | hold, refund parcial (mesa já tem teto ≠ 100% da cobrança) `[CÓDIGO]` |
| Após payout | quase ninguém | N/A | clawback + reserva |

Chargeback: risco no **MoR** do PSP; regresso contratual. **Não implementar.**

---

## 8–13. Auditorias pontuais

### 8. Estruturas comerciais

Reutilizáveis: `commercialRequests`, policies versionadas, freeze, settlements, ads, visibilidade, authorizations, `auditEvents`, originação JSON, refunds da mesa.

Incompletas: pagador único, `contractedBy`, ledger, originação tipada, união mesa/Rede.

Erradas como modelo alvo: default 30/70 admin em `contracts`. `[DÍVIDA]`

### 9. `contracts`

Campos: `contractAmount`, `ojuServicePercent` default **30**, `administratorSharePercent` default **70**, `payoutStatus`. `[CÓDIGO]`

Mistura administrador com beneficiário. **Não substituir por outro % inventado.** Classificar como dívida até decisão empresarial + parecer.

### 10. `commercialPolicies`

Scopes: `Visibilidade institucional`, `Anúncio`, `Cobertura`, `Documentário`, `Fotografia`, `Outro`. `[CÓDIGO]`  
Version + status + `effectiveAt`. Snapshot na Opportunity e em transações. **Não reler política viva no settlement da Rede.** `[CÓDIGO]`  
Ads exigem development=0 e executor=0. Visibilidade: executor=0. `[CÓDIGO]`  
**Não definir % definitivos aqui.** Percentuais no banco são **instrumentos operacionais**, não política pública aprovada como lançamento comercial.

### 11. `commercialTransactions`

Tipos: `Cobrança`, `Reembolso`, `Ajuste`. Colunas: gross, executor, partner gross/net, oju, retained costs, policy snapshot, refund policy. `[CÓDIGO]`  
**Não** é movimento bancário. Dualidade com `networkProductionSettlements`.

### 12. Settlements / payments

- Settlement 1:1 com Production; copia freeze. `[CÓDIGO]`
- Intent: idempotency key, webhook receipts, HMAC, janela 5 min. `[CÓDIGO]`
- Cobrança só se Production `Concluída`. `[CÓDIGO]`
- Provider: Map in-memory; `pixCopyPaste: null`. `[CÓDIGO]`
- `createProductionPayment` exige role admin — **não** é checkout do cliente. `[CÓDIGO]`
- Schema de payment pode faltar em ambientes antigos (`isMissingPaymentSchema`). `[CÓDIGO]` — Aiven histórico vs journal: **não migrar nesta missão.**

### 13. Originação

Stamp em `notes` (editável na carteira). `[DÍVIDA]` Enum Opportunity `origin` = Comercial|Mesa|Manual — **não** “Profissional”. `[CÓDIGO]`  
Não cria Opportunity, intent, Home nem ranking. `[DOC]`

### 14. `auditEvents`

Usado em originação, pagamentos da Rede, editorial, governança. Reutilizável como trilha; **não** substitui ledger financeiro (não reconstrói +1000 −PSP −partes). `[HIPÓTESE]` técnica.

---

## 14. Duplicações

1. Mesa transações vs Rede settlements.  
2. `networkExecutors` vs `professionalProfiles`.  
3. `acceptedExecutorId` vs `acceptedProfessionalProfileId`.  
4. Notificação de payout vs intent vs `payoutStatus` em ads/contratos.  
5. Status de pedido comercial vs status de Production vs settlement.  
6. Fundo `developmentPercent` vs “Ojú”.

Não fundir nesta missão.

---

## 15. Dívidas arquiteturais

Ver `architecturalDebts` no código. Principais:

1. Dual rail.  
2. `contracts` 30/70 admin.  
3. Payout = aviso.  
4. Originação em `notes`.  
5. PSP stub.  
6. Fundo sem personalidade jurídica. `[DEPENDE DE VALIDAÇÃO EXTERNA]`  
7. Licença pública vs query protegida.  
8. Superfície `/fotografos` paralela.

---

## 16. Reutilizar (não recriar)

Policies + freeze; predicados `territorialVisibility`; RBAC + `assertPartnerScope`; intents + HMAC + idempotência; ads/visibilidade rotulados; originação JSON até haver coluna; 5+1; `paymentControlsDirectoryVisibility`; refund policy versionada da mesa; `auditEvents`.

---

## 17. Não criar (PROMPT 1 e Beta)

MonetizationEngine, ServicesEngine, tabela `services`, wallet/saldo, checkout, split real, OAuth de recebedor, tokens PSP, %, preços, CNAE, ISS, MoR como fato, marketplace, ranking, pay-to-appear, seeds, mocks permanentes, ghost data, migration em Aiven/Beta, push de monetização.

**Migration futura (somente proposta, NÃO aplicar):**  
`networkOpportunities.originatedByProfessionalProfileId` + `originKind` (já descrita em autonomia comercial). Sem SQL neste repositório nesta missão.

---

## 18. Especificação da fundação futura

Cada operação econômica futura deve responder ao checklist do briefing (o quê, quem, produto, natureza, executor, originador, operador, beneficiário, território, política, contrato, valores próprios vs terceiros, custos, estados, exceções, auditoria).

**Camada 0 (agora):** invariantes + catálogo (`shared/economicFoundation.ts`) + este documento + estruturas existentes.  
**Camada 1 (PROMPT 2):** contratos, responsabilidades, equivalência de estados, o que *não* é receita.  
**Camada 2 (PROMPT 3):** escala, segurança, prontidão.  
**Camada 3 (Etapa 4):** PSP real — fora de escopo.

Natureza jurídica por linha (prestação vs intermediação vs híbrido): `[DEPENDE DE VALIDAÇÃO EXTERNA]`. Hipótese de produto: **MoR híbrido por linha**, não adotada como fato fiscal.

---

## 19. Ledger — recomendação

**Sim, um ledger de eventos será tecnicamente necessário antes da Etapa 4.** Não nesta missão. Não é wallet. Não é contabilidade oficial.

| | |
|---|---|
| Finalidade | reconstruir histórico: captura, taxa PSP, alocações, payout, refund, chargeback, correção |
| Granularidade | um evento por fato; centavos; referência à operação + policy snapshot |
| Imutabilidade | append-only; correção = novo evento |
| Idempotência | `providerEventId` (já há germen em `networkPaymentWebhookReceipts`) |
| Reconciliação | arquivo PSP × soma do ledger |
| Não fazer | saldo de usuário; apagar passado; chamar de plano de contas |

`status = paid` + `amount = 1000` **não** reconstrói o fato econômico. `[HIPÓTESE]` técnica.

---

## 20. PSP — requisitos futuros (não conectar)

Pix; hold ou payout atrasado; refund parcial; webhook idempotente; conciliação; KYC CPF/CNPJ; N beneficiários **ou** Ojú recebedora + transfers.  
Documentação oficial a reler na Etapa 4 (não escolher agora): Mercado Pago Split; Stripe Connect + Pix.

Pontos de integração já existentes no código: `PaymentProvider`, `createProductionPayment`, webhook HMAC, intents. **Trocar o stub** só depois do PROMPT 2/3 e parecer.

Não armazenar cartão, senha, token. Metadados: intent, freeze, `receiverId` opaco.

---

## 21. Segurança da fundação

Já: RBAC em cobrança da Rede; escopo territorial; HMAC; cliente não confirma pagamento; pagamento não compra diretório; IDs de valor conferidos ao freeze. `[CÓDIGO]`

Futuro: nunca confiar só em `users.role` nem em amount do cliente; IDOR de settlement; alteração retroativa de freeze (`canMutateOpportunityEconomics` só Rascunho/Aberta) `[CÓDIGO]` — preservar.

---

## 22. Escala (sem otimizar agora)

| n | Gargalo a documentar |
|---|---|
| 20–100 | dual rail e natureza fiscal |
| 500 | originação em `notes`; suporte |
| 1.000 | conciliação manual |
| 10.000 | ledger + PSP + KYC + Tigris |
| 50.000 | recorrência institucional vs take da produção |

Storage público limitado pela janela 5+1 **ajuda** o portal; acervo contratado pode crescer fora dessa janela — não misturar com limite editorial.

---

## 23. Visibilidade de mercado no Beta

Permitido: visitantes reais, casas reais, profissionais reais, editorial, SEO, Instagram como camada, crescimento da Rede.  
**Não** significa checkout. Não criar barreira artificial à Rede porque o dinheiro está desligado.

---

## 24. Matriz de decisões pendentes

| Tema | Tipo |
|---|---|
| Adotar operadora + produtos identificados como tese de empresa | empresarial |
| Unificar mesa e Rede num instrumento | empresarial + contratual |
| Destino de `contracts` 30/70 | empresarial + jurídica |
| Originação remunerada só no sucesso (quando) | empresarial |
| Fundo da Rede: personalidade | jurídica + contábil |
| Produção: prestação vs intermediação vs híbrido | jurídica + fiscal + contábil |
| O que é receita vs trânsito | contábil + fiscal |
| NF por linha de produto | fiscal |
| ISS / município / regime | fiscal — **não inventar CNAE** |
| Titularidade de licença | jurídica |
| Serviços territoriais / sagrado sem checkout | jurídica + empresarial |
| Hold / chargeback / regresso | contratual + PSP |
| Escolha de PSP | PSP + técnica (depois) |
| Coluna `originatedBy` | técnica (migration autorizada) |
| Ledger table | técnica (PROMPT 2/3, não Aiven agora) |
| Preços e % de lançamento | empresarial — **proibido nesta missão** |

---

## 25. Recomendação para o PROMPT 3

1. Auditar prontidão de segurança (IDOR de settlement, `updateAd` que ainda aceita % após captação, botão Super Admin “marcar pago”).  
2. Escala e reconciliação: o que falta para 1.000–10.000 sem implementar PSP.  
3. Checklist Etapa 4: parecer advogado+contador **antes** de schema de ledger.  
4. Não conectar PSP. Não Etapa 4. Não “corrigir” 30/70 com outro percentual.  
5. Decidir se `contracts` entra no freeze da Rede ou permanece PDF legado. `[DECISÃO EMPRESARIAL]`

---

## 26. Relação com o código desta missão

| Artefato | Função |
|---|---|
| Este arquivo | norma oficial PROMPT 1 |
| `shared/economicFoundation.ts` | catálogo + invariantes PROMPT 1–2; **não** cobra |
| `shared/economicFoundation.test.ts` | trava Beta, PSP, 30/70, payout ≠ banco |

Nenhuma tabela nova. Nenhuma migration. Aiven/Tigris/Render intocados por este prompt.
