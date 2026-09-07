# Autonomia comercial do profissional e originação territorial

**Fase:** auditoria + implementação controlada sem schema novo.  
**Fora de escopo:** marketplace, ranking, feed, tabela `services`, migration, Aiven, push, deploy, gateway real.

A política pública permanece em `shared/territorialVisibility.ts`.  
Vender mais, originar mais ou cobrar mais **não** altera diretório nem Home.

---

## 1. Autonomia atual (antes desta fase)

O profissional com perfil Ativo já podia: receber convite de Opportunity (`opportunities.mine` + aceite/recusa), executar Production no próprio recorte, ter presença em `/rede/profissionais` se `publicVisible`.

Não podia: criar `commercialRequests` em seu nome; criar Opportunity; gravar originador distinto de `createdBy`; receber pedido público dirigido ao perfil.

`commercial.requestCoverage` já existia como formulário **genérico** para a Ojú (`/contrate-sua-cobertura`), sem vínculo a um perfil.

`networkOpportunities.origin` é operacional (`Comercial | Mesa | Manual`), não “quem trouxe”.

## 2. Autonomia implementada

1. Visitante no perfil público: **Solicitar serviço** → mesma tabela `commercialRequests`, com origem `visitante-profissional` e `requestedProfessionalProfileId`.
2. Integrante autenticado com perfil Ativo e território: **`/rede/originar`** cria solicitação com origem `profissional` e `originatedByProfessionalProfileId`. **Não** cria Opportunity.
3. Listagem `commercial.myOriginationLeads` só devolve origens do próprio perfil (filtro após parse).
4. Opportunity criada depois pelo admin (`createFromRequest` / `create`) copia a origem no `auditEvents.nextState` e remove o carimbo do briefing.

## 3. Origem de oportunidade

Persistência no Beta (sem coluna nova):

- carimbo `OJU_ORIGIN_V1:{json}` no campo `notes` de `commercialRequests`;
- `commercialActivities` (tipo Solicitação);
- `auditEvents` (`professional_service_requested`, `professional_opportunity_originated`, e no create de Opportunity).

**Necessidade futura documentada (não aplicar):**  
`networkOpportunities.originatedByProfessionalProfileId` + `originKind` (e opcionalmente os mesmos campos em `commercialRequests`). Motivo: `notes` é editável na carteira comercial; coluna tipada é a fonte de verdade para métricas internas.

## 4. createdBy vs originatedBy

| Papel | Campo / registro |
| --- | --- |
| Quem gravou o lead | `createdByUserId` no JSON de origem (usuário da sessão) ou `null` se visitante |
| Quem originou na Rede | `originatedByProfessionalProfileId` |
| Para quem o visitante pediu | `requestedProfessionalProfileId` |
| Quem cria a Opportunity | `networkOpportunities.createdBy` (admin) |
| Quem aceita | `acceptedProfessionalProfileId` |
| Quem executa | `networkProductions.professionalProfileId` |

Um admin pode registrar depois: `createdBy` da Opportunity ≠ originador do lead.

## 5. Serviços

Não há tabela `services`. O que a pessoa faz continua sendo:

- catálogo `professionalSpecialties` + `professionalProfileSpecialties`;
- `workType` da originação / Opportunity;
- flags `needsPhotography` etc. em `commercialRequests`.

Lacuna: declaração fina de “oferta” (pacote, disponibilidade horária) **não** existe. Não justifica `services` neste Beta.

## 6. Solicitações

Reuso de `commercialRequests`. Status inicial `Solicitação`. `managedByUserId` permanece nulo até a carteira comercial da Ojú assumir.

Pedido dirigido ao perfil **não** é aceite automático do profissional.

## 7. Propostas

Continuam no fluxo comercial existente (`proposalSummary`, `proposalAmount`, status Proposta), **somente admin** (`requireCommercial`). O profissional não envia proposta por esta fase.

## 8. Oportunidades

Continuam internas. Só admin cria/abre/convida. Originação **não** chama `insert(networkOpportunities)`.

Fluxos mapeados:

| Fluxo | Hoje |
| --- | --- |
| Ojú origina → profissional executa | Sim (Opportunity + invite) |
| Profissional origina → análise Ojú | Sim (lead `commercialRequests`) |
| Profissional origina → ele mesmo executa | Só depois de Opportunity + invite/aceite admin |
| Profissional origina → outro executa | Idem, matching admin |
| Parceiro origina | Parcial (`regionalOffers` para admin de parceiro) |
| Visitante → Ojú | `requestCoverage` sem slug |
| Visitante → profissional → Ojú | `requestCoverage` com `professionalSlug` |

## 9. Produção

Inalterada. `editorialReady` ≠ publicado.

## 10. Pagamento

Inalterado: `PaymentProvider`, webhook, snapshot, `clientMayConfirmPayment() === false`. Originação não cria intent.

## 11. Settlement

Inalterado. Profissional não ganha `requireCommerceAdmin`.

## 12. Direitos

Inalterados. Originar não autoriza portal (`canUseOnPortal` segue na contratação).

## 13. RBAC

Não existe motor de capabilities genérico. Regras desta fase:

- `originateLead` / `myOriginationLeads`: sessão Ativa + perfil profissional ( **não** exige `adminAccess`).
- `opportunities.create`: continua `requireOpportunityAdmin`.
- `protectedProcedure` do Centro Admin continua exigindo `adminAccess`.
- Especialidade não concede papel.

Autonomia comercial ≠ autonomia administrativa.

## 14. Território

Originação usa `professionalProfiles.territoryId`. Sem território, recusa. Pedido ao perfil copia `territoryId` e `partnerId` do perfil. Create de Opportunity segue `assertPartnerScope`.

## 15. Visibilidade

`shared/territorialVisibility.ts` intocada em regra. Pedido/origem não entra em `/rede` ranking, Home ou destaques. `publicVisible` + Ativo equivale a “aceita solicitação pública” nesta fase (sem flag `acceptsServiceRequests`).

## 16. Governança

Lead = operação comercial privada. Publication = editorial. Visibility = exposição. Camadas separadas.

## 17. Métricas internas

Possível via parse de `OJU_ORIGIN_V1` + auditoria. **Não** expor ranking. Coluna futura permite agregação estável.

## 18. Limitações do Beta

- Origem em `notes` pode ser apagada se a carteira editar o campo sem preservar o carimbo.
- `listMyOriginationLeads` varre notas com o prefixo (volume baixo no Beta).
- Profissional sem `users.userId` no perfil não origina nem recebe notificação.
- Sem proposta self-service, sem agenda, sem preço público, sem comissão definitiva.
- `startLogin()` ainda aponta ao fluxo Google/admin; conta sem `adminAccess` usa `/rede/originar`, não o Centro Administrativo.
- Enum `origin` da Opportunity **não** ganhou valor `Profissional` (exigiria migration).

## 19. Futuras evoluções

1. Colunas `originatedByProfessionalProfileId` / `originKind` (após autorização de migration).
2. Proposta do profissional no próprio recorte, sem vitrine de preço.
3. Área da Rede para quem tem perfil e não tem `adminAccess` (convites hoje exigem Centro Admin).
4. Flag `acceptsServiceRequests` se presença pública e disponibilidade precisarem divergir.
5. Disponibilidade/agenda.
6. Métricas internas de originação por território/especialidade.

---

Nenhuma tabela nova. Nenhuma migration executada.
