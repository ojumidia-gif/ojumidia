# Matriz de cobertura administrativa do conteúdo público

**Atualizada em 21 de agosto de 2026.** Esta matriz descreve os fluxos efetivamente disponíveis no projeto Ojú Mídia. Ela separa conteúdo documental, presença comunitária e visibilidade comercial para que nenhuma contratação substitua consentimento, curadoria ou autorização editorial.

> **Princípio operacional:** uma publicação comercial ou institucional não é curadoria documental. Todo item só alcança o portal quando possui a etapa de publicação correta, consentimento aplicável e ausência de remoção na lixeira auditável.

| Área pública | Entrada administrativa | Editar e pré-visualizar | Publicar e despublicar | Arquivar, remover e restaurar | Regras de visibilidade |
|---|---|---|---|---|---|
| Histórias, Coberturas, Documentários, Projetos e Fotografia documental | `/admin/publicacoes` | Editor de publicação e prévia individual | Ciclo editorial por status; republicação quando apropriada | Arquivamento para a equipe; lixeira e restauração exclusivas do Super Admin | Publicação exige o estado editorial adequado; autorizações comerciais são verificadas quando aplicáveis |
| Mídias e Acervo editorial | Editor da publicação, Acervo e painel de mídia | Metadados, crédito, direitos, capa e vínculo revisáveis | A mídia não se torna pública isoladamente; acompanha a publicação elegível | Remoção do vínculo preserva o item de mídia e seus direitos | Limites de até cinco fotos e dois vídeos de até sessenta segundos por registro documental |
| Territórios e taxonomias | `/admin/taxonomias` ou `/admin/territorios` | Edição de descrição, relações e referência territorial | Não constitui publicação editorial isolada; alimenta filtros e relações | Exclusão do item não apaga conteúdos vinculados; vínculos de mídia podem ser removidos | Coordenadas públicas exigem autorização; referências aproximadas e não divulgadas permanecem protegidas |
| Instituições e perfis comunitários | `/admin/nova-instituicao` e `/admin/comunidade` | Editor comunitário; dados, contato, consentimento e local revisáveis | Publicar e despublicar por ação explícita; publicação exige consentimento autorizado | Arquivar pela carteira; lixeira e restauração exclusivas do Super Admin | Consulta pública exige status publicado, consentimento autorizado e ausência de `deletedAt` |
| Agenda comunitária | `/admin/comunidade` | Editor de evento; data, local, descrição e consentimento revisáveis | Publicar e despublicar por ação explícita; publicação exige consentimento autorizado | Arquivar pela carteira; lixeira e restauração exclusivas do Super Admin | A agenda exibe somente eventos futuros publicados, autorizados e fora da lixeira |
| Memórias orais | Upload administrativo, revisão de memória e `/admin/comunidade` | Transcrição e resumo assistidos passam por revisão humana; narrativa e nível de acesso são editáveis | Publicar e despublicar por ação explícita; publicação exige consentimento autorizado | Arquivar pela carteira; lixeira e restauração exclusivas do Super Admin | A área pública exige consentimento, nível `Público`, status publicado e ausência de remoção |
| Rede de Serviços e Saberes | Cadastro completo de instituição com escopo `Serviço comunitário` | Categoria, palavras-chave, bairro autorizado, contato e descrição são editáveis | A presença pública requer publicação e consentimento; não ingressa em curadoria editorial | Usa a mesma lixeira auditável de perfis comunitários | O diretório mostra serviço comunitário somente quando existe vigência comercial ativa; o cartão informa “Visibilidade contratada” |
| Anúncios e visibilidade institucional | `/admin/anuncios` e `/admin/visibilidade-institucional` | Dados comerciais, vigência, contato e repasse administráveis | A visibilidade depende de confirmação e período de vigência | Cancelamento comercial retira a visibilidade sem apagar o perfil documental | Administrador comum vê a própria carteira; Super Admin consolida captação e repasses |
| Miniclipes de fundo vivo | `/admin/miniclipes` | Ordem, ativação e duração de transição revisáveis | Um miniclipe elegível pode compor a sequência ativa da Home | Remoção do fundo vivo não apaga o Acervo | No máximo quatro miniclipes na sequência; seleção segue direitos e autorização |

## Permissões por papel

| Ação | Criador, editor ou aprovador autorizado | Administrador responsável | Administrador principal |
|---|---|---|---|
| Criar, editar e encaminhar conteúdo da própria carteira | Conforme o papel editorial | Sim | Sim |
| Publicar conteúdo comunitário com consentimento autorizado | Conforme a permissão concedida | Sim, na própria carteira | Sim, em todas as carteiras |
| Despublicar ou arquivar conteúdo comunitário | Conforme a carteira e o papel | Sim, na própria carteira | Sim, em todas as carteiras |
| Enviar um registro para a lixeira | Não | Não | Sim, com motivo obrigatório |
| Restaurar um registro removido | Não | Não | Sim, devolvendo-o a Rascunho |
| Ver carteiras, captações e repasses de outros administradores | Não | Não | Sim |

## Comportamento do diretório territorial

O menu público **Instituições** passou a reunir a descoberta de casas, lideranças, iniciativas e serviços comunitários. Seus filtros permitem combinar texto, entrada no diretório, tipo de perfil, categoria de serviço e território. A busca considera nome, descrição, categoria, palavras-chave, bairro autorizado e referência de localização permitida.

O mapa continua restrito aos perfis com localização marcada como pública e coordenadas autorizadas. O bairro ou a localização aproximada pode aparecer no cartão quando houver autorização, mas nunca gera marcador sem o consentimento necessário. Para a Rede de Serviços e Saberes, uma vigência comercial ativa torna o perfil elegível ao diretório; ela não compra destaque editorial nem altera a classificação documental de nenhum conteúdo.
