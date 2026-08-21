# Central de Pendências Operacionais

## Objetivo

A Central de Pendências Operacionais é a fila unificada do Centro Administrativo da Ojú. Ela não cria uma segunda base de dados nem substitui os módulos editoriais, comerciais, comunitários ou financeiros. Ela organiza registros reais que já exigem uma decisão, um prazo ou continuidade de trabalho e direciona a pessoa responsável para o fluxo de origem.

O acesso está disponível em **Centro Administrativo → Pendências** e também é destacado no Painel Central. A lista é atualizada periodicamente, sem gerar alertas fictícios ou estados paralelos.

## Fontes reais monitoradas

| Frente | Pendência identificada | Ação de continuidade |
|---|---|---|
| Editorial | Publicação em revisão ou item na Lixeira Editorial. | Revisar conteúdo ou operar a lixeira. |
| Acervo | Upload pronto ainda sem aprovação ou rejeição. | Aprovar ou rejeitar no Acervo. |
| Comercial | Solicitação, proposta, aceite ou entrega em etapa aberta. | Abrir Solicitações. |
| Autorização | Autorização editorial pendente ou termo aguardando gov.br. | Registrar decisão ou anexo assinado. |
| Financeiro | Pedido de reembolso solicitado, em análise ou aprovado. | Avaliar e compensar conforme a política ativa. |
| Contratos | Contrato em rascunho ou enviado. | Concluir a gestão contratual. |
| Curadoria | Sugestão territorial de destaque aguardando decisão nacional. | Super Admin decide na Curadoria. |
| Comunidade | Instituição, agenda ou memória com consentimento ou revisão pendente. | Abrir o fluxo comunitário correspondente. |
| Visibilidade | Plano institucional vencido ou próximo do vencimento. | Abrir Visibilidade institucional. |
| Acolhimento | Pedido reservado recém-recebido ou em acolhimento. | Abrir Notificações de acolhimento; a Central nunca exibe contato ou relato reservado. |
| Governança | Administrador autorizado sem termo de responsabilidade assinado via gov.br. | Abrir Colaboradores. |

## Prioridades

| Nível | Uso |
|---|---|
| **Crítica** | Exige decisão prioritária, por exemplo prazo vencido, termo aguardando assinatura, reembolso aprovado ou acolhimento recém-recebido. |
| **Atenção** | Requer trabalho editorial, aprovação, revisão, consentimento ou acompanhamento comercial. |
| **Acompanhamento** | Registros ainda dentro de prazo, mas que devem permanecer visíveis, como item na lixeira em retenção ou contrato em rascunho. |

## Escopo e proteção de dados

O Super Admin recebe a visão global. Para administradores territoriais, itens vinculados a Parceiro Ojú somente entram na Central quando o membro possui vínculo ativo com o parceiro e território autorizado. Recursos centrais sem parceiro aparecem apenas para o responsável registrado. Essa regra é aplicada no backend; ocultar menus no navegador não é considerado controle de autorização.

Pedidos de acolhimento são apresentados sem nome, contato, protocolo ou texto sensível. A pessoa autorizada deve abrir o módulo de acolhimento para consultar informações reservadas.

## Validação

A Central foi validada com TypeScript sem erros e a suíte completa passou com **61 arquivos de teste e 147 testes**. A revisão visual confirmou que o Painel Central apresenta o resumo de pendências e que cada item da fila direciona ao módulo correspondente.
