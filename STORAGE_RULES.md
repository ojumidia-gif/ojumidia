# Regras de armazenamento e acesso protegido — Ojú Mídia

Este documento define como a Ojú guarda mídia, contratos, termos de autorização e documentos de gestão. O armazenamento de arquivos usa S3 como fonte de verdade; o banco armazena apenas metadados, propriedade e referências técnicas.

## Classificação dos arquivos

| Classe | Exemplos | Acesso | Exposição |
|---|---|---|---|
| Público editorial | Mídia já autorizada e publicada | Conforme portal | Somente após aprovação editorial e direitos válidos |
| Operacional de carteira | Entregas privadas, proposta e links de trabalho | Administrador responsável e Super Admin | Nunca pelo portal público |
| Contratual protegido | Termo assinado via gov.br, contrato de cobertura, responsabilidade de administrador | Super Admin e administrador responsável | Nunca por URL pública exposta pela interface |
| Governança restrita | Auditorias, revogações, divisão de receita, responsáveis | Super Admin; administrador somente em sua carteira quando aplicável | Nunca público |

## Regras obrigatórias

1. **S3 é a fonte de verdade para bytes.** O banco registra apenas chave, nome, estado, data e responsável; não armazena o PDF ou mídia em colunas de texto ou BLOB.
2. Todo arquivo usa chave única com sufixo aleatório. Documentos de termos e contratos devem permanecer em prefixos privados e não podem ser incluídos no Git, no ZIP de transferência ou em `client/public`.
3. PDF assinado via gov.br, contrato e termo de responsabilidade são abertos somente por rota autenticada. O servidor confere se a pessoa é o Super Admin ou a responsável pela carteira antes de gerar o redirecionamento temporário ao arquivo. No termo administrativo, o acesso individual é limitado ao próprio e-mail vinculado ao termo.
4. O Super Admin possui acesso global de governança. Administradores acessam somente os documentos, publicações, receitas e autorizações vinculados às próprias carteiras. Criadores, editores e aprovadores não acessam documentos contratuais por padrão.
5. Revogação de termo, autorização ou colaborador preserva a trilha de auditoria. O arquivo não deve ser republicado nem associado novamente sem nova decisão registrada.
6. Arquivos enviados aceitam apenas tipos permitidos pelo servidor e até 16 MB. Todo termo assinado — editorial ou administrativo — deve ser PDF; outros formatos são rejeitados pela interface e não ativam autorização ou papel administrativo.

## Retenção e revisão

| Registro | Ação operacional |
|---|---|
| Termo pendente | Mantido na carteira até assinatura, arquivamento ou substituição. |
| Termo assinado | Mantido como evidência contratual; acesso restrito e rastreado. |
| Autorização revogada | Publicação é retirada preventivamente; termo e registro permanecem como histórico. |
| Colaborador revogado | Acesso administrativo é removido; seu histórico de operações permanece para auditoria do Super Admin. |
| Administrador sem termo assinado | Mantém o convite registrado, mas não recebe papel administrativo nem acesso a carteiras até a assinatura via gov.br. |
| Termo administrativo assinado | Mantido como evidência de governança, acessível somente pelo Super Admin e pelo próprio administrador vinculado. |

> Esta é uma regra técnica e operacional. Prazos legais de retenção, validade de assinatura e descarte devem ser confirmados por advogado e contador brasileiros antes de uso em produção.
