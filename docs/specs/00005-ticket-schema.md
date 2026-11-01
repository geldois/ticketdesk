# Esquema do ticket: tabelas, migrations e o serviço migrate

## Objetivo

O esquema do PostgreSQL que guarda o ticket e o histórico, versionado em migrations de SQL puro, com o banco espelhando
a estrutura, o tamanho, as transições aceitas e a presença de nota e motivo que o domínio já garante, e um serviço
`migrate` que aplica as migrations uma vez antes de qualquer outro serviço. Testes contra um PostgreSQL real provam que
o banco e o domínio dão o mesmo veredito sobre o que espelham.

## Fora do escopo

- Pool de conexões, repositório, consultas e a unidade de trabalho: nascem com a spec da persistência.
- `UPDATE` condicional, a semântica da `version`, `If-Match` e concorrência: o esquema só guarda a coluna.
- Índices de listagem, filtros e paginação, a tabela de idempotência e o `NOTIFY` do tempo real.
- HTTP, Zod, rotas e a tradução de um erro do banco em resposta.
- Formato de caractere e caracteres de controle nos textos: o banco não os valida, o domínio é o dono. O banco aceita um
  nome com `$` ou emoji desde que o tamanho caiba, e a escrita só chega a ele pela saída do domínio.
- Dado gravado sob uma regra antiga do domínio: mudar a regra de texto exige uma migration de dados, de outra spec.
- Papéis, permissões e endurecimento do banco para produção; carga de dados (seed).
- Os serviços `api` e `nginx` do compose.
- A forma do código: o executor e os testes e a organização em arquivos são de quem implementa. O SQL das migrations é
  do autor, que o escreve. Esta spec fixa só nomes, tipos, invariantes e comportamento observável.

## Contrato

Os nomes dos campos do domínio abaixo são os do código atual de `apps/api/src/domain/`, que a spec 00004, congelada,
ainda chama de `note`, `reason`, `createTicket` e `transitionTicket`.

Duas tabelas. O banco guarda o que o `Ticket` e a entrada do histórico do domínio não carregam: o identificador e a
`version` do ticket, e o identificador e a ordem da entrada.

Tabela `ticket`:

| Coluna | Campo do domínio | Tipo | Invariante |
| --- | --- | --- | --- |
| `id` | (nenhum) | uuid | Chave primária, gerada pelo banco, UUID v7 |
| `customer_name` | `customerName` | texto | Obrigatório; 1 a 120 pontos de código |
| `description` | `description` | texto | Obrigatório; 1 a 4000 pontos de código |
| `channel` | `channel` | texto | Obrigatório; `email`, `chat` ou `phone` |
| `priority` | `priority` | texto | Obrigatório; `low`, `medium` ou `high` |
| `status` | `status` | texto | Obrigatório; `open`, `in_progress` ou `resolved` |
| `resolution_note` | `resolutionNote` | texto | Nulo se, e só se, `status` não é `resolved`; quando preenchido, 1 a 2000 pontos de código |
| `version` | (nenhum) | inteiro | Obrigatório; começa em 1 e nunca é menor que 1 |
| `created_at` | `createdAt` | instante com fuso | Obrigatório |

Tabela `ticket_history_entry`:

| Coluna | Campo do domínio | Tipo | Invariante |
| --- | --- | --- | --- |
| `id` | (nenhum) | inteiro de 64 bits | Chave primária, gerada pelo banco, crescente na ordem da inserção |
| `ticket_id` | (nenhum) | uuid | Obrigatório; referencia `ticket.id`, sem remoção em cascata |
| `from_status` | `from` | texto | Nulo só na primeira entrada; senão `open`, `in_progress` ou `resolved` |
| `to_status` | `to` | texto | Obrigatório; `open`, `in_progress` ou `resolved` |
| `resolution_note` | `resolutionNote` | texto | Preenchido se, e só se, `to_status` é `resolved`; 1 a 2000 pontos de código |
| `reopen_reason` | `reopenReason` | texto | Preenchido se, e só se, `from_status` é `resolved`; 1 a 500 pontos de código |
| `at` | `at` | instante com fuso | Obrigatório |

O par (`from_status`, `to_status`) de uma entrada é exatamente um destes, e qualquer outro é recusado:

| De | Para |
| --- | --- |
| nulo | `open` |
| `open` | `in_progress` |
| `in_progress` | `resolved` |
| `resolved` | `open` |

Imutabilidade: qualquer `UPDATE` ou `DELETE` em `ticket_history_entry` é recusado pelo banco, e uma linha existente
permanece como estava depois da tentativa. O `INSERT` continua aceito.

Migrations e serviço:

| Caminho | Papel |
| --- | --- |
| `apps/api/migrations/` | As migrations, em SQL puro, cada uma com a parte que aplica e a que reverte |
| `compose.yaml` | O serviço `db` (PostgreSQL), dono único da referência da imagem, e o `migrate` (execução única, que depende do `db` saudável) |
| `.env.example` | Só os nomes das variáveis que o compose exige, sem valor |

Comportamento observável do `migrate`:

- Aplica as migrations pendentes na ordem e sai com 0; uma segunda execução não muda nada e sai com 0.
- Com o banco inalcançável, sai com código diferente de 0.
- A senha do banco vem de uma variável de ambiente sem valor padrão: sem ela, o compose recusa subir.

## Critérios de aceite

1. Aplicar as migrations de `apps/api/migrations/` num banco vazio cria exatamente as tabelas `ticket` e
   `ticket_history_entry`, com as colunas, os tipos e a obrigatoriedade do Contrato.
2. O executor de migrations, dado um diretório, aplica, reverte e aplica de novo: depois da reversão nada do que o
   diretório criou existe, e depois da segunda aplicação a estrutura é igual à da primeira. Vale para um diretório de
   teste e para `apps/api/migrations/`.
3. O banco recusa um `ticket` com `channel`, `priority` ou `status` fora do conjunto, em maiúsculas inclusive, e aceita
   cada valor do conjunto.
4. Para `customer_name`, `description`, `resolution_note` e `reopen_reason`, o banco aceita o mínimo e o máximo do
   Contrato e recusa vazio e o máximo mais um, medidos em pontos de código, e esses limites são os mesmos que o domínio
   exporta.
5. O banco aceita um par de status em `ticket_history_entry` se, e só se, ele é um dos quatro do Contrato, e esses
   quatro são os que o domínio produz: o par (nulo, `open`) da criação e os da tabela de transições do domínio. Os
   outros oito pares entre nulo ou um status e um destino são recusados.
6. O banco aceita a combinação de nota e motivo de uma entrada se, e só se, o domínio a aceita: para cada destino, com e
   sem nota e com e sem motivo, o veredito do banco é o do domínio. No `ticket`, `resolution_note` nulo com `status`
   `resolved`, ou preenchida com outro status, são recusados.
7. `UPDATE` e `DELETE` em `ticket_history_entry` são recusados, e a linha existente permanece igual; `INSERT` é aceito.
8. Entradas inseridas em sequência voltam, ordenadas por `id`, na ordem em que foram inseridas.
9. A saída de `createTicketChange` e a de `transitionTicketChange` se gravam sem recusa e voltam do banco com os campos
   iguais aos do domínio, texto normalizado inclusive.
10. O banco aceita um texto com caractere que o domínio recusa (por exemplo, `$`) quando o tamanho cabe: o formato de
    caractere é do domínio.
11. O `id` do `ticket` é um UUID v7 gerado pelo banco, e a `version` de um ticket novo é 1.
12. O mesmo conjunto de testes passa, sem alterar código, em duas máquinas com executores de contêineres diferentes; o
    executor é configurado só pelo ambiente de quem roda.
13. O `compose.yaml` é o dono da referência da imagem do PostgreSQL, e o auxiliar de teste a obtém de lá.
14. `docker compose run --rm migrate` contra um banco novo termina com 0 e deixa as tabelas do Contrato; repetido,
    termina com 0 e não muda o esquema; sem a variável da senha, o compose recusa subir; com o banco inalcançável,
    termina com código diferente de 0.
15. O `.env` real é ignorado pelo git, e o `.env.example` traz só nomes de variável, sem valor.
16. O `npm ci` não altera o lockfile, e as dependências novas têm versão exata.
17. O run do `check.yml` para o SHA do `HEAD` de `dev` termina com conclusão `success`.
18. Cada passo que introduz uma decisão (1, 2, 3 e 5) acrescenta ao Registro de decisões do `README.md`, no conjunto dos
    seus commits, a linha de cada decisão que introduz, com a alternativa descartada e o trade-off aceito.
19. O `npm run check` começa por uma verificação rápida do executor de contêineres: sem executor acessível, sai com
    código diferente de 0, diz em uma mensagem curta que falta um executor de contêineres e aponta o `README.md`, e não
    roda nenhuma outra verificação; com executor, roda todas as verificações como antes, mesmo que uma falhe.

## Casos de teste

Os casos dos critérios 1 a 11 são de integração: rodam o código real do domínio contra um PostgreSQL de verdade, num
contêiner iniciado por execução, com as migrations aplicadas uma vez e cada caso isolado dos demais. O instante é um
valor fixo. Os critérios 13, 15 e 16 são regressões sobre o repositório. O 12 e o 14 rodam fora do `check`, o primeiro
em duas máquinas e o segundo com o compose do repositório, e os resultados vão ao `IA.md`, em "O que validei". O 17
consulta o CI. O 19 é o único caso que roda o `check` inteiro, num clone descartável, uma vez com e uma vez sem
executor; os demais não o rodam.

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Integração | O catálogo do banco lista exatamente as duas tabelas, com as colunas, os tipos e a obrigatoriedade do Contrato. Borda: nenhuma coluna a mais. |
| 2 | Integração | Depois de aplicar, reverter e aplicar, o catálogo da primeira e o da segunda aplicação são iguais, e depois da reversão nada do que o diretório criou existe. Bordas: o registro de migrations da ferramenta não conta; roda uma vez com migrations de teste e uma vez com as reais. |
| 3 | Integração | Cada valor de canal, prioridade e status passa; `fax`, `urgent`, vazio e `EMAIL` são recusados pelo banco com violação de integridade. |
| 4 | Integração | Para cada um dos quatro campos: 1 e o máximo passam; vazio e o máximo mais um são recusados. Bordas: o texto de teste usa letras fora do plano básico, que o domínio aceita e que ocupam dois códigos em UTF-16, para provar a contagem em pontos de código; o máximo vem das constantes do domínio. |
| 5 | Integração | O conjunto aceito é derivado do domínio: o par que `createTicketChange` produz e os pares de `TRANSITION_TICKET_STATUSES`. Cada um dos doze pares entre nulo ou um status e um destino é inserido, com a nota e o motivo que o par exige: os quatro do conjunto passam e os oito restantes são recusados. Bordas: um status para ele mesmo; nulo com `in_progress` ou `resolved`. |
| 6 | Integração | Percorre cada destino com nota e motivo presentes e ausentes: o veredito do banco coincide com o do domínio, obtido de `transitionTicketChange` com par válido. Bordas: nota em `in_progress`; motivo ao resolver; reabrir sem motivo; resolver sem nota. No `ticket`, `resolved` sem nota e `open` com nota são recusados. |
| 7 | Integração | Com uma entrada inserida, `UPDATE` de qualquer coluna e `DELETE` são recusados e a linha lida depois é igual à inserida; um `INSERT` novo passa. Borda: `UPDATE` que não muda valor algum também é recusado. |
| 8 | Integração | Três entradas inseridas em sequência voltam ordenadas por `id` na ordem da inserção, com `id` estritamente crescente. |
| 9 | Integração | Uma criação e uma cadeia de transições (abrir, atender, resolver, reabrir) são gravadas com os campos de `TicketChange`; o que volta é igual, com o texto já normalizado e os instantes iguais ao milissegundo. Borda: a nota some do ticket ao reabrir e continua na entrada de resolução. |
| 10 | Integração | Um nome com `$` e um com emoji, de tamanho válido, são aceitos pelo banco e recusados pelo domínio. Borda: o caso existe para documentar o limite, e muda só se a decisão mudar. |
| 11 | Integração | O `id` do ticket inserido tem a versão 7 no texto do UUID; a `version` sem valor informado é 1; `version` 0 é recusada. |
| 12 | Integração | O mesmo conjunto de testes, sem alterar uma linha de código, passa em duas máquinas com executores de contêineres diferentes, mudando só o ambiente de quem roda. Borda: o resultado das duas execuções vai ao `IA.md`, em "O que validei", com o executor de cada uma. |
| 13 | Regressão | Um teste lê a imagem do `compose.yaml` e confere que é a que o auxiliar passa ao contêiner. Borda: a imagem do contêiner de teste muda quando a referência do compose muda. |
| 14 | Integração | `docker compose run --rm migrate` num banco novo: saída 0 e as duas tabelas. Repetido: saída 0 e o esquema igual. Sem a variável da senha: recusa. Banco parado: saída diferente de 0. Borda: o código de saída sozinho não prova, e o esquema é conferido no banco. |
| 15 | Regressão | `git check-ignore .env` sai com 0, e um teste lê o `.env.example` e confere que toda linha que não é vazia nem comentário tem a forma `NOME=` sem valor. Borda: a recusa do compose sem a variável é o caso do critério 14. |
| 16 | Regressão | `npm ci` seguido de `git diff --exit-code package-lock.json` sai com 0, e nenhuma versão das dependências novas é uma faixa. |
| 17 | Integração | `gh run list --workflow check.yml --branch dev --commit <sha do HEAD> --json conclusion --jq '.[0].conclusion'` imprime `success`. Borda: run em andamento não conta. |
| 18 | Regressão | Em cada passo de 1, 2, 3 e 5, o diff acumulado dos commits do passo traz as linhas novas do Registro de decisões, com as três colunas preenchidas. Borda: o passo 4 não declara decisão e não exige linha. |
| 19 | Integração | Num clone descartável com uma violação de lint introduzida: sem executor acessível, o `npm run check` sai com código diferente de 0, a saída traz a mensagem de falta do executor e nenhum diagnóstico do lint; com executor, a saída traz o diagnóstico do lint e o código de saída é diferente de 0. Bordas: com executor e a árvore sem violação, sai com 0; a máquina de quem roda pode ter um executor padrão, e a ausência é simulada escondendo dele o acesso ao executor; o resultado vai ao `IA.md`, em "O que validei". |

## Restrições

- Dependências novas: `node-pg-migrate`, `pg`, `@types/pg`, `testcontainers` e `@testcontainers/postgresql`. A versão é
  pesquisada ao vivo no passo que a instala e mora só no manifesto.
- As migrations são SQL puro, escritas pelo autor, sem a linguagem de construção da ferramenta.
- O domínio não muda nesta spec; os testes só importam dele.
- O executor de migrations e o auxiliar de teste ficam fora de `apps/api/src/domain/`, que continua isolado, e entram na
  cobertura mínima do repositório.
- Os testes não dependem de qual executor de contêineres a máquina usa: nada no código escolhe um, e o que o executor
  pede é configuração de ambiente, documentada no `README.md`.
- Nenhum segredo entra no repositório: a senha do banco do compose vem do ambiente de quem roda, e o `.env` real fica
  fora do git.
- O `check` é o único portão e roda no CI; passa a exigir um executor de contêineres, e a exigência é verificada antes
  de tudo, por uma checagem que usa a mesma detecção de executor dos testes, para que passar nela signifique que os
  testes o encontram. A checagem não toca em linters nem em testes. Quando o `check` e o `fix` rodam fora dos passos é
  regra do `CLAUDE.md`.

## Validação

Comandos em sintaxe de `sh`, cada ferramenta sozinha:

```sh
tsc --noEmit
eslint apps/api --quiet --max-warnings 0
vitest run --coverage
git check-ignore .env
npm ci && git diff --exit-code package-lock.json
docker compose run --rm migrate
gh run list --workflow check.yml --branch dev --commit "$(git rev-parse HEAD)" --json conclusion --jq '.[0].conclusion'
```

Os três primeiros saem com 0 sobre a árvore sem alterações com um executor de contêineres disponível; o quarto e o
quinto saem com 0; o sexto cumpre o critério 14 com a variável da senha definida, no comando de compose do executor da
máquina; o último imprime `success`, depois do push de `dev`. Os critérios 12 e 19 não têm comando de uma linha: o 12 é
a repetição dos testes numa segunda máquina, e o 19 é o `check` num clone descartável, com e sem executor.

## Passos

Em todo passo, o `npm ci` não altera o lockfile e nenhuma versão vira faixa.

1. A infraestrutura de teste: as dependências novas; o `compose.yaml` só com o serviço `db`, dono da referência da
   imagem, e o `.env.example`; um executor que aplica e reverte as migrations de um diretório num banco; um auxiliar que
   inicia um PostgreSQL por execução de teste, com a imagem lida do compose, e aplica as migrations uma vez; um teste de
   fumaça com migrations de teste, só do teste, que prova aplicar, reverter e aplicar; o "Como rodar" do `README.md` com
   a configuração do executor de contêineres; e a checagem do executor como primeira etapa do `npm run check`, que trava
   todas as outras se faltar executor, com a linha do `check` na tabela de comandos do `README.md` ajustada no mesmo
   commit. O Registro ganha a linha do banco real num contêiner por execução no lugar de um banco simulado e a da
   checagem que trava o `check` sem executor. Prova: critérios 2 (com o diretório de teste), 12, 13, 15, 16, 18 e 19.
2. As tabelas `ticket` e `ticket_history_entry`, com os `CHECK` de conjunto, de tamanho, de transição e de nota e
   motivo, em SQL puro. O Registro ganha a linha do banco que espelha estrutura, tamanho, transições e presença de nota
   e motivo e deixa o formato de caractere para o domínio. Prova: uma sonda descartável fora do repositório com os casos
   dos critérios 1, 3 a 6, 10 e 11, com o resultado no `IA.md`, em "O que validei"; os testes duráveis são do passo 4.
   Critério 18.
3. A imutabilidade do histórico e a ordem por identificador crescente, em SQL puro. O Registro ganha a linha da
   imutabilidade pelo próprio banco. Prova: uma sonda descartável com os casos dos critérios 7 e 8, com o resultado no
   `IA.md`; os testes duráveis são do passo 4. Critério 18.
4. Os testes de integração dos critérios 1 a 11, e o de aplicar, reverter e aplicar sobre as migrations reais. Prova:
   critérios 1 a 11, e o 2 com `apps/api/migrations/`.
5. O serviço `migrate` no `compose.yaml` e a variável da senha no "Como rodar" do `README.md`. O Registro ganha a linha
   do `migrate` de execução única no lugar de migrar na subida da API. Prova: critérios 14, 15 e 18; depois do push de
   `dev`, o critério 17.
