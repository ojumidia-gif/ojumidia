# Arquitetura de visibilidade territorial da Rede Ojú

**Fase:** auditoria + contrato de domínio + centralização controlada.  
**Escopo negativo:** sem deploy, sem push, sem Aiven, sem migrations, sem tabelas novas, sem ranking, sem marketplace.

> Visibilidade não é curadoria.  
> Curadoria não é pagamento.  
> Presença na Rede não é portfólio.  
> Limite de mídia é por unidade editorial, não por profissional.

O motor **não decide sozinho a vitrine**. Ele declara **elegibilidade**. A Home continua curada no editorial/admin.

Nome adotado (alinhado ao código existente, não um serviço paralelo): **`shared/territorialVisibility.ts`**. Não se chama `VisibilityEngine` no runtime para não sugerir um segundo sistema. Conceitualmente é o *Territorial Visibility Policy* da Rede.

---

## 1. Objetivo

Descobrir onde o Ojú já decide o que o público vê; separar identidade, especialidade, vínculo, território, permissão, produção, editorial, visibilidade, comercial e originação; centralizar **predicados duplicados** sem criar fonte de verdade nova no banco.

## 2. Princípios

- Ojú é rede territorial de visibilidade, memória, cultura e conexão.
- Público contextualiza QUEM + O QUE + ONDE + COM QUEM + CONTEXTO + HISTÓRIA + PRODUÇÃO + RELAÇÃO COM O TERRITÓRIO.
- Backend autoriza; frontend apresenta.
- Pagamento não compra curadoria nem posição no diretório da Rede (`paymentControlsDirectoryVisibility() === false`).
- 5 JPG + 1 miniclip ≤ 60s **por unidade** (publicação / produção / cobertura / documentário / projeto), nunca `maxMediaPerProfessional`.
- Autonomia comercial do profissional ≠ permissão administrativa ≠ destaque editorial.

## 3. Entidades (o que já existe no schema oficial 0048–0053 + legado)

| Conceito | Estrutura existente | Não criar |
| --- | --- | --- |
| Identidade usuário | `users` | segundo cadastro de pessoa |
| Identidade profissional Rede | `professionalProfiles` (`userId`, `status`, `publicVisible`, `publicSlug`) | tabela de “vitrine” |
| Executor legado / ficha /fotografos | `networkExecutors` (`linkedUserId`, `publicVisible`, `publicSlug`, enum `specialty`) | fundir à força nesta fase |
| Especialidade Rede | catálogo `professionalSpecialties` + `professionalProfileSpecialties` | tabela `services` |
| Especialidade legado | `networkExecutors.specialty` | segundo catálogo |
| Vínculo | `professionalProfiles.networkBond` (`criador-parceiro` \| `parceiro-midia`), `partnerMembers` | “membership” paralelo |
| Território | `taxonomies` dimensão Território; `partnerTerritories`; `*.territoryId`; `cityLabel`/`uf` em oportunidades | motor geográfico novo |
| Parceiro | `partners` (`publicVisibility`, `status`) | diretório paralelo |
| Casa / instituição | `institutions` + consentimento + `directoryScope` | |
| Projeto público | `publications` `contentKind = Projeto` | |
| Oportunidade | `networkOpportunities` (`origin` Comercial\|Mesa\|Manual, `createdBy`) | origem profissional ainda **não** é coluna |
| Produção | `networkProductions` (`editorialReady` ≠ publicado) | auto-publicar |
| Mídia / acervo | `mediaAssets` (`publicationAllowed`, `authorization`, duração) | acervo 2 |
| Mídia de produção | `networkProductionMedia` | |
| Publicação | `publications` (status, `isPublic`, `homePlacement`, `manualFeatured`, `sponsored`, `commercialRequestId`) | |
| Destaques / Home | `homePlacement`, `highlightSuggestions`, `editorial.featured` | feed |
| Direitos comerciais editoriais | `commercialEditorialAuthorizations` (`canUseOnPortal`) | |
| Visibilidade comercial institucional | `institutionVisibilitySubscriptions` | pay-to-appear da Home |
| Auditoria | `auditEvents`, `editorialActivities` | log paralelo |
| Políticas comerciais | `commercialPolicies` versionadas + snapshot em transações | percentuais hardcoded |

## 4. Território

- **Dado:** taxonomia Território (cidade/região conforme cadastro editorial), `territoryId` em perfil, casa, oportunidade, produção, publicação (via `publicationTaxonomies`).
- **Admin:** `assertPartnerScope` + `publicationIdsFullyInTerritoryScope` (todos os territórios ligados precisam estar autorizados).
- **Visitante público:** ainda **não** há contexto territorial do browser persistido. Filtro é explícito (`territoryId` na query da Rede / memórias).
- **Regra de produto ainda não implementada como motor:** diversidade Home (Manaus vs Porto Alegre). Hoje a Home é **curadoria manual** (`homePlacement` / `manualFeatured`), não ranking por volume. `relevance` é desempate **depois** da colocação editorial — risco a monitorar, não popularidade pública.

## 5. Editorial

Elegibilidade de portal: `publicationEligibleForPortal` / `canExposeOnPublicPortal`.

Condições: `Publicada` + `isPublic` + não quarentenada + não na lixeira + (se `commercialRequestId`, `canUseOnPortal`).

`editorialReady` em produção **não publica**. `productions.ts` e `networkCommerce.ts` devolvem `published: false`. Entrega ≠ publicação.

## 6. Diretório

Rotas: `/rede`, `/rede/profissionais`, `/rede/parceiros`, `/rede/casas`, `/rede/projetos`.

- Profissional Rede: `Ativo` + `publicVisible`. Ordenação **alfabética**. Sem score.
- Parceiro: `Ativo` + `publicVisibility`.
- Casa: `Publicada` + consentimento `Autorizado`; serviço comunitário exige plano institucional vigente (rótulo comercial, não curadoria).
- Projeto: mesma elegibilidade de portal (incluindo quarentena e autorização comercial).

Superfície **paralela**: `/fotografos` via `editorial.publicPhotographers` (`networkExecutors`). Não fundir nesta fase.

## 7. Home

`isHomeCurated` / `isEditorialHomeSurface`: `homePlacement !== "Nenhum"` ou `manualFeatured`.

Lista pública Home: `editorial.featured` + `sortHomeCurated` (placement, `homeOrder`, featured, `relevance`).

Não é `ORDER BY created_at` da Rede. Não é diretório. Não é oportunidade.

`publications.sponsored` / `sponsorDisclosure` identificam comercial **quando** a peça também está na vitrine; pagamento **não** altera `paymentControlsDirectoryVisibility`.

## 8. Comercial

- Pedidos: `commercialRequests`.
- Oportunidades da Rede: privadas (admin). Origem operacional: Comercial / Mesa / Manual. `createdBy` = ator do sistema, **não** originador territorial.
- Profissional **não** vende pelo diretório. Não há preço, estrelas nem “comprar agora” nas páginas públicas da Rede.
- Visibilidade institucional de **serviço comunitário** é produto identificado (`visibilityPlan` no explorer). **Conflito:** `community.publicInstitutions` ordena quem tem plano **antes** dos demais (`Number(Boolean(visibilityPlan))`) e ainda `updatedAt DESC`. Isso **não** é a regra da Rede (`/rede` alfabético). Documentado; não alterado nesta fase para não mudar o explorer sem decisão editorial.

Percentuais: snapshot de `commercialPolicies` na oportunidade. Nada hardcoded como “modelo definitivo”.

## 9. Originação

**Hoje:** `networkOpportunities.origin` ∈ {Comercial, Mesa, Manual}. Ligação opcional `commercialRequestId`. Originação territorial do profissional no Beta: carimbo `OJU_ORIGIN_V1` em `commercialRequests.notes` + auditoria (`docs/AUTONOMIA_COMERCIAL_REDE_OJU.md`). Sem coluna nova.

**Não existe ainda no schema:** `originatedByProfessionalProfileId`.

**Futuro (só documentado):** distinguir Ojú / profissional / participante / parceiro-casa / contato externo. Sem comissão, sem migration nesta fase.

`createdBy` não deve ser reutilizado como originador: é auditoria de quem gravou o registro.

## 10. Direitos

`mediaAssets.authorization`, `publicationAllowed`, prazos `usageExpiresAt`. Portal comercial: `commercialEditorialAuthorizations`. Consentimento comunitário: `consentStatus` em instituições, eventos, memórias.

Mídia no acervo **não** é pública só porque foi enviada (`mediaIsPublicByUploadAlone` = false).

## 11. Autorização

- RBAC: `users.role` / `adminAccess`. Especialidade **não** concede papel (`specialtyGrantsPrivilege`).
- Escopo territorial: `partnerScope`.
- Diretório: admin autoriza `publicVisible` (`setDirectoryProfileVisible`); Super Admin vs admin de parceiro.
- Publicação: fluxo editorial `editorialPolicy` (rascunho → revisão → aprovada → publicada).

Autonomia comercial futura **não** implica publicar Home, destaques ou políticas.

## 12. Motor de visibilidade

Arquivo: `shared/territorialVisibility.ts`.

Perguntas que o contrato já responde com regras **reutilizadas**:

| Pergunta | Função |
| --- | --- |
| Pode ir ao portal? | `publicationEligibleForPortal` |
| Profissional na Rede? | `decideProfessionalDirectory` |
| Parceiro na Rede? | `decidePartnerDirectory` |
| Casa na Rede / explorer? | `decideCommunityHouseDirectory` |
| Home curada? | `decideHomeCuration` / `isEditorialHomeSurface` |
| Filtro território? | `directoryTerritoryFilter` |
| Pagamento compra vitrine? | `paymentNeverBuysEditorialOrDirectory` |
| Janela 5+1? | `productionMediaWithinLimit` (reexport) |
| Oportunidade pública? | `opportunityIsPublicSurface()` = false |
| Frequency cap? | `exposureCooldownUntil: null` (gancho, sem tabela) |

Consumidores adaptados nesta fase: `server/routers/editorial.ts`, `server/editorialScale.ts`, `server/networkDirectory.ts`, `server/routers/community.ts` (`publicDirectory`).

## 13. Fluxo de decisão (conceitual)

```
CONTEÚDO / ENTIDADE
  → autorização / consentimento / direitos
  → estado editorial (ou Ativo no diretório)
  → tipo de entidade (não misturar superfícies)
  → território (filtro ou escopo admin)
  → contexto da superfície (portal | diretório | home | comercial)
  → política de visibilidade (este módulo)
  → curadoria editorial (admin; fora do predicado)
  → política comercial identificada (se houver)
  → regras de exposição futuras (frequency; contrato já reserva campo)
  → display público
```

Não é um monólito: queries continuam nos routers; o módulo só **avalia**.

## 14. Matriz de visibilidade

| Entidade | Pode ser pública? | Quem autoriza | Território | Direitos | Curadoria | Comercial | Rota pública |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Profissional Rede | Sim se Ativo + `publicVisible` | Admin diretório / vínculo | `territoryId` | bio/contato opt-in | Não (alfa) | Não | `/rede/profissionais/:slug` |
| Executor /fotografos | Sim se Ativo + `publicVisible` + slug | Admin fotógrafos | `territoryId` executor | ficha documental | Não | Não | `/fotografos` |
| Parceiro | Sim se Ativo + `publicVisibility` | Admin parceiros | `partnerTerritories` | — | Não | Não | `/rede/parceiros/:slug` |
| Casa institucional | Sim se Publicada + consentimento | Staff comunitário + consentimento | `territoryId` | localização/contato | Não | Não | `/rede/casas`, explorer |
| Serviço comunitário | Só com plano vigente | Idem + confirmação de vigência | idem | idem | Não | Sim, identificado | explorer / `/rede` casas |
| Instituição (lista `publicInstitutions`) | Publicada + consentimento **sem** filtrar serviço sem plano | — | — | — | **Não** (ordenação paga + recência) | Plano sobe na lista | explorer legado |
| Projeto | Portal-eligible | Editorial + auth comercial se houver | taxonomia | mídia | Editorial | Só se contratado | `/projetos/:slug`, `/rede` |
| Produção | Não automaticamente | Editorial após `editorialReady` | `territoryId` | mídia 5+1 | Sim para virar publicação | Valores internos | só via publicação |
| Cobertura / história / doc / foto documental | Via `publications` | Editorial | taxonomia | mídia 5+1 (foto doc: 5+0) | Home opcional | `commercialRequestId` | rotas editoriais |
| Evento comunitário | Publicada + consentimento + futuro | Staff | `territoryId` | capa `publicationAllowed` | Agenda por data | Não | `publicEvents` |
| Memória oral | Publicada + consentimento + `accessLevel` Público | Staff | filtro opcional | mídia | Recência | Não | busca memórias |
| Mídia acervo | Só se ligada e permitida | Acervo + publicação | — | `publicationAllowed` | Home clips fundo | Miniclips comerciais separados | nunca “upload = público” |
| Publicação | `canExposeOnPublicPortal` | Editorial | taxonomia | auth comercial | Home placement | sponsored identificável | portal |
| Destaque / Home | Subconjunto curado | Superficie Home | diversidade ainda manual | — | **Sim** | Não compra lugar | `/` |
| Agenda | Eventos futuros publicados | Staff | — | — | Cronológica (data do evento) | Não | eventos |
| Diretório Rede | Ver linhas acima | Admin | filtro | — | Alfa | Serviço comunitário = gate, não rank | `/rede` |
| Oportunidade | **Não** | Admin Rede | obrigatório | — | Matching interno | Economia snapshot | nenhuma rota pública |
| Acervo | Admin | Acervo | — | direitos | — | — | não listagem social |

## 15. Responsabilidades

- **shared/territorialVisibility.ts:** predicados e decisões de elegibilidade.
- **editorial.ts:** portal, caps de publicação, fotógrafos legado.
- **networkDirectory.ts:** Rede pública.
- **community.ts:** casas/eventos/memórias; **não** usar como Home.
- **productions.ts:** 5+1 na entrega; nunca publicar.
- **partnerScope.ts:** RBAC territorial.
- **paymentProvider.ts:** pagamento não controla diretório.
- **Frontend:** UX, filtros, copy. Sem autorização.

## 16. Regras que já existiam

- Portal: status + isPublic + quarentena + lixeira + auth comercial.
- Rede profissionais/parceiros: flags + status.
- Casas: consentimento; serviço comunitário + assinatura.
- 5+1 produção e 5+1 publicação (`MAX_PHOTOS` / `MAX_MINICLIPS`).
- Home curada.
- Oportunidade privada.
- Escopo de parceiro.

## 17. Regras centralizadas nesta fase

- Predicado de portal em `publicationEligibleForPortal`.
- Home surface em `isEditorialHomeSurface`.
- Diretório profissional/parceiro/casa + filtro territorial.
- `/rede` projetos alinhados ao portal (quarentena + autorização comercial).
- `publicDirectory` comunitário usa o mesmo predicado de casa.

## 18. Regras ainda distribuídas (propositalmente)

- Caps de **publicação** (`recordPhotoCap` / `canAttachWithinMediaLimit`) vs caps de **produção** (`productionMediaWithinLimit`): mesma janela numérica, códigos distintos por unidade.
- `/fotografos` vs `/rede/profissionais`.
- `publicInstitutions` ordenação comercial (conflito).
- Perfil público da Rede **colapsa** mídias de várias produções numa única janela 5+1 na **exibição** (`getPublicProfessionalBySlug`) — atenção, não regra de upload. Upload continua por produção.
- `relevance` na ordenação da Home.
- Matching de oportunidades (`server/opportunities.ts`).
- RBAC completo permanece em `partnerScope` / editorialPolicy.

## 19. Riscos

1. Duas identidades públicas de profissional (executor vs perfil Rede) podem divergir.
2. `publicInstitutions` privilegia plano pago na ordem — tensiona “pagamento não compra ranking”.
3. Sem contexto de visitante, diversidade territorial da Home depende só da curadoria humana.
4. Originação territorial ainda não é rastreável de forma fiel.
5. Exibição 5+1 no perfil público pode esconder produções adicionais (concentração de atenção misturada à janela).
6. Projetos comerciais sem autorização deixam de aparecer em `/rede` (alinhado ao portal; se existirem no Beta, some da Rede).
7. Frequency/rotação ainda não persistem — só o campo nulo no contrato.

## 20. Próximos passos (não esta fase)

1. Decidir unificação gradual `/fotografos` → perfil Rede **ou** papéis documentados distintos.
2. Corrigir ordenação de `publicInstitutions` (alfabética + selo “visibilidade contratada”) após OK editorial.
3. Documentar migration futura de originação (`originatedByProfessionalProfileId` + `originKind`) **sem** aplicá-la agora.
4. Separar janela de **exibição** do perfil (diversidade de produções) da janela de **anexo**.
5. Motor de diversidade territorial na Home **depois** de dados reais de curadoria.
6. Autonomia de oferta: reutilizar especialidades + território + `commercialRequests` / oportunidades; **não** criar marketplace nem tabela `services` até provar lacuna de dados (hoje especialidade + workType + briefing cobrem a declaração do que a pessoa faz).
7. Frequency cap: preencher `exposureCooldownUntil` com política em memória/config, ainda sem tabela, se o produto pedir.

### Autonomia profissional — o que o código permite hoje

O profissional **já pode** (via operação Ojú, não self-serve completo): ter identidade (`professionalProfiles`), especialidades, território, vínculo, receber convites de oportunidade, produzir com janela 5+1 por produção, ter presença na Rede se um admin marcar `publicVisible`, ter ficha `/fotografos` se executor `publicVisible`.

O profissional **não pode hoje:** originar oportunidade com autoria persistida; publicar a si na Home; definir preço público; receber ranking; criar oferta self-service no portal; confirmar pagamento pelo cliente; transformar especialidade em RBAC.

**Para vender serviços sem virar marketplace:** preservar Rede como presença; pedidos e propostas no fluxo autenticado/admin; originação rastreada; comercial com política versionada; visibilidade editorial intocada por volume de venda.

---

*Nenhuma tabela nova foi criada. Schema 0048–0053 permanece a estrutura oficial.*
