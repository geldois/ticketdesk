# O contrato com forma verificada: esquema único, cliente que valida e teste do cliente

## Objetivo

Fazer o contrato entre a API e o front ter um dono só e ser verificado em tempo de execução: o pacote do contrato passa
a declarar o esquema de cada resposta e a derivar o tipo dele, a API é tipada por esse tipo, o cliente HTTP valida todo
corpo que lê contra o mesmo esquema e um teste automatizado exercita o cliente contra a API real. O front deixa de
confiar no corpo por uma asserção de tipo. Esta spec roda antes dos passos 2 a 4 da `00011-ticket-actions`, para que as
operações novas dela já nasçam validadas e testadas.

## Fora do escopo

- Validar o corpo de requisição no front: a API já valida o que recebe, e o front só envia o que o formulário monta.
- Gerar OpenAPI, cliente ou tipos a partir do esquema por ferramenta externa.
- Teste automatizado de componente ou de tela: a tela segue provada por sonda e por conferência guiada.
- Mudar a forma de qualquer resposta ou renomear um tipo que já existe: esta spec só dá um dono ao que já existe.
- A forma do código: a organização dos arquivos do esquema, do cliente e do teste é de quem implementa. Esta spec fixa
  nomes públicos, comportamento observável e o lugar do teste.

## Contrato

### Pacote do contrato

O `@ticketdesk/contract` exporta, para cada resposta da API, o esquema e o tipo derivado dele; os nomes dos tipos que já
existem não mudam, e os esquemas seguem a convenção `*_SCHEMA` da API.

| Resposta | Esquema | Tipo |
| --- | --- | --- |
| Status, canal e prioridade do ticket | `TICKET_STATUS_SCHEMA`, `TICKET_CHANNEL_SCHEMA`, `TICKET_PRIORITY_SCHEMA` | `TicketStatus`, `TicketChannel`, `TicketPriority` |
| Um ticket | `TICKET_RESPONSE_SCHEMA` | `TicketResponse` |
| A lista de tickets | `LIST_TICKETS_RESPONSE_SCHEMA` | `ListTicketsResponse` |
| Uma entrada do histórico | `TICKET_HISTORY_ENTRY_RESPONSE_SCHEMA` | `TicketHistoryEntryResponse` |
| A lista de entradas do histórico | `LIST_TICKET_HISTORY_ENTRIES_RESPONSE_SCHEMA` | `ListTicketHistoryEntriesResponse` |
| O corpo do conflito | `VERSION_CONFLICT_RESPONSE_SCHEMA` | `VersionConflictResponse` |

Os tipos de requisição (`CreateTicketRequest`, `TransitTicketRequest`, `ListTicketsRequest`) seguem como tipos. O
esquema aceita chave desconhecida num objeto de resposta, para uma API que acrescenta um campo não quebrar um front
antigo, e rejeita campo ausente, campo de tipo errado e valor fora dos conjuntos fechados. O pacote declara a
dependência do esquema, na mesma versão exata que a API usa.

A API tipa as respostas pelos tipos derivados, então uma resposta fora do esquema não compila.

### Cliente HTTP

| Item | Definição |
| --- | --- |
| Validação | Todo corpo que o cliente lê é validado contra o esquema da operação antes de ser devolvido; o cliente devolve o corpo validado, sem as chaves que o esquema desconhece |
| `InvalidResponseError` | Novo erro do cliente, lançado quando o corpo de uma resposta 2xx não bate com o esquema; a mensagem nomeia o caminho do primeiro campo que falhou, com os índices (`3.customerName`), e `body` quando o corpo inteiro tem o tipo errado; nunca devolve o corpo inválido |
| Demais erros | `ApiError` e `NetworkError` como hoje |
| Operações da `00011-ticket-actions` | Validam o corpo pelo mesmo esquema, e o corpo do `409` pelo `VERSION_CONFLICT_RESPONSE_SCHEMA` |

O cliente segue usando caminho relativo, sem mudar de forma por causa do teste.

### Teste

O teste do cliente mora em `apps/api/test/`, ao lado do `web-build.test.ts`, e roda no `check`: sobe a API real sobre o
banco real do teste, exercita as operações do cliente por HTTP, e usa um servidor local só para o que a API não produz
(uma resposta fora de 2xx que não é `problem+json` e um corpo 2xx fora do esquema). O teste aponta o `fetch` para a
origem da API ou do servidor local sem alterar o cliente, e o `tsc` da raiz passa com o cliente importado.

## Critérios de aceite

1. O pacote do contrato exporta os esquemas e os tipos da tabela, e o `tsc` da API e o do front passam com a API tipada
   por eles.
2. Uma resposta de ticket com campo fora do tipo não compila na API, provado por um canário de `tsc`.
3. Os conjuntos de status, de canal e de prioridade do esquema são iguais aos do domínio.
4. Um corpo válido de cada resposta passa pelo esquema, e o cliente devolve o corpo validado, sem as chaves
   desconhecidas.
5. Um corpo 2xx fora do esquema faz o cliente lançar `InvalidResponseError` com o caminho do campo da tabela de casos,
   sem devolver dado.
6. Nenhum `eslint-disable` resta em `apps` e `packages`.
7. O teste do cliente cobre a lista: a primeira página com o `Link`, a página seguinte, a última sem `Link`, a lista
   vazia e os empates de `created_at` sem repetição nem falta.
8. O teste do cliente cobre os filtros: `status`, `channel` e os dois juntos devolvem só os tickets que combinam, e um
   filtro sem resultado devolve a lista vazia.
9. O teste do cliente cobre `getTicket` e o histórico: o ticket devolvido, as entradas da mais antiga à mais recente e a
   entrada de criação com `from` nulo.
10. O teste do cliente cobre os erros: `ApiError` 404 `ticket_not_found` e 400 `invalid_ticket_id`, `ApiError` só com o
    `status` para um 502 de texto e `NetworkError` para a porta sem servidor.
11. `npm run check` sai com 0, com o teste do cliente entre os executados, e o `docker build` dos alvos `migrate` e
    `api` segue saindo com 0.

## Casos de teste

Níveis: unitário (o esquema e o domínio, pelas funções exportadas), integração (o cliente contra a API real, com o banco
real) e regressão (comando que sai com 0).

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Regressão | `tsc` da API e `tsc` do front saem com 0 com o pacote exportando os seis esquemas |
| 2 | Regressão | Um arquivo de teste da API com um `@ts-expect-error` numa resposta de ticket sem `status`: o `tsc` sai com 0, e sai com erro se a linha deixar de errar |
| 3 | Unitário | As opções de `TICKET_STATUS_SCHEMA`, `TICKET_CHANNEL_SCHEMA` e `TICKET_PRIORITY_SCHEMA` são, como conjunto, `TICKET_STATUSES`, `TICKET_CHANNELS` e `TICKET_PRIORITIES` do domínio; o teste mora na API, porque o contrato não importa o domínio |
| 4 | Integração | Um ticket, uma lista de 45, um histórico de quatro entradas e um corpo de conflito reais passam pelos esquemas; o cliente devolve os mesmos valores, e um corpo com uma chave a mais volta sem ela |
| 5 | Integração | Servidor local que responde 200 com: ticket sem `status` (caminho `status`), `version` em texto (`version`), `status` `closed` (`status`), lista que não é array (`body`), a quarta entrada de uma lista com `customerName` numérico (`3.customerName`) e histórico com `at` numérico na primeira entrada (`0.at`); cada um lança `InvalidResponseError` com o caminho da coluna |
| 6 | Regressão | `git grep -n "eslint-disable" -- apps packages` não acha nada |
| 7 | Integração | 45 tickets semeados com `created_at` truncado ao minuto: a primeira página tem o `limit` do `Link` e um `Link`; percorrer até o fim junta os 45 ids sem repetição e sem falta; a última página não tem `Link`; zero tickets devolve a lista vazia e nenhum `Link` |
| 8 | Integração | Tickets de status e canais variados: cada filtro e a combinação devolvem exatamente os que combinam; `status` `resolved` com `channel` `email` sem ticket devolve a lista vazia |
| 9 | Integração | Um ticket com transições: o histórico vem na ordem, com a nota de resolução e o motivo de reabertura nos lugares certos; um ticket recém-criado tem uma entrada com `from` nulo; `getTicket` devolve os campos do ticket criado |
| 10 | Integração | `id` bem formado inexistente: `ApiError` 404 `ticket_not_found`; `id` malformado: `ApiError` 400 `invalid_ticket_id`; servidor local com 502 e texto: `ApiError` 502 sem `code`; porta sem servidor: `NetworkError` |
| 11 | Regressão | `npm run check` sai com 0 sobre a árvore sem alterações, com um container runtime disponível, e o teste do cliente consta entre os arquivos executados; `docker build` dos dois alvos com 0 |

## Restrições

- A dependência do esquema é a que a API já usa, na mesma versão exata, e só no `package.json` e no lockfile.
- Uma única declaração de cada forma de resposta: nenhum tipo escrito à mão que repita um esquema.
- O front não ganha camada nova: o cliente valida onde já lia o corpo.
- O domínio e os casos de uso não mudam.
- Identificadores e mensagens de erro do código são em inglês.

## Validação

Comandos em sintaxe de `sh`:

```sh
npm ci && git diff --exit-code package-lock.json
npm run check
docker build --target migrate .
docker build --target api .
```

Os comandos saem com 0 sobre a árvore sem alterações, com um container runtime disponível.

## Passos

1. Os esquemas e os tipos derivados no pacote do contrato, a dependência do esquema no pacote, a API tipada por eles, o
   canário de `tsc` e o teste de igualdade com os conjuntos do domínio. Prova: critérios 1 a 3.
2. A validação no cliente com o `InvalidResponseError`, no lugar da asserção de tipo, e o teste do cliente nascendo com
   os casos de corpo válido e inválido. Prova: critérios 4 a 6.
3. Os demais casos do teste do cliente (lista, filtros, ticket, histórico e erros), a atualização do `CLAUDE.md` e do
   `README.md` para o front só ter automatizado o teste do cliente, a linha do Registro de decisões reescrita e a linha
   nova do contrato com esquema único. Prova: critérios 7 a 11.
