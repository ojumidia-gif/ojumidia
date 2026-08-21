# Guia Operacional — Parceiros Ojú e Escopo Territorial

## Finalidade

Esta camada permite que a Ojú expanda sua rede sem perder a governança central. **Parceiro Ojú** é uma entidade operacional própria: não substitui Instituição, anunciante, contratante, profissional executor ou conta administrativa. Sua função é definir quem pode operar quais territórios e criar uma trilha rastreável para conteúdos, mídias e oportunidades comerciais novos.

> Registros históricos não são classificados automaticamente. Enquanto não receberem uma associação explícita, permanecem vinculados à **Operação Central Ojú**.

## Sequência segura de ativação

O Super Admin deve abrir **Centro Administrativo → Parceiros Ojú** e criar o registro inicialmente como **Rascunho**. Em seguida, deve associar pelo menos um território existente e uma conta administrativa previamente autorizada. Somente então o parceiro pode ser ativado. A tela não cria novos usuários; a autorização de conta Google e a assinatura do termo de responsabilidade continuam no fluxo de Colaboradores.

| Etapa | Ação do Super Admin | Proteção aplicada |
|---|---|---|
| 1. Criar | Registrar nome, identificador e descrição interna | O parceiro nasce em rascunho, sem visibilidade pública. |
| 2. Delimitar | Adicionar territórios já cadastrados na taxonomia | Um território só pode ser usado se estiver autorizado para o parceiro. |
| 3. Autorizar | Associar uma conta administrativa e papel operacional | A conta continua sujeita ao papel administrativo, ao termo via gov.br e à revogação. |
| 4. Ativar | Alterar estado para Ativo | A ativação exige território autorizado. |
| 5. Contextualizar | Marcar identidade pública apenas se houver decisão editorial | A identidade aparece somente em perfis territoriais publicados, nunca na Home nacional. |

## Operação dos administradores parceiros

Um administrador associado cria Instituição, Agenda ou Memória pela tela Comunitária selecionando o parceiro e o território autorizado. O servidor valida o papel, a associação ativa, o parceiro e o território. A interface facilita a seleção, mas não é a barreira de segurança: a verificação é repetida no backend.

Os limites documentais permanecem invariáveis: até **5 fotos**, até **2 vídeos curtos de 60 segundos** e miniclipe conforme a regra de contratação. O upload cria uma sessão rastreável e um arquivo no Acervo; isso não torna a mídia pública. Publicação continua dependente de direitos, consentimento, fluxo editorial e curadoria aplicável.

## Distribuição comercial

Uma solicitação pública nasce sem parceiro e sem território, na guarda da Ojú. O Super Admin deve distribuí-la definindo parceiro, território e responsável. Depois dessa distribuição, um administrador só pode assumir ou alterar a oportunidade se estiver no escopo territorial ativo. Essa regra evita concorrência entre parceiros sobre a mesma captação.

As percentagens comerciais, os valores registrados e os snapshots de política não são modificados por essa camada. Qualquer alteração financeira continua sob as políticas comerciais e a governança já existentes.

## Curadoria e visibilidade pública

A Home, seus destaques e o fundo vivo continuam sob responsabilidade do **Super Admin**. Parceiros podem ter identidade contextual em perfis institucionais ou comerciais publicados quando `identidade pública contextual` estiver ativa e o parceiro estiver ativo. A rede não aparece como uma sequência de logos ou anunciantes na página inicial.

| Situação | Resultado no portal |
|---|---|
| Parceiro em rascunho, suspenso ou arquivado | Não é exposto publicamente. |
| Parceiro ativo sem identidade pública | Opera no backend, sem crédito público de parceiro. |
| Parceiro ativo com identidade pública | Pode aparecer apenas junto de perfil territorial publicado e consentido. |
| Instituição, serviço ou mídia sem consentimento | Permanece fora das consultas públicas. |

## Segurança, concorrência e auditoria

Atualizações críticas de Parceiro Ojú e solicitações distribuídas usam versionamento otimista. Se outra pessoa alterar o mesmo registro antes da confirmação, a operação retorna conflito em vez de sobrescrever dados silenciosamente. Ações de distribuição, escopo e upload ficam registradas na trilha de auditoria. O Acervo valida autoria ou parceiro antes de aceitar alterações e exclui mídias removidas das consultas públicas.

## Revisão antes do uso em produção

Antes de ativar o primeiro parceiro real, confirme que a conta Google foi autorizada individualmente, que o termo de responsabilidade via gov.br foi anexado quando o papel exigir, que o território existe e que a identidade pública tem aprovação editorial. Para uma oportunidade comercial, também confirme quem é o responsável pela carteira e se a autorização de publicação permanece separada da contratação.

## Referências internas

- [Modelo de dados e migrations](../drizzle/schema.ts)
- [Guarda de parceiro e território](../server/partnerScope.ts)
- [Gestão administrativa de parceiros](../client/src/pages/admin/PartnersAdmin.tsx)
- [Auditoria de arquitetura](AUDITORIA_MULTIADMIN_PARCEIROS_TERRITORIOS.md)
- [Plano de evolução](PLANO_EVOLUCAO_MULTIADMIN_PARCEIROS.md)
