# Auditoria de consistência de fluxos — pré-Blaze

**Estado do código:** pronto para a etapa de implantação integral, condicionado à configuração externa de Firebase Hosting, Cloud Run, banco, armazenamento e OAuth de produção. Esta auditoria distingue a prontidão do código da ativação da infraestrutura: o portal não deve ser considerado publicado integralmente enquanto o backend autenticado não estiver conectado.

> **Regra de operação da Ojú:** nenhum conteúdo público é criado de forma fictícia. O portal exibe somente registros reais que atendam às permissões, aos direitos de mídia, ao consentimento e ao estado de publicação aplicáveis.

## Resultado executivo

A revisão foi concluída sobre as rotas públicas, os painéis administrativos, os procedimentos de servidor, as permissões de papel, os direitos de mídia, as regras de lixeira e os eventos de sincronização. Foram substituídas as antigas estruturas visuais desconectadas de **Territórios** e **Acervo**; o Acervo, a Home, as áreas editoriais, as frentes comunitárias e os blocos institucionais agora reagem aos eventos emitidos pelo servidor. As validações de código concluíram com **TypeScript sem erros**, **58 arquivos de teste aprovados** e **139 testes aprovados**.

| Critério de liberação | Resultado | Evidência operacional |
|---|---|---|
| Conteúdo público usa dados reais | Aprovado | Territórios, Acervo, diretório, Agenda e Memórias consultam procedures públicas filtradas por publicação, consentimento e lixeira. |
| Administração controla o ciclo | Aprovado | Rascunho, edição, prévia aplicável, publicação, despublicação, arquivamento, lixeira e restauração estão disponíveis conforme papel. |
| Direitos e limites de mídia | Aprovado | Acervo conserva origem, crédito, autorização, finalidade, prazo e estado; publicação aceita somente mídia elegível e fora da lixeira. |
| Atualização sem recarga manual | Aprovado no código | Eventos editoriais invalidam as consultas públicas de conteúdo, Acervo, fundo vivo, comunidades e blocos institucionais. |
| Responsividade revisada | Aprovado | Home, Territórios, Acervo, Instituições e painel comunitário foram conferidos em desktop e celular. |
| Backend hospedado e login Google de produção | Dependência externa | Requer Blaze, Cloud Run, variáveis seguras, OAuth e callbacks homologados. |

## Matriz por item de menu público

| Menu público | Origem administrativa | Produção e mídia | Ciclo e segurança | Exibição pública sincronizada |
|---|---|---|---|---|
| **Histórias** | Publicações, Frentes editoriais, Acervo, Taxonomias e Curadoria | Texto, foto, vídeo e capa; equipe, território, tema e direitos | Revisão, aprovação, publicação, despublicação, arquivamento, lixeira e restauração | Sim, por evento editorial |
| **Coberturas** | Publicações, relações institucionais, Acervo e Taxonomias | Mesmo editor documental, com relações a evento, instituição e território | Autorização editorial separada da contratação; ciclo integral | Sim, por evento editorial |
| **Documentários** | Publicações, Frentes editoriais e Acervo | Texto, fotos, vídeos e capa com direitos | Mesmo ciclo editorial completo | Sim, por evento editorial |
| **Projetos** | Publicações, Frentes editoriais e Acervo | Texto, fotos, vídeos e capa com direitos | Mesmo ciclo editorial completo | Sim, por evento editorial |
| **Territórios** | Taxonomias e publicação editorial | Mídia territorial autorizada e contagem de conteúdos públicos relacionados | CRUD taxonômico; conteúdo removido não integra resultados públicos | Sim, por evento editorial |
| **Instituições** | Cadastro institucional, Comunidade, Visibilidade e Acervo | Mídia de apresentação pode ser escolhida já no rascunho; localização e contato têm visibilidade própria | Consentimento, publicação, despublicação, arquivamento, lixeira e restauração | Sim, por evento comunitário |
| **Agenda** | Comunidade e Acervo | Capa autorizada pode ser escolhida já no rascunho do evento | Consentimento, publicação, despublicação, arquivamento, lixeira e restauração | Sim, por evento comunitário |
| **Memórias** | Upload especializado, revisão de IA, Comunidade e Acervo | Áudio, vídeo autorizado, narrativa e transcrição revisada | Consentimento obrigatório, nível de acesso, revisão humana e lixeira | Sim, por evento comunitário |
| **Acervo** | Painel de Mídias e Miniclipes | Upload, prévia real, metadados de direitos, estado e vínculo documental | Arquivamento, lixeira auditável e restauração preservam créditos e termos | Sim, por evento de mídia |
| **Serviços** | Conteúdo do Portal, Solicitações e Comercial | Página institucional textual; os materiais visuais pertencem ao Acervo, anúncios autorizados ou publicações documentais | Blocos podem ser criar, editar, ordenar, ocultar, excluir logicamente e restaurar | Sim, por evento de conteúdo institucional |
| **Planejar um registro** | Solicitações comerciais, Contratos, Autorização editorial e Acervo | Formulário cria solicitação administrável; material só pode ir ao portal depois de autorização expressa | Carteira, contratação, termo, autorização e fluxo editorial separados | Sim, por consultas e eventos comerciais/editoriais |

## Regras de mídia e visibilidade confirmadas

O Acervo é a fonte de mídia que mantém origem, crédito, autorização, finalidade, publicação permitida, prazo, vínculo documental e estado. A seleção de mídia nos fluxos de Instituições, Agenda e Memórias aceita itens existentes no Acervo, mas o servidor impede a publicação se a mídia estiver privada, arquivada ou na lixeira. Isso mantém o rascunho privado possível sem transformar o ato de contratar ou de salvar um perfil em autorização pública.

| Regra | Aplicação confirmada |
|---|---|
| Fotografia documental | Até 5 fotos; não aceita vídeo na coleção documental. |
| Histórias, Coberturas, Documentários e Projetos | Até 5 fotos e 2 vídeos curtos por registro, com limite de 60 segundos por vídeo. |
| Fundo vivo | Até 4 miniclipes ativos, sempre vídeos autorizados, ativos e com duração de até 60 segundos. |
| Mídia comunitária | Instituição usa mídia de apresentação; Agenda usa capa; Memória pode vincular vídeo; todos exigem elegibilidade para publicação. |
| Lixeira | A remoção lógica não apaga crédito, direitos, consentimentos ou vínculos; somente o administrador principal restaura os itens sensíveis. |

## Permissões e sincronização

O acesso segue a matriz de papéis da Ojú: criador, editor, aprovador, administrador e administrador principal. O administrador principal possui controle integral das ações sensíveis, em especial lixeira e restauração; demais administradores trabalham em suas carteiras e dentro das transições permitidas. O endereço comercial `ojumidia@gmail.com` permanece apenas como contato público e não recebe privilégio administrativo.

As alterações de publicação, mídia, comunidade, lixeira, restauração, fundo vivo e conteúdo institucional emitem eventos que atualizam as consultas públicas relevantes. A arquitetura preserva também intervalos de refetch como contingência, mas o comportamento esperado após uma alteração administrativa é a invalidação imediata da consulta correspondente.

## Validação visual executada

Foram revisadas em desktop as rotas `/territorios`, `/acervo`, `/instituicoes`, `/agenda`, `/memorias` e `/admin/comunidade`. Em celular, foram revisados `/admin/comunidade`, `/territorios`, `/acervo` e `/instituicoes`. O painel comunitário recebeu ajuste para que o seletor de mídia permaneça contido na coluna do formulário, sem sobrepor a lista de registros.

## Dependências externas antes do primeiro deploy integral

O código não possui bloqueio de fluxo interno pendente. O bloqueio remanescente é exclusivamente de infraestrutura: a prévia estática do Firebase Hosting não inclui o servidor Express/tRPC, o banco, o armazenamento, a sessão nem o OAuth necessários ao Centro Administrativo. A implantação integral exige a ativação do Blaze, a publicação do backend em Cloud Run, o encaminhamento de Hosting para o backend, variáveis de ambiente seguras e a homologação dos callbacks de autenticação. O guia `docs/HOSPEDAGEM_TESTE_FIREBASE.md` deve ser atualizado e seguido quando essa conta de faturamento estiver ativa.
