# Lixeira Editorial e expurgo definitivo

## Finalidade

A **Lixeira Editorial** é a etapa de retenção para uma publicação que o Super Admin removeu do portal. A exclusão lógica desativa imediatamente sua exibição pública e preserva, durante uma janela curta, a possibilidade de retorno controlado. Essa regra não substitui o Acervo nem altera os arquivos de mídia originais; ela trata exclusivamente da publicação editorial e dos seus vínculos.

| Evento | Ação no sistema | Visibilidade | Auditoria |
|---|---|---|---|
| Enviar para lixeira | A publicação passa a `Arquivada`, recebe `deletedAt` e sai do portal. | Pública: removida imediatamente. Administrativa: visível na Lixeira. | Registra ator, motivo, versão e prazo de restauração. |
| Restaurar até 24 horas | Remove `deletedAt` e devolve a publicação como `Arquivada` e privada. | Continua fora do portal até nova publicação editorial. | Registra a restauração e quem a realizou. |
| Expurgo manual | Super Admin digita o título exato para confirmar a exclusão definitiva. | Remove a publicação, seus vínculos editoriais, taxonomias, relações e sugestões de destaque. | O evento central permanece guardado. |
| Expurgo automático | Rotina publicada localiza itens com mais de 24 horas na lixeira. | Mesmo efeito do expurgo manual. | Identifica a execução automática e os IDs processados. |

> **Atenção:** a exclusão definitiva é irreversível. Ela remove o registro editorial, não os arquivos de mídia do Acervo. A trilha de auditoria permanece para investigação e governança.

## Uso no Centro Administrativo

O caminho é **Centro Administrativo → Lixeira Editorial**. A entrada é visível somente ao Super Admin. Cada item informa tipo, título, responsável pela exclusão, momento da exclusão e contador até o término da janela de 24 horas.

Enquanto o prazo estiver ativo, a ação **Restaurar** retorna o conteúdo ao estado arquivado e privado. A ação **Excluir definitivamente** exige que o Super Admin digite o título integral da publicação. Depois do prazo, a restauração é bloqueada no backend; o item pode aguardar o expurgo periódico ou receber expurgo manual confirmado.

## Ativação do expurgo automático em produção

O projeto já possui o callback seguro `POST /api/scheduled/editorial-trash-purge`. Ele autentica chamadas de cron, executa de forma idempotente e expurga somente registros cujo `deletedAt` tenha ultrapassado 24 horas.

Por segurança, o cron **não deve ser um processo dentro da aplicação**. No Render, use um Cron Job autenticado com `EDITORIAL_TRASH_CRON_SECRET` apontando para `POST /api/scheduled/editorial-trash-purge`. Exemplo:

```bash
curl -X POST "$OJU_PUBLIC_BASE_URL/api/scheduled/editorial-trash-purge" \
  -H "Authorization: Bearer $EDITORIAL_TRASH_CRON_SECRET"
```

O comando deve ser executado somente após a publicação do servidor. No Render, use o Cron Job documentado em `docs/RENDER_DEPLOY.md`. Não use temporizadores no processo da aplicação, como `setInterval` ou bibliotecas de cron locais: ambientes escaláveis podem suspender instâncias e não oferecem execução confiável nesses mecanismos.

## Salvaguardas implementadas

| Salvaguarda | Implementação |
|---|---|
| Prazo fechado | `24 × 60 × 60 × 1000` milissegundos, calculados a partir de `deletedAt`. |
| Restauração bloqueada após prazo | O backend recusa a mutation `restore` quando a janela expirou. |
| Exclusão manual protegida | Apenas Super Admin; confirmação exige título exato. |
| Expurgo idempotente | Somente registros ainda marcados como excluídos e vencidos entram no processamento. |
| Mídia preservada | Arquivos do Acervo não são apagados automaticamente junto da publicação. |
| Auditoria preservada | O evento de expurgo é gravado antes da remoção do registro editorial. |

## Validação atual

O projeto foi validado com TypeScript sem erros e uma suíte de **60 arquivos e 146 testes**. A interface administrativa foi revisada no navegador com uma publicação efetivamente presente na lixeira, exibindo o contador de restauração e as ações protegidas.
