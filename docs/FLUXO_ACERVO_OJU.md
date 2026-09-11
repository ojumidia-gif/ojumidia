# Fluxo do Acervo Ojú

O Acervo interno (`/admin/midias`) é a área operacional de gestão de `mediaAssets`. Não é portfólio, galeria pública, marketplace, feed, ranking nem depósito de conteúdo. A mídia pode permanecer sem vínculo. Ligar a um conteúdo não publica, não altera a Home, não altera curadoria, monetização nem o modelo econômico.

**O vínculo não é um estado da mídia. O vínculo é uma relação derivada dos objetos que utilizam a mídia.**

A página pública `/acervo` é busca do que já foi publicado com consentimento. Não é o CMS.

## Onde está a mídia?

No Acervo interno, enquanto `deletedAt` for nulo. Na Lixeira, quando `deletedAt` está preenchido. Expurgada, quando o Super Admin concluiu `media.purge` (metadado e objeto removidos).

## Situação (estados derivados)

Não existe coluna `linked`. A UI deriva a situação de `state`, `deletedAt` e `media.usages`:

| Situação | Condição | Significado |
|---|---|---|
| Ainda sem conteúdo | `Ativo` e nenhum uso | Estado válido. Pronta para ligar, se autorizada. |
| Ligada a conteúdo | `Ativo` e um ou mais usos | Relação derivada (publicação, produção da Rede ou outros usos existentes). |
| Fora de uso | `Arquivado` e não está na lixeira | Deixa de estar disponível para novos usos. Continua armazenada. Pode ser reativada. |
| Na lixeira | `deletedAt != null` | Super Admin. Distinto de fora de uso. |
| Expurgada | registro inexistente | Irreversível. |

Não usar as palavras órfã, orphan, sem dono ou não vinculada para descrever mídia ainda sem conteúdo.

## Ações

- **Editar dados** (`media.update`): só metadados. Não cria vínculo, não publica, não altera `storageKey` nem `uploadId`. Depois de salvar, permanecer no Acervo é correto; a próxima ação possível é ligar a um conteúdo. O campo “Nota de contexto” é texto livre (`projectCoverage`), não relacionamento.
- **Ligar a um conteúdo**: corte mínimo = publicação editorial (`editorial.attachMedia`) ou Produção da Rede (`productions.attachMedia`). O picker lista destinos que o ator já pode editar; o servidor revalida autenticação, papel, partner, território, autoria, status da mídia, autorização, `publicationAllowed`, aprovação, 5+1 e guards específicos. Tentativa F12 com IDs cruzados continua DENY.
- **Retirar de uso** (`media.archive`): `Ativo` → `Arquivado`. Se `canPubliclyReleaseMedia` for verdadeiro, a ação é bloqueada: *“Esta mídia está sendo utilizada por conteúdo publicado. Remova ou substitua o vínculo antes de retirá-la de uso.”* Sem unlink silencioso, troca automática ou 404 público.
- **Reativar** (`media.reactivate`): respeita existência do objeto no storage.
- **Enviar à lixeira** (`media.delete`): Super Admin. `deletedAt` + `Arquivado`. Não é retirar de uso.
- **Restaurar**: volta para Arquivado (fora de uso), não para Ativo.
- **Expurgar**: Super Admin. Exige lixeira, confirmação, zero usos (incluindo `networkProductionMedia`) e demais guards.

## 5+1

Publicação e Produção da Rede: no máximo 5 JPG + 1 miniclip. Link externo não entra na contagem. A UI mostra ocupação antes da confirmação; o backend continua sendo a autoridade.

## Autoria, território e RBAC

Reutiliza `assertMediaScope`, `assertPublicationScope`, `assertPartnerScope`, `canAccessOwnOperatorRecord`, `canEditPublication`, `decideProductionMediaAttachAccess` e `publicationAllowed`. Visitante não executa ação administrativa. Profissional e admin territorial permanecem no próprio escopo. Super Admin permanece global conforme o RBAC atual.

## media.usages e purge

`collectMediaUsages` inclui `publicationMedia`, taxonomias, marcas de parceiro, instituições, agenda, memórias, miniclips comerciais, leads e **`networkProductionMedia`**. Purge recusa mídia ainda usada por Produção da Rede. A UI do Acervo responde “esta mídia está sendo usada onde?” sem expor `storageKey`, checksum ou `uploadId`.

## publicationAllowed (não é autorização completa)

`publicationAllowed` é um boolean gravado em `mediaAssets`. Significa: **o operador marcou que aquela mídia pode ir a uma publicação editorial**. Não publica sozinho, não coloca na Home e não substitui curadoria.

É **permissão parcial**. O attach editorial só passa se, **na linha do servidor**, todos estes guards forem verdadeiros:

1. `publicationAllowed === true` (lido do banco; o payload de `attachMedia` nem aceita esse campo);
2. `state === Ativo` e `deletedAt` nulo (implícito no fluxo ativo);
3. `uploadStatus` em `Aprovado` ou `Publicado`;
4. o ator pode editar a publicação (`canEditPublication` + `assertPublicationScope`);
5. autoria (`canAccessOwnOperatorRecord`, Super Admin vê o site inteiro);
6. mesmo `partnerId` quando a publicação tem parceiro;
7. limite 5+1 (`canAttachWithinMediaLimit`).

O enum `authorization` (`Cessão`, `Licença`, `Domínio público`, `Autoral própria`, `Pendente`) é metadado de base jurídica. **Não é o gate de attach.** Se `authorization` está `Pendente` e `publicationAllowed` é `true`, o attach editorial atual **permite** — porque o domínio escolheu o boolean como declaração explícita de permissão de publicação. Não é bypass: `publicationAllowed: false` continua DENY, mesmo com payload F12 tentando mandar `true`.

`canPubliclyReleaseMedia` também exige `publicationAllowed` e `state === Ativo`. Capa pública no portal filtra o mesmo boolean.

**Produção da Rede:** `productions.attachMedia` **não** exige `publicationAllowed`. A produção é operacional e privada; publicação no portal continua dependente de autorização e curadoria. Não acoplar a regra editorial nesse attach.

## Dívida UX (fora desta missão)

Profissional da Rede ainda informa o ID numérico da mídia em Produções. O backend valida o ID (`decideProductionMediaAttachAccess`, escopo, 5+1). Cross-scope continua DENY. Não há listagem de Acervo para o papel profissional (`media.list` exige admin).
