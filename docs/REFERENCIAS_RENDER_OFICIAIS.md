# Referências oficiais do Render

Estas referências foram consultadas em 21 de agosto de 2026 para preparar a implantação full-stack da Ojú Mídia.

| Tema | Decisão aplicada ao projeto | Fonte oficial |
|---|---|---|
| Blueprint | O arquivo `render.yaml` fica na raiz e define `type: web`, `runtime: node`, `buildCommand`, `startCommand`, `healthCheckPath` e variáveis sem valores secretos. | [Blueprint YAML Reference](https://render.com/docs/blueprint-spec) |
| Health check | Um Web Service pode receber `GET /health`; qualquer resposta 2xx/3xx em até cinco segundos é considerada saudável. | [Health Checks](https://render.com/docs/health-checks) |
| Node | A versão deve ser fixada com faixa limitada em `package.json` ou configuração equivalente, para evitar mudanças automáticas de major. | [Setting Your Node.js Version](https://render.com/docs/node-version) |
| Variáveis | Segredos não devem entrar em `render.yaml`; devem ser definidos no Dashboard ou por grupos de ambiente. | [Environment Variables and Secrets](https://render.com/docs/configure-environment-variables) |

> A Ojú usa MySQL com Drizzle. O Blueprint não cria um Render Postgres, porque trocar o banco existente seria uma alteração arquitetural indevida. A `DATABASE_URL` deve apontar para um MySQL/TiDB compatível já provisionado e com acesso permitido ao serviço.
