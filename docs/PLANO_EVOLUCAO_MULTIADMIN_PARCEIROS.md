# Plano de evolução controlada — Parceiro Ojú, escopo territorial e multiadmin

**Estado:** proposta técnica para aprovação. Este documento **não implementa** entidades, migrations, rotas ou mudanças de permissão. Ele foi escrito a partir da auditoria técnica do código atual e preserva os módulos que já funcionam.

> **Princípio de implementação:** a Ojú continua uma plataforma nacional única. Parceiros não recebem sites, bancos, domínios ou marcas independentes. Eles recebem autonomia operacional delimitada por parceiro, território e permissão; a Ojú mantém identidade institucional, curadoria nacional, políticas globais e governança financeira.

## 1. Decisão arquitetural proposta

Em vez de duplicar administradores, taxonomias, publicações ou carteiras, a proposta é acrescentar uma camada de escopo sobre as entidades existentes. O parceiro passa a ser uma entidade operacional explícita, distinta de Instituição, Executor, Colaborador e Anunciante.

```text
Usuário
  └── Papel global existente
        └── Associação de membro ao Parceiro Ojú
              └── Territórios autorizados
                    └── Recursos sob escopo (conteúdo, mídia, contratação, comunidade)
```

O papel existente continua definindo **o tipo de ação** que alguém pode praticar. A associação ao parceiro e ao território passa a definir **onde e sobre qual recurso** essa ação pode ocorrer. O Super Admin mantém o bypass controlado e a visão global.

## 2. Entidades propostas, sem duplicação

| Entidade proposta | Finalidade | Reutiliza | Não substitui |
|---|---|---|---|
| `partners` | Perfil operacional do Parceiro Ojú: nome, slug, apresentação, mídia autorizada, contato, status e regras de exibição | `mediaAssets`, taxonomias e usuários | Instituições, `networkExecutors`, anúncios ou conteúdo institucional global |
| `partnerTerritories` | Muitos territórios autorizados por parceiro | Taxonomias de dimensão `Território` | Coluna de texto com estado/cidade hardcoded |
| `partnerMembers` | Vínculo de usuário a parceiro, função operacional e status | `users`, `collaboratorAccessGrants` e termos atuais | Papel global do usuário |
| `partnerResourceScope` ou campos `partnerId` | Identificar o parceiro responsável por recurso novo ou migrado | Publicações, mídia, solicitações, contratos, leads e comunidade | `managedByUserId`, que continua como carteira individual |
| `auditEvents` transversal | Registrar ação, ator, parceiro, território, recurso, antes/depois e resultado | Atividades editorial/comercial existentes | Logs específicos já existentes |

### Campos mínimos sugeridos para `partners`

| Campo | Regra |
|---|---|
| `id`, `slug`, `displayName` | Identificação interna e pública única. |
| `status` | `Rascunho`, `Em revisão`, `Ativo`, `Suspenso`, `Arquivado`. |
| `description`, `contactText`, `specialties` | Dados contextuais, não substituem a comunicação institucional da Ojú. |
| `logoMediaId`, `profileMediaId` | Apenas mídias ativas e autorizadas do Acervo. |
| `createdBy`, `approvedBy`, `createdAt`, `updatedAt` | Governança e autoria. |
| `publicVisibility` | Impede publicar perfil de parceiro sem revisão/consentimento. |

Não há qualquer proposta de criar `partnerCaio.ts`, páginas por estado, tabelas por cidade ou domains por parceiro.

## 3. Guard central de autorização proposto

Antes de alterar routers individuais, será criado um helper de servidor reutilizável, em arquivo novo e testável, com um contrato semelhante a:

```text
assertResourceScope({
  actor,
  action,
  resource,
  partnerId,
  territoryIds,
  ownerUserId
})
```

O helper não substituirá validações existentes de estado editorial, contrato, consentimento ou carteira. Ele as complementará na ordem abaixo:

```text
Sessão ativa
  ↓
Papel global permite a ação?
  ↓
Usuário está ativo no parceiro?
  ↓
Parceiro possui o território do recurso?
  ↓
Recurso pertence ao parceiro/escopo ou é central?
  ↓
Regra específica do módulo permite a transição?
```

| Situação | Comportamento proposto |
|---|---|
| Super Admin | Acesso global auditado, preservando os controles críticos já existentes. |
| Administrador sem parceiro ativo | Mantém a operação atual de carteira até ser associado; não recebe escopo territorial por inferência. |
| Admin territorial | Somente recurso próprio ou do parceiro, com interseção territorial válida. |
| Editor/aprovador parceiro | Apenas ações delegadas pelo papel global e pelo escopo de membro. |
| Conteúdo sem território aplicável | Permanece central ou exige classificação explícita antes de publicação territorial. |

## 4. Ordem de implementação proposta

### Fase A — segurança estrutural e baseline

**Objetivo:** introduzir o conceito de escopo sem migrar dados nem mudar comportamento de administradores existentes.

1. Criar testes de caracterização das permissões atuais de editorial, comercial, comunidade, Acervo, rede e colaboradores.
2. Criar helper de escopo ainda sem ser aplicado como bloqueio, apenas em modo de diagnóstico/auditoria para o Super Admin.
3. Inventariar recursos existentes sem `partnerId` e classificá-los como operação central até associação explícita.
4. Definir política de migração e rollback antes de qualquer coluna obrigatória.

**Resultado:** nenhum admin perde acesso, mas o sistema passa a identificar quais rotas dependem de carteira, papel e território.

### Fase B — Parceiro Ojú e território autorizado

**Objetivo:** criar a estrutura de dados mínima, sem alterar conteúdo existente.

1. Migration aditiva para `partners`, `partnerTerritories` e `partnerMembers`.
2. Painel exclusivo do Super Admin para criar parceiro em rascunho, selecionar territórios existentes, selecionar mídias do Acervo e convidar membros já autorizados.
3. Nenhuma logo aparece na Home. O perfil só pode aparecer em página contextual de Parceiros, rota territorial ou crédito relacionado após aprovação.
4. O parceiro não pode mudar marca Ojú, políticas, domínio, configurações globais nem membros de outro parceiro.

**Resultado:** um parceiro pode existir formalmente sem assumir ainda conteúdos, contratos ou clientes históricos.

### Fase C — associação gradual de recursos e isolamento territorial

**Objetivo:** aplicar o escopo primeiro em recursos novos e, depois, migrar somente registros confirmados.

1. Adicionar `partnerId` **nulo e indexado** a recursos selecionados: Publicações, Mídias, Solicitações Comerciais, Contratos, Leads de Receita, Instituições, Eventos e Memórias.
2. Manter registros históricos com `partnerId = null` como operação central Ojú.
3. Ao criar recurso no contexto de parceiro, exigir território autorizado quando ele for territorial.
4. Aplicar `assertResourceScope` aos routers começando por Comercial, Comunidade e Acervo; depois Editorial e Rede Ojú.
5. Criar tela de contexto administrativo: “Ojú Mídia · Parceiro Ojú X · Territórios Y”, sem permitir troca casual de contexto.

**Resultado:** novos recursos territoriais já nascem isolados; não há backfill automático ou atribuição inferida de registros antigos.

### Fase D — curadoria, identidade e portal público

**Objetivo:** manter a Home nacional limpa e mostrar parceiro apenas quando fizer sentido.

1. Reservar a curadoria da Home nacional ao Super Admin ou a uma delegação de curadoria explícita, nunca por simples papel de administrador territorial.
2. Exibir identificação de Parceiro Ojú apenas em página de parceiro, rota territorial, crédito de conteúdo ou operação regional aprovada.
3. Não criar parede de logos, banners automáticos ou menu nacional por parceiro.
4. Resolver parceiro contextual por `partnerId` do conteúdo e território, nunca por estado/cidade hardcoded.

**Resultado:** identidade Ojú central e reconhecimento regional sem poluição visual.

### Fase E — monetização, auditoria e concorrência

**Objetivo:** adaptar a operação comercial sem redefinir os percentuais por suposição.

1. Versionar o vínculo entre fechamento comercial, parceiro responsável, executor e política comercial aplicada.
2. Manter percentuais já persistidos como snapshot histórico; novas regras só passam a valer mediante política comercial criada e ativada pelo Super Admin.
3. Criar auditoria transversal para alterações críticas de escopo, parceiro, território, comissão, repasse, contrato e mídia.
4. Estender bloqueio otimista às transições editoriais e ações sensíveis que ainda dependem apenas do estado atual.
5. Adicionar idempotency key e checksum ao upload antes de crescimento de volume; somente avaliar fila após métricas de latência/falha justificarem infraestrutura adicional.

**Resultado:** monetização parametrizável e rastreável sem alterar retroativamente contratos, anúncios ou repasses existentes.

## 5. Migrations condicionais

Nenhuma migration será criada antes da aprovação. A ordem proposta é exclusivamente aditiva e reversível:

| Ordem | Migration futura | Alteração | Risco controlado |
|---|---|---|---|
| 1 | Parceiros base | Criar `partners`, `partnerTerritories`, `partnerMembers` | Não toca dados atuais. |
| 2 | Escopo opcional | Adicionar `partnerId` anulável e índices aos recursos aprovados | Todos os dados existentes permanecem como operação central. |
| 3 | Auditoria transversal | Criar `auditEvents` e índices por parceiro/território/recurso | Complementa logs atuais. |
| 4 | Concorrência/upload | Idempotência de upload e versão nas transições necessárias | Deve ser testada por cenário de conflito. |
| 5 | Integridade gradual | Só após backfill manual aprovado, considerar validações mais rígidas | Nunca sem inventário e rollback. |

O rollback de cada etapa é: desativar a aplicação do guard por feature flag ou configuração interna, preservar `partnerId` nulo, suspender parceiros sem apagar dados e restaurar o checkpoint anterior para código. Migrações aditivas não devem ser removidas em produção sem um plano específico de dependência e dados.

## 6. Arquivos candidatos a alteração, após aprovação

| Área | Arquivos atuais candidatos | Tipo de mudança |
|---|---|---|
| Schema e migrations | `drizzle/schema.ts`, novas migrations | Somente adições aprovadas. |
| Autorização | novo helper em `server/`, `server/_core/trpc.ts` apenas se necessário | Guard reutilizável, sem fragilizar procedures existentes. |
| Colaboradores | `server/routers/collaborators.ts` | Associação de membro a parceiro, sem alterar papel global por inferência. |
| Editorial | `server/routers/editorial.ts` | Escopo territorial e curadoria nacional. |
| Acervo/upload | `server/routers/media.ts`, `server/_core/index.ts` | Escopo, idempotência e trilha de mídia. |
| Comercial/Rede | `server/routers/commercial.ts`, `server/routers/network.ts`, `server/financialGovernance.ts` | Parceiro responsável e snapshot de política. |
| Comunidade | `server/routers/community.ts` | Escopo territorial e de parceiro sem perder consentimentos. |
| Interface administrativa | `client/src/pages/admin/*`, `client/src/App.tsx` | Contexto operacional e gestão exclusiva do Super Admin. |
| Portal público | páginas territoriais, conteúdo e perfil de parceiro novos | Identidade contextual, nunca na Home global por padrão. |
| Testes | `server/**/*.test.ts`, `client/**/*.test.ts` | Casos de negação de escopo, concorrência e regressão. |

## 7. Decisões que exigem validação do titular antes do código

1. **Nome operacional:** usar “Parceiro Ojú” como entidade formal é aprovado?
2. **Membro de parceiro:** um administrador poderá atuar em mais de um parceiro e em quais condições?
3. **Recursos centrais:** publicações e mídias históricas sem parceiro devem permanecer como “Operação Ojú Central” até reclassificação manual?
4. **Curadoria nacional:** somente o Super Admin terá destaque na Home, ou haverá uma delegação explícita de curador nacional?
5. **Comissão:** o percentual desejado é por parceiro, por executor, por serviço, por política global ou combinação? A regra jurídica e contábil deverá ser validada antes de virar política ativa.
6. **Dados privados:** parceiros poderão acessar apenas solicitações captadas por eles, ou também oportunidades no seu território ainda não atribuídas? Esta decisão muda a regra de claim de carteira.
7. **Identidade pública:** parceiros aprovados terão página pública própria desde o lançamento ou apenas identificação contextual em conteúdos e territórios?

## 8. Critério de entrada para implementação

Só iniciar a Fase A após aprovação explícita deste plano e das sete decisões anteriores. A primeira entrega não criará automaticamente centenas de parceiros nem migrará registros existentes; ela entregará segurança estrutural, testes de negação de acesso e gestão controlada pelo Super Admin. Ao fim de cada fase, serão executados compilação, testes, validação de rotas administrativas e públicas, verificação de upload, publicação, permissões e regressão visual.

## Referências internas

[1]: AUDITORIA_MULTIADMIN_PARCEIROS_TERRITORIOS.md "Diagnóstico técnico e matriz de riscos"
[2]: ../drizzle/schema.ts "Entidades existentes que a proposta reutiliza"
[3]: ../server/routers/commercial.ts "Carteira e autorização comercial atuais"
[4]: ../server/routers/community.ts "Carteira comunitária e território existente"
[5]: ../server/routers/editorial.ts "Ciclo editorial e bloqueio otimista existente"
[6]: ../server/routers/media.ts "Acervo e regras de mídia existentes"
