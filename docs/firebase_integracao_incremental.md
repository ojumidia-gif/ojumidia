# Firebase — integração incremental da Ojú Mídia

O SDK oficial do Firebase está instalado e centralizado em `client/src/lib/firebase.ts`. A inicialização é única, opcional e acontece somente quando as variáveis `VITE_FIREBASE_*` estão completas.

## Fonte de verdade atual

| Domínio | Fonte atual | Situação nesta etapa |
|---|---|---|
| Conteúdo, usuários, papéis, receitas e comunidade | MySQL via Drizzle e tRPC | Mantido como fonte única de verdade. |
| Mídia documental | S3 via `manus-storage` | Mantido; Firebase Storage não recebe arquivos nesta etapa. |
| Sessão administrativa | Sessão atual por cookie JWT | Mantida; Firebase Authentication está apenas preparado. |
| Firebase SDK | Inicialização centralizada no frontend | Preparado para recursos futuros, sem substituição automática. |

## Próxima ativação recomendada

O próximo passo deve ser habilitar **Firebase Authentication com Google** apenas para administradores, mantendo o mapeamento de papel e autorização no backend da Ojú. Antes disso, configure no console Firebase os domínios autorizados e o provedor Google; não inclua `service account`, `private_key` ou credenciais administrativas no frontend.

Firebase Hosting, domínio próprio, Firestore e Firebase Storage não foram ativados nesta etapa.
