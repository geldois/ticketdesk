# Listar os tickets: cursor e filtros

## Objetivo

A listagem de tickets de ponta a ponta: o índice que sustenta a ordem, o repositório que lê uma página a partir de uma
posição, o caso de uso que decide se há próxima página, e a rota `GET /tickets` com paginação por cursor, filtros por
`status` e `channel` e o cursor da próxima página no cabeçalho `Link`. Testes contra um PostgreSQL real provam que
percorrer todas as páginas devolve cada ticket exatamente uma vez, inclusive com instantes iguais ou que diferem só em
microssegundos.

## Fora do escopo

- Outra ordenação, busca por texto, filtro por `priority`, por intervalo de datas ou por vários valores de um mesmo
  filtro, contagem total e página anterior.
- Cursor assinado ou com validade: o cursor é opaco, não protegido, e forjá-lo só muda a posição da leitura.
- Índice por filtro: o índice desta spec é o da ordem.
- Paginação do histórico de um ticket, que segue sem paginação como na spec 00006.
- CORS, inclusive expor o cabeçalho `Link` a outra origem, tempo real (SSE), `GET /health`, `GET /ready`, OpenAPI,
  idempotência, limites de abuso e o front.
- Mudar o domínio ou as colunas do ticket: esta spec acrescenta só um índice e consome o resto como está.
- A forma do código: a organização em arquivos, o SQL e o desenho do repositório e do caso de uso são de quem
  implementa. Esta spec fixa só nomes públicos, tipos, invariantes e comportamento observável.

## Contrato

A lista é ordenada por `created_at` decrescente e, em empate, por `id` decrescente. Uma página tem até `limit` tickets.
O cursor marca a posição do último ticket entregue, e a página seguinte começa no ticket imediatamente depois dessa
posição, na mesma ordem.

Esquema novo, em uma migration:

| Objeto | Definição |
| --- | --- |
| Índice `ticket_created_at_id_idx` | Em `ticket`, sobre `created_at` decrescente e `id` decrescente; o nome segue o que o próprio PostgreSQL daria, `<tabela>_<colunas>_idx` |

Operação nova do repositório, com o comportamento observável:

| Operação | Recebe | Devolve | Comportamento |
| --- | --- | --- | --- |
| Listar os tickets | Filtros opcionais `status` e `channel`, a posição opcional de partida e o número de tickets pedido | Os tickets na ordem da lista, cada um com a sua `version`, e a posição de cada um | Aplica os filtros com E, começa logo depois da posição de partida, ou no início se ela falta, e devolve no máximo o número pedido |

A posição de um ticket guarda o `created_at` sem perda de precisão, microssegundos incluídos, exatamente como o banco o
devolve, e o `id`. Uma posição que perde precisão pula ou repete tickets na borda da página.

Caso de uso de listar, com o comportamento observável:

| Situação | Resultado |
| --- | --- |
| Há mais tickets depois da página | Os `limit` tickets da página e a posição de partida da página seguinte |
| A página é a última, mesmo com exatamente `limit` tickets | Os tickets e nenhuma posição seguinte |
| Nenhum ticket combina | Lista vazia e nenhuma posição seguinte |

Rota nova:

| Rota | Parâmetros de consulta | Sucesso | Falhas |
| --- | --- | --- | --- |
| `GET /tickets` | `status`, `channel`, `limit` (inteiro de 1 a 100, padrão 20) e `cursor`, todos opcionais | 200 e um array de tickets, cada um na representação da spec 00006, que já traz a `version` | 400 |

Sem `ETag`, porque a lista não é um recurso que se condiciona. O cursor é opaco para quem consome. Por dentro, é o
base64url de um objeto JSON com exatamente duas chaves: `createdAt`, um texto ISO 8601 com data, hora, fração de até
seis dígitos e o deslocamento `Z` ou `±hh:mm`, e `id`, um UUID.

Com tickets depois da página, a resposta traz o cabeçalho `Link` com `rel="next"`, cujo alvo é um caminho relativo
(`/tickets?...`) com, nesta ordem, `status` e `channel` quando foram informados, o `limit` efetivo e o `cursor` da
página seguinte. Na última página não há `Link`. Os parâmetros fora desse conjunto, repetidos ou vazios são recusados. O
`limit` só tem dígitos decimais, sem sinal e sem zero à esquerda.

Erros, no formato da spec 00006 (`application/problem+json` com `type`, `title`, `status`, `detail` e `code`):

| Situação | Status | `code` |
| --- | --- | --- |
| `status` ou `channel` fora dos valores do domínio, vazio ou repetido | 400 | `invalid_request` |
| `limit` que não é inteiro de 1 a 100 nas regras acima, vazio ou repetido | 400 | `invalid_request` |
| Parâmetro de consulta que a rota não conhece | 400 | `invalid_request` |
| `cursor` vazio, repetido ou que não decodifica para um `createdAt` e um `id` válidos | 400 | `invalid_cursor` |

A forma dos filtros e do `limit` é checada antes do cursor. Um cursor bem formado que aponta para uma posição sem ticket
é aceito, e a lista segue dali. O cursor vale com qualquer combinação de filtros: ele só marca a posição.

## Critérios de aceite

1. Depois das migrations, existe o índice `ticket_created_at_id_idx` sobre `created_at` e `id`, ambos decrescentes.
2. O repositório lista os tickets em `created_at` decrescente e, em empate, em `id` decrescente, no máximo o número
   pedido, cada um com a sua `version`.
3. Com a posição do último ticket de uma página, o repositório devolve a página seguinte começando no ticket
   imediatamente depois; percorrer as páginas devolve cada ticket exatamente uma vez, inclusive com `created_at` iguais
   e com `created_at` que diferem só em microssegundos.
4. Os filtros `status` e `channel`, sozinhos ou juntos, restringem cada página, e percorrer as páginas filtradas devolve
   cada ticket que combina exatamente uma vez.
5. O caso de uso devolve a posição seguinte só quando há mais tickets depois da página, inclusive quando a última página
   tem exatamente `limit` tickets e quando nenhum ticket combina.
6. `GET /tickets` sem parâmetros responde 200 com um array de até 20 tickets, na ordem da lista, cada um na
   representação da spec 00006, e sem `Link` quando tudo cabe na página.
7. Com tickets depois da página, a resposta traz o `Link` com `rel="next"`, em caminho relativo, repetindo `status`,
   `channel` e o `limit` efetivo e levando o `cursor` da página seguinte; seguir o `Link` devolve a página seguinte.
8. `status` e `channel` pela rota restringem a lista como no critério 4.
9. `limit` de 1 a 100 limita a página; sem `limit`, a página tem 20; fora da faixa ou não inteiro responde 400
   `invalid_request`.
10. `status` ou `channel` desconhecido, vazio ou repetido, e um parâmetro de consulta desconhecido, respondem 400
    `invalid_request`.
11. Um `cursor` que não decodifica para um `createdAt` e um `id` válidos responde 400 `invalid_cursor`, nunca 500; um
    `cursor` bem formado de uma posição sem ticket responde 200.
12. Toda resposta de falha desta spec é `application/problem+json` com os cinco campos, e o 500 não traz mensagem nem
    pilha do erro original.
13. Percorrer a rota seguindo o `Link` de página em página, com e sem filtros, devolve cada ticket exatamente uma vez, e
    a última página não traz `Link`.
14. O `npm run check` passa, com a cobertura mínima.
15. Cada passo que introduz uma decisão (1, 2 e 4) acrescenta ao Registro de decisões do `README.md`, no conjunto dos
    seus commits, a linha de cada decisão que introduz, com a alternativa descartada e o trade-off aceito.

## Casos de teste

Os casos dos critérios 1 a 4 são de integração contra o PostgreSQL real, com o repositório e sem HTTP; o do critério 5
usa o repositório real. Os dos critérios 6 a 13 são de integração pela interface HTTP do servidor, sem abrir porta,
contra o mesmo banco. Os tickets de empate e de microssegundos são inseridos direto no banco, porque o domínio só gera
instantes em milissegundos.

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Integração | Consulta ao catálogo do banco depois das migrations: o índice existe em `ticket`, com as colunas `created_at` e `id`, nessa ordem e ambas decrescentes |
| 2 | Integração | Cinco tickets com `created_at` distintos, inseridos fora de ordem: a lista volta do mais novo ao mais antigo, e o número pedido corta a lista. Dois tickets com o mesmo `created_at`: o de `id` maior vem primeiro. Cada ticket traz a `version`. Borda: tabela vazia devolve lista vazia; número pedido maior que o total devolve todos |
| 3 | Integração | Tickets com `created_at` iguais e outros que diferem só em microssegundos (por exemplo `.123456` e `.123457`): páginas de 1 e de 2 percorridas pela posição do último ticket devolvem a mesma sequência de uma leitura única, sem pular nem repetir. Borda: a posição de um ticket no meio de um empate continua no empatado seguinte |
| 4 | Integração | Tickets de status e canais misturados: `status` sozinho, `channel` sozinho e os dois juntos devolvem só os que combinam, na ordem, e percorrer as páginas filtradas devolve cada um uma vez. Borda: filtro que nada combina devolve lista vazia |
| 5 | Integração | Com 5 tickets e `limit` 2: a primeira página traz a posição seguinte, a terceira (1 ticket) não. Com 4 tickets e `limit` 2: a segunda página tem 2 tickets e nenhuma posição seguinte. Sem tickets: lista vazia e nenhuma posição seguinte |
| 6 | Integração | 3 tickets criados pela rota: 200, array de 3 na ordem da lista, cada item igual à representação do `GET /tickets/:id`, sem `Link`. Com 21 tickets: 20 itens e um `Link`. Borda: banco vazio responde 200 e `[]` |
| 7 | Integração | Com 3 tickets e `limit=2&status=open&channel=chat`: `Link` com `rel="next"`, caminho relativo, parâmetros na ordem `status`, `channel`, `limit`, `cursor`; fazer a requisição do alvo devolve o ticket restante e nenhum `Link`. Sem filtros, o `Link` traz só `limit` e `cursor`. O `limit` efetivo aparece mesmo quando a requisição não o informou |
| 8 | Integração | Tickets de status e canais misturados: cada filtro e a combinação devolvem só os que combinam, na ordem |
| 9 | Integração | `limit=1`, `limit=100` e o padrão 20 limitam a página. `limit` `0`, `101`, `-1`, `+5`, `01`, `1e1`, `1.5`, `abc`, vazio e repetido: 400 `invalid_request` |
| 10 | Integração | `status=closed`, `status=`, `status=open&status=resolved`, `channel=sms`, `channel=`, `channel=chat&channel=email` e `foo=1`: 400 `invalid_request` |
| 11 | Integração | `cursor` vazio, repetido (`cursor=a&cursor=b`), texto que não é base64url, base64url de texto que não é JSON, JSON que não é objeto, objeto sem `createdAt`, sem `id`, com chave a mais, com `id` que não é UUID e com `createdAt` fora do formato (`ontem`, `2026-13-45T00:00:00Z`, sem deslocamento, mais de seis casas de fração): 400 `invalid_cursor`. `limit=0` junto de um cursor inválido: 400 `invalid_request` (a forma vem antes). Cursor bem formado de uma posição sem ticket: 200 |
| 12 | Integração | Cada falha dos casos 9 a 11 e um erro interno provocado por um banco indisponível: tipo de mídia, cinco campos e `status` do corpo igual ao da linha de status; o 500 não contém o texto do erro original |
| 13 | Integração | 45 tickets, com empates de `created_at`, criados direto no banco: seguir o `Link` de 20 em 20 devolve 45 `id` distintos na ordem da lista; o mesmo com `status` e com `channel`; a última resposta não traz `Link` |
| 14 | Regressão | O `npm run check` sai com 0 sobre a árvore sem alterações |
| 15 | Regressão | Em cada passo de 1, 2 e 4, o diff acumulado dos commits do passo traz as linhas novas do Registro de decisões, com as três colunas preenchidas |

## Restrições

- Nenhuma dependência nova: a spec usa o `pg`, o `fastify` e o `zod` que já estão no manifesto.
- O Zod valida a forma da consulta e a do cursor decodificado, com objetos estritos; o valor de cada filtro é conferido
  contra os valores do domínio.
- O repositório usa o `pg` com SQL escrito à mão e a conexão das variáveis `PG*`; todo valor da consulta vai por
  parâmetro, nunca concatenado ao texto do SQL; nenhum segredo entra no repositório.
- A migration traz o lado de reversão.
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

1. A migration do índice `ticket_created_at_id_idx`, com o teste do esquema. O Registro de decisões ganha a linha do
   índice sobre a ordem da lista, sem índice por filtro. Prova: critérios 1 e 15.
2. O repositório: listar os tickets com filtros e posição de partida, e a posição de cada ticket com o instante sem
   perda de precisão. O Registro ganha a linha do cursor por posição `(created_at, id)` com o valor bruto do instante.
   Prova: critérios 2, 3, 4 e 15.
3. O caso de uso de listar, que pede um ticket a mais que a página para saber se há próxima. Prova: critério 5.
4. A rota: o Zod da consulta, a decodificação do cursor, o erro `invalid_cursor` (da família `InterfaceError`) e a
   entrada dele no mapeador, o cabeçalho `Link`, e os tipos em `packages/contract`. O Registro ganha a linha do cursor
   no `Link` com caminho relativo e do `invalid_cursor` próprio. Prova: critérios 6 a 12 e 15.
5. O teste HTTP do percurso completo e o fechamento: o `check` inteiro e a conferência dos critérios. Prova: critérios
   13 e 14.
