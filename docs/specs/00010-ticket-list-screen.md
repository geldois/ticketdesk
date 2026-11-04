# A tela de leitura: lista, filtros, painel e histórico

## Objetivo

A primeira tela do front, só de leitura: a lista de tickets com filtros por `status` e `channel` e o botão "Carregar
mais", e o painel do ticket selecionado com os dados e o histórico. O front consome a API por um cliente HTTP próprio,
desenvolve-se contra ela por um servidor de desenvolvimento com proxy e passa a ter um linter de CSS e um de HTML no
`check`.

## Fora do escopo

- Criar ticket, transitar status, tratar o conflito 409 e qualquer escrita.
- Tempo real (SSE), `ETag` e `If-Match` (que só as escritas usam), roteador, URL com estado, biblioteca de estado ou de
  dados, framework de estilo e componente de terceiros.
- Teste automatizado do front: esta spec não o escreve, e a prova do cliente é uma sonda e a da tela é uma conferência
  guiada, ambas descritas em "Casos de teste".
- Paginar o histórico, voltar uma página, ordenar, buscar por texto e filtrar por `priority`.
- Internacionalização, tema escuro e acessibilidade além de rótulos associados aos controles.
- A forma do código: a organização dos arquivos, os componentes e o desenho do estado são de quem implementa. Esta spec
  fixa só nomes públicos, comportamento observável e os textos da interface.

## Contrato

### Servidor de desenvolvimento

| Item | Definição |
| --- | --- |
| Script `dev:web` da raiz | Sobe o servidor de desenvolvimento do front; a tela abre no endereço dele e recarrega a cada mudança |
| Proxy | O servidor de desenvolvimento repassa os pedidos a `/tickets` à API do host, no endereço `API_HOST:API_PORT` do `.env`, com os padrões `127.0.0.1` e `3000` quando a variável falta |
| `.env.example` | Traz `WEB_DIST_DIR` vazio, então `npm run dev` sobe a API sem exigir `npm run build` |

### Cliente HTTP

O cliente vive no `apps/web`, usa os tipos de `@ticketdesk/contract` e só fala com a API pela origem da tela. É a parte
reservada ao semimanual: a tabela fixa o que ele faz e o que a tela vê, e a forma é de quem o escreve.

| Operação | Recebe | Devolve | Falha |
| --- | --- | --- | --- |
| `listTickets` | `status` e `channel`, ambos opcionais | A primeira página: os tickets e o `Link` da próxima, ou nenhum `Link` na última | `ApiError` ou `NetworkError` |
| `listNextTickets` | O `Link` da próxima página, como veio no cabeçalho `Link` com `rel="next"` | A página seguinte, no mesmo formato | `ApiError` ou `NetworkError` |
| `getTicket` | O `id` do ticket | O ticket | `ApiError` ou `NetworkError` |
| `listTicketHistoryEntries` | O `id` do ticket | As entradas do histórico, da mais antiga à mais recente | `ApiError` ou `NetworkError` |

| Erro | Quando | Carrega |
| --- | --- | --- |
| `ApiError` | A API responde com um status fora de 2xx | O `status`, o `code` e o `detail` do `application/problem+json`; quando o corpo não é esse formato, o `status` e nenhum `code` |
| `NetworkError` | O pedido não chega à API | A causa original |

Sem `limit` na primeira página: vale o padrão da API. O `Link` da próxima página é usado como veio, sem reescrita, e o
cliente nunca monta um `cursor` por conta própria.

### Tela

Uma tela só. Os textos da interface são em português do Brasil e os da tabela abaixo são exatos.

| Parte | Comportamento |
| --- | --- |
| Filtros | Dois controles, "Status" (Todos, Aberto, Em atendimento, Resolvido) e "Canal" (Todos, Chat, E-mail, Telefone); mudar qualquer um recarrega a primeira página com os filtros atuais |
| Recarga | A primeira página é recarregada com os filtros atuais ao abrir a tela, a cada mudança de filtro e ao clicar em "Tentar de novo" da lista |
| Carregando a lista | Enquanto a primeira página não chega, o texto "Carregando tickets…" no lugar da lista |
| Lista vazia | Nenhum ticket combina: o texto "Nenhum ticket encontrado." |
| Erro da lista | O texto "Não foi possível carregar os tickets." seguido do `detail` quando o erro o tem, e um botão "Tentar de novo" que recarrega |
| Linha | Cliente, status, prioridade, canal e a data de criação em formato local pt-BR; os valores usam os rótulos da tabela seguinte |
| Carregar mais | Um botão "Carregar mais" abaixo da lista, só quando a última página trouxe um `Link`; acrescenta a página seguinte ao fim da lista sem repetir ticket, fica desabilitado enquanto carrega e some na última página; uma falha mostra o erro sem apagar o que já foi carregado |
| Seleção | Clicar numa linha a seleciona e abre o painel; a linha selecionada fica destacada; recarregar a lista mantém o painel aberto |
| Painel | Mostra cliente, descrição, canal, prioridade, status, a nota de resolução quando existe, a `version` e a data de criação, mais o histórico; lê o ticket e o histórico ao abrir |
| Painel carregando | "Carregando ticket…" até os dois chegarem |
| Painel com erro | "Não foi possível carregar o ticket." seguido do `detail` quando existe, e um botão "Tentar de novo" |
| Histórico | Uma linha por mudança, da mais antiga à mais recente: de (ou "Criado" quando é a criação), para, a nota de resolução ou o motivo de reabertura quando existem, e o instante |

| Valor | Rótulo |
| --- | --- |
| `open`, `in_progress`, `resolved` | Aberto, Em atendimento, Resolvido |
| `low`, `medium`, `high` | Baixa, Média, Alta |
| `chat`, `email`, `phone` | Chat, E-mail, Telefone |

### Linters de CSS e de HTML

| Item | Definição |
| --- | --- |
| Ferramenta de CSS | `stylelint`, com a configuração mais rigorosa que a pesquisa do passo provar, sobre todo `.css` do repositório que não é gerado |
| Ferramenta de HTML | `html-validate`, com a configuração mais rigorosa que a pesquisa do passo provar, sobre todo `.html` do repositório que não é gerado |
| `check` | Roda cada linter como mais uma verificação e sai com erro quando um deles acha qualquer problema |
| `fix` | Roda cada linter com correção automática, quando a ferramenta a tem |
| Cache | Em `.cache/`, como as demais ferramentas |

O mínimo que a configuração de cada linter precisa reprovar é a lista de canários dos "Casos de teste".

## Critérios de aceite

1. `npm run dev:web`, com a API do host no ar, serve a tela, e `GET /tickets` pelo endereço do servidor de
   desenvolvimento responde o mesmo status e corpo que a API.
2. Com o `.env.example` copiado sem alteração, sem `npm run build` e com o `db` migrado, `npm run dev` sobe a API e
   `GET /tickets` responde 200.
3. Um arquivo do `apps/web` importa um tipo de `@ticketdesk/contract` (`TicketResponse`): o `tsc` do front passa,
   `npm ci` não altera o lockfile e o `docker build` dos alvos `migrate` e `api` sai com 0.
4. `listTickets` sem filtros devolve a primeira página, na ordem da API, com o `Link` da próxima quando há mais tickets
   e sem `Link` na última.
5. `listTickets` com `status`, com `channel` e com os dois devolve só os tickets que combinam.
6. `listNextTickets` com o `Link` recebido devolve a página seguinte, e percorrer todas as páginas devolve cada ticket
   exatamente uma vez.
7. `getTicket` devolve o ticket, e `listTicketHistoryEntries` devolve as entradas da mais antiga à mais recente.
8. Um `id` que não existe faz `getTicket` lançar `ApiError` com `status` 404 e `code` `ticket_not_found`; um `id`
   malformado, `ApiError` com 400 e `invalid_ticket_id`; uma resposta fora de 2xx que não é `application/problem+json`,
   `ApiError` só com o `status`; uma API inalcançável, `NetworkError`.
9. Com a API respondendo, a lista mostra "Carregando tickets…" até chegar e depois uma linha por ticket com os cinco
   campos, a data em formato local pt-BR; sem tickets, mostra "Nenhum ticket encontrado."; com a API fora do ar, mostra
   "Não foi possível carregar os tickets." e "Tentar de novo" recarrega.
10. Mudar o filtro de status ou de canal recarrega a lista e só mostra os tickets que combinam; "Todos" os devolve a
    todos.
11. "Carregar mais" aparece só quando há próxima página, fica desabilitado enquanto carrega, acrescenta a página sem
    repetir ticket e some na última; se a API cair no meio, o erro aparece e as páginas já carregadas continuam na tela.
12. Clicar numa linha a destaca e abre o painel, que mostra "Carregando ticket…" até os dados do ticket e o histórico
    dele chegarem; recarregar a lista mantém o painel aberto; com a API fora do ar o painel mostra "Não foi possível
    carregar o ticket." e "Tentar de novo".
13. O `check` falha para cada defeito de CSS e de HTML provocado (abaixo), passa com os arquivos limpos, o `fix`
    conserta o que cada linter sabe corrigir, e nenhum cache dos linters aparece fora de `.cache/`.
14. O `npm run check` sai com 0 sobre a árvore.
15. Depois de `docker compose up -d --build` num projeto descartável, `GET /` responde 200 com o `index.html` do build e
    `GET /tickets` responde 200 com um array.

## Casos de teste

O front não tem teste automatizado nesta spec, então os critérios 4 a 8 são provados por uma sonda que roda o cliente
contra a API real, num projeto descartável do compose, e os critérios 9 a 12 por uma conferência guiada na mesma pilha.
A sonda e a conferência ficam fora do repositório. Os níveis desta tabela são: sonda (cliente contra a API real),
conferência (passos executados na tela) e regressão (comando que sai com 0).

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Regressão | Com a API no ar, o endereço do servidor de desenvolvimento devolve o mesmo status e corpo de `GET /tickets` que a API; sem `API_PORT` no `.env`, o proxy usa a porta 3000 |
| 2 | Regressão | `.env` copiado do exemplo, sem `apps/web/dist`: `npm run dev` fica pronto e `GET /tickets` é 200 |
| 3 | Regressão | `tsc` do front com a importação do tipo, `npm ci` com `git diff --exit-code package-lock.json`, `docker build` dos dois alvos |
| 4 | Sonda | Com 45 tickets semeados: a primeira página tem o `limit` que o `Link` informa e vem com `Link`; a última tem o resto e nenhum `Link`; zero tickets devolve lista vazia e nenhum `Link` |
| 5 | Sonda | Tickets de status e canais variados: cada filtro e a combinação devolvem exatamente os que combinam; um filtro sem resultado devolve vazio |
| 6 | Sonda | Percorrer do primeiro ao último `Link` junta os 45 tickets, sem repetição e sem falta, também com tickets de `created_at` igual |
| 7 | Sonda | Um ticket com transições: o histórico tem as entradas na ordem, com a nota e o motivo nos lugares certos; um ticket recém-criado tem uma entrada com `from` nulo |
| 8 | Sonda | `id` bem formado inexistente: `ApiError` 404 `ticket_not_found`; `id` malformado: `ApiError` 400 `invalid_ticket_id`; um servidor local da sonda que responde 502 com texto: `ApiError` 502 sem `code`; porta sem servidor: `NetworkError` |
| 9 | Conferência | Pilha com tickets: "Carregando tickets…" aparece e some, as linhas têm os cinco campos com rótulos e a data em pt-BR; pilha vazia: o texto do vazio; API parada: o texto do erro, e subir a API e clicar em "Tentar de novo" mostra a lista |
| 10 | Conferência | Trocar "Status" para "Resolvido" mostra só resolvidos, trocar "Canal" para "Chat" restringe mais, voltar a "Todos" devolve tudo |
| 11 | Conferência | Com mais tickets que uma página o botão aparece, fica desabilitado durante o pedido, clicar acrescenta sem repetir, e na última página ele some; parar a API e clicar mostra o erro e mantém as linhas |
| 12 | Conferência | Clicar numa linha a destaca e abre o painel com "Carregando ticket…" e depois dados e histórico; trocar o filtro mantém o painel; parar a API e clicar em outra linha mostra o erro do painel e "Tentar de novo" |
| 13 | Regressão | Para cada canário (abaixo), um `.css` ou `.html` provocado faz o `check` sair com código diferente de 0; os arquivos limpos o fazem sair com 0; o `fix` sobre um arquivo que só tem o defeito corrigível o deixa limpo; `git status` não mostra cache fora de `.cache/` |
| 14 | Regressão | `npm run check` sai com 0 sobre a árvore sem alterações |
| 15 | Regressão | Na sonda, com a pilha de pé num projeto descartável: `GET /` é 200 e traz o elemento raiz do build, `GET /tickets` é 200 com array; `down` ao fim |

Canários do linter de CSS, cada um num arquivo à parte: propriedade desconhecida, declaração duplicada no mesmo bloco,
seletor duplicado, bloco vazio, cor inválida, `!important`, seletor por `id` e propriedades fora da ordem.

Canários do linter de HTML, cada um num arquivo à parte: `id` duplicado, atributo duplicado no mesmo elemento, `img` sem
`alt`, elemento obsoleto, tag não fechada, documento sem `lang`, documento sem `title` e controle de formulário sem
rótulo associado.

## Restrições

- Dependências novas, todas nomeadas aqui e com a versão exata só no manifesto e no lockfile: o `stylelint`, o
  `html-validate` e as configurações e os plugins deles que o passo escolher, no `package.json` da raiz como ferramenta
  compartilhada, e o `@ticketdesk/contract` como dependência do workspace `apps/web`. Cada versão é pesquisada ao vivo e
  a compatibilidade é provada fora do repositório.
- Sem roteador, sem biblioteca de estado ou de dados, sem framework de estilo e sem componente de terceiros; o estilo é
  CSS puro.
- O front não monta URL de `cursor` e não reescreve o `Link` da próxima página.
- Os textos da interface são em português do Brasil; identificadores e mensagens de erro do código são em inglês.
- O domínio, os casos de uso e a API não mudam nesta spec.

## Validação

Comandos em sintaxe de `sh`:

```sh
npm ci && git diff --exit-code package-lock.json
npm run check
docker compose up -d --build
curl -fsS "http://${API_PUBLISH_HOST}:${API_PUBLISH_PORT}/"
curl -fsS "http://${API_PUBLISH_HOST}:${API_PUBLISH_PORT}/tickets"
docker compose down
```

Os dois primeiros saem com 0 sobre a árvore sem alterações, com um container runtime disponível, e os `curl` saem com 0
com o `.env` baseado no `.env.example`. A sonda dos critérios 4 a 8 e 15 e a conferência dos critérios 9 a 12 rodam
sobre a mesma pilha, e o `npm run dev:web` com a API do host no ar prova o critério 1.

## Passos

Em todo passo, o `npm ci` não altera o lockfile e nenhuma versão vira faixa.

1. O servidor de desenvolvimento do front com o proxy, o script `dev:web` da raiz, o `WEB_DIST_DIR` vazio no
   `.env.example` e as passagens do `README.md` que citavam o `npm run build` antes do `npm run dev`, a tabela de
   comandos e a tabela de variáveis. Prova: critérios 1 e 2.
2. O `apps/web` passa a depender de `@ticketdesk/contract`: o `package.json`, o `tsconfig.json` e o estágio `web` do
   `Dockerfile`, com o `.dockerignore`. Prova: critérios 3 e 15.
3. O cliente HTTP e os dois erros. Prova: critérios 4 a 8.
4. A lista: os filtros, a recarga, os estados, a linha, o botão "Carregar mais" e o primeiro CSS. Prova: critérios 9 a
   11.
5. O painel do ticket e o histórico, e o `README.md` deixa de dizer que a tela de tickets não existe. Prova: critério
   12.
6. O `stylelint` e o `html-validate` no `check` e no `fix`, a configuração mais rigorosa de cada um que a pesquisa
   provar, os canários e a linha do Registro de decisões do `README.md`. Prova: critérios 13 e 14.
