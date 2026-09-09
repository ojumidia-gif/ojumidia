# Especificação do motor de visibilidade territorial e editorial do Ojú

**Missão:** 6 — auditoria forense + especificação.  
**Não é implementação.** Sem migration, schema, Aiven, QA de produto, OJU-AR/AE, 5+1, Opportunity, Production, push ou deploy.

Contrato de predicados em uso: `shared/territorialVisibility.ts`.  
Contrato vivo (princípios, matriz resumida): `docs/ARQUITETURA_VISIBILIDADE_OJU.md`.

---

## 1. Princípio da Rede

O Ojú é uma rede territorial de visibilidade, memória, cultura e conexão.  
A visibilidade pública **conecta** entidades autorizadas; não ranqueia popularidade, volume nem pagamento.

O Ojú **não limita a trajetória** de uma pessoa. Limita a **quantidade de mídia por unidade editorial** (publicação / produção / cobertura / documentário / projeto): 5 JPG + 1 miniclip ≤ 60s.

**Quem decide o que o público vê hoje:** o backend (estado + autorização + predicados) e, na Home, **curadoria humana** (`homePlacement` / `manualFeatured`). Não existe motor que “descubra” destaques por cronologia, likes ou pagamento.

---

## 2. Dez conceitos (não substituíveis)

| # | Conceito | Fonte de verdade no código | Não confundir com |
| --- | --- | --- | --- |
| 1 | Identidade | `users`, `professionalProfiles`, `networkExecutors` (legado) | especialidade, RBAC |
| 2 | Especialidade | `professionalProfileSpecialties` / catálogo; `networkExecutors.specialty` | permissão, Home |
| 3 | Membership | `partnerMembers`, `professionalProfiles.networkBond` | `adminAccess` |
| 4 | Território | `taxonomies` (dimensão Território), `*.territoryId`, `publicationTaxonomies`, `partnerTerritories` | geolocalização do visitante |
| 5 | RBAC | `users.role`, `adminAccess`, `partnerScope` | aparecer na Home |
| 6 | Produção | `networkProductions` (`editorialReady` ≠ publicado) | publicação, Home |
| 7 | Editorial | `publications` + fluxo CMS | diretório, comercial |
| 8 | Visibilidade | predicados + flags (`isPublic`, `publicVisible`, consentimento) | curadoria |
| 9 | Produto comercial | `advertisements`, `institutionVisibilitySubscriptions`, `commercialMiniclips`, `sponsored` | curadoria editorial |
| 10 | Originação | carimbo `OJU_ORIGIN_V1` em `commercialRequests.notes` | ranking, Home |

Proibições confirmadas no código de predicados: especialidade não concede Home; admin não ranqueia diretório; `opportunityIsPublicSurface() === false`; `paymentControlsDirectoryVisibility() === false`.

---

## 3. Superfícies públicas (inventário a partir de `App.tsx`)

Rotas autenticadas da Rede (`/rede/originar`, `/rede/convites`, `/rede/producoes`) **não** são vitrine pública. CMS `/admin/*` não é público.

| Rota | Componente | Procedure | Origem | Entidade | Elegibilidade | Autorização | Território | Ordenação | Paginação | Curadoria | Filtros | Limites | Frequência | Exposição | Comercial | Auditoria | Riscos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `Home` | `editorial.featured`, `media.homeBackgrounds`, `commercial.activeAds` | `publications`, `mediaAssets`, `advertisements` | publicação curada, miniclip, anúncio | Home: `Publicada`+`isPublic`+sem lixeira/quarentena + (`homePlacement`≠Nenhum **ou** `manualFeatured`); ads: `Ativo` no período; fundo: ver §7 | Portal: `portalAuthorizedPublications`; miniclip `publicationAllowed`; anúncio status | `featured.territoryId` **existe na API**, Home **não envia** | `sortHomeCurated` depois prioriza taxonomia geográfica; SQL residual `manualFeatured, relevance, sponsored, publishedAt` | featured limit 40 SQL → `balanceFeaturedPublications` 6; UI **4** cards | Humana (CMS Destaques) | NÃO IMPLEMENTADO na UI da Home | 4 cards / sequência `HOME_MINICLIP_SEQUENCE_LIMIT` | NÃO IMPLEMENTADO (cooldown null) | `highlightExpiresAt` via `editorialAutomation`, **não** filtrado na query featured | Ads bloco identificado; miniclip comercial pode **substituir** sequência editorial | `editorialActivities` / setFeatured | Sem diversidade automática; comercial no hero; `relevance` desempata |
| `/miniclipe/:id` | `MiniclipWatch` | `media.publicBackgroundClip` | `mediaAssets` ± `commercialMiniclips` | vídeo | `publicationAllowed`+Ativo + (`backgroundEligible` **ou** comercial home autorizado) | publicaçãoAllowed | NÃO IMPLEMENTADO | n/a | 1 | CMS fundo vivo | id | 60s upload | n/a | n/a | comercial se origin comercial | — | ID enumerável |
| `/busca`, `/acervo` | `Search` | `editorial.search` | `publications` | publicação portal | portal + taxonomias | `canUseOnPortal` se comercial | filtro explícito | `publishedAt DESC` | 24 | NÃO (cronologia) | tema, território, tipo, org, kind, datas, query | 24 | NÃO | todas as publicadas matching | não | — | Feed por recência; `total` conta antes do filtro de autorização comercial |
| `/historias` | `StoriesPreview` | `editorial.search` kind História | idem | história | idem | idem | não | recência | 24 | primeira da lista = “featured” **por recência**, não Home | kind | 24 | NÃO | NÃO | não | — | Superfície editorial vira feed recente |
| `/coberturas` `/documentarios` `/projetos` | *Public | `editorial.search` kind | idem | cobertura/doc/projeto | idem | idem | não | recência | 24 | NÃO | kind | 24 | NÃO | NÃO | só se publicação comercial autorizada no portal | — | idem |
| `/fotografia-documental` | `DocumentaryPhotography` | `editorial` fotos documentais | `publications` kind | foto doc | portal | idem | não | recência | offset | NÃO | — | cap 5 fotos na unidade | NÃO | NÃO | não | — | — |
| `/territorios` | `TerritoriesPreview` | `editorial.publicTerritories` | `taxonomies` + links | território | dimensão Território; `contentCount` só publicações portal | mídia taxonomia `publicationAllowed` | a própria entidade | `name` | lista | mídia primária CMS | n/a | todos | NÃO | contagem de conteúdo **pode** favorecer território com mais publicações (métrica, não ranking de pessoas) | não | — | Escala: carrega todas as taxonomias |
| `/territorios/:slug` | `Taxonomy` | editorial taxonomia | taxonomias + publicações | página territorial | conteúdo portal ligado | portal | slug | recência das peças | — | NÃO IMPLEMENTADO diversidade | slug | — | NÃO | NÃO | não | — | Território “cheio” domina a página |
| `/historias/:slug` | `Story` | editorial get público | `publications` | publicação | portal | auth comercial | taxonomias da peça | n/a | 1 | humana (publicar) | slug | 5+1 da unidade | n/a | enquanto Publicada | sponsored identificável | editorial | — |
| `/rede` `/rede/profissionais` | `NetworkPublic` | `networkDirectory.publicList` | perfis, instituições, projetos, partners | mistura | predicados `decide*` | flags + consentimento | **API** `territoryId`; **UI não envia** | alfabético `displayName` | 24/48 | não | q, kind, specialty | 24 | NÃO | NÃO | serviço comunitário = gate plano, não rank | `directory_profile_*` | Dual fonte vs `/fotografos`; load all then slice (escala) |
| `/rede/profissionais/:slug` | `NetworkProfessionalPublic` | `networkDirectory` by slug | `professionalProfiles` + produções | perfil Rede | Ativo+`publicVisible` | `publicVisible` | `territoryId` do perfil | stories de produções concluídas+`editorialReady`+publicação portal | — | não | slug | **exibição** colapsa 5+1 **entre** todas as stories | NÃO | NÃO | não | — | 5+1 de exibição ≠ unidade |
| `/rede/casas/:slug` `/rede/instituicoes/:slug` | `NetworkHousePublic` | `community.publicDirectory` | institutions | casa | `decideCommunityHouseDirectory` | consentimento | `territoryId` | updatedAt na query, depois predicado | lista | não | slug | — | NÃO | plano institucional se serviço | selo `visibilityPlan` | expire visibilities (write-on-read) | write-on-read em GET |
| `/rede/projetos/:slug` | `NetworkProjectPublic` | publicação Projeto | publications | projeto | portal | comercial se houver | — | — | 1 | editorial | slug | 5+1 | — | — | — | — | — |
| `/rede/parceiros/:slug` | `NetworkPartnerPublic` | `getPublicPartnerBySlug` | `partners` | parceiro | Ativo+`publicVisibility` | `publicVisibility` | `partnerTerritories` não listados no card público mínimo | n/a | 1 | não | slug | — | NÃO | NÃO | não é ranking | — | Parceiro ≠ licença de publicar qualquer coisa |
| `/fotografos` | `PhotographersPublic` | `editorial.publicPhotographers` | `networkExecutors` | executor | Ativo+`publicVisible`+slug | `decideExecutorPhotographerPage` | `territoryId` sem filtro UI | `displayName` | 24 | não | — | 24 | NÃO | NÃO | não | — | Fonte paralela à Rede |
| `/fotografos/:slug` | `PhotographerProfile` | `editorial.photographerBySlug` | executor + publicações creditadas | ficha + obras | portal nas obras | photographerId na mídia | não | `publishedAt DESC` | 12 | NÃO | slug | 12 | NÃO | volume de crédito aumenta lista | não | — | Volume de crédito = mais itens na ficha |
| `/instituicoes` | `InstitutionExplorer` | `community.publicDirectory` | institutions | casas/serviços | predicado casa | consentimento; serviço exige plano | filtro UI + mapa | **updatedAt** (não alfa) | lista | não | busca, tipo, território | — | NÃO | plano identificado no copy | `visibilityPlan` **não ordena** esta procedure | expire write-on-read | Geolocalização **só pan do mapa**, não persiste contexto Ojú |
| `/agenda` | `CommunityDirectory` agenda | `community.publicEvents` | `communityEvents` | evento | Publicada+Autorizado+não deleted+`startsAt`≥agora | consentimento; capa `publicationAllowed` | `territoryId` sem filtro UI | `startsAt` ASC | lista | não | — | futuros | n/a | até passar a data | não | — | Eventos passados somem |
| `/memorias` | `OralMemorySearch` | `community.publicMemories` | `oralMemories` | memória | Publicada+Autorizado+`accessLevel` Público | consentimento; mídia publicationAllowed | filtro opcional | `updatedAt DESC` | lista | NÃO | query, tema, território | — | NÃO | NÃO | não | — | Recência; voz se `speakerNameVisibility` |
| `/comunidade` | `CommunityHub` | conteúdo portal | CMS copy | navegação | — | — | — | — | — | copy | — | — | — | — | — | — | — |
| `/sobre` `/conheca-a-oju` | `AboutOju` | portal content | settings | institucional | — | — | — | — | — | copy | — | — | — | — | — | — | — |
| `/servicos` | `Services` | copy | — | produtos Ojú | — | — | — | — | — | — | — | — | — | — | institucional | — | Não é ranking de profissionais |
| `/contrate-sua-cobertura` `/planejar-um-registro` `/contato` `/apoie-uma-memoria` | formulários | mutations públicas de lead | requests | lead | n/a | — | opcional | n/a | n/a | n/a | — | — | n/a | n/a | pedido comercial **não** publica | — | Não é vitrine |
| `/licenciar-midia` | `LicenseMedia` | `revenue.mediaEligibleForLicense`, `revenue.createPublic` | `mediaAssets` | lead licença | **DÍVIDA:** eligibility é `protectedProcedure` (CMS); UI é pública | **não** exige `publicationAllowed` no check | n/a | n/a | n/a | n/a | mid query | — | n/a | n/a | produto | — | Visitante não consulta elegibilidade; ID enumerável |
| `/cuidado-e-consentimento` `/acompanhar-acolhimento` | cuidado | `createCareRequest` / track | care requests | acolhimento | n/a | tracking code | opcional | n/a | n/a | n/a | — | — | n/a | n/a | não | — | — |
| `/ser-parceiro` | `BePartner` | joinRequests | join | candidatura | n/a | termos | — | n/a | n/a | n/a | — | — | n/a | n/a | não | — | Não publica parceiro |
| `/termos-de-uso` `/privacidade` | `LegalDocument` | `legal.current` | versões | legal | n/a | — | — | — | — | — | — | — | n/a | n/a | não | — | — |
| `/memorias-documentais` | `DocumentaryMemories` | portal | — | copy | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `/404` | `NotFound` | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |

**APIs públicas sem rota dedicada (ainda invocáveis):** `community.publicInstitutions` (ordenação por plano pago); `community.publicInstitutionMap` (todas as Publicada+Autorizado com lat/lng, **sem** predicado de serviço/plano).

---

## 4. Fontes de visibilidade

| Fonte | Cria | Edita | Aprova/publica | Vê público | Território | Autorização | Estado | Expiração | Remoção | Auditoria | Home | Rede | Busca | Território página | Comercial | Editorial |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `publications` | CMS | CMS | CMS publicar | se portal | taxonomias | comercial se `commercialRequestId` | Publicada+isPublic | highlight via automation | unpublish, trash, quarantine | editorial | só se curada | projetos no diretório | sim `editorial.search` | via taxonomia | sponsored/ads separados | sim |
| `professionalProfiles` | Rede/admin | admin diretório | `publicVisible` | Ativo+visible | `territoryId` | explícita | Ativo | não | hide / suspender | directory_* | **não** | sim | **não** (search é editorial) | filtro API | não | não |
| `networkExecutors` | CMS fotógrafos | CMS | flags | Ativo+visible+slug | `territoryId` | flags | Ativo | não | hide | CMS | crédito de capa na Home | **não** (outra rota) | via photographerId no search | não | não | obras se portal |
| `partners` | Super Admin | CMS | `publicVisibility` | Ativo+visible | partnerTerritories | flag | Ativo | não | flag off | CMS | não | sim | não | não | não compra rank | não |
| `institutions` | staff comunitário | staff | status Publicada + consentimento | predicado (Rede/explorer) | `territoryId` | consentimento | Publicada | plano visibilidade | trash Super Admin | community-* | **não** | sim se predicado | não editorial | explorer | plano identificado | não |
| `communityEvents` | staff | staff | Publicada+consentimento | futuros | `territoryId` | consentimento | Publicada | `startsAt` filtro | trash | community-* | não | não | não | não | não | não |
| `oralMemories` | staff | staff | Publicada+consentimento+Público | sim | `territoryId` | consentimento | Publicada | não | trash / accessLevel | community-* | não | não | **só** `/memorias` | filtro | não | não |
| `mediaAssets` | CMS/produção | CMS | `publicationAllowed`+state | só anexada ou fundo/hero | via publicação | authorization ≠ Pendente no perfil Rede | Ativo | `usageExpiresAt` (licença) | trash, quarantine | media | fundo se eligible | via publicação | capa search | taxonomia media | miniclip comercial | se publicação |
| `networkProductions` | accept/create | profissional/CMS | **não publica** | só via publicação ligada | `territoryId` | operacional | Concluída+editorialReady para listar stories | não | status | productions | não direto | indireto | não | não | não | após CMS |
| `advertisements` | CMS comercial | CMS | Ativo datas | Home bloco | não | contrato | Ativo | `endsAt` | status | commercial | bloco ads | não | não | não | **sim identificado** | **não** mistura cards |
| `commercialMiniclips` | CMS | CMS | `homeFeatured`+`authorizedForHome` | hero se Ativo | não | `authorizedForHome` | Ativo | não no query | status | media | **substitui** sequência editorial se 1 ativo | não | não | não | **sim** | conflito com curadoria de fundo |
| `institutionVisibilitySubscriptions` | staff | CMS | Ativa+período | gate serviço / selo | via instituição | pagamento confirmado | Ativa | `expiresAt` (+ expirePast write-on-read) | cancel | visibilidade | não | gate | não | explorer | produto | não |
| `highlightSuggestions` | admin pede | Super Admin decide | `decideHighlightSuggestion` | só se virar Home | — | CMS | — | highlightExpiresAt | recusar | editorial | se aprovado | não | não | não | não | sim |
| Opportunity | CMS/originação | CMS | n/a público | **não** | obrigatório interno | Rede | interno | — | — | opportunities | **proibido** | não | não | não | interno | não |
| Originação notes | profissional autenticado | n/a | n/a | **não** | da demanda | termos Rede | notes | n/a | n/a | origin | **proibido** | não | não | não | inteligência | não |

---

## 5. Home (estado real)

Quem decide: editor humano via `editorial.setFeatured` / Destaques / pedido de highlight.

- `featured`: placement ≠ Nenhum **ou** `manualFeatured`.
- Ordenação efetiva: `homePlacementRank` → `homeOrder` → `manualFeatured` → `relevance`. Depois: priorizar `territoryId` **se** passado (Home não passa) **ou** ter taxonomia Território/Localização. Depois `balanceFeaturedPublications` (1º de cada `contentKind`, depois resto, máx. 6).
- `relevance` (0–100) é **desempate editorial**, não popularidade pública.
- SQL ainda ordena por `sponsored` antes do re-sort — resíduo; o sort em memória manda.
- `highlightExpiresAt`: automation zera placement; **query featured não filtra expirados** até o job correr.
- Miniclips: curadoria `backgroundEligible` + `backgroundPriority`; sinais mute/watch **não** reordenam o público (só settings Super Admin).
- Sem limite por profissional, casa ou território. Sem rotação. Sem cooldown (`exposureCooldownUntil: null`).
- `Home.tsx` mostra 4 de até 6.

**Não é** últimas publicações da Rede, nem mais populares, nem quem pagou os cards editoriais.  
**É** curadoria + políticas parciais + um passo de diversidade **por tipo de conteúdo**, não territorial.

---

## 6. Território

- Visitante **sem** contexto persistido. Ojú **não sabe** de onde o visitante vem.
- `InstitutionExplorer` usa `navigator.geolocation` **apenas** para pan/zoom do mapa (`Permissions-Policy: geolocation=(self)`). Não grava cidade, não filtra Home, não vira `territoryId`.
- Estados conceituais futuros (NÃO IMPLEMENTADO): `VISITANTE_SEM_CONTEXTO_TERRITORIAL` (Home nacional curada + diretório alfa) e `VISITANTE_COM_CONTEXTO_TERRITORIAL` (relevância local **sem** esconder o restante; nunca geolocalização obrigatória).
- Distinção local/cidade/região/estado/nacional: taxonomia plana “Território”; **não** há hierarquia no schema. DECISÃO DE PRODUTO se precisar de árvore.

---

## 7. Diversidade territorial (especificação alvo, sem código)

**Unidade correta de cooldown da Home:** combinação **publicação × território da peça**, com teto secundário por **profissional** e por **casa** na mesma janela da vitrine.  
Não cooldown só de território (apagaria a cidade pequena). Não só profissional (uma casa com muitos profissionais ainda concentra).

Mecanismos alvo (não persistir agora):

- exposição mínima por território com conteúdo elegível;
- rotação na janela (não feed infinito);
- limite de repetição do mesmo profissional na Home (ex.: 1 slot / ciclo);
- `balanceFeaturedPublications` permanece para **kind**; complementar com território;
- visitante com contexto: boost local **depois** da curadoria humana, nunca no lugar dela.

---

## 8. Frequência e concentração

- **Mídia:** 5+1 por unidade de anexo (produção e publicação).  
- **Atenção:** NÃO IMPLEMENTADO. Várias produções do mesmo profissional podem gerar várias publicações na busca (`publishedAt DESC`) e várias candidatas à Home se o editor as marcar.
- Perfil Rede **colapsa** mídias de **todas** as stories numa janela 5+1 — mistura concentração de atenção com limite de mídia.
- Ficha `/fotografos/:slug` lista até N publicações creditadas por recência — volume de crédito aumenta exposição.
- Território com `contentCount` alto aparece “mais cheio” em `/territorios`.

Modelo alvo: contador de exposição **por superfície e ciclo**, em política/config, sem tabela até a Missão 6.1 definir armazenamento. Unidade: publicação na Home; profissional como teto; território como piso.

---

## 9. Editorial vs comercial

| Editorial | Comercial |
| --- | --- |
| `publications` curadas, frentes, taxonomias, memórias, casas documentais | `advertisements` na Home (bloco próprio) |
| `homePlacement` humano | `institutionVisibilitySubscriptions` (gate + selo) |
| miniclips `backgroundEligible` | `commercialMiniclips` homeFeatured |

**Conflitos reais:**

1. `community.publicInstitutions` ordena `visibilityPlan` primeiro — ranking por pagamento na API. Classificação: **bug semântico / dívida** (não é a regra da Rede; explorer público usa `publicDirectory`, que **não** ranqueia). Correção **não imediata** (decisão de produto: alfa + selo).
2. Hero: 1 miniclip comercial ativo **substitui** a sequência editorial. Pagamento não reordena cards, mas **ocupa o fundo vivo**. Classificação: **risco de produto** — precisa identificação visual explícita (DECISÃO DE PRODUTO).
3. `publications.sponsored` pode estar na Home se curado; identificação comercial. **Missão 6.1:** SQL da Home não ordena por `sponsored`.

---

## 10. Profissionais: duas fontes

| | `professionalProfiles` | `networkExecutors` |
| --- | --- | --- |
| Superfície | `/rede/profissionais` | `/fotografos` |
| Verdade da Rede | **sim** (membership, especialidades, originação) | ficha documental / crédito de mídia (`photographerId`) |
| Podem divergir | **sim** | pessoa pode existir só em uma |
| Unificar agora | **não** | DECISÃO DE PRODUTO |

`decideExecutorPhotographerPage` **não** é aplicado no procedure — duplicação de regra vs query.

---

## 11. Casas / instituições

- Explorer `/instituicoes` e Rede casas: `decideCommunityHouseDirectory` (serviço comunitário exige plano vigente). Ordenação explorer: `updatedAt` (recência de cadastro, **não** pagamento).
- `publicInstitutions`: todos Publicada+Autorizado, **sem** gate de serviço; sort plano pago. API órfã de rota, ainda pública.
- Mapa: coordenadas públicas sem gate de plano.

Classificação da ordenação paga: **dívida + risco semântico**. Não é ranking da Home. **Não** é regra comercial válida para “posição editorial”. Pode permanecer como identificação **se** a ordem deixar de privilegiar pagamento.

---

## 12. Produção → publicação → Home

```
Production (Planejada…Concluída)
  → editorialReady (CMS / operação; ≠ publicado)
  → publicationId ligado + CMS publica (status Publicada, isPublic)
  → portalAuthorizedPublications
  → Home somente se setFeatured / placement
```

Quem autoriza: profissional entrega mídia operacional (`publicationAllowed: false` no fluxo Rede); CMS autoriza acervo/publicação; Super Admin/editor coloca Home.

---

## 13. 5+1

Confirmado por unidade: `MAX_PHOTOS`/`MAX_MINICLIPS` em publicação; `productionMediaWithinLimit` na produção.  
**Inconsistência de exibição:** `getPublicProfessionalBySlug` aplica o mesmo cap no **conjunto** de mídias de várias publicações. Não é quota global de upload. Não existe `maxMediaPerProfessional` persistido.

Fotografia documental: cap de fotos da unidade, vídeo 0 no `recordPhotoCap` editorial.

---

## 14. Acervo

Armazenar ≠ exibir. Upload não publica (`publicationAllowed` + state + deletedAt + authorization).  
Alimenta publicação via `publicationMedia`; perfil via stories publicadas; Home fundo via flags; território via `taxonomyMedia`; licenciamento via lead (procedure CMS).  
Quarentena/lixeira: fora do portal. Revogação: unpublish, `publicationAllowed` false, consentimento Retirado, trash.

---

## 15. Originação

Originação ≠ visibilidade. Testes impedem `homePlacement` em `professionalOrigination.ts`. Sem coluna `originatedByProfessionalProfileId` (carimbo notes). Não altera diretório nem Home.

---

## 16. Segurança / privacidade

Backend é autoridade. Riscos:

- `publicInstitutions` / mapa sem predicado de serviço.
- `editorial.search` `total`/`hasMore` vs filtro comercial posterior.
- `publicBackgroundClip` por id numérico.
- Licença: UI pública / procedure CMS; check ignora `publicationAllowed`.
- Memória: `accessLevel` Público obrigatório — OK.
- Produção não publicada não entra no portal — OK se `publicationId` e status.
- Write-on-read: `expirePastInstitutionVisibilities` em GET público.

---

## 17. Escala (200 / 1k / 10k)

Hoje: `publicList` carrega **todos** os perfis visíveis e pagina em memória; `featured` 40 linhas; `publicTerritories` todas as taxonomias; search SQL paginado.  
Alvo: selectors por superfície, predicados compartilhados, paginação no SQL, curadoria humana como fila limitada, **sem** ranking. Cache de diretório alfa e de Home curada (invalidar no `publishEditorialEvent`). Sem consulta monolítica. Sem pré-cálculo de “score”.

---

## 18. Arquitetura atual vs alvo

**Atual:** predicados em `shared/territorialVisibility.ts` + selectors nos routers (`editorial.featured`, `networkDirectory`, `community.public*`) + curadoria CMS + produto comercial paralelo. Não há `VisibilityEngine`.

**Alvo (sem monólito):**

- `shared` policies: editorial portal, directory, commercial-identified, territorial filter, frequency (config).
- Selectors por superfície (Home, Rede, busca, agenda, memórias).
- CMS continua autoridade da Home.
- Testes de invariante: pagamento não altera ordem editorial; originação não altera diretório; 5+1 por unidade.

Autoridade da regra: TypeScript compartilhado + testes que leem o source dos routers. Quem chama: routers públicos. Evolução: adicionar selector, não classe Deus.

---

## 19. Componentes candidatos (só justificados)

| Candidato | Por quê | Não fazer |
| --- | --- | --- |
| Manter `territorialVisibility.ts` | já é o contrato | `VisibilityEngine.ts` |
| `sortDirectoryAlphabetical` usado também em instituições públicas | duplicação de ordem | score |
| Home selector isolado de SQL residual `sponsored` | auditoria | popularidade |
| Frequency policy in-memory | gancho já existe | tabela 6.0 |
| Alinhar `publicInstitutions` ao predicado **ou** deprecar a procedure | vazamento | pay-to-rank |

---

## 20. O que NÃO implementar (permanente nesta linha)

VisibilityEngine monolítico; ranking; geolocalização persistida; quota global de mídia; originação como boost; unificar executores nesta missão; migration de originação; alterar 5+1 de anexo; marketplace; pay-for-Home; feed `created_at` na Home; E2E gigante agora.

---

## 21. Decisões de produto necessárias

1. Unificar ou especializar `/fotografos` vs Rede.
2. Ordem de `/instituicoes` (recência vs alfa) vs selo pago.
3. Destino de `publicInstitutions` (deprecar vs alinhar predicado).
4. Miniclip comercial no hero: identificação obrigatória vs nunca substituir sequência editorial.
5. Hierarquia territorial (cidade/UF/nacional).
6. Janela de **exibição** do perfil (por produção vs colapso).
7. Home: 4 vs 6 cards; usar `territoryId` só com contexto declarado (nunca GPS silencioso).

## 22. Decisões jurídicas necessárias

1. Geolocalização do mapa: consentimento do browser vs “Ojú sabe o território do visitante” (hoje **não** sabe).
2. Memória oral pública vs compartilhar URL.
3. Licenciamento: quem pode solicitar (anônimo vs autenticado) e o que o ID de mídia revela.
4. Write-on-read de expiração de plano em GET público (efeitos colaterais em visita anônima).

---

## 23. Matriz de testes futura (não implementar agora)

- Publicado aparece / não publicado não.
- Quarentena, lixeira, revogado, expirado highlight (após automation) não na Home.
- Pagamento não altera ordem dos cards editoriais.
- Originação não altera `publicList`.
- Serviço sem plano não na Rede nem no explorer.
- `publicInstitutions` não deve ranquear (quando corrigido).
- 5+1 por unidade de upload; perfil não inventa quota global.
- Acervo privado não na busca.
- Comercial identificado (`activeAds`, selo plano).
- Diretório alfa, não popularidade.
- Território filtro explícito; visitante sem contexto vê curadoria nacional.

---

## 24. Missão 6.1 (encerrada)

Implementado: predicado único de casa nas APIs públicas; Home sem `sponsored` no SQL; destaque expirado fora da vitrine mesmo antes do job; fotógrafos via `decideExecutorPhotographerPage`; busca pagina o conjunto autorizado.

Permanecem decisões de produto/jurídicas: hero comercial, unificação de profissionais, janela de exibição 5+1 do perfil, licença anônima, diversidade/frequência.

---

*Auditoria 2026-09-09. Schema de código: journal até 0055 no repo; Aiven/Beta permanece 0053 por política do projeto.*
