# Estudo estratégico — MoR híbrido por linha de produto

**Este estudo é uma análise estratégica e arquitetural. Não constitui parecer jurídico, fiscal ou contábil.**

Não implementa. Não cria tabelas, migrations, PSP, preços, seeds nem mocks. Não altera Aiven, Tigris, Beta nem o produto para “caber” no modelo.

**Pergunta central:** o Ojú já construído consegue sustentar uma empresa com múltiplas linhas, cada uma com natureza, fluxo, responsabilidade, margem e contrato próprios — sem virar marketplace nem pay-to-appear?

**Classificação de evidência usada neste texto:**  
`[CONFIRMADO NO CÓDIGO]` · `[CONFIRMADO NA DOCUMENTAÇÃO]` · `[INFERÊNCIA]` · `[HIPÓTESE]` · `[DEPENDE DE VALIDAÇÃO EXTERNA]` · `[DECISÃO EMPRESARIAL]`

---

## 1. Executive summary

O Ojú **não** é um marketplace, um SaaS, uma agência genérica nem um portal de classificados. É uma **rede territorial de visibilidade, memória, cultura, conexão e produção**, com mesas internas de operação e alguns produtos comerciais **já identificados**. `[CONFIRMADO NA DOCUMENTAÇÃO]` `docs/FASE7_OPERACAO.md`, `docs/ARQUITETURA_VISIBILIDADE_OJU.md`.

A arquitetura **MoR híbrido por linha de produto** (“operadora da Rede com produtos identificados”) **não é um enxerto**. Ela descreve, em linguagem empresarial, o que o código **já tenta** fazer: políticas por *scope* (Cobertura, Documentário, Fotografia, Anúncio, Visibilidade institucional), freeze na Opportunity, anúncio rotulado, visibilidade institucional rotulada, licenciamento e apoio como *leads* separados, pagamento que **não** compra diretório. `[CONFIRMADO NO CÓDIGO]` `commercialPolicyScopes`, `paymentControlsDirectoryVisibility() === false`.

**Decisão desta auditoria:** **SIM COM RESSALVAS.**

Ressalvas que impedem adoção cega:

1. **Dois trilhos de dinheiro** (mesa `commercialTransactions` vs Rede `settlements` + intents) sem ledger único. `[CONFIRMADO NO CÓDIGO]`
2. **`contracts` com default 30/70 administrador** mistura cargo territorial com beneficiário. `[CONFIRMADO NO CÓDIGO]` conflita com a tese “admin ≠ beneficiário”.
3. **Payout é notificação de status**, não liquidação. `[CONFIRMADO NO CÓDIGO]` `commercialPayoutNotifications`.
4. **PSP é stub** (`PixWebhookProvider`; `getPaymentProvider()` só isso; `clientMayConfirmPayment() === false`). `[CONFIRMADO NO CÓDIGO]`
5. **MoR, ISS, CNAE, titularidade de licença e personalidade do fundo** são `[DEPENDE DE VALIDAÇÃO EXTERNA]`.
6. **Originação** existe sem remuneração e sem coluna estável (`OJU_ORIGIN_V1` em `notes`). `[CONFIRMADO NO CÓDIGO]` / `[CONFIRMADO NA DOCUMENTAÇÃO]` `docs/AUTONOMIA_COMERCIAL_REDE_OJU.md`.

Adotar o modelo **como princípio de produto e de empresa** é coerente. Adotá-lo **como operação financeira em produção** ainda não está preparado.

---

## 2. O que o Ojú é hoje

### 2.1 O que não é

Não é marketplace de freelancers (sem preço público, sem checkout no diretório, sem ranking). `[CONFIRMADO NA DOCUMENTAÇÃO]`  
Não é SaaS (não há plano de ferramenta cobrado). `[CONFIRMADO NO CÓDIGO]`  
Não é só produtora (há editorial, território, casas, vozes, memórias). `[CONFIRMADO NO CÓDIGO]`  
Não é só portal de anúncios (ads são bloco identificado, Home é curadoria). `[CONFIRMADO NO CÓDIGO]`  
Não é rede social / feed. `[CONFIRMADO NA DOCUMENTAÇÃO]`  
Não é só diretório ou portfólio: janela **5 JPG + 1 miniclip ≤ 60s por unidade de produção/publicação**, não quota global do profissional. `[CONFIRMADO NO CÓDIGO]` `PRODUCTION_PHOTO_CAP = 5`.

### 2.2 O que é

| Camada | Evidência |
|---|---|
| Identidade de login / RBAC | `users.role`, `adminAccess` — **não** é profissão `[CONFIRMADO NO CÓDIGO]` `[CONFIRMADO NA DOCUMENTAÇÃO]` Fase 7 |
| Identidade na Rede | `professionalProfiles` + especialidades `[CONFIRMADO NO CÓDIGO]` |
| Território | taxonomia + `partnerTerritories` + `territoryId` `[CONFIRMADO NO CÓDIGO]` |
| Editorial | `publications`, Home `homePlacement` / `manualFeatured` `[CONFIRMADO NO CÓDIGO]` |
| Memória / cultura | `oralMemories`, `networkVoices`, instituições, eventos `[CONFIRMADO NO CÓDIGO]` |
| Operação de produção | Opportunity → Production → settlement `[CONFIRMADO NO CÓDIGO]` |
| Mesa comercial | `commercialRequests`, closings, transações, reembolsos `[CONFIRMADO NO CÓDIGO]` |
| Presença comercial identificada | `advertisements`; casas `directoryScope = Serviço comunitário` + plano `[CONFIRMADO NO CÓDIGO]` |
| Princípio anti pay-to-appear | `paymentControlsDirectoryVisibility() === false` `[CONFIRMADO NO CÓDIGO]` |

**Princípio a preservar:** Rede primeiro; dinheiro só onde há valor criado e identificação comercial explícita. `[DECISÃO EMPRESARIAL]` alinhada à documentação viva.

---

## 3. O que MoR híbrido significa aqui

**Merchant of Record (MoR)** neste estudo = *quem aparece como recebedor perante o cliente e o PSP, e quem responde por chargeback, NF e contestação daquela cobrança*. `[HIPÓTESE]` conceitual — não é parecer.

**Híbrido por linha** = a Ojú **não** usa um único papel para tudo:

| Linha | Natureza potencial (produto) | Classificação |
|---|---|---|
| Rede Ojú | gratuita / bem comum da Rede | **provável** (já é o desenho) |
| Cobertura / produção | operação da Rede; MoR **ou** split **depende do contrato** | **dependente de validação** |
| Anúncio identificado | serviço comercial da Ojú (MoR da Ojú mais natural) | **hipótese** forte de produto; fiscal **dependente** |
| Visibilidade institucional | serviço Ojú rotulado, não curadoria | **provável** no produto; fiscal **dependente** |
| Presença comercial / serviço comunitário | descoberta + contexto; **não** checkout | **provável** no produto; risco de virar classificado se monetizar mal |
| Licenciamento | titularidade indefinida | **ainda indefinida** juridicamente |
| Projeto institucional | prestação Ojú | **hipótese** de produto; **dependente** de contrato |
| SaaS futuro | assinatura de ferramenta | **hipótese** futura; **não obrigatório** |
| Originação | eventual remuneração só no sucesso econômico | **hipótese**; hoje **incompatível com pagamento automático** (não existe) |

Separar sempre:

| Camada | O que decide |
|---|---|
| Técnico | o PSP *consegue* split / hold / webhook |
| Contratual | quem é parte com o cliente |
| Contábil | o que é receita vs trânsito |
| Fiscal | base de ISS/PIS/Cofins etc. |
| Jurídico | MoR, direitos, CDC, culto, imagem |

`[DEPENDE DE VALIDAÇÃO EXTERNA]` nas quatro últimas. “O PSP permite split” **não** equivale a “a Ojú pode operar como marketplace”.

---

## 4. Compatibilidade do projeto atual

**Coerente com o modelo:** políticas versionadas por linha; freeze econômico; settlement que **não** relê política vigente (`settlementUsesCurrentPolicy() === false`); ads só Ojú+captor; visibilidade institucional sem executor; Home curada; diretório alfabético; originação ≠ Opportunity ≠ pagamento. `[CONFIRMADO NO CÓDIGO]`

**Conflitos:**

1. Mesa vs Rede: dois mundos de “pago”. `[CONFIRMADO NO CÓDIGO]`
2. `contracts.administratorSharePercent` default 70% vs tese do estudo anterior. `[CONFIRMADO NO CÓDIGO]`
3. `commercialPayoutNotifications` só para Anúncio e Visibilidade institucional — produção usa outro caminho. `[CONFIRMADO NO CÓDIGO]`
4. `networkExecutors` paralelo a `professionalProfiles` (`/fotografos`). `[CONFIRMADO NA DOCUMENTAÇÃO]`
5. Licença pública `/licenciar-midia` vs `mediaEligibleForLicense` em `protectedProcedure`. `[CONFIRMADO NO CÓDIGO]` `[INFERÊNCIA]` risco de UX/governança, não de MoR.
6. Fundo `networkFundValue` / `developmentPercent` sem entidade jurídica no schema. `[CONFIRMADO NO CÓDIGO]` natureza **indefinida**.
7. Intent de pagamento só após Production no desenho operacional, mas **provider fictício**. `[CONFIRMADO NO CÓDIGO]` / E2E documenta SKIP de pagamento.

**Não é incompatível.** É **parcial**. Forçar um único MoR (tudo agência) ou um único split (tudo marketplace) **brigaria mais** com o produto do que o híbrido.

---

## 5. Mapa das linhas de produto

### 5.1 Rede gratuita

**Por que entra:** pertencer a um território com contexto, memória e possível trabalho — não “abrir loja”. `[INFERÊNCIA]` de produto + docs.  
**Por que permanece:** novas oportunidades internas, documentação, descoberta, casas, editorial (sem ranking). `[HIPÓTESE]` retenção.  
**Gratuito:** perfil básico, diretório alfabético, território, Vozes (participação), Método (leitura), originação de lead, convites de Opportunity. `[CONFIRMADO NO CÓDIGO]` / `[INFERÊNCIA]`  
**Não cobrar:** existência, posição editorial, acesso básico a ser convidado. `[DECISÃO EMPRESARIAL]` já refletida no código de visibilidade.  
**Função estratégica da gratuidade:** aquisição, network effect, oferta territorial, descoberta, *pipeline* para produção e presença comercial. Gratuidade **não** é ausência de valor: é o ativo que torna as linhas pagas possíveis. `[HIPÓTESE]` estratégica.

### 5.2 Cobertura / produção

Atores: cliente/casa; contratante na mesa; executor (`professionalProfileId`); originador (JSON, não coluna); administrador (escopo, **não** split); Ojú (operadora). `[CONFIRMADO NO CÓDIGO]`

Pagamento: intent + webhook HMAC; cliente não confirma. `[CONFIRMADO NO CÓDIGO]`  
Limite 5+1: **por unidade**, não global. **Não alterar.** `[CONFIRMADO NO CÓDIGO]` `[CONFIRMADO NA DOCUMENTAÇÃO]`  
`editorialReady` ≠ publicado. `[CONFIRMADO NO CÓDIGO]`  
Cancelamento/reembolso: política na **mesa** (`commercialRefundPolicies`, teto percentual); Rede tem status de settlement, não a mesma máquina de refund. `[CONFIRMADO NO CÓDIGO]` **conflito operacional.**  
Direitos: `commercialEditorialAuthorizations` depois da entrega privada. `[CONFIRMADO NO CÓDIGO]`

Margem, chargeback, inadimplência: **variáveis**; PSP inexistente. `[DEPENDE DE VALIDAÇÃO EXTERNA]` + `[DECISÃO EMPRESARIAL]` de hold.

### 5.3 Presença comercial

Já existe como: anúncio (`Cartão de serviço`, `Banner`, `Destaque de parceiro`) e casa `Serviço comunitário` com plano de visibilidade **rótulo**, ordem pública **não** privilegiada por plano. `[CONFIRMADO NO CÓDIGO]` testes Missão 6.1.

**Presença básica gratuita:** casa institucional com consentimento, profissional Ativo+`publicVisible`, parceiro visível. `[CONFIRMADO NO CÓDIGO]`  
**Ampliada / serviço comercial:** período contratado, identificação, contato — **não** topo da Home. `[CONFIRMADO NA DOCUMENTAÇÃO]`

Nome melhor que “anúncio tradicional”: **Presença Territorial identificada**. `[DECISÃO EMPRESARIAL]`  
Risco: `services` texto no anúncio + explorer de categorias (flora, ateliê) — se ganhar preço+checkout+avaliação, vira classificado. **Não criar tabela `services`.** `[CONFIRMADO NA DOCUMENTAÇÃO]` autonomia comercial.

### 5.4 Serviços territoriais (incluindo casas / ofícios / sagrado)

O produto já permite `directoryScope = Serviço comunitário`, categoria, palavras-chave, mapa, contato com visibilidade controlada. `[CONFIRMADO NO CÓDIGO]`  
`communityCareRequests` existe como cuidado comunitário, não checkout. `[CONFIRMADO NO CÓDIGO]`

**Manter:** descoberta → contexto → presença → contato.  
**Não fazer:** catálogo → preço → checkout → avaliação → ranking.

Riscos: commodificar prática religiosa; reputação; CDC se houver oferta de serviço; ranking como “melhor pai/mãe de santo”. `[DEPENDE DE VALIDAÇÃO EXTERNA]` (jurídico/cultural). Identidade Ojú: território e história, não delivery de rito.

### 5.5 Visibilidade institucional

Planos no schema: `Piloto solidário`, `Visibilidade institucional`, `Perfil parceiro`. `[CONFIRMADO NO CÓDIGO]`  
Editorial ≠ este produto. Comercial deve permanecer rotulado (`visibilityPlan` no explorer). `[CONFIRMADO NA DOCUMENTAÇÃO]`  
Gratuito: perfil institucional publicado com consentimento. Contratável: janela de visibilidade de **serviço comunitário** / plano. `[CONFIRMADO NO CÓDIGO]` predicado de diretório.

### 5.6 Licenciamento

Lead `Licenciamento de mídia`; campos de mídia, finalidade, escopo. `[CONFIRMADO NO CÓDIGO]`  
Solicitação **não** concede uso. `[CONFIRMADO NA DOCUMENTAÇÃO]` UI.  
Titulares possíveis: fotógrafo, produtor, casa, retratado, Ojú, acervo — **não mapeados como direitos no ledger**. Autorização de mídia (`authorization`, `publicationAllowed`, `usageExpiresAt`) é evidência **editorial**, não contrato de licença comercial completo. `[INFERÊNCIA]`

**Para o advogado (não responder aqui):** titular da foto; cessão à Ojú; imagem de terceiros; finalidade/prazo/território/mídia; quando a Ojú licencía vs intermedia; NF; remuneração do autor.

### 5.7 Projetos institucionais

Publicações `contentKind = Projeto`; Apoio institucional e Oficina como leads. `[CONFIRMADO NO CÓDIGO]`  
Alta margem potencial **se** a Ojú for prestadora. Compatível com MoR da Ojú. Ciclo longo, pouca automação — **não** precisa de engine nova. `[HIPÓTESE]`

### 5.8 SaaS futuro

Candidatos: acervo, produção, relacionamento, território, agenda. **Não existe cobrança.** `[CONFIRMADO NO CÓDIGO]`  
Fortalece se for ferramenta **da Rede** (o profissional continua porque organiza o território). Dilui se virar “Drive + CRM” vendável sem Ojú (teste de identidade, seção 29). `[HIPÓTESE]`

### 5.9 Originação

Separação já documentada: `createdBy` ≠ `originatedBy` ≠ `acceptedBy` ≠ executor ≠ admin. `[CONFIRMADO NA DOCUMENTAÇÃO]`  
Remunerar cadastro de lead: **não**. Remunerar só se Opportunity aceita + produção concluída + unicidade de captor. Modelos (nenhum / bônus / % / fixo / crédito): `[DECISÃO EMPRESARIAL]` após jurídico. Hoje: **sem dinheiro**. `[CONFIRMADO NO CÓDIGO]`

---

## 6. Mapa de valor (A–V)

Para cada forma: quem recebe / gera / pagaria. Custos e CAC/LTV são **variáveis** (não inventados).

| Valor | Quem recebe | Quem gera | Quem pagaria | Recorrência | Fuga | Escala |
|---|---|---|---|---|---|---|
| A Descoberta | visitante, casa, profissional | editorial + diretório + território | ninguém (orgânico) | alta indireta | baixa se contexto único | alta |
| B Presença territorial | casa/profissional | cadastro + consentimento | presença ampliada: casa | média | média | alta |
| C Visibilidade | público | curadoria vs produto rotulado | só produto rotulado | média | se pagar editorial, marca morre | média |
| D Documentação | contratante, Rede | executor + Ojú | contratante | por evento | alta se 1-shot | média |
| E Memória | território, casas | oral, vozes, acervo | apoio / institucional | baixa–média | baixa | média |
| F Produção | cliente + executor | operação Rede | cliente | por obra | ver §10 | média |
| G Conexão | ambos os lados | matching admin | implícito na operação | alta | se matching ruim | média |
| H Oportunidades | profissional | Ojú + originadores | ninguém na vitrine | alta | se convite some | média |
| I Originação | Rede / captor futuro | profissional/admin | só no sucesso | baixa | spam se % no lead | média |
| J Distribuição | público | portal | — | — | — | alta |
| K Relacionamento | casa/profissional | mesa | institucional | alta | WhatsApp fora | média |
| L Institucionalização | organizações | contratos | organização | média | editais fora | baixa volume / alta $ |
| M Licenciamento | cliente da obra | titular + Ojú | licenciante | por uso | se autor vende direto | média |
| N Arquivo | futuro | Tigris + metadados | SaaS/custódia futura | alta | Google Drive | alta custo |
| O Ferramentas | profissional | produto | SaaS futuro | alta | se genérico | alta |
| P Inteligência territorial | Ojú / parceiros | dados da Rede | B2B futuro | média | — | média |
| Q Encaminhamento | demandante | `requestCoverage` / perfil | operação | média | telefone direto | média |
| R–U Fortalecimento | profissionais, casas, projetos, estabelecimentos | ciclo da Rede | misto | — | desintermediação | — |
| V Conexão território–ofício | todos | mapa + contexto | presença identificada | alta | Maps genérico | alta |

---

## 7. Mapa de receita (hipótese de produto, não contábil)

Ordenação por **potencial estratégico** (não por TAM inventado):

1. **Produção / cobertura** — motor de circulação; receita **própria só na fatia Ojú** `[HIPÓTESE]` ou no bruto se MoR total `[DEPENDE DE VALIDAÇÃO EXTERNA]`.
2. **Projetos institucionais + apoio** — margem e missão; recorrência baixa, ticket alto. `[HIPÓTESE]`
3. **Visibilidade institucional / presença territorial identificada** — recorrência. `[HIPÓTESE]`
4. **Anúncio identificado** — complementar; não pode contaminar Home. `[CONFIRMADO NO CÓDIGO]` existência; receita **hipótese**.
5. **Licenciamento** — complementar; bloqueado por direitos. `[DEPENDE DE VALIDAÇÃO EXTERNA]`
6. **Originação** — custo/incentivo, não motor. `[HIPÓTESE]`
7. **SaaS** — só depois. `[DECISÃO EMPRESARIAL]`

**Não é receita** sem validação: bruto da Opportunity, `professionalValue`, `captorValue`, fundo, PIX recebido no stub. `[HIPÓTESE]` / `[DEPENDE DE VALIDAÇÃO EXTERNA]`

---

## 8. Mapa de custos (variáveis)

Infra (Render, Aiven, Tigris), equipe editorial/operação/suporte, storage por produção, PSP, chargeback, conciliação, KYC, aquisição territorial, governança (casos, termos). **Nenhum número inventado.** `[DECISÃO EMPRESARIAL]` medir antes de precificar.

Custo que **já é princípio de produto:** janela editorial pequena reduz storage público; acervo completo “fora do Ojú” na UI de produções. `[CONFIRMADO NO CÓDIGO]` texto admin. Isso **ajuda** sustentabilidade de mídia. `[INFERÊNCIA]`

---

## 9. Mapa de responsabilidades

| Evento | Hipótese operacional (não jurídica) |
|---|---|
| Cobrança de anúncio/visibilidade | Ojú frente ao anunciante `[HIPÓTESE]` |
| Cobrança de produção | **indefinido** até contrato MoR vs split `[DEPENDE DE VALIDAÇÃO EXTERNA]` |
| Obra / entrega | executor + operação Ojú `[CONFIRMADO NO CÓDIGO]` estados |
| Editorial | curadoria humana `[CONFIRMADO NO CÓDIGO]` |
| Chargeback | MoR no PSP; regresso contratual `[DEPENDE DE VALIDAÇÃO EXTERNA]` |
| Direitos de imagem | autorizações + termos; incompleto para licença `[INFERÊNCIA]` |
| Admin territorial | escopo `assertPartnerScope`, não split `[CONFIRMADO NO CÓDIGO]` |

---

## 10. Desintermediação

**Cenário A:** Ojú traz cliente → profissional executa → próxima vez é WhatsApp.

Por que voltariam (legítimo, sem aprisionar contato):

1. Novas oportunidades que o profissional **não origina sozinho** (outras casas, outros territórios).
2. Documentação e memória que o cliente quer **com o selo e o arquivo da Rede**.
3. Presença territorial contínua (casa encontrada no mapa com contexto).
4. Licença/reuso institucional que o par isolado não opera.
5. Matching com especialidade e convite — sem leilão.
6. Governança de autorização (portal só com regra).
7. Projetos maiores que um freelancer avulso.
8. Originação: o profissional **ganha trazendo**, não só saindo.
9. Ferramentas futuras de operação (agenda/acervo) **se** forem da Rede.
10. Reputação institucional **sem estrelas** (pertencer à Rede).

Não esconder contato. Não taxa punitiva de “cliente da plataforma”. Take rate alto acelera a saída. `[HIPÓTESE]` econômica clássica de plataformas; aqui reforçada pela identidade cultural (confiança > pedágio).

**Estratégia melhor não é automática:** “ganhar menos por operação e mais ao longo do tempo” **só funciona** se o ciclo (seção 7 do briefing) girar. Se só houver uma produção por profissional por ano, take baixo **não** paga equipe. `[HIPÓTESE]` Ver testes §30.

---

## 11. Retenção (10+ mecanismos)

| # | Mecanismo | Tipo |
|---|---|---|
| 1 | Convites de Opportunity contínuos | operacional / econômico |
| 2 | Perfil territorial encontrado | territorial / produto |
| 3 | Casas e projetos no mesmo mapa | territorial |
| 4 | Editorial pontual (não comprado) | editorial / social |
| 5 | Vozes da Rede / Método | social / profissional |
| 6 | Originação reconhecida | econômico / profissional |
| 7 | Autorização e acervo com regra | operacional |
| 8 | Presença identificada da casa (recorrência) | econômico |
| 9 | Projetos institucionais em série | econômico / institucional |
| 10 | Comunidade de administradores territoriais | territorial / social |
| 11 | Notificações de Rede (já existem) | produto `[CONFIRMADO NO CÓDIGO]` |
| 12 | SaaS futuro de organização | produto (hipótese) |

Nenhum é “lock-in” de dados do cliente.

---

## 12. Marketing (funis)

Instagram **não** é concorrente direto: é distribuição; Ojú é **contexto + território + memória + operação**. `[DECISÃO EMPRESARIAL]`

| Público | Funil |
|---|---|
| Visitante | descoberta (SEO território, editorial, mapa) → conexão (contato/casa) → retorno |
| Profissional | entrada gratuita → presença → oportunidade → produção → retenção |
| Casa | presença consentida → documentação → novo valor (memória, apoio) |
| Estabelecimento | presença territorial identificada → descoberta → contato (**não** checkout) |
| Instituição | projeto / apoio / visibilidade rotulada |

Canais: território e eventos (orgânico da Rede); profissionais e casas como nós; parceiros; SEO de cidade; Instagram como *layer*; Google como busca de nome próprio. Sem comprar Home. `[DECISÃO EMPRESARIAL]`

---

## 13. Network effect

- **Direto (mesmo lado):** mais profissionais → mais conteúdo territorial → mais descoberta entre pares. Fraco se não houver editorial.
- **Indireto / cross-side:** casas ↔ profissionais ↔ visitantes ↔ instituições. **Este é o efeito que importa.** `[HIPÓTESE]`
- Ciclo documentado na Fase 7 **já existe em pedaços técnicos** (pedido → opportunity → production → editorial opcional). Fecho “receita → expansão” **não** está no runtime financeiro. `[CONFIRMADO NO CÓDIGO]` / `[INFERÊNCIA]`

Vantagem competitiva **se** o contexto (casa + território + memória + produção) não for replicável por Instagram/Maps. `[HIPÓTESE]`

---

## 14. Economia unitária

Por linha:

`contribuição = receita_própria − tributos(receita_própria) − PSP_alocado − ops − executor_se_custo − repasse_terceiros_se_despesa − reembolso − chargeback − aquisição − suporte`

Variáveis **obrigatórias de conhecer** antes de preço: take rate efetivo, alocação da taxa PSP, regime tributário, ticket médio, taxa de conclusão, taxa de chargeback, CAC por território, intervalo entre produções (retenção).

Métricas: CAC, LTV, churn, retention, take rate, contribution margin, payback, ARPU, receita/território, receita/profissional, receita/parceiro — **todas sem dado**; medir depois da primeira operação real. **Não inventar.**

**Take alto vs baixo:** take alto aumenta margem unitária e desintermediação; take baixo exige volume e recorrência (presença + institucional + várias produções). Para **esta** marca, take moderado na produção + recorrência em presença institucional é o equilíbrio **conceitual**. `[HIPÓTESE]` `[DECISÃO EMPRESARIAL]` — sem % neste documento.

---

## 15. Cenários de escala (participantes na Rede)

| n | O que quebra primeiro `[INFERÊNCIA]` |
|---|---|
| 20–100 | natureza fiscal errada; dois trilhos; payout manual |
| 500 | KYC, suporte, storage, originação em `notes` |
| 1.000 | conciliação sem ledger; admin territorial sem política de conflito |
| 10.000 | PSP + hold + fraude; equipe; custo Tigris |
| 50.000 | sem MoR claro e sem recorrência, a produção pontual **não** paga a Rede |

O modelo **melhora** a Rede se gratuidade e curadoria aguentarem. **Piora** se anúncio comprar território.

---

## 16. Matriz de riscos

| Risco | Tipo | Gravidade |
|---|---|---|
| Take alto → fuga | econômico | alta |
| Pay-to-appear por pressão comercial | identidade | existencial |
| Serviço comunitário → classificados | identidade | alta |
| MoR errado → tributo sobre bruto de terceiros | fiscal | alta |
| Chargeback sem regresso | financeiro | alta |
| `contracts` 30/70 admin | governança | alta |
| Fundo sem dono | contábil | média |
| Dual ledger | operacional | alta |
| PSP stub em “produção paga” | operacional | alta |
| Originação spam | Rede | média |
| Licença sem titularidade | jurídico | alta |
| Sagrado como SKU | reputação | alta |

---

## 17. Matriz jurídica / contábil pendente

Ver seção 27 do relatório (perguntas). Não há CNAE, alíquota nem “é legal” neste arquivo.

---

## 18. Ojú hoje × futuro

| Componente | Hoje | Compat. | Alteração futura | Prioridade | Risco | Dependência |
|---|---|---|---|---|---|---|
| Rede gratuita | Sim | Alta | nenhuma para caber no modelo | — | baixo | — |
| Policy por scope | Sim | Alta | não criar MonetizationEngine | P2 | baixo | — |
| Freeze Opportunity | Sim | Alta | — | — | baixo | — |
| Settlement | Sim | Média | unificar com mesa | P1 | médio | produto |
| Payment intent | Stub | Baixa | PSP real **depois** do contrato | P1 | alto | advogado + PSP |
| Ads | Sim | Alta | manter rótulo; nunca Home | P2 | médio | — |
| Visibilidade institucional | Sim | Alta | recorrência PSP | P2 | médio | PSP |
| Originação | Parcial | Média | coluna tipada (migration futura) | P3 | médio | migration |
| Licença | Lead | Baixa | direitos + NF | P2 | alto | advogado |
| `contracts` 30/70 | Conflita | Baixa | **não silenciar**; revisar instrumento | P1 | alto | advogado |
| Ledger | Ausente | Baixa | eventos imutáveis | P1 | alto | — |
| SaaS | Não | — | só após Rede estável | P4 | diluição | produto |
| Tabela `services` | Não | Correto | **não criar** | — | — | — |

---

## 19. O que não fazer

- Não implementar PSP, MoREngine, MonetizationEngine, tabela `services`.
- Não cobrar existência, perfil básico, território, descoberta orgânica, curadoria, posição na Home, acesso básico a convites.
- Não marketplace, leilão, ranking, estrelas, checkout de rito/serviço sagrado.
- Não colocar presença paga na Home editorial.
- Não misturar admin, executor, originador, beneficiário.
- Não automatizar originação → dinheiro.
- Não deixar admin territorial definir sozinho o split nacional.
- Não deixar o PSP definir a natureza jurídica.
- Não chamar PIX recebido de receita.
- Não alterar 5+1.
- Não “corrigir” `contracts` 70% nesta missão (só documentar).

---

## 20. Modelo recomendado

**B. Adotar com ajustes** — princípio empresarial **agora**; operação financeira **depois** das ressalvas.

```
REDE GRATUITA          → aquisição, confiança, território
+ PRODUÇÃO             → circulação e valor criado (hold + freeze)
+ PRESENÇA TERRITORIAL → recorrência identificada (não classificado)
+ ANÚNCIO ROTULADO     → comercial explícito, fora da curadoria
+ INSTITUCIONAL        → margem e missão (MoR Ojú mais natural)
+ LICENCIAMENTO        → só com titularidade
+ ORIGINAÇÃO           → incentivo no sucesso, nunca no lead
+ SAAS FUTURO          → ferramenta da Rede, não porta de entrada
```

Ajustes obrigatórios de **desenho** (futuro, não nesta missão): um contrato econômico por operação; unificar trilhos; aposentar 30/70 de admin como default; ledger; hold; originação tipada; parecer MoR.

---

## 21. Segunda melhor alternativa

**MoR total da Ojú** (cliente contrata a Ojú; executor é subcontratado). Preferível se o advogado disser que a marca já é a contratada. Mais simples de explicar; tributo potencialmente sobre o bruto; payout é despesa. `[DEPENDE DE VALIDAÇÃO EXTERNA]`

---

## 22. Modelos rejeitados

| Modelo | Por quê |
|---|---|
| Assinatura para existir | destrói gratuidade estratégica |
| Marketplace + ranking | destrói identidade; código já recusa |
| Agência única sem Rede | perde network effect e território |
| SaaS-first | dilui; não é o produto atual |
| Split único 1:N para tudo | ads/visibilidade não são o mesmo fato que produção |
| Tesouraria sem ledger | escala = falência operacional |

---

## 23. Resultado empresarial esperado

Sem números de mercado.

**Conservador:** poucas produções; visibilidade/anúncio pontuais; Ojú vive de projeto institucional + disciplina de custo; Rede cresce lenta. Motor: institucional + operação enxuta. `[HIPÓTESE]`

**Base:** ciclo gira (casas → produção → editorial → descoberta → nova casa); presença identificada gera recorrência; take moderado na produção. Motor: produção + presença + institucional. `[HIPÓTESE]`

**Ambicioso:** vários territórios; originação saudável; licença com direitos; SaaS só como adesivo. Motor: recorrência territorial + volume de operações + institucional. `[HIPÓTESE]`

Linhas estratégicas **gratuitas:** Rede, editorial, memória de participação.  
Linhas de **margem:** institucional, licença (se titular), anúncio.  
Linhas de **circulação:** produção.  
Linhas de **recorrência:** visibilidade / presença.

---

## 24. Decisões que podem ser tomadas agora (produto / empresa)

- Adotar como **tese:** operadora da Rede + produtos identificados + MoR **por linha** (não um único papel).
- Reafirmar o que **não** se monetiza (lista §22 do briefing / §19 aqui).
- Presença territorial identificada ≠ Home.
- Serviços territoriais = descoberta/contato, não checkout.
- Originação sem remuneração de lead.
- Não criar `services` / engines.
- Tratar `contracts` 30/70 como **dívida de governança** a resolver com advogado (não como modelo alvo).
- Unificar a história comercial mesa/Rede **no discurso** mesmo antes do código.

---

## 25. Decisões que devem esperar

Contador: receita vs trânsito; NF; fundo; regime; ISS; retenções; ads vs visibilidade.  
Advogado: MoR por linha; partes do contrato; chargeback; licença; culto/serviços; admin vs vínculo; CDC; LGPD/PSP.  
PSP: 1:N vs 1:1; hold Pix; refund após split; KYC misto; conciliação.  
Não escolher PSP, %, preço, CNAE.

---

## 26. Roadmap estratégico futuro (conceitual)

**Único próximo passo necessário:** parecer conjunto **advogado + contador** sobre a natureza da **produção** (prestação vs intermediação) e sobre o instrumento `contracts` 30/70 — porque isso trava MoR, NF, PSP e margem.

Não listar dezenas de missões. Depois desse parecer: unificar trilhos e ledger **no papel**; só então PoC de PSP.

---

## 27. Conclusão executiva das 27 seções pedidas

O híbrido é a leitura **honesta** do Ojú atual. A empresa sustentável não nasce de maximizar cada transação, e sim de um ciclo em que gratuidade constrói território e produtos identificados capturam valor **sem comprar editorial**. Isso é plausível estratégica e operacionalmente **em escala baixa**; em escala alta só com ledger, hold, contrato e parecer. É defensável como marca **se** a presença comercial permanecer rotulada. É coerente com o código **mais** do que qualquer modelo único.

---

## Auditoria de estruturas (pedido §8)

| Estrutura | Existe | Juízo para MoR híbrido |
|---|---|---|
| users / roles / adminAccess | Sim | Reutilizável; **não** é membership econômico |
| partnerMembers / partnerTerritories | Sim | Escopo; não beneficiário |
| professionalProfiles | Sim | Identidade Rede; suficiente |
| networkExecutors | Sim | **Parcial / conflita** (superfície paralela) |
| territories (taxonomias) | Sim | Reutilizável |
| commercialRequests | Sim | Lead; originação frágil em notes |
| networkOpportunities | Sim | Freeze; reutilizável |
| networkProductions + media | Sim | Suficiente para 5+1 |
| commercialPolicies | Sim | **Já é híbrido por scope** |
| commercialTransactions | Sim | Trilho mesa; **separar ou unificar** |
| settlements | Sim | Trilho Rede |
| refunds | Mesa sim / Rede parcial | **Precisa evoluir** |
| payments | Intent + stub | **Parcial** |
| mediaAssets / publications | Sim | Editorial; não financeiro |
| institutions + visibility subs | Sim | Produto identificado |
| advertisements | Sim | Produto identificado |
| licensing | revenueLeads | **Parcial** |
| auditEvents / notifications | Sim | Reutilizável |
| originations | JSON | **Precisa evoluir** (sem migration agora) |
| terms / authorizations | Sim | Parcial para licença |
| contracts | Sim | **Conflita** com tese de beneficiários |
| financial ledger imutável | Não | **Precisa evoluir** (conceito, não tabela agora) |

---

## Mapa de identidade econômica (pedido §9)

O sistema **já separa** em documentação: role ≠ profissão ≠ especialidade ≠ território. `[CONFIRMADO NA DOCUMENTAÇÃO]` Fase 7.

Misturas reais:

- `createdBy` da Opportunity = admin, não originador. `[CONFIRMADO NO CÓDIGO]`
- Captor de anúncio = `capturedByUserId` (pessoa da mesa), facilmente confundido com “admin ganha porque criou”. `[INFERÊNCIA]`
- `contracts.administratorSharePercent` **materializa** “admin recebe porque administra”. `[CONFIRMADO NO CÓDIGO]`
- `acceptedExecutorId` legado + `professionalProfileId` — duas identidades de executor. `[CONFIRMADO NO CÓDIGO]`

Riscos nomeados: admin recebe porque criou; profissional recebe porque administra; originador recebe porque cadastrou — os dois primeiros estão **latentes no schema de contracts**; o terceiro está **evitado** na originação atual (sem pagamento). `[CONFIRMADO NO CÓDIGO]`

---

## Governança da visibilidade (pedido §16)

O modelo econômico **não ameaça** a separação **se** ads e planos continuarem fora do `ORDER BY` da Home e do diretório. Código atual: pagamento não controla diretório; instituições comunitárias não sobem na ordem pelo plano. `[CONFIRMADO NO CÓDIGO]`  
Ameaça futura: “Destaque de parceiro” e `sponsored` na peça **também** curada — exige disciplina editorial. `[INFERÊNCIA]` risco a monitorar (já dito na arquitetura de visibilidade: `relevance` após placement).

---

## PSP (pedido §18) — requisitos, não escolha

Necessário no futuro, **depois** da natureza jurídica: Pix; hold ou payout atrasado; refund parcial; webhooks idempotentes (já há germen); conciliação; KYC CPF/CNPJ; N beneficiários **ou** MoR Ojú + transfers.

Mercado Pago: split 1:1 documentado; 1:N assessorado (estudo anterior, docs oficiais MP). Stripe Connect + Pix: MoR depende do tipo de charge (docs Stripe). **Não escolher.** `[DEPENDE DE VALIDAÇÃO EXTERNA]` atualizar no momento da PoC.

---

## Cancelamentos (pedido §19) — o que decidir, não a política

Estados a cobrir num contrato futuro: lead → proposta → aceite → pagamento → produção → entrega → cancelamento → reembolso → chargeback → disputa → falha Pix → inadimplência → incompleta → desistência (profissional / cliente / Ojú) → substituição de executor.

Hoje: Opportunity cancelável; Production `Cancelada`; refund **mesa** com teto; Rede mapeia estorno no intent. **Quem perde/recebe** em cada célula = `[DECISÃO EMPRESARIAL]` + `[DEPENDE DE VALIDAÇÃO EXTERNA]`. Não inventar política definitiva.

---

## Teste de identidade (pedido §29)

| Produto | Vendável por classificado genérico? | Depende de Rede/território/memória? |
|---|---|---|
| Rede / diretório contextual | Não da mesma forma | Sim |
| Produção documental da Rede | Parcial (qualquer produtora) | Sim, se for *desta* casa/território |
| Anúncio banner | **Sim — risco** | Só se o contexto territorial for o valor |
| Presença de casa com história | Não | Sim |
| Checkout de búzios | **Sim — risco grave** | Não deve pertencer |
| Licença de acervo Ojú | Parcial | Sim se memória Ojú |
| CRM genérico | **Sim** | Não — SaaS só se for da Rede |

---

## Teste de sustentabilidade (pedido §30)

**Pouco por operação × muitas operações:** sustenta **se** (retenção × ticket × take × (1 − fuga) × N) cobrir custo fixo. Sem N e sem recorrência, não. `[HIPÓTESE]` algébrica, sem números.

**Saiu depois da primeira:** volta por oportunidade nova, casa nova, licença, projeto, presença — seção 11.

**Ninguém contrata produção:** restam institucional, apoio, visibilidade, anúncio, licença. Empresa vira “editorial + presença”. Possível no conservador; a circulação da Rede enfraquece. `[HIPÓTESE]`

**Ninguém compra presença:** produção + institucional. Possível; recorrência cai; dependência de projeto e de take da obra. `[HIPÓTESE]`

**10.000 participantes:** quem paga infra/equipe **não** é o perfil gratuito. São (a) volume de operações, (b) recorrência institucional/presença, (c) projetos. Sem (b) e (c), (a) precisa de take que pode expulsar o profissional. `[HIPÓTESE]` — este é o argumento para **múltiplas linhas**, ou seja, para o híbrido.

---

## Teste final da tese (pedido §31)

“O Ojú não precisa ganhar muito de cada participante; precisa de uma Rede em que valor circule.”

| Critério | Juízo |
|---|---|
| Economicamente plausível | Sim, **condicional** a recorrência + institucional + take sustentável `[HIPÓTESE]` |
| Operacionalmente plausível | Hoje **não** em dinheiro real; sim em fluxo de produto `[CONFIRMADO NO CÓDIGO]` |
| Estrategicamente plausível | Sim — é a única tese que não destrói a marca `[INFERÊNCIA]` |
| Escalável | Só com ledger, PSP, governança de conflito `[INFERÊNCIA]` |
| Defensável | Sim se comercial permanecer identificado `[DECISÃO EMPRESARIAL]` |
| Coerente com a marca | Sim `[CONFIRMADO NA DOCUMENTAÇÃO]` |

---

## Decisão final (pedido §36)

### O Ojú deve adotar o MoR híbrido por linha de produto?

**SIM COM RESSALVAS.**

### O projeto atual está preparado?

Metodologia: peso igual nas seis dimensões; nota 0–100 por evidência de *capacidade de operar a linha com natureza distinta*, não por “dá para cobrar amanhã”.

| Dimensão | Nota | Motivo |
|---|---|---|
| Técnica | **58%** | Policies, freeze, ads, visibilidade, intents, predicados de visibilidade existem; PSP stub; dual rail; sem ledger |
| Operacional | **40%** | Mesas humanas fortes; payout não liquida; originação frágil; 5+1 ok |
| Comercial | **45%** | Produtos existem como carteira admin, não como jornada clara do pagador |
| Financeira | **22%** | Sem dinheiro real, sem conciliação bancária, fundo indefinido |
| Jurídica | **8%** | Termos e autorizações existem; MoR/licença/admin-share não validados |
| Fiscal | **5%** | Nenhuma escrituração das linhas no produto |

**Preparação global ponderada (média simples): ~30%.** Não usar como KPI de board; é ordem de grandeza da auditoria.

### Qual é a arquitetura econômica recomendada?

A Ojú opera a Rede de graça. Ganha quando a Rede **faz algo que cria valor identificado**: documentar (produção), dar presença comercial **rotulada**, prestar projeto institucional, licenciar **se for titular**, e só então ferramentas. Cada linha tem contrato e (no futuro) fluxo de caixa próprio. Ninguém paga para existir nem para a Home.

### Como isso muda o Ojú?

**Antes (hoje):** Rede + editorial + mesas que já *cheiram* a híbrido, mas contratos e dois caixas misturam papéis.  
**Depois (tese):** as mesas viram linhas de empresa conscientes; o dinheiro segue a natureza do produto; o admin deixa de ser sócio oculto do split; o profissional permanece porque a Rede circula, não porque está preso.

### De onde virá a receita? (estratégico)

Produção (circulação) → institucional/apoio (margem e missão) → presença/visibilidade (recorrência) → anúncio rotulado (complemento) → licença (se direitos) → originação (incentivo) → SaaS (depois).

### Por que as pessoas continuariam na Rede?

Porque o próximo cliente, a próxima casa, a próxima memória e a próxima autorização **nascem do território compartilhado**, não de um anúncio isolado — e o contato não é refém.

### Qual é o maior risco?

Tratar o híbrido como desculpa para **monetizar tudo que o schema já tem** (anúncio, plano, 70% admin, checkout de serviço comunitário) e, nisso, virar classificado e perder a Rede. O segundo risco é **tributar o bruto do fotógrafo** por MoR acidental. `[HIPÓTESE]` / `[DEPENDE DE VALIDAÇÃO EXTERNA]`

### Qual é o maior diferencial?

Território + memória + curadoria humana + produção **na mesma Rede**, sem ranking comprado.

### Qual é o próximo passo?

**Um parecer conjunto de advogado e contador** sobre (1) natureza da produção e (2) o default 30/70 de `contracts` — único gargalo que impede desenhar PSP e receita com honestidade.

---

## Git / status desta missão

Ver mensagem do agente no encerramento. Este arquivo é o único artefato intencional da missão.

**STATUS DA MISSÃO:** ver encerramento do agente (`PASS COM DÍVIDA` se o documento existir e nada de produto/PSP/banco tiver sido alterado; dívida = validação externa e conflito `contracts`/trilhos).
