# Capacidade de storage — recálculo (Beta Ojú)

**Tipo:** análise isolada de capacidade.  
**Escopo:** somente GB acumulados de JPG + miniclipe no object storage.  
**Não faz:** alteração de código, merge com outras auditorias, mudança de Tigris/R2/Aiven/Render.  
**Erro corrigido:** o relatório anterior usou **2,4 GB** na coluna *provável* para 5 usuários. Esse número é o **conservador** (≈ 2,46 GB). No cenário *provável* a conta correta é **24 GB/ano**.

---

## Premissas (iguais nos três cenários, salvo onde indicado)

| Premissa | Conservador | Provável | Pesado |
|---|---|---|---|
| JPG por registro | 5 | 5 | 5 |
| Miniclipe por registro | 1 | 1 | 1 |
| MB por JPG | **2,5** | **5** | **10** |
| MB por miniclipe (≤ 60 s) | **8** | **25** | **50** |
| MB por registro | 5×2,5 + 8 = **20,5** | 5×5 + 25 = **50** | 5×10 + 50 = **100** |
| Registros / usuário / mês | **2** | **8** | **20** |
| Período | 12 meses | 12 meses | 12 meses |
| Usuários ativos | 5 / 10 / 20 / 50 / 100 | idem | idem |

Fórmula:

```
GB/ano = (MB_por_registro × registros_por_mês × 12 × usuários) / 1024
```

Aqui **1 GB = 1024 MB**. Valores arredondados a 2 casas.

**Fora desta conta (não somados):** GET da Home em loop, PDFs de termo, áudio de memória oral, anúncios, objetos órfãos, versões, lixeira ainda no bucket, tráfego de download.

---

## Conta explícita — 5 usuários

### Conservador

20,5 × 2 × 12 × 5 = **2 460 MB** → **2,40 GB**

### Provável (onde estava o erro)

50 × 8 × 12 × 5 = **24 000 MB** → **23,44 GB** (≈ **24 GB**)

Não é 2,4 GB. Faltava um zero: 50 × 8 = 400 MB/usuário/mês; × 12 = 4 800 MB/usuário/ano ≈ 4,69 GB/usuário; × 5 ≈ **23,44 GB**.

### Pesado

100 × 20 × 12 × 5 = **120 000 MB** → **117,19 GB**

---

## Por usuário / ano (atalho)

| Cenário | MB / usuário / mês | GB / usuário / ano |
|---|---|---|
| Conservador | 20,5 × 2 = 41 | 492 MB ≈ **0,48 GB** |
| Provável | 50 × 8 = 400 | 4 800 MB ≈ **4,69 GB** |
| Pesado | 100 × 20 = 2 000 | 24 000 MB ≈ **23,44 GB** |

Multiplicar pela quantidade de usuários.

---

## 5 / 10 / 20 / 50 / 100 usuários — 12 meses

| Usuários | Conservador | Provável | Pesado |
|---|---|---|---|
| 5 | **2,40 GB** | **23,44 GB** | **117,19 GB** |
| 10 | **4,80 GB** | **46,88 GB** | **234,38 GB** |
| 20 | **9,61 GB** | **93,75 GB** | **468,75 GB** |
| 50 | **24,02 GB** | **234,38 GB** | **1 171,88 GB** |
| 100 | **48,05 GB** | **468,75 GB** | **2 343,75 GB** |

Checagem: 10 usuários = 2× o de 5; 20 = 4×; 50 = 10×; 100 = 20×.

---

## Ritmo mensal (acúmulo, não “por mês de fatura de GB-mês” misturado)

GB-mês de armazenamento cresce com o acervo. O **incremento** por mês:

| Usuários | Conservador / mês | Provável / mês | Pesado / mês |
|---|---|---|---|
| 5 | 0,20 GB | **1,95 GB** | 9,77 GB |
| 10 | 0,40 GB | **3,91 GB** | 19,53 GB |
| 20 | 0,80 GB | **7,81 GB** | 39,06 GB |
| 50 | 2,00 GB | **19,53 GB** | 97,66 GB |
| 100 | 4,00 GB | **39,06 GB** | 195,31 GB |

Quando o acervo **passa** o free (Tigris 5 GB / R2 10 GB), no cenário *provável* com **5 usuários**:

- Tigris 5 GB: ≈ **2,6 meses** (5 / 1,95)
- R2 10 GB: ≈ **5,1 meses** (10 / 1,95)

Conservador 5 usuários: Tigris 5 GB aguenta o **ano** (2,40 GB).  
Pesado 5 usuários: Tigris free acaba na **primeira quinzena**.

---

## Free publicado (referência, não medido na conta Ojú)

| | Tigris | Cloudflare R2 |
|---|---|---|
| Storage free | 5 GB | 10 GB |
| Class A (PUT etc.) | 10 000 / mês | 1 000 000 / mês |
| Class B (GET) | 100 000 / mês | 10 000 000 / mês |
| Egress | 0 | 0 |

Writes no *provável* 5 usuários: 8 registros × 6 arquivos × 5 ≈ **240 PUT/mês** — cabe nos dois.

GET da Home **não** entra na tabela de GB; no Tigris free (100 mil GET) continua o risco maior de **tráfego de miniclipe**, independente desta correção de GB.

---

## Tigris continua válido?

**Como tecnologia (S3 no código atual): sim.** Não migrar agora. O adapter, purge e `S3_*` no Render não mudam por causa desta conta.

**Como “Beta de 5 usuários cabe o ano inteiro no free do Tigris”: não**, no cenário **provável**.

| Leitura | Conclusão |
|---|---|
| Conservador, 5 usuários, 12 meses | Tigris **free** ainda fecha em GB (2,40 &lt; 5). GET da Home é outro teto. |
| Provável, 5 usuários | **Pagar Tigris por volta do 3º mês** (~24 GB no ano; ~US$ 0,02/GB acima de 5 GB → dezenas de centavos a poucos dólares/mês, não justificam migração). |
| Pesado, 5 usuários | Pagar **já no 1º mês**. |
| R2 só pelos 10 GB | Atrasa o pagamento ~2–3 meses no *provável*. Não elimina pagar no ano. Custo de copiar objetos &gt; economia do free extra. |
| 10+ usuários no *provável* | Storage **pago** de qualquer fornecedor S3. Arquitetura segue a mesma. |

**Recomendação revista (capacidade):**

1. Continuar **Tigris** (já ligado ao projeto).  
2. **Não** migrar para R2 por causa desta planilha.  
3. Tratar o Beta de 5 fotógrafos no ritmo *provável* como **Tigris pago cedo**, não como “5 GB para sempre”.  
4. Se o ritmo real for o *conservador*, o free Tigris em **GB** aguenta 5 usuários um ano; medir GET da Home à parte.  
5. Quotas de produto (5 JPG + 1 clipe) não mudam. Quotas de infra do relatório antigo (alerta 3 GB / bloqueio 4,5 GB) fazem sentido para **não estourar o free sem perceber**; no *provável* esses alertas disparam em **~2 meses**.

---

## O que esta nota não substitui

Não substituí o relatório GO WITH FIXES, Render, Aiven, segurança ou upload. Só a **tabela de GB** e a leitura do **free Tigris vs 5–100 usuários**.
