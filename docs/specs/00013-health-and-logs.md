# Healthcheck e logs estruturados

## Objetivo

Dar à API dois endpoints de saúde, um de vida e um de prontidão do banco, e um log estruturado com uma linha JSON de
conclusão por requisição e um identificador de correlação, e fazer o compose esperar a prontidão da API em vez de só a
existência do processo. Fecha o bônus de logs estruturados e healthcheck.

## Fora do escopo

- Métricas, rastreamento distribuído e envio de log para fora do processo.
- Autenticar ou limitar a taxa dos endpoints de saúde.
- Registrar o corpo da requisição ou da resposta, a query string ou o texto livre do ticket (nome do cliente, descrição,
  nota de resolução e motivo de reabertura) em log.
- Os eventos de negócio, de banco e de ciclo de vida do processo: ficam para uma spec posterior, escrita depois que o
  logger e o `reqId` desta spec estiverem provados.
- Verificar as migrations na prontidão: ela prova só que o banco responde a uma consulta constante.
- Mudar a forma, o código de resposta ou o corpo de qualquer rota existente; a única adição às respostas existentes é o
  cabeçalho `X-Request-Id`.
- A forma do código: a organização dos arquivos, o nome da porta de prontidão e o caso de uso são de quem implementa.
  Esta spec fixa nomes públicos e comportamento observável.

## Contrato

A palavra "prontidão" nesta spec é a do banco respondendo; não tem relação com o `server.ready()` do Fastify, que a
`00009-web-shell` usa para a pasta do front.

### Saúde

| Rota | Resposta | O que prova |
| --- | --- | --- |
| `GET /health` | `200` com `{ "status": "ok" }`, sem tocar o banco | O processo está de pé |
| `GET /health/ready` | `200` com `{ "status": "ready" }` quando o banco responde a uma consulta constante | A API alcança o banco |
| `GET /health/ready` com o banco que não responde | `503` em `application/problem+json`, com `code` `not_ready`, por um prazo fixo no código | A API não deve receber tráfego |

As duas rotas aceitam só `GET` (e o `HEAD` que o Fastify acrescenta a cada `GET`): `POST /health` e `GET /health/ready/`
com barra final caem no `route_not_found` de sempre. Com o banco inacessível, as rotas de ticket seguem respondendo
`500` `internal_error`, como hoje.

O erro `not_ready` é um erro da família da interface e entra na tabela de status do tratador com `503`, ao lado dos
demais códigos.

### Log

| Item | Definição |
| --- | --- |
| Linha de conclusão | Cada requisição produz exatamente uma linha JSON com os campos `level` (o nome do nível, como `info`), `time`, `reqId`, `method`, `path` (sem a query), `status` e `durationMs`; outras linhas da mesma requisição não trazem `status` |
| Nível | `LOG_LEVEL` no ambiente, entre `fatal`, `error`, `warn`, `info`, `debug`, `trace` e `silent`, lido por `Settings` no campo `logLevel`; ausente, vazio ou só de espaços vale `info`; outro valor impede a API de subir, com `InvalidSettingsError` que nomeia `LOG_LEVEL` |
| Identificador | O cabeçalho `X-Request-Id` em toda resposta, inclusive a de erro, a de rota inexistente e a do front estático; uma requisição com um único `X-Request-Id` de 1 a 128 caracteres entre letras, números, `_` e `-` tem o valor reaproveitado, e qualquer outro caso (ausente, repetido, vazio, longo demais, com outro caractere) recebe um valor gerado; o mesmo valor está no `reqId` das linhas da requisição |
| Conteúdo | Nenhuma linha contém o corpo da requisição ou da resposta, a query string nem o texto livre do ticket (nome do cliente, descrição, nota e motivo); o `path` pode conter o `id` do ticket |
| Erro 5xx | O erro interno é registrado numa linha de nível `error` com a mensagem e a pilha; a resposta continua `internal_error` sem detalhe |
| Saúde | As duas rotas de saúde não geram linha de conclusão, para o healthcheck do compose não encher o log |
| Parâmetro | `buildServer` recebe `logger`, com `level` (um `LogLevel`) e `destination` opcional (um fluxo de escrita; ausente escreve na saída padrão); os testes existentes passam `level` `silent` |

### Compose

O serviço `api` do `compose.yaml` ganha o `LOG_LEVEL` repassado do `.env`, vazio quando ausente, e um healthcheck que
chama `GET /health/ready` na porta do próprio contêiner com o Node da imagem e só fica saudável com `200`. Nenhuma
ferramenta entra na imagem.

## Critérios de aceite

1. `GET /health` responde `200` com `{ "status": "ok" }` com o banco inacessível.
2. `GET /health/ready` responde `200` com `{ "status": "ready" }` com o banco de pé.
3. `GET /health/ready` responde `503` `not_ready` em `application/problem+json` com um banco que aceita a conexão e não
   responde.
4. `HEAD /health`, `POST /health` e `GET /health/ready/` seguem o comportamento descrito no Contrato, e as rotas de
   ticket seguem `500` `internal_error` com o banco inacessível.
5. As rotas de saúde não geram linha de conclusão, e uma chamada a `/tickets` no mesmo fluxo gera.
6. Toda resposta traz `X-Request-Id`, com a regra de reaproveitar ou gerar do Contrato, e o `reqId` das linhas da
   requisição é o mesmo valor.
7. Cada requisição, de sucesso, `400`, `404` e do front estático, gera exatamente uma linha com `status` e os campos do
   Contrato.
8. Nenhuma linha de uma criação de ticket contém a descrição, o nome do cliente, a query string nem o corpo.
9. O erro `500` é registrado numa linha de nível `error` com a pilha, e a resposta não a traz.
10. Um `LOG_LEVEL` fora da lista impede a API de subir com `InvalidSettingsError`; `silent` não escreve linha alguma.
11. O `compose.yaml` repassa o `LOG_LEVEL` e declara o healthcheck do `api` na porta do contêiner, e
    `docker compose up -d --wait` sobe a pilha descartável com 0, com o `api` saudável.
12. `npm run check` sai com 0, e o `docker build` dos alvos `migrate` e `api` segue saindo com 0.

## Casos de teste

Níveis: unitário (as configurações), integração (a API real com o banco real) e regressão (comando que sai com 0). O
"banco que não responde" é um servidor TCP local que aceita a conexão e nunca responde, no lugar do banco, porque a rede
é a fronteira que o projeto não controla.

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Integração | Com o pool fechado, `GET /health` devolve `200` e o corpo exato; a resposta não depende do banco |
| 2 | Integração | Com o banco de pé, `GET /health/ready` devolve `200` e o corpo exato |
| 3 | Integração | Com o servidor TCP que não responde como banco, `GET /health/ready` devolve `503`, `content-type` `application/problem+json` e `code` `not_ready`; com o pool fechado, o mesmo |
| 4 | Integração | `HEAD /health` responde `200` sem corpo; `POST /health` e `GET /health/ready/` respondem `404` `route_not_found`; com o pool fechado, `GET /tickets/<id>` responde `500` `internal_error` |
| 5 | Integração | Com o destino do log num fluxo de teste, uma chamada a cada rota de saúde não acrescenta linha com `status`, e uma chamada a `/tickets` no mesmo fluxo acrescenta uma |
| 6 | Integração | Um cabeçalho de 1 caractere e um de 128 voltam iguais; vazio, de 129, com espaço, com `/`, repetido e ausente recebem um gerado, sempre diferente entre si; respostas `200`, `404`, `422` e do front estático trazem o cabeçalho; o `reqId` da linha é igual ao do cabeçalho |
| 7 | Integração | Uma criação (`201`), uma leitura inexistente (`404`), uma requisição malformada (`400`) e `GET /` do front geram cada uma exatamente uma linha com `status`, e a linha lê por `JSON.parse` com os sete campos; o `status` é o da resposta |
| 8 | Integração | Criar um ticket com nome e descrição reconhecíveis e uma query string: nenhuma linha do fluxo contém esses textos, nem o corpo enviado |
| 9 | Integração | Uma rota que falha de forma inesperada devolve `500` `internal_error` sem a pilha, e o fluxo de log tem uma linha de nível `error` com a pilha |
| 10 | Unitário | `LOG_LEVEL` com `verbose`, `INFO` e `1` lança `InvalidSettingsError` nomeando a variável; ausente, vazio e só de espaços dão `info`; os sete níveis válidos passam; com `silent`, uma requisição não escreve linha |
| 11 | Regressão | Um teste de estrutura do `compose.yaml` confere o repasse do `LOG_LEVEL` e o healthcheck do `api` sobre a porta do contêiner; numa pilha descartável, `docker compose up -d --wait` sai com 0 |
| 12 | Regressão | `npm run check` sai com 0 sobre a árvore sem alterações; `docker build` dos dois alvos com 0 |

## Restrições

- Nenhuma dependência nova: o logger é o que o Fastify já traz.
- O domínio não muda.
- Um valor lido do ambiente tem um dono só, `Settings`; o resto do código recebe o nível pronto.
- O identificador vem do cliente e vai para o log e para a resposta, então a lista fechada de caracteres e o limite de
  tamanho são o que o tornam seguro.
- Identificadores, mensagens de erro e códigos são em inglês.

## Validação

Comandos em sintaxe de `sh`:

```sh
npm ci && git diff --exit-code package-lock.json
npm run check
docker build --target migrate .
docker build --target api .
docker compose --project-name probehealth up -d --wait
docker compose --project-name probehealth down --volumes
```

## Passos

1. Semimanual, critérios 1 a 4: o autor escreve o caso de uso e a consulta de prontidão, a IA escreve a sonda, a porta e
   a implementação sobre o pool, a rota, o erro `not_ready` e os testes.
2. Delegado, critérios 5 a 10: `LOG_LEVEL` em `Settings`, o logger no construtor do servidor, o `X-Request-Id`, o
   silêncio das rotas de saúde, o registro do erro `500`, os testes e a linha do `LOG_LEVEL` na tabela de configuração
   do `README.md`.
3. Delegado, critérios 11 e 12: o repasse do `LOG_LEVEL` e o healthcheck do serviço `api` no compose, o teste de
   estrutura, a passagem do `README.md` sobre como conferir a saúde e a linha do Registro de decisões.
