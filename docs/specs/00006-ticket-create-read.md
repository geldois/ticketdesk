# Criar e ler o ticket: repositório e rotas

## Objetivo

A primeira fatia vertical do sistema: o repositório que grava o ticket e a primeira entrada do histórico na mesma
transação e os lê de volta, e três rotas HTTP sobre ele, `POST /tickets`, `GET /tickets/:id` e
`GET /tickets/:id/history`. Toda falha sai como `application/problem+json`, com um `code` estável. Testes contra um
PostgreSQL real provam que o que o domínio produz volta do banco igual e que a API traduz cada falha no status certo.

## Fora do escopo

- Transições, `UPDATE` condicional, a semântica da `version`, `ETag`, `If-Match` e concorrência. A gravação da saída de
  `transitTicketChange` e a leitura dela de volta, que é a metade restante do critério 9 da spec 00005, nascem com a
  spec da concorrência.
- Listagem de tickets, cursor, filtros e índices de listagem.
- Idempotência na criação, tempo real (SSE), `GET /health`, `GET /ready`, OpenAPI, limites de abuso, CORS e cabeçalhos
  de segurança.
- Identidade da operadora: nenhuma rota exige autenticação.
- O serviço `api` do compose e a imagem dele: a API é exercitada pelos testes, sem contêiner próprio.
- Remover, editar ou reordenar um ticket ou uma entrada do histórico: nenhuma rota faz isso.
- Mudar o domínio ou o esquema: esta spec só os consome.
- A forma do código: a organização em arquivos, o desenho do repositório e dos casos de uso e os testes são de quem
  implementa. O repositório, a transação dele e o mapeador de erros são do autor, que os escreve. Esta spec fixa só
  nomes públicos, tipos, invariantes e comportamento observável.

## Contrato

O repositório guarda e devolve o que o domínio produz, mais o que só o banco conhece: o `id` e a `version` do ticket.

Operações do repositório, com o comportamento observável:

| Operação | Recebe | Devolve | Comportamento |
| --- | --- | --- | --- |
| Gravar a criação | O `TicketChange` de `createTicketChange` | O `id` e a `version` do ticket gravado | Grava o ticket e a entrada do histórico na mesma transação: se uma das duas escritas falha, nenhuma fica. A `version` volta 1 |
| Achar o ticket | O `id` | O ticket com `id` e `version`, ou ausência | Devolve os campos do domínio iguais aos gravados, texto normalizado inclusive e instante igual ao milissegundo |
| Listar o histórico | O `id` do ticket | As entradas do domínio, sem identificador | Na ordem em que foram gravadas; um `id` sem entradas, existente ou não, devolve lista vazia, e quem decide o 404 é o caso de uso, que acha o ticket antes |

Representação do ticket, em JSON:

| Campo | Tipo | Origem |
| --- | --- | --- |
| `id` | texto, UUID | O `id` do ticket |
| `customerName` | texto | O domínio |
| `description` | texto | O domínio |
| `channel` | `chat`, `email` ou `phone` | O domínio |
| `priority` | `low`, `medium` ou `high` | O domínio |
| `status` | `open`, `in_progress` ou `resolved` | O domínio |
| `resolutionNote` | texto ou nulo | O domínio |
| `version` | inteiro | O banco |
| `createdAt` | texto, instante ISO 8601 em UTC | O domínio |

Representação de uma entrada do histórico, em JSON: `from` (status ou nulo), `to`, `resolutionNote` (texto ou nulo),
`reopenReason` (texto ou nulo) e `at` (instante ISO 8601 em UTC). A entrada nunca traz o identificador do banco.

Rotas:

| Rota | Corpo | Sucesso | Falhas |
| --- | --- | --- | --- |
| `POST /tickets` | `customerName`, `description`, `channel` e `priority`, todos texto | 201, cabeçalho `Location` com `/tickets/<id>` e o ticket no corpo | 400 e 422 |
| `GET /tickets/:id` | (nenhum) | 200 e o ticket | 400 e 404 |
| `GET /tickets/:id/history` | (nenhum) | 200 e a lista das entradas, na ordem em que foram gravadas | 400 e 404 |

O servidor carimba o instante de criação; o corpo da requisição não traz instante.

Erros: toda resposta de falha tem o tipo de mídia `application/problem+json` e os campos `type`, `title`, `status`,
`detail` e `code`.

| Situação | Status | `code` |
| --- | --- | --- |
| JSON com sintaxe inválida, corpo que não é um objeto, campo faltando, campo que não é texto ou campo desconhecido | 400 | `invalid_request` |
| `:id` que não é um UUID | 400 | `invalid_ticket_id` |
| Entrada que o domínio recusa | 422 | O `code` do `DomainError`, como `invalid_customer_name` |
| Ticket que não existe | 404 | `ticket_not_found` |
| Rota que não existe | 404 | `route_not_found` |
| Qualquer outra falha | 500 | `internal_error` |

## Critérios de aceite

1. Gravar a criação deixa exatamente um ticket com `version` 1 e uma entrada do histórico, com os campos do
   `TicketChange`; se a escrita da entrada falha, o ticket também não fica.
2. Achar o ticket devolve os campos gravados iguais aos do domínio, com o texto normalizado e o instante igual ao
   milissegundo; um `id` que não existe devolve ausência.
3. Listar o histórico devolve as entradas na ordem em que foram gravadas e sem identificador; um `id` sem entradas
   devolve lista vazia.
4. `POST /tickets` com um corpo válido responde 201, com `Location` apontando para o ticket e o ticket no corpo, em
   `status` `open`, `resolutionNote` nulo e `version` 1, e `createdAt` o instante do relógio do servidor.
5. `POST /tickets` com corpo malformado responde 400 `invalid_request`: nenhum campo obrigatório pode faltar e nenhum
   campo desconhecido pode sobrar.
6. `POST /tickets` com um valor que o domínio recusa responde 422 com o `code` do erro do domínio, e nada é gravado.
7. `GET /tickets/:id` responde 200 com o ticket gravado, 400 `invalid_ticket_id` para um `:id` que não é UUID e 404
   `ticket_not_found` para um UUID que não existe.
8. `GET /tickets/:id/history` responde 200 com a entrada de criação (`from` nulo, `to` `open`) de um ticket
   recém-criado, 400 `invalid_ticket_id` e 404 `ticket_not_found` nos mesmos casos.
9. Toda resposta de falha, inclusive a de rota inexistente e a de erro interno, é `application/problem+json` com os
   cinco campos do contrato; o `500` não traz mensagem nem pilha do erro original.
10. Nenhuma resposta traz o identificador numérico do banco de uma entrada do histórico.
11. O `npm run check` passa, com a cobertura mínima.
12. Cada passo que introduz uma decisão (2 e 4) acrescenta ao Registro de decisões do `README.md`, no conjunto dos seus
    commits, a linha de cada decisão que introduz, com a alternativa descartada e o trade-off aceito.

## Casos de teste

Os casos dos critérios 1 a 3 são de integração contra o PostgreSQL real, com o repositório e sem HTTP. Os dos critérios
4 a 10 são de integração pela interface HTTP do servidor, sem abrir porta, contra o mesmo banco; o caso 6 roda também
pelos casos de uso, sem HTTP. O instante vem de um relógio fixo injetado, o único dublê, porque o relógio é a fronteira
que o projeto não controla. Nenhuma rota grava uma transição nesta spec, então o teste que precisa de mais de uma
entrada a insere por SQL direto.

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Integração | Depois de gravar, o banco tem um ticket e uma entrada com os campos do `TicketChange`. Borda: uma entrada que o banco recusa (um par de status que não existe) faz a gravação falhar, e a contagem de tickets não muda |
| 2 | Integração | `createTicketChange` com nome com espaços nas pontas e texto com letra fora do plano básico: o que volta é igual ao do domínio, e o instante é igual ao milissegundo. Bordas: `id` inexistente; instante com milissegundos |
| 3 | Integração | Uma entrada gravada pela criação e uma segunda inserida por SQL direto voltam na ordem da gravação. Bordas: um `id` sem entradas devolve lista vazia; entradas de outro ticket não aparecem; nenhuma tem campo de identificador |
| 4 | Integração | Corpo válido: status 201, `Location` igual a `/tickets/` mais o `id` do corpo, e os nove campos do contrato com os valores enviados, `status` `open`, `resolutionNote` nulo e `version` 1. Borda: `createdAt` é o instante do relógio injetado, em ISO 8601 UTC |
| 5 | Integração | JSON inválido, corpo vazio, não objeto, sem cada campo, com um campo de número e com um campo desconhecido: 400 `invalid_request`, e nada gravado |
| 6 | Integração | Nome com `$`, descrição vazia, `channel` `fax`, `priority` `urgent`: 422 e o `code` do domínio; a contagem de tickets não muda. Roda também pelo caso de uso, que lança o erro do domínio |
| 7 | Integração | Ticket criado: 200 com o corpo igual ao do 201, campo a campo. `:id` `abc`: 400. UUID v7 que não existe: 404 |
| 8 | Integração | Recém-criado: lista de uma entrada com `from` nulo, `to` `open`, `resolutionNote` e `reopenReason` nulos e `at` igual ao `createdAt` do ticket, em ISO 8601 UTC. `:id` `abc`: 400. UUID que não existe: 404 |
| 9 | Integração | Cada falha dos casos anteriores, uma rota inexistente e um erro interno provocado por um banco indisponível (a conexão aponta para uma porta sem banco): tipo de mídia, cinco campos e `status` do corpo igual ao da linha de status da resposta; o 500 não contém o texto do erro original |
| 10 | Integração | Nos corpos de `GET /tickets/:id/history` e de `POST /tickets`, a serialização não contém um campo `id` dentro de uma entrada nem o número do identificador de banco da entrada |
| 11 | Regressão | O `npm run check` sai com 0 sobre a árvore sem alterações |
| 12 | Regressão | Em cada passo de 2 e 4, o diff acumulado dos commits do passo traz as linhas novas do Registro de decisões, com as três colunas preenchidas |

## Restrições

- Dependências novas: o servidor HTTP e a validação do corpo (`fastify` e `zod`). A versão é pesquisada ao vivo no passo
  que as instala e mora só no manifesto.
- O Zod valida só a forma do corpo (objeto, campos de texto, campos desconhecidos); o valor de cada campo é do domínio,
  que continua o único dono do que vale.
- O repositório usa o `pg`, e a conexão vem das mesmas variáveis `PG*` do `migrate`; o auxiliar de teste entrega ao
  repositório a conexão do banco de teste, sem que o código do repositório conheça o `testcontainers`. Nenhum segredo
  entra no repositório.
- O relógio entra por argumento, como no domínio: os casos de uso recebem o instante, e só a rota o lê do relógio do
  servidor.
- O domínio não importa nada de fora dele, e os casos de uso e o repositório não são importados por ele.
- O `check` é o único portão; quando ele e o `fix` rodam fora dos passos é regra do `CLAUDE.md`.

## Validação

Comandos em sintaxe de `sh`:

```sh
npm ci && git diff --exit-code package-lock.json
npm run check
```

Os dois saem com 0 sobre a árvore sem alterações, com um executor de contêineres disponível.

## Passos

Em todo passo, o `npm ci` não altera o lockfile e nenhuma versão vira faixa.

1. As dependências novas, `fastify` e `zod`. Prova: o `npm ci` não altera o lockfile, as versões são exatas e o `check`
   passa.
2. O pool de conexões lido das variáveis `PG*`, com o encerramento do pool, e o repositório: gravar a criação, achar o
   ticket e listar o histórico. O Registro de decisões ganha as linhas da transação única que grava o ticket e a
   entrada, e da entrada do histórico sem identificador na resposta. Prova: critérios 1 a 3 e 12.
3. Os casos de uso de criar e ler, que recebem o instante por argumento. Prova: o critério 6 pelo caso de uso, sem HTTP.
4. O servidor HTTP: as três rotas, o Zod e o mapeador de erros em `application/problem+json`. O Registro ganha as linhas
   do `problem+json` com o status separado entre 400 e 422, do histórico em rota própria e da divisão em que o Zod
   valida só a forma e o domínio valida o valor. Prova: critérios 4 a 10 e 12.
5. O fechamento: o `check` inteiro e a conferência dos critérios. Prova: o critério 11.
