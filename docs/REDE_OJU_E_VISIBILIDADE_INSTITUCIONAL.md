# Rede Ojú e visibilidade institucional

## Objetivo

A Ojú Mídia é uma plataforma documental e uma rede organizada de produção audiovisual. Administradores futuros não se tornam donos da marca: atuam como **parceiros administrativos da rede**, com conta individual, carteira delimitada, termo de responsabilidade assinado via gov.br e participação apenas nas operações que captam ou conduzem.

O modelo busca criar trabalho, proteger a qualidade e tornar a permanência na rede mais atrativa do que uma simples cobrança de assinatura. A Ojú deve crescer quando cria resultado para instituições, profissionais executores e parceiros administrativos, sem transformar a curadoria editorial em publicidade paga.

> **Contratação, visibilidade institucional e autorização editorial são camadas distintas.** Pagar pela presença institucional não compra publicação jornalística, destaque, aprovação editorial ou acesso a informações protegidas.

## Papéis econômicos

| Papel | Responsabilidade | Remuneração possível | Limite de atuação |
|---|---|---|---|
| Ojú Mídia | Marca, plataforma, proteção documental, curadoria, administração e governança | Parcela operacional definida na política vigente | Mantém controle das regras e da visão global pelo Super Admin |
| Administrador parceiro | Captação, relacionamento, proposta, acompanhamento e carteira própria | Participação de captação ou gestão registrada | Não define sozinho preço mínimo, pagamento do executor ou porcentagens fora da política |
| Profissional executor | Fotografia, vídeo, edição ou outra entrega efetivamente contratada | Parcela de execução definida no fechamento | Não recebe acesso administrativo por executar um trabalho |
| Instituição | Perfil documental e, opcionalmente, presença institucional renovável | Recebe a entrega e a visibilidade contratada | Não compra curadoria, não obtém acesso administrativo e mantém seus consentimentos separados |

## Dois modelos, duas regras

### 1. Produções e coberturas contratadas

Uma cobertura pode envolver três parcelas econômicas distintas: **execução**, **gestão/captação** e **operação da Ojú**. O exemplo de R$ 600 apresentado nos materiais é útil como ilustração de funcionamento, mas não deve virar uma tabela fixa publicada ou aplicada sem revisão de custo, impostos, deslocamento, duração, complexidade e contratação formal.

| Componente | O que remunera | Regra de governança |
|---|---|---|
| Executor | Quem realiza fotografia, vídeo, edição ou produção | Valor mínimo, percentual ou faixa definidos pela política comercial aprovada pelo Super Admin |
| Administrador parceiro | Captação, atendimento e gestão da operação | Participação registrada no fechamento e visível somente em sua carteira e no consolidado do Super Admin |
| Ojú Mídia | Marca, operação, tecnologia, curadoria, documentação e gestão | Parcela transparente, registrada no contrato e destinada conforme a política da rede |
| Fundo de rede | Desenvolvimento, capacitação, materiais, melhorias e expansão | Nunca apresentado como remuneração individual sem regra, registro e prestação de contas |

O exemplo que separa R$ 350 para executor e R$ 250 para operação precisa de uma definição adicional: **5% de qual base?** Cinco por cento de R$ 250 equivale a R$ 12,50; cinco por cento de R$ 600 equivale a R$ 30. Por isso, o sistema deve registrar sempre valor bruto, base de cálculo, valores absolutos e percentuais, em vez de guardar apenas a expressão “5%”.

### 2. Visibilidade institucional renovável

A modalidade já existente no projeto é diferente de uma cobertura. Não há profissional executor a remunerar; existe uma contribuição recorrente por presença institucional autorizada no portal. A regra atual é adequada para o piloto:

| Destino do valor líquido confirmado | Percentual atual | Finalidade |
|---|---:|---|
| Ojú Mídia | 50% | Operação, marca, infraestrutura, proteção e gestão da plataforma |
| Desenvolvimento e manutenção | 30% | Evolução técnica, materiais, capacitação e sustentabilidade da rede |
| Captação/atendimento | 20% | Participação do administrador que captou e acompanha a vigência |
| Reserva operacional | 20% quando não há captador | Protege a operação quando a vigência não é atribuída a um administrador |

Essa lógica já aparece no painel de **Visibilidade institucional**, que registra o administrador captador, a vigência, o recebimento, os valores líquidos e a distribuição. O administrador comum vê a própria carteira; o Super Admin vê o consolidado. A vigência expira automaticamente, sem retirar o perfil documental nem alterar a curadoria.

## Regras de proteção da rede

1. A participação do administrador nasce somente de uma captação ou gestão registrada na carteira. Não deve haver comissão por conteúdo editorial, por consentimento ou por dados comunitários.
2. A cada renovação deve ser preservado quem realizou o atendimento. Se a renovação for conduzida por outra pessoa, a regra precisa registrar essa troca antes do repasse.
3. Nenhum administrador pode alterar sozinho percentuais, preço mínimo, remuneração de executor ou regras de categoria. A política comercial é configurada e auditada pelo Super Admin.
4. Um administrador que também execute uma cobertura deve ter as duas funções registradas separadamente. A acumulação só pode ocorrer quando estiver clara no fechamento e dentro da política aprovada.
5. Valores de captação, operação e desenvolvimento não devem ser tratados como “saldo livre” sem situação de pagamento, referência de recebimento e trilha de auditoria.
6. A saída de um administrador remove acesso a carteiras e dados protegidos, mas preserva o histórico financeiro e contratual necessário à auditoria da Ojú.

## Camada implementada da Rede Ojú

O domínio passou a separar explicitamente o **profissional executor** do administrador da plataforma. `networkExecutors` mantém perfil profissional, especialidade, contato opcional e vínculo opcional com uma conta; nenhum desses campos concede acesso administrativo. A contratação pode receber um único `commercialClosings`, que armazena administrador responsável, executor, valor bruto opcional, política comercial e versão aplicada, percentuais copiados e situação conceitual.

| Elemento | Estado atual | Regra aplicada |
|---|---|---|
| Executor independente | Implementado | Pode ser cadastrado e associado à contratação sem receber papel administrativo. |
| Fechamento da contratação | Implementado, sem pagamento | Preserva valor e política/versionamento quando há política ativa; não cria transferência, nota fiscal ou liquidação. |
| Miniclip da contratação | Implementado | Um `activeRequestKey` único no banco permite somente um miniclip ativo por contratação; a substituição arquiva o anterior como `Substituído`. |
| Exposição na Home | Implementado | A Home prefere miniclip comercial ativo, autorizado e marcado para destaque; sem ele, mantém o miniclip editorial global vigente. |
| Revogação editorial | Implementado | Perda de autorização retira o miniclip comercial da Home e mantém o histórico privado. |

## Regras absolutas de mídia

Cada publicação agora segue o mesmo teto, independentemente de cobertura institucional, evento, história, projeto ou documentário: **até 5 fotografias e até 2 vídeos**. Fotografia documental continua aceitando somente fotos. A interface mostra os contadores “Fotos: _x_ de 5” e “Vídeos: _x_ de 2”, bloqueia anexos que excedam esse número, oculta ativos já vinculados do Acervo e permite remover o vínculo para liberar uma vaga. O servidor mantém a mesma verificação e o banco proíbe o mesmo ativo de ser vinculado duas vezes à mesma publicação.

Vídeos enviados pela interface têm duração lida no navegador para feedback imediato. Antes do armazenamento, o servidor lê os metadados binários do arquivo e rejeita vídeo inválido, sem duração confirmável ou acima de 60 segundos; a duração confirmada retorna à interface e é registrada no Acervo.

## Concorrência e sincronização

A edição de publicação usa a versão registrada no banco como trava otimista. O `UPDATE` só ocorre quando `id` e `version` ainda correspondem à versão vista pelo editor; se outra sessão salvar primeiro, a segunda recebe conflito, vê um aviso e pode recarregar a versão atual antes de continuar. As mutações de criação, edição, anexo, remoção de mídia e mudança de etapa continuam publicando eventos editoriais para que Admin e portal refaçam suas consultas.

## Evolução recomendada antes de escalar

O projeto deve evoluir a partir da política existente, sem substituir a regra atual por números rígidos espalhados pelo código. A próxima camada técnica precisa permitir que o Super Admin mantenha políticas versionadas por modalidade — por exemplo, visibilidade institucional, fotografia, vídeo, documentário ou cobertura extensa — e que cada fechamento receba uma cópia imutável da regra aplicada naquele momento.

| Evolução | Resultado esperado |
|---|---|
| Política comercial versionada | Percentuais e faixas definidos por modalidade, vigência e aprovação do Super Admin |
| Situação de repasse por participação | Diferencia pendente, parcial e pago para administrador e executor |
| Renovação atribuída | Registra quem acompanhou cada ciclo mensal ou anual de visibilidade |
| Fechamento com papéis separados | Distingue captador, administrador responsável, executor e Ojú sem duplicar remunerações |
| Prestação de contas do fundo de rede | Permite ao Super Admin registrar aplicação do valor destinado a desenvolvimento e manutenção |
| Repasse de executor | Define parcela, documento, situação e comprovante do executor após validação jurídica e contábil |

## Limite jurídico e fiscal

Antes de operar valores reais em escala, a Ojú deve definir com advogado e contador brasileiros quem contrata o cliente, quem presta o serviço, quem emite documento fiscal, como são feitos os repasses e qual é a natureza jurídica de cada participação. O modelo acima é uma regra operacional e econômica; ele não substitui contrato, orientação trabalhista, tributária ou societária.
