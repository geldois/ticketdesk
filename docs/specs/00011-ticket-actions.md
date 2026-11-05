# Criar e transitar tickets pela tela, com o aviso de conflito

## Objetivo

A API passa a dizer, em cada ticket, para onde ele pode ir e o que cada transição exige, e a tela da
`00010-ticket-list-screen` ganha as escritas: criar um ticket por um formulário, transitar o status pelo painel e
mostrar o aviso de conflito com o estado atual quando outra pessoa alterou o ticket antes. A regra mora na API: o front
não conhece a máquina de estados nem o texto que cada destino exige, e desenha o que a API mandar.

## Fora do escopo

- Editar os outros campos do ticket, apagar ticket, atribuição a uma pessoa e qualquer autenticação.
- Tempo real (SSE), tentativa automática de refazer uma escrita e atualização otimista da tela.
- Idempotência da criação: um duplo clique cria dois tickets, e o botão desabilitado durante o envio é a única defesa.
- Roteador, biblioteca de formulário, biblioteca de estado e componente de terceiros.
- Teste automatizado do front, como na `00010-ticket-list-screen`: a prova do cliente é uma sonda e a da tela é uma
  conferência guiada.
- Mudar as regras de transição ou de validação do domínio: esta spec só as expõe.
- A forma do código: a organização dos arquivos, os componentes e o desenho do estado são de quem implementa. Esta spec
  fixa só nomes públicos, comportamento observável e os textos da interface.

## Contrato

### Domínio

O domínio expõe, ao lado de `TRANSITION_TICKET_STATUSES`, a tabela `TRANSITION_TICKET_TEXTS`, que diz o texto exigido
por cada destino, e as duas têm um dono só.

| Destino | Texto exigido (`requires`) |
| --- | --- |
| `in_progress` | Nenhum |
| `resolved` | A nota de resolução (`resolutionNote`) |
| `open` | O motivo da reabertura (`reopenReason`) |

Para cada destino, uma transição com o texto exigido é aceita, sem ele é recusada e com o texto do outro destino é
recusada, como hoje; a tabela nunca diverge do que a validação faz.

### API

O `TicketResponse` ganha um campo, presente em toda resposta que traz um ticket: `GET /tickets`, `GET /tickets/:id`, o
`201` de `POST /tickets`, o `200` de `POST /tickets/:id/transitions` e o campo `ticket` do `409` de `version_conflict`.

```ts
interface NextTransitionResponse {
  readonly to: TicketStatus;
  readonly requires: "resolutionNote" | "reopenReason" | null;
}

interface TicketResponse {
  // ...os campos que já existem
  readonly nextTransitions: readonly NextTransitionResponse[];
}
```

| Status do ticket | `nextTransitions` |
| --- | --- |
| `open` | `[{ to: "in_progress", requires: null }]` |
| `in_progress` | `[{ to: "resolved", requires: "resolutionNote" }]` |
| `resolved` | `[{ to: "open", requires: "reopenReason" }]` |

Os valores saem das duas tabelas do domínio, e a apresentação não repete nenhuma regra.

### Cliente HTTP

O cliente da `00010-ticket-list-screen` ganha duas operações, e o `ApiError` do `409` passa a trazer o ticket atual.

| Operação | Recebe | Devolve | Falha |
| --- | --- | --- | --- |
| `createTicket` | `customerName`, `description`, `channel` e `priority` | O ticket criado | `ApiError` ou `NetworkError` |
| `transitTicket` | O `id`, a `version` que a tela leu, o destino (`to`) e, conforme o destino, a nota de resolução ou o motivo de reabertura | O ticket atualizado | `ApiError` ou `NetworkError` |

A `version` vai no cabeçalho `If-Match`, entre aspas. O texto exigido pelo destino vai como a tela o recebeu, mesmo
vazio, e o texto que o destino não pede vai como `null`. No `409` o `ApiError` carrega, além do `status`, do `code` e do
`detail`, o ticket atual do corpo; nos demais erros esse campo é `null`.

### Tela

Os textos da interface são em português do Brasil e os desta tabela são exatos.

| Parte | Comportamento |
| --- | --- |
| Formulário "Novo ticket" | Fixo acima da lista, com os campos "Cliente", "Descrição", "Canal" (Chat, E-mail, Telefone) e "Prioridade" (Baixa, Média, Alta) e o botão "Criar ticket"; o botão fica desabilitado enquanto envia |
| Criar com sucesso | O formulário volta ao estado inicial e a lista recarrega a primeira página com os filtros atuais; com um filtro que o ticket novo não satisfaz, ele não aparece na lista, e isso é o esperado |
| Criar com erro | O texto "Não foi possível criar o ticket." seguido do `detail` quando o erro o tem; o formulário mantém o que foi digitado |
| Botões de transição | O painel mostra um botão por item de `nextTransitions`: "Iniciar atendimento" para `in_progress`, "Resolver" para `resolved` e "Reabrir" para `open` |
| Texto exigido | Ao escolher um botão com `requires` aparece o campo "Nota de resolução" para `resolutionNote` ou "Motivo da reabertura" para `reopenReason`; sem `requires` nenhum campo aparece; o botão "Confirmar" envia, desabilitado enquanto envia |
| Transitar com sucesso | O painel mostra o ticket atualizado e relê o histórico, e a lista recarrega a primeira página com os filtros atuais |
| Transitar com erro | O texto "Não foi possível alterar o ticket." seguido do `detail` quando o erro o tem; o painel mantém o ticket e o texto digitado |
| Conflito | Com `409`, o painel mostra "Este ticket foi alterado por outra pessoa.", passa a mostrar o ticket atual que a API devolveu, com os botões dele, e relê o histórico; nada é sobrescrito |

## Critérios de aceite

1. Cada ticket devolvido por `GET /tickets`, `GET /tickets/:id`, `POST /tickets` e pelo `200` de transição traz
   `nextTransitions` igual ao da tabela para o status dele, e o ticket do corpo do `409` também.
2. Depois de uma transição, o `nextTransitions` da resposta corresponde ao status novo.
3. Para cada destino da tabela do domínio, a transição com o texto exigido é aceita, sem ele é recusada e com o texto do
   outro destino é recusada.
4. O tipo `TicketResponse` do contrato tem `nextTransitions`, e o `tsc` da API e o do front passam.
5. `createTicket` com os quatro campos válidos devolve o ticket com `status` `open` e `version` 1; com um nome vazio
   lança `ApiError` com status 422, `code` `invalid_customer_name`, o `detail` da API e o ticket atual `null`.
6. `transitTicket` com a `version` atual e um destino de `nextTransitions` devolve o ticket no status novo com a
   `version` mais um; para `resolved` com nota, o ticket e a entrada do histórico trazem a nota; para `open` com motivo,
   a entrada do histórico traz o motivo e o ticket volta sem nota.
7. `transitTicket` com uma `version` velha lança `ApiError` com status 409, `code` `version_conflict` e o ticket atual,
   com a `version` do banco; nos demais erros o ticket atual do `ApiError` é `null`.
8. `transitTicket` para um destino fora de `nextTransitions` lança `ApiError` com status 422 e `code`
   `invalid_transition`, e uma nota só com espaços ou vazia para `resolved` lança `ApiError` com status 422 e `code`
   `missing_resolution_note`.
9. Na tela, criar um ticket pelo formulário o mostra na lista e esvazia o formulário; um erro da API mostra "Não foi
   possível criar o ticket." com o `detail` e mantém o que foi digitado.
10. Na tela, o painel de um ticket mostra os botões de `nextTransitions`, resolver sem nota mostra o erro e mantém o
    texto digitado sem alterar o ticket, e resolver com nota muda o status na lista e no painel, que mostra também a
    entrada nova do histórico.
11. Na tela, com o mesmo ticket aberto em duas abas, transitar na primeira e depois na segunda mostra "Este ticket foi
    alterado por outra pessoa." na segunda, com o status atual, os botões dele e o histórico relido, e a transição da
    segunda não é aplicada.
12. `npm run check` sai com 0.

## Casos de teste

Níveis: unitário (o domínio, pela função exportada), integração (a API pela fronteira HTTP, com o banco real), sonda (o
cliente contra a API real num projeto descartável do compose), conferência (passos executados na tela) e regressão
(comando que sai com 0).

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Integração | Para cada status, um ticket nele devolve o `nextTransitions` da tabela por `GET /tickets/:id`, dentro de `GET /tickets`, no `201` e no `200` de transição; um `409` traz o ticket com o `nextTransitions` do status atual |
| 2 | Integração | Transitar `open` para `in_progress` devolve `[resolved]`; `in_progress` para `resolved`, `[open]`; `resolved` para `open`, `[in_progress]`, cada um com o `requires` da tabela |
| 3 | Unitário | Para `in_progress`, `resolved` e `open`: com o texto exigido aceita; sem o texto recusa com o erro de texto faltando; com o texto do outro destino recusa com o erro de texto sobrando; a tabela do domínio e o resultado concordam nos três |
| 4 | Regressão | `tsc` da API e `tsc` do front saem com 0 com o campo no tipo; o valor do campo é o do critério 1 |
| 5 | Sonda | Os quatro campos válidos: `status` `open`, `version` 1, o `id` abre em `getTicket`; nome vazio: `ApiError` 422 `invalid_customer_name`, com o `detail` e o ticket atual `null`; porta sem servidor: `NetworkError` |
| 6 | Sonda | `open` para `in_progress` sem texto; `in_progress` para `resolved` com a nota, que aparece no ticket e na entrada do histórico; `resolved` para `open` com o motivo, que aparece só na entrada do histórico, e o ticket volta com `resolutionNote` nulo |
| 7 | Sonda | Duas leituras do mesmo ticket, a primeira transita, a segunda com a `version` velha lança `ApiError` 409 `version_conflict` e o ticket atual com a `version` nova; um `id` inexistente lança `ApiError` 404 com o ticket atual `null`; duas transições disparadas juntas com a mesma `version` dão um sucesso e um 409, 20 rodadas |
| 8 | Sonda | Um ticket `open` transitando direto para `resolved` lança `ApiError` 422 `invalid_transition`; `in_progress` para `resolved` com a nota só de espaços e com a nota vazia lança `ApiError` 422 `missing_resolution_note` |
| 9 | Conferência | Preencher e criar: o ticket aparece na primeira página, o formulário esvazia; um nome vazio mostra "Não foi possível criar o ticket." com o `detail` e os campos mantidos; com a API parada, o texto do erro e os campos mantidos; com o filtro "Resolvido" ativo, o ticket novo não aparece e a lista não quebra |
| 10 | Conferência | Abrir um ticket `open`: só "Iniciar atendimento", sem campo de texto; confirmar; agora só "Resolver", com "Nota de resolução"; confirmar sem nota mostra o erro, mantém o campo e o ticket segue `in_progress`; com nota, vira `resolved` na lista e no painel, com a entrada nova no histórico; "Reabrir" pede "Motivo da reabertura" |
| 11 | Conferência | Duas abas no mesmo ticket: transitar numa e na outra confirmar mostra o aviso exato, o status atual, os botões dele e o histórico relido |
| 12 | Regressão | `npm run check` sai com 0 sobre a árvore sem alterações, com um container runtime disponível |

## Restrições

- Nenhuma dependência nova.
- O front nunca calcula a transição permitida nem o texto exigido: só desenha o que `nextTransitions` diz.
- O front tem um rótulo para cada status de destino e para cada valor de `requires` do contrato, e um valor novo sem
  rótulo reprova o `tsc` do front.
- O domínio ganha só a tabela do texto exigido; os casos de uso, as rotas de escrita e as regras não mudam.
- Os textos da interface são em português do Brasil; identificadores e mensagens de erro do código são em inglês.

## Validação

Comandos em sintaxe de `sh`:

```sh
npm run check
docker compose up -d --build
curl -fsS "http://${API_PUBLISH_HOST}:${API_PUBLISH_PORT}/tickets"
docker compose down
```

O `check` sai com 0 sobre a árvore sem alterações, com um container runtime disponível, e o `curl` sai com 0 com o
`.env` baseado no `.env.example`. A sonda dos critérios 5 a 8 e a conferência dos critérios 9 a 11 rodam sobre a mesma
pilha, e o caso da API parada usa `docker compose stop api`.

## Passos

1. A tabela do texto exigido no domínio, o campo `nextTransitions` na apresentação do ticket e no tipo do contrato, com
   os testes do domínio e da fronteira HTTP. Prova: critérios 1 a 4.
2. As duas operações do cliente e o ticket atual no `ApiError` do `409`. Prova: critérios 5 a 8.
3. O formulário de criar e os botões de transição, com o texto exigido, no painel. Prova: critérios 9 e 10.
4. O aviso de conflito no painel e o fechamento da spec. Prova: critérios 11 e 12.
