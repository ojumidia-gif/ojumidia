# Identidade, acesso e contato — Ojú Mídia

Esta política separa o contato público da identidade administrativa. Ela deve orientar qualquer integração futura com Google ou Firebase Authentication.

## Estrutura de acesso

```text
AUTENTICAÇÃO
│
├── Super Admin
│   └── Conta Google principal autorizada individualmente
│
├── Administradores e colaboradores
│   └── Contas Google próprias, autorizadas e classificadas por papel
│
└── Público
    └── Sem acesso ao Centro Administrativo
```

| Identidade | Finalidade | Privilégio administrativo |
|---|---|---|
| Conta Google principal | Administrador principal, governança, consolidados e distribuição de carteiras | Sim, após verificação de papel no backend. |
| Contas Google de colaboradores | Trabalho editorial ou administrativo delimitado por papel | Somente o papel atribuído individualmente. |
| `ojumidia@gmail.com` | Dúvidas, sugestões, solicitações, parcerias e contato comercial público | **Não.** O e-mail comercial não cria, eleva ou recupera privilégios administrativos. |
| Visitante público | Consumo de conteúdo publicado e canais de contato | Não. |

## Regras operacionais

1. O acesso ao Centro Administrativo continua discreto e exige sessão autenticada mais verificação de papel no servidor.
2. Um endereço de e-mail, por si só, não recebe permissão. A permissão é concedida à conta autenticada e registrada no banco com um dos papéis autorizados.
3. O Super Admin é a única função que pode visualizar consolidados e distribuir carteiras; essa função não dispensa consentimento, direitos de mídia ou trilha de auditoria.
4. Em testes locais, `OJU_LOCAL_ADMIN_EMAIL` representa somente a conta de administrador principal do ambiente de desenvolvimento. Ela não transforma o e-mail comercial em conta administrativa.
5. Ao habilitar Google/Firebase Authentication, o backend deverá preservar o mapeamento de conta autenticada para papel, sem conceder acesso administrativo ao público.
