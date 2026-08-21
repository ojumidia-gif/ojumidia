# Regras de segurança e operação — Ojú Mídia

Este arquivo é a referência de segurança antes de configurar Firebase, publicar o projeto ou convidar novos administradores. Ele traduz as regras já aplicadas no código e as regras operacionais que a equipe deve manter.

## 1. Princípios obrigatórios

| Regra | Aplicação na Ojú |
|---|---|
| Menor privilégio | Cada pessoa recebe apenas o papel necessário: criador, editor, aprovador, administrador ou administrador principal. |
| Privacidade por padrão | Todo conteúdo e memória começa protegido; publicação exige autorização e etapa editorial concluída. |
| Consentimento específico | Imagem, voz, referência religiosa, localização e IA são opções separadas, nunca um aceite genérico. |
| Rastreabilidade | Revisões, aprovações, carteiras, atividades comerciais e decisões de acesso devem permanecer registradas. |
| Segredos fora do código | Chaves, senhas, URLs privadas e credenciais pertencem ao `.env` ou ao cofre de segredos, jamais ao Git ou ao ZIP. |

## 2. Regras de acesso

| Papel | Pode fazer | Não pode fazer sem autorização adicional |
|---|---|---|
| Criador | Preparar rascunhos e mídias dentro das permissões | Publicar, aprovar ou acessar carteiras de terceiros |
| Editor | Revisar, corrigir e organizar fluxo editorial | Aprovar publicação sem o fluxo aplicável |
| Aprovador | Decidir sobre aprovação e publicação conforme política | Acessar carteira comercial privada sem vínculo |
| Administrador | Operar a própria carteira comercial e comunitária | Ver consolidados ou editar carteiras de outros administradores |
| Administrador principal | Distribuir carteiras, ver consolidados e gerir governança | Ignorar consentimento, direitos de mídia ou trilha de auditoria |

### Governança global e carteiras

- O **Super Admin** possui acesso de governança a todas as publicações, mídias, contratos, termos, autorizações, receitas, documentos e carteiras da Ojú.
- Cada administrador futuro opera somente a própria carteira: suas captações, contratos, autorizações, documentos e receitas atribuídos. O servidor aplica essa verificação; a interface não é a única barreira.
- Políticas comerciais são versionadas e geridas exclusivamente pelo Super Admin. Uma política ativa rege apenas novas captações; os fechamentos anteriores preservam seus valores e a versão aplicada para evitar alteração retroativa de participação.
- A confirmação de repasse é exclusiva do Super Admin. Ao mudar uma participação de captação para **Pago**, o servidor registra um aviso interno na carteira do administrador responsável; o aviso não substitui conciliação financeira, comprovante ou obrigação fiscal.
- Criadores, editores e aprovadores acessam apenas as etapas editoriais previstas pelo papel. Eles não recebem acesso a contratos, taxas, divisão de receitas ou PDFs assinados sem autorização adicional.
- O termo de responsabilidade de cada administrador deve ser assinado via gov.br antes da ativação de responsabilidades contratuais ou financeiras.
- Um convite com papel **administrador** não libera o Centro Administrativo imediatamente: até o anexo do PDF assinado via gov.br, a conta permanece sem acesso administrativo e, quando aplicável, somente com papel editorial de criador.
- A promoção, a revogação ou a redução de um papel passam exclusivamente pelo módulo **Colaboradores**. A rotina centralizada sincroniza a conta vinculada ao convite e só ativa `administrador` quando existir termo correspondente assinado via gov.br; outros módulos não alteram papéis diretamente.
- A geração do termo é atribuição do Super Admin. O termo é versionado como `OJU-AR-1.0`, guarda data de exportação, assinatura, arquivo protegido e responsável pelo anexo.
- Cada fechamento deve registrar sua divisão. O padrão inicial é **70% para o administrador responsável** pela captação ou gestão e **30% para a Ojú Mídia** como operação, infraestrutura e curadoria; qualquer exceção requer registro contratual explícito.
- O simulador de políticas comerciais é uma ferramenta visual local do Super Admin: usa percentuais digitados e um valor informado no navegador, mas não grava política, não altera versão ativa e não cria repasse.

### Separação entre identidade e contato comercial

- A conta Google principal autorizada é a identidade de **administrador principal**. O papel continua sendo verificado pelo backend em cada operação.
- Administradores e colaboradores futuros usam contas Google próprias e recebem um papel específico de forma individual.
- `ojumidia@gmail.com` é o canal público para dúvidas, sugestões, solicitações e parcerias. **Esse e-mail não confere, eleva ou recupera privilégios administrativos automaticamente.**
- Visitantes públicos não possuem acesso ao Centro Administrativo.

## 3. Dados sensíveis e memória comunitária

- Não publicar localização exata, referência religiosa, imagem, voz ou relato sem a autorização correspondente.
- O nível de acesso deve ser escolhido e registrado: **Público**, **Comunitário**, **Pesquisa mediante análise** ou **Preservação restrita**.
- Conteúdos rituais, saberes reservados, pessoas menores de idade ou situações de acolhimento exigem revisão reforçada e, quando aplicável, validação jurídica.
- A transcrição ou o resumo de IA é apenas rascunho. A revisão humana é obrigatória antes de qualquer uso editorial.
- Pedido de acolhimento é privado. O protocolo de acompanhamento revela somente o status seguro, nunca os detalhes enviados.

## 4. Regras de mídia

| Regra | Limite |
|---|---|
| Fotos por conteúdo, cobertura, evento, história, projeto ou documentário | Até 5 |
| Vídeos por conteúdo, cobertura, evento, história, projeto ou documentário | Até 2 |
| Duração de cada vídeo enviado | Até 60 segundos |
| Miniclipe comercial ativo | 1 por contratação |
| Miniclipe exibido na Home | 1 por vez, ativo e autorizado |
| Arquivo enviado pela rota de mídia | Até 16 MB |

Álbuns e vídeos completos devem ser vinculados por link externo quando autorizados; eles não substituem a mídia curada do registro. A remoção de uma mídia desvincula o ativo do conteúdo e libera a vaga, sem apagar automaticamente o original do Acervo. O banco impede que o mesmo ativo seja anexado duas vezes à mesma publicação.

## 5. Contratação privada e autorização editorial

> **Contratação não é autorização de publicação.** Fotografia, vídeo, cobertura, documentário e registro de evento contratados permanecem privados após a entrega, salvo autorização editorial específica registrada no sistema.

- A autorização é granular: fotos, vídeos, nome institucional, localização, texto/história, identificação de pessoas, portal, divulgação institucional e redes sociais são escopos separados.
- Estados **Não autorizada**, **Pendente**, **Autorização parcial**, **Autorizada** e **Revogada** possuem efeitos diferentes; somente autorização vigente, com escopo de portal e conteúdo permitido torna o material elegível para curadoria.
- A autorização para portal não compra publicação, destaque ou posição na Home. A curadoria editorial permanece independente.
- Revogação, vencimento ou ausência de escopo suficiente bloqueia publicação e republicação; a revogação também retira preventivamente do portal materiais comerciais já vinculados.
- A revogação ou perda do escopo de portal também remove o miniclip comercial correspondente da Home, mantendo o histórico interno da substituição.
- Registre quem autorizou, função, data, validade, restrições culturais e observações. A documentação jurídica deve ser revisada por advogado brasileiro antes da assinatura.
- O termo é exportado em PDF e deve ser assinado **exclusivamente via gov.br**. O portal não coleta assinatura eletrônica, não simula assinatura e não aceita outro provedor como equivalente operacional.
- O PDF assinado via gov.br é anexado à cobertura pela equipe autorizada. Sem esse anexo, a matriz pode permanecer preenchida, mas a autorização editorial não pode ser ativada para publicação.
- Documentos contratuais e termos assinados são acessados por rota autenticada: Super Admin ou administrador responsável pela carteira. A interface não deve exibir a chave de armazenamento nem link permanente ao arquivo.
- O termo de responsabilidade assinado pode ser aberto pelo Super Admin e pelo próprio administrador vinculado ao e-mail do termo, sempre por rota autenticada e URL temporária; outros administradores não possuem acesso.

## 6. Regras técnicas do servidor

- O servidor remove o cabeçalho de identificação do framework e envia `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e política de permissões restrita.
- Upload exige sessão autenticada e papel editorial ou administrativo autorizado.
- Upload aceita somente imagem, vídeo, áudio ou PDF e limita o corpo da requisição.
- A duração de vídeo é lida no navegador para feedback imediato e conferida novamente pelo servidor a partir dos metadados binários do arquivo; a rota rejeita arquivo inválido, sem duração confirmável ou acima de 60 segundos.
- Validações de dados ficam no servidor; validações de interface nunca são a única barreira de proteção.
- Migrations do banco devem ser revisadas e aplicadas de forma aditiva antes de qualquer atualização de produção.

## 7. Segredos e configuração

1. Copie `.env.example` para `.env` apenas na sua máquina.
2. Gere `JWT_SECRET` longo e aleatório; nunca reutilize o valor de desenvolvimento em produção.
3. Preencha OAuth e banco somente no ambiente autorizado.
4. `OJU_LOCAL_ADMIN_EMAIL` existe exclusivamente para desenvolvimento e não deve ser definido em produção.
5. `OJU_LOCAL_DEV_LOGIN_ENABLED` existe somente para validação interna local, com acesso automático de administrador principal. Nunca a defina em produção e nunca a inclua em Git, ZIP ou ambientes compartilhados. O código bloqueia as rotas fora de `NODE_ENV=development`.
6. O Firebase Web SDK pode ser preparado de forma incremental, mas Firebase Authentication só deve ser ativado após a definição de contas Google autorizadas e regras de verificação no backend.

## 8. Checklist antes de publicar

- [ ] Não existe `.env`, chave, token, banco local ou arquivo de mídia privado no commit/pacote.
- [ ] O administrador principal e os administradores foram revisados no banco.
- [ ] Formulários de consentimento e licença foram revisados por advogado brasileiro.
- [ ] Rotas públicas não expõem dados de proposta, acolhimento, carteira, localização restrita ou mídia não autorizada.
- [ ] `pnpm check` e `pnpm test` foram executados com sucesso.
- [ ] Firebase e serviços externos usam segredos configurados fora do repositório.
- [ ] `OJU_LOCAL_DEV_LOGIN_ENABLED` está ausente do ambiente de produção.
