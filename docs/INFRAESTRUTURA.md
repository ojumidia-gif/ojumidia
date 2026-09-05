# Infraestrutura oficial da Ojú Mídia

```text
GitHub  →  versionamento
Render  →  aplicação web + API
Aiven   →  MySQL persistente (DATABASE_URL)
Tigris  →  fotos, vídeos, miniclipes e documentos (S3-compatible)
```

O disco do Render não armazena mídia. Em desenvolvimento, `.local-storage` só entra se Tigris/S3 não estiver configurado.

URLs internas de mídia novas: `/media-storage/{chave}`.

A aplicação converte `ssl-mode` da `DATABASE_URL` (comum no Aiven) para a opção `ssl` do mysql2. `REQUIRED` cifra a conexão sem exigir CA própria; `VERIFY_CA` / `VERIFY_IDENTITY` exigem certificado confiável.

As referências `/manus-storage/` deste banco local foram reescritas para `/media-storage/`. A rota alias `/manus-storage/*` permanece só como compatibilidade de leitura para caches e links antigos.

Variáveis: ver `.env.example`.

`.project-config.json` e `template.json` estão no `.gitignore` e não devem ir para o GitHub.
