# Transitar o ticket: concorrência otimista

## Objetivo

A transição do ticket de ponta a ponta e a garantia de que duas operadoras não a aplicam sobre o mesmo estado: o
repositório que grava a transição e a entrada do histórico na mesma transação, condicionado à `version` que quem chama
leu, o caso de uso que decide entre conflito e recusa, e a rota `POST /tickets/:id/transitions` com `If-Match`. Testes
contra um PostgreSQL real provam que, de duas transições concorrentes sobre a mesma `version`, só uma vence.

## Fora do escopo

- Listagem de tickets, cursor, filtros e índices de listagem.
- Duas instâncias da API contra o mesmo banco: o teste de conflito desta spec usa uma instância.
- Idempotência na criação ou na transição, tempo real (SSE), `GET /health`, `GET /ready`, OpenAPI, limites de abuso,
  CORS e cabeçalhos de segurança.
- Identidade da operadora: nenhuma rota exige autenticação.
- Editar outro campo do ticket, remover um ticket ou uma entrada do histórico.
- Mudar o domínio ou o esquema: esta spec os consome como estão, e o `UPDATE` condicional usa as colunas que já existem.
- A forma do código: a organização em arquivos e o desenho do repositório e do caso de uso são de quem implementa. O
  `UPDATE` condicional e a transação são do autor, que os escreve. Esta spec fixa só nomes públicos, tipos, invariantes
  e comportamento observável, inclusive a ordem em que o caso de uso decide.

## Contrato

A `version` do ticket nasce em 1 na criação e sobe de 1 em 1 a cada transição gravada. Quem quer transitar diz qual
`version` leu, e a transição só é gravada se o ticket ainda estiver nela.

Operação nova do repositório, com o comportamento observável:

| Operação | Recebe | Devolve | Comportamento |
| --- | --- | --- | --- |
| Gravar a transição | O `id`, a `version` esperada e o `TicketChange` de `transitTicketChange` | O `id` e a nova `version`, ou ausência | Atualiza o ticket e grava a entrada do histórico na mesma transação, só se o ticket estiver na `version` esperada e no status de origem da entrada. A `version` sobe 1. Se a condição falha, não grava nada e devolve ausência. Se a escrita da entrada falha, o ticket também não muda |

Caso de uso de transitar, com o comportamento observável:

| Situação | Resultado |
| --- | --- |
| O ticket não existe | `TicketNotFoundError`, `code` `ticket_not_found` |
| O ticket existe e a `version` esperada difere da atual | `VersionConflictError`, `code` `version_conflict`, que carrega o ticket atual com a `version` atual |
| A `version` bate e o domínio recusa a transição | O erro do domínio, com o `code` dele, e nada é gravado |
| A `version` bate e o domínio aceita | O ticket gravado com a nova `version` |
| A gravação devolve ausência (outra transição venceu a corrida) | O ticket é relido: `version_conflict` com o ticket atual, ou `ticket_not_found` se ele não existe mais |

A checagem da `version` vem antes da regra do domínio: quem está desatualizado recebe o conflito e o estado atual, nunca
uma recusa sobre um estado que já mudou.

Representação do ticket, igual à da spec 00006. A rota nova e `GET /tickets/:id` passam a devolver também o cabeçalho
`ETag` com a `version` entre aspas, como `"3"`; o 201 de `POST /tickets` não muda.

Rota nova:

| Rota | Cabeçalho | Corpo | Sucesso | Falhas |
| --- | --- | --- | --- | --- |
| `POST /tickets/:id/transitions` | `If-Match` com a `version` entre aspas, como `"3"` | `to` (texto), `resolutionNote` e `reopenReason` (texto ou nulo), as três sempre presentes | 200, o ticket no corpo e o `ETag` da nova `version` | 400, 404, 409, 422 e 428 |

O servidor carimba o instante da transição; o corpo da requisição não traz instante. O Zod valida só a forma do corpo
(objeto, as três chaves, texto ou nulo, nenhuma chave a mais); o valor de cada campo e a combinação entre eles são do
domínio.

Erros novos, no formato da spec 00006 (`application/problem+json` com `type`, `title`, `status`, `detail` e `code`):

| Situação | Status | `code` |
| --- | --- | --- |
| `If-Match` ausente | 428 | `missing_if_match` |
| `If-Match` que não é um inteiro positivo entre aspas | 400 | `invalid_if_match` |
| `version` esperada diferente da atual | 409 | `version_conflict` |
| Corpo fora da forma | 400 | `invalid_request` |
| `:id` que não é UUID | 400 | `invalid_ticket_id` |
| Ticket que não existe | 404 | `ticket_not_found` |
| Entrada que o domínio recusa | 422 | O `code` do `DomainError`, como `invalid_transition` |

O corpo do 409 traz, além dos cinco campos, o membro `ticket` com a representação do ticket atual. A ordem das checagens
da rota é: `:id`, `If-Match` ausente, `If-Match` malformado, forma do corpo; depois o caso de uso decide 404, 409 e 422
nessa ordem.

## Critérios de aceite

1. Gravar a transição com a `version` esperada deixa o ticket com o novo status, a nova nota e a `version` seguinte, e
   acrescenta exatamente uma entrada do histórico com os campos do `TicketChange`; a nota some do ticket ao reabrir e
   fica na entrada de resolução. Se a escrita da entrada falha, o ticket também não muda.
2. Gravar a transição com uma `version` que não é a atual, ou com um status de origem que não é o atual, não altera o
   ticket nem o histórico e devolve ausência.
3. De duas gravações concorrentes sobre a mesma `version`, exatamente uma devolve sucesso e a outra devolve ausência; o
   ticket termina com a `version` seguinte e uma única entrada nova.
4. O caso de uso responde `ticket_not_found` para um `id` que não existe, `version_conflict` com o ticket atual para uma
   `version` diferente da atual, o erro do domínio quando a regra recusa (sem gravar) e o ticket gravado quando tudo
   passa. Com a `version` velha e uma transição que o domínio também recusaria, a resposta é o conflito.
5. `POST /tickets/:id/transitions` com `If-Match` igual à `version` atual e um corpo válido responde 200 com o ticket no
   novo status e o `ETag` da nova `version`, e o histórico do ticket ganha a entrada.
6. `GET /tickets/:id` devolve o `ETag` igual à `version` do corpo, entre aspas.
7. A rota sem `If-Match` responde 428 `missing_if_match`; com `If-Match` que não é um inteiro positivo entre aspas
   responde 400 `invalid_if_match`; com corpo fora da forma responde 400 `invalid_request`; com `:id` que não é UUID
   responde 400 `invalid_ticket_id`; para um UUID que não existe responde 404 `ticket_not_found`. Nenhuma dessas falhas
   grava.
8. A rota com `If-Match` de uma `version` que não é a atual responde 409 `version_conflict`, com o ticket atual no
   membro `ticket`, e não grava. Repetir uma transição já aplicada, com o mesmo `If-Match`, responde 409.
9. A rota com uma transição que o domínio recusa e a `version` certa responde 422 com o `code` do domínio e não grava; a
   `version` do ticket não muda.
10. Duas requisições concorrentes à rota, com o mesmo `If-Match` e a mesma transição, terminam em um 200 e um 409, e o
    ticket tem uma só entrada nova.
11. Toda resposta de falha desta spec é `application/problem+json` com os cinco campos, e o 500 não traz mensagem nem
    pilha do erro original.
12. O `npm run check` passa, com a cobertura mínima.
13. Cada passo que introduz uma decisão (1, 2 e 4) acrescenta ao Registro de decisões do `README.md`, no conjunto dos
    seus commits, a linha de cada decisão que introduz, com a alternativa descartada e o trade-off aceito.

## Casos de teste

Os casos dos critérios 1 a 3 são de integração contra o PostgreSQL real, com o repositório e sem HTTP; o do critério 4
usa o repositório real e um relógio fixo injetado, o único dublê. Os dos critérios 5 a 11 são de integração pela
interface HTTP do servidor, sem abrir porta, contra o mesmo banco. A concorrência dos critérios 3 e 10 é provada com
duas operações disparadas juntas sobre o mesmo banco, e o assertado é o resultado final (quem venceu, `version` e
contagem de entradas), nunca a ordem em que as operações chegaram.

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Integração | Ticket criado, transitado para `in_progress`, depois `resolved` com nota, depois reaberto com motivo: o que volta de `findTicketById` é igual ao `TicketChange` gravado, a `version` é 2, 3 e 4, o histórico tem as entradas na ordem e a nota some do ticket ao reabrir e fica na entrada de resolução. Borda: uma entrada que o banco recusa (um par de status que não existe) faz a gravação falhar e o ticket volta como estava |
| 2 | Integração | Gravar com `version` 1 num ticket já na 2: devolve ausência, o ticket e o histórico não mudam. Gravar com a `version` certa e um status de origem que não é o atual: devolve ausência. Borda: `id` inexistente devolve ausência |
| 3 | Integração | Ticket aberto na `version` 1 e duas gravações disparadas juntas, ambas `open` para `in_progress`, com instantes `at` diferentes: uma devolve a `version` 2 e a outra ausência, o ticket tem a `version` 2 e uma só entrada nova, cujo `at` é o da vencedora. Repetido em 20 rodadas, cada uma com um ticket novo, para não depender de uma ordem de sorte |
| 4 | Integração | `id` inexistente: `ticket_not_found`. `version` esperada 1 num ticket na 2: `version_conflict` com o ticket atual. `version` certa e transição que o domínio recusa (resolver sem nota): o erro do domínio e a `version` intacta. `version` velha e transição inválida: o conflito. Tudo certo: o ticket com a `version` seguinte |
| 5 | Integração | Ticket aberto, `If-Match` `"1"`, `to` `in_progress` e as duas chaves nulas: 200, `status` `in_progress`, `version` 2, `ETag` `"2"` e o histórico com a entrada nova, `at` igual ao relógio injetado em ISO 8601 UTC. Resolver com nota e reabrir com motivo também respondem 200 |
| 6 | Integração | `GET /tickets/:id` de um ticket na `version` 3: `ETag` igual a `"3"` e `version` 3 no corpo |
| 7 | Integração | Sem `If-Match`: 428. `If-Match` `3`, `"abc"`, `"0"`, `"-1"`, `"1.5"`, `W/"1"` e vazio: 400 `invalid_if_match`. Corpo vazio, não objeto, JSON inválido, sem cada chave, com chave a mais, com chave de número e com `to` nulo: 400 `invalid_request`. `:id` `abc`: 400. UUID v7 que não existe: 404. Em todos, nada gravado |
| 8 | Integração | `If-Match` `"1"` num ticket na `version` 2: 409, `code` `version_conflict`, `ticket` igual ao ticket atual campo a campo, nada gravado. A mesma transição repetida com o mesmo `If-Match` depois de aplicada: 409 |
| 9 | Integração | Com a `version` certa, 422 e o `code` indicado, e a `version` e o histórico não mudam. Ticket aberto: `to` `resolved` com nota e `to` `open` com motivo, `invalid_transition`; `to` `in_progress` com nota, `unexpected_resolution_note`; `to` `in_progress` com motivo, `unexpected_reopen_reason`; `to` `closed`, `invalid_transition`. Ticket em andamento: `to` `resolved` sem nota, `missing_resolution_note`. Ticket resolvido: `to` `open` sem motivo, `missing_reopen_reason`; `to` `in_progress`, `invalid_transition` |
| 10 | Integração | Ticket aberto e duas requisições disparadas juntas com `If-Match` `"1"` e a mesma transição para `in_progress`: um 200 e um 409, e o histórico tem uma só entrada nova. Repetido em 20 rodadas, cada uma com um ticket novo |
| 11 | Integração | Cada falha dos casos 7 a 10 e um erro interno provocado por um banco indisponível: tipo de mídia, cinco campos e `status` do corpo igual ao da linha de status; o 500 não contém o texto do erro original |
| 12 | Regressão | O `npm run check` sai com 0 sobre a árvore sem alterações |
| 13 | Regressão | Em cada passo de 1, 2 e 4, o diff acumulado dos commits do passo traz as linhas novas do Registro de decisões, com as três colunas preenchidas |

## Restrições

- Nenhuma dependência nova: a spec usa o `pg`, o `fastify` e o `zod` que já estão no manifesto.
- O Zod valida só a forma do corpo; o valor de cada campo é do domínio, que continua o único dono do que vale.
- O repositório usa o `pg` com SQL escrito à mão e a conexão das variáveis `PG*`; nenhum segredo entra no repositório.
- O relógio entra por argumento, como no domínio: o caso de uso recebe o instante, e só a rota o lê do relógio do
  servidor.
- O domínio não importa nada de fora dele, e o caso de uso e o repositório não são importados por ele.
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

1. O repositório: gravar a transição condicionada à `version` e ao status de origem, com a entrada do histórico na mesma
   transação. O Registro de decisões ganha as linhas da concorrência otimista pela `version` e da ausência como sinal de
   conflito. Prova: critérios 1, 2 e 13.
2. O caso de uso de transitar, que recebe o instante e a `version` esperada, com o erro `version_conflict` (da família
   `ApplicationError`) e a entrada dele, com status 409, no mapeador de erros, para o `check` fechar verde. O Registro
   ganha as linhas da checagem da versão antes da regra do domínio e da resposta de conflito com o ticket atual. Prova:
   critérios 4 e 13.
3. O teste de conflito do repositório, duas gravações concorrentes sobre a mesma `version`. Prova: critério 3.
4. A rota: o Zod da forma do corpo, a leitura do `If-Match`, o `ETag` e o membro `ticket` do 409, os erros
   `missing_if_match` e `invalid_if_match` (da família `InterfaceError`), e os tipos do pedido e da resposta em
   `packages/contract`. O Registro ganha a linha do `If-Match` e do `ETag` pela `version`, com 409 em vez do 412. Prova:
   critérios 5 a 9, 11 e 13.
5. O teste HTTP da corrida e o fechamento: o `check` inteiro e a conferência dos critérios. Prova: critérios 10 e 12.
