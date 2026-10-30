# Domínio do ticket: tipos, normalização, transições e isolamento

## Objetivo

O núcleo de regras do ticket em `apps/api/src/domain/`: os tipos, a normalização e a validação dos campos, a tabela de
transições, os erros e as duas operações puras que criam um ticket e o transicionam. O domínio não importa nada fora de
si, e uma regra do ESLint prova esse isolamento.

## Fora do escopo

- Identificador e `version` do ticket: o `Ticket` do domínio não os carrega; quem os guarda é a persistência.
- Persistência, SQL, migrations, a ordem entre instantes e a unidade de trabalho.
- HTTP, Zod, rotas, `If-Match` e a tradução de um `code` de erro em status HTTP ou em `application/problem+json`.
- O relógio: o instante entra por argumento e o domínio não sabe a hora atual, então não detecta um instante futuro.
- Regra de conteúdo além dos caracteres aceitos: um nome só de dígitos passa.
- Casos de uso, portas e as demais camadas: nascem com as specs das suas fatias.
- Tempo real, idempotência, paginação e filtros.
- A forma do código: assinaturas, funções auxiliares, classes e a organização em arquivos são de quem implementa. Esta
  spec fixa só nomes públicos, tipos e invariantes.

## Contrato

A superfície pública do domínio, em `apps/api/src/domain/`. Um valor ou campo é do tipo que a tabela diz, e a invariante
vale sempre.

Conjuntos fechados de valores:

| Conjunto | Valores |
| --- | --- |
| Status | `open`, `in_progress`, `resolved` |
| Canal | `email`, `chat`, `phone` |
| Prioridade | `low`, `medium`, `high` |

Ticket, uma fotografia imutável do estado, sem `id` nem `version`:

| Campo | Tipo | Invariante |
| --- | --- | --- |
| `customerName` | texto | Normalizado, 1 a 120 pontos de código |
| `description` | texto | Normalizado, 1 a 4000 pontos de código |
| `channel` | Canal | Um valor do conjunto |
| `priority` | Prioridade | Um valor do conjunto |
| `status` | Status | Um valor do conjunto |
| `resolutionNote` | texto ou nulo | Nulo fora de `resolved`; normalizado, 1 a 2000 pontos de código em `resolved` |
| `createdAt` | instante | Um instante válido, cópia do recebido |

Entrada do histórico, imutável:

| Campo | Tipo | Invariante |
| --- | --- | --- |
| `from` | Status ou nulo | Nulo só na primeira entrada de um ticket |
| `to` | Status | O status depois da mudança |
| `note` | texto ou nulo | Preenchido só ao resolver; normalizado, 1 a 2000 pontos de código |
| `reason` | texto ou nulo | Preenchido só ao reabrir; normalizado, 1 a 500 pontos de código |
| `at` | instante | Um instante válido, cópia do recebido |

Operações puras. Cada uma devolve o par (ticket, entrada do histórico) e lança um erro do domínio em vez de devolver
falha. As entradas de texto, de canal, de prioridade e de destino chegam como texto qualquer, e o domínio valida e
normaliza:

| Operação | Nome público | Recebe | Devolve |
| --- | --- | --- | --- |
| Criar um ticket | `createTicket` | nome do cliente, descrição, canal, prioridade e o instante | O ticket novo e a primeira entrada |
| Transicionar um ticket | `transitionTicket` | um ticket, o destino, a nota e o motivo (ambos opcionais) e o instante | O ticket no novo status e a entrada da mudança |

A tabela de transições é um dado público, `TRANSITIONS`, que mapeia cada um dos três status ao conjunto de destinos
permitidos; o que não está no conjunto é recusado. Ela contém exatamente:

| De | Para |
| --- | --- |
| `open` | `in_progress` |
| `in_progress` | `resolved` |
| `resolved` | `open` |

Erros. A base pública é `DomainError`, um `Error` com a propriedade `code`. O `code` é sempre um destes e é estável,
independente da mensagem:

| `code` | Quando |
| --- | --- |
| `invalid_customer_name` | Nome recusado pela normalização ou fora do intervalo, vazio inclusive |
| `invalid_description` | O mesmo para a descrição |
| `invalid_channel` | Canal fora do conjunto, em maiúsculas inclusive |
| `invalid_priority` | Prioridade fora do conjunto |
| `invalid_instant` | Instante cujo `getTime()` é `NaN` |
| `missing_note` | Resolver com nota ausente, ou que fica vazia depois da normalização |
| `invalid_note` | Nota recusada pela normalização ou fora do intervalo |
| `missing_reason` | Reabrir com motivo ausente, ou que fica vazio depois da normalização |
| `invalid_reason` | Motivo recusado pela normalização ou fora do intervalo |
| `invalid_transition` | Destino que não é um Status, ou par fora da tabela |

Campos de texto:

| Campo | Mínimo | Máximo |
| --- | --- | --- |
| `customerName` | 1 | 120 |
| `description` | 1 | 4000 |
| `note` | 1 | 2000 |
| `reason` | 1 | 500 |

Normalização de um texto, nesta ordem:

1. Converter para a forma de normalização Unicode NFC.
2. Recusar se restar qualquer caractere que não seja letra, número, pontuação ou espaço em branco (da classificação
   Unicode); emoji, símbolos, caracteres de controle e marcas combinantes que sobrarem depois do NFC são recusados.
3. Trocar cada bloco de espaço em branco (qualquer espaço em branco Unicode, inclusive espaço, tabulação e quebra de
   linha) por um único espaço.
4. Cortar o espaço das pontas.
5. Medir o comprimento em pontos de código e recusar se estiver fora do intervalo do campo.

Um texto ausente, ou que fica vazio na etapa 4, é o caso "ausente" da nota e do motivo (`missing_note` e
`missing_reason`); no nome e na descrição, vazio recusa com o código de recusa do campo.

Regras de comportamento:

- Criar devolve o ticket com `status` `open`, `resolutionNote` nulo e `createdAt` igual ao instante recebido, e a
  primeira entrada do histórico (`from` nulo, `to` `open`, `note` e `reason` nulos, `at` igual ao instante).
- Transicionar devolve o ticket com o novo `status` e uma entrada do histórico (`from`, `to`, `note` ou `reason`, `at`).
  Resolver grava a nota no ticket e na entrada; reabrir grava o motivo só na entrada e zera `resolutionNote`; passar a
  `in_progress` ignora a nota e o motivo, que não entram no ticket nem na entrada.
- Resolver exige a nota e reabrir exige o motivo, pela normalização acima.
- Ordem de checagem fixa, a primeira falha vence. Criar: instante, nome, descrição, canal, prioridade. Transicionar:
  instante, par, depois o texto exigido pelo destino.
- Nenhuma operação altera o que recebe. Os instantes guardados no resultado são cópias, e uma mudança posterior no
  instante recebido não altera o ticket nem a entrada.

Isolamento: o `eslint.config.js` recusa, nos arquivos de `apps/api/src/domain/`, importar das pastas `application`,
`infrastructure` e `interface` e dos pacotes `pg`, `fastify` e `zod`, com seus subcaminhos.

## Critérios de aceite

1. `createTicket` com dados válidos devolve o ticket `open`, sem nota, com `createdAt` igual ao instante, e a entrada
   com `from` nulo, `to` `open`, `note` e `reason` nulos e `at` igual ao instante; o ticket não tem `id` nem `version`.
2. Nome, descrição, nota e motivo chegam ao resultado com as pontas cortadas e cada bloco de espaço em branco (espaço,
   tabulação, quebra de linha) reduzido a um espaço.
3. Um campo com emoji, símbolo ou caractere de controle lança o código de recusa do campo; letras acentuadas, pontuação
   e dígitos são aceitos.
4. Cada campo aceita o comprimento mínimo e o máximo do Contrato, medidos depois da normalização, e recusa vazio, só
   espaços e um ponto de código acima do máximo.
5. Canal e prioridade aceitam cada valor do conjunto e recusam qualquer outro, inclusive o mesmo valor em maiúsculas,
   com `invalid_channel` e `invalid_priority`.
6. Um instante inválido lança `invalid_instant` em `createTicket` e em `transitionTicket`.
7. `transitionTicket` aceita as três transições da tabela, e cada um dos outros seis pares entre dois status, inclusive
   o de um status para ele mesmo, e um destino que não é um Status, lança um `DomainError` com `code`
   `invalid_transition`.
8. Resolver sem nota, com nota vazia ou só de espaços lança `missing_note`; com nota recusada pela normalização ou fora
   do tamanho lança `invalid_note`. Resolver com nota válida grava a nota no ticket e na entrada.
9. Reabrir sem motivo, com motivo vazio ou só de espaços lança `missing_reason`; com motivo recusado ou fora do tamanho
   lança `invalid_reason`. Reabrir com motivo válido deixa `resolutionNote` nulo e grava o motivo só na entrada.
10. Passar a `in_progress` com nota ou motivo informados, válidos ou não, é aceito e não os grava.
11. Com mais de um defeito na mesma chamada, vence o primeiro da ordem de checagem do Contrato.
12. Nenhuma operação altera o ticket recebido, nem quando congelado, e uma mudança posterior no instante recebido não
    altera o que foi devolvido.
13. Todo erro lançado é instância de `DomainError` com `code` da lista do Contrato, e o mesmo defeito produz o mesmo
    `code`, qualquer que seja a mensagem.
14. O ESLint, rodado sobre um arquivo de `apps/api/src/domain/` que importa de `application`, `infrastructure`,
    `interface`, `pg`, `fastify` ou `zod`, termina com código diferente de 0 e a saída aponta o arquivo da provocação;
    sobre a árvore sem alterações, termina com 0.
15. O run do `check.yml` para o SHA do `HEAD` de `dev` termina com conclusão `success`.
16. Cada passo acrescenta ao Registro de decisões do `README.md`, no mesmo commit que traz o código, a linha de cada
    decisão que introduz, com a alternativa descartada e o trade-off aceito.

## Casos de teste

Todos os casos de operação são unitários e rodam o código real, sem relógio, banco ou rede: o instante é um valor
fixo. O caso do critério 14 roda o ESLint real num clone descartável do repositório, no scratchpad, com a provocação
descartada depois; o resultado vai ao `IA.md`, em "O que validei". Nenhum caso roda o `check` inteiro.

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Unitário | O resultado tem exatamente o ticket e a entrada do Contrato; as chaves do ticket não incluem `id` nem `version`. Borda: cada canal e cada prioridade válidos. |
| 2 | Unitário | Cada campo de texto sai com espaços, tabulações e quebras de linha nas pontas cortados, e com blocos no meio reduzidos a um espaço. Bordas: só pontas; só meio; tabulação e quebra de linha no meio; nome com 120 letras e cinco espaços depois passa. |
| 3 | Unitário | Cada campo lança o próprio código de recusa com emoji, com `$`, `<` e `+`, e com `\u0000`; aceita "João D'Ávila-Souza", pontuação e um texto só de dígitos. Borda: o mesmo acento em forma composta e decomposta dá o mesmo resultado. |
| 4 | Unitário | Para cada campo: o mínimo (1) e o máximo passam; vazio, só espaços e o máximo mais um lançam o código de recusa, ou o de ausência para nota e motivo. Bordas: o limite é medido depois da normalização. |
| 5 | Unitário | Cada valor do conjunto passa; `fax`, `urgent`, vazio e `EMAIL` lançam o código do campo. |
| 6 | Unitário | Um instante com `getTime()` igual a `NaN` lança `invalid_instant` ao criar e ao transicionar por um par válido. |
| 7 | Unitário | Percorre os três status por três: os três pares da tabela passam e os seis restantes lançam `DomainError` com `invalid_transition`; um destino fora dos três status também. Borda: `TRANSITIONS` tem uma chave por status. |
| 8 | Unitário | Nota ausente, vazia e só de espaços lançam `missing_note`; 2001 pontos de código, emoji e símbolo lançam `invalid_note`; 1 e 2000 passam e a nota aparece no ticket e na entrada. |
| 9 | Unitário | Motivo ausente, vazio e só de espaços lançam `missing_reason`; 501 pontos de código, emoji e símbolo lançam `invalid_reason`; 1 e 500 passam, o motivo aparece só na entrada e `resolutionNote` fica nulo. Borda: reabrir, resolver de novo com outra nota e conferir que só a nova nota está no ticket. |
| 10 | Unitário | Destino `in_progress` com nota e motivo válidos, e com inválidos, devolve ticket e entrada sem eles. |
| 11 | Unitário | Criar com instante, nome e descrição inválidos juntos lança `invalid_instant`; sem o instante, `invalid_customer_name`. Transicionar com par inválido e nota inválida lança `invalid_transition`. |
| 12 | Unitário | O ticket congelado com `Object.freeze` passa por qualquer transição sem erro e igual a uma cópia profunda tirada antes; alterar o instante recebido depois não muda `createdAt` nem `at` da entrada. |
| 13 | Unitário | Para um defeito de cada código, o erro é `instanceof DomainError` e tem o `code` esperado. Borda: dois defeitos iguais com textos diferentes dão o mesmo `code`. |
| 14 | Integração | Para cada fonte recusada, um arquivo de provocação em `apps/api/src/domain/` com o `import` faz o ESLint sair com código diferente de 0 e apontar o arquivo; sem a provocação, sai com 0. Borda: o código de saída sozinho não prova. |
| 15 | Integração | `gh run list --workflow check.yml --branch dev --commit <sha do HEAD> --json conclusion --jq '.[0].conclusion'` imprime `success`. Borda: run em andamento não conta. |
| 16 | Regressão | Em cada commit dos passos 1 a 3, o diff do `README.md` traz as linhas novas do Registro de decisões, com as três colunas preenchidas. |

## Restrições

- Nenhuma dependência nova: o domínio usa só a linguagem e a biblioteca padrão.
- O domínio não importa das pastas `application`, `infrastructure` e `interface` nem dos pacotes `pg`, `fastify` e
  `zod`; a regra do ESLint do Contrato é a prova.
- Sintaxe de TypeScript restrita à apagável, como o `tsconfig.json` impõe.
- O ticket e a entrada do histórico são somente leitura; nenhuma operação muda o que recebe.
- O `check` é o único portão e roda no CI; nenhum passo desta spec o roda fora do CI. Quando ele e o `fix` rodam fora
  dos passos é regra do `CLAUDE.md`.

## Validação

Comandos em sintaxe de `sh`, cada ferramenta sozinha:

```sh
tsc --noEmit
eslint apps/api/src/domain --quiet --max-warnings 0
vitest run --coverage
gh run list --workflow check.yml --branch dev --commit "$(git rev-parse HEAD)" --json conclusion --jq '.[0].conclusion'
```

Os três primeiros saem com 0 sobre a árvore sem alterações, e o quarto imprime `success`, depois do push de `dev`. A
provocação do critério 14 tem o canário do passo 3.

## Passos

Em todo passo, o `npm ci` não altera o lockfile e nenhuma versão vira faixa.

1. Os tipos e os erros; a normalização de texto; `createTicket`; os testes. O Registro de decisões ganha as linhas do
   domínio sem `id` nem `version`, dos erros lançados com `code` em vez de devolvidos como resultado, das entradas
   de texto validadas pelo domínio, do texto normalizado em uma linha sem emoji nem símbolos, do instante recebido por
   argumento no lugar de o domínio ler o relógio e da primeira falha que vence no lugar de acumular todas. Prova:
   critérios 1 a 6, 11 (a parte de criar), 12 (a parte de criar), 13 e 16.
2. `TRANSITIONS` e `transitionTicket`, com os testes. O Registro ganha a linha da tabela de transições como dicionário
   de conjuntos. Prova: critérios 6, 7 a 10, 11 (a parte de transicionar), 12, 13 e 16.
3. A regra de isolamento no `eslint.config.js` e o canário descartável de cada fonte recusada. O Registro ganha a linha
   da regra do ESLint no lugar de uma ferramenta de grafo de dependências. Prova: critérios 14 e 16; depois do push de
   `dev`, o critério 15.
