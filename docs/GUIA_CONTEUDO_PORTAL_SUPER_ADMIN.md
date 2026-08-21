# Guia do Super Admin: Conteúdo do Portal

## Onde editar

No Centro Administrativo, abra **Conteúdo do portal**. Essa área é exclusiva do papel **administrador principal** e concentra os blocos institucionais que estruturam a percepção pública da Ojú.

> O portal documental não é um portfólio. Os textos deste painel devem explicar o cuidado, os limites, os serviços e os caminhos de entrada da Ojú, sem inventar clientes, resultados, depoimentos ou registros.

## O que já é administrável

| Área do portal | Bloco editável | Alterações permitidas |
|---|---|---|
| Navegação | Navegação pública principal | Rótulos e rotas das entradas principais. |
| Home | Abertura e chamada “Planejar um registro” | Selo, título, descrição, CTA, rota e visibilidade. |
| Histórias | Abertura de Histórias | Texto de contexto da área editorial. |
| Memórias Documentais | Abertura de Memórias Documentais | Texto que explica a seleção autorizada, sem linguagem de vitrine. |
| Serviços | Abertura e formas de registro | Títulos, descrições, coleções de serviços e formatos. |
| Comunidade | Abertura de Comunidade | Linguagem de visibilidade, cuidado e aproximação. |
| Sobre | Abertura Sobre a Ojú | Posicionamento institucional e CTA. |
| Método Ojú | Método Ojú | Título, resumo e cinco etapas do método. |

As publicações, fotografias, vídeos, miniclipes, taxonomias, instituições, agendas, autorizações, contratos e solicitações já possuem seus próprios módulos administrativos. Eles não devem ser duplicados no painel institucional.

## Como editar um bloco

Selecione **Editar** no bloco desejado. O formulário apresenta a página, o nome interno, a ordem, a visibilidade e o conteúdo estruturado. O conteúdo é salvo como um objeto JSON para permitir que textos simples e coleções — como os serviços ou as etapas do Método Ojú — coexistam no mesmo painel.

Um bloco de abertura costuma seguir esta estrutura:

```json
{
  "eyebrow": "Serviços e processos",
  "title": "Registrar não é acumular imagens.",
  "description": "Texto de contexto da Ojú.",
  "ctaLabel": "Planejar um registro",
  "ctaHref": "/planejar-um-registro"
}
```

Uma coleção de itens, como os serviços ou as etapas do método, usa uma lista `items`. Cada item deve manter os campos que a página usa. No Método Ojú, mantenha `order`, `title` e `description`; em Formas de registro, mantenha `title`, `description` e `formats`.

## Visibilidade, ordem e exclusão

Use **Ocultar** quando precisar suspender uma seção sem apagar seu texto. A ordem numérica organiza blocos que aparecem em sequência. Use **Excluir** apenas quando o bloco não deve mais permanecer disponível no portal; a exclusão é lógica, fica registrada na atividade administrativa e pode ser desfeita com **Restaurar**.

Não altere a **chave técnica** de um bloco já ligado a uma página sem uma revisão técnica. Essa chave informa ao portal onde aquele conteúdo deve aparecer. Para mudar a linguagem, os títulos, as descrições, os itens e os CTAs, basta editar o conteúdo estruturado.

## Critério de qualidade antes de salvar

Antes de publicar uma alteração, confirme se o texto esclarece uma decisão real da Ojú, se não promete algo que a equipe ainda não oferece e se não transforma uma comunidade ou uma memória em anúncio. No caso de registros contratados, preserve sempre a separação entre entrega privada e autorização editorial expressa.
