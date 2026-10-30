# Toolchain mínimo: pinagem, portões e CI, refeito

Substitui: 00001

## Objetivo

Um repositório que instala de forma reproduzível e traz, em um único script `check`, a verificação de tipos, lint,
formato, Markdown, lockfile, workflows e testes, provada por um CI e por um canário de cada ferramenta, antes de existir
qualquer regra de negócio. A 00001 fica só como registro: tudo o que continua valendo dela mora aqui.

## Fora do escopo

- Fastify, Zod, PostgreSQL, migrations, React e `apps/web`: entram nas specs das suas fatias.
- Domínio, camadas e regras de importação entre elas.
- Contêiner, `compose` e a fixação de imagens.
- Teste de integração do sistema, com contêiner ou com duas instâncias da API, e teste de mutação.
- Hook local de git, script orquestrador dos portões e arquivo de tarefas (Makefile).
- Configuração do host do repositório (ruleset, check obrigatório) e atualização automática de dependências.
- Teste de linter: nenhuma suíte, commitada ou não, roda o `check` em laço nem aplica uma lista de provocações a ele. A
  prova de cada ferramenta é um canário descartável que roda só aquela ferramenta. Custo aceito: as opções do
  `tsconfig.json` e as regras do ESLint além das do canário não têm caso próprio, e uma delas desligada por engano passa
  sem ser vista até o CI ou o uso mostrar.
- Provar que o `check` roda com o ambiente reduzido a `PATH` e `HOME`: exigiria rodar o `check` fora do CI.
- Validar os arquivos sem dono na tabela de donos (`.npmrc`, `.node-version`, `.gitignore`, `.gitattributes`,
  `.prettierignore`, `.rumdl.toml`, `.editorconfig`, `LICENSE`, `docs/specs/.gitkeep`): nenhuma etapa os valida.

## Contrato

Comandos, executados na raiz:

```sh
npm ci
npm run check
npm run fix
```

Scripts do `package.json` da raiz. O `check` para na primeira etapa que falha. Cada ferramenta roda com a flag que reduz
a saída ao que reprova, e nenhum script filtra ou formata a saída com redirecionamento ou `|`:

```json
"check": "tsc --noEmit && eslint . --quiet --max-warnings 0 --cache --cache-strategy content --cache-location .cache/eslint/ && prettier --check . --log-level warn --cache --cache-strategy content --cache-location .cache/prettier/cache && rumdl check . --quiet && lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https --validate-integrity && action-validator .github/workflows/check.yml && action-validator .github/workflows/audit.yml && vitest run --coverage --silent --reporter=dot",
"fix": "eslint --fix . --quiet --cache --cache-strategy content --cache-location .cache/eslint/ && prettier --write . --log-level warn --cache --cache-strategy content --cache-location .cache/prettier/cache && rumdl fmt . --quiet"
```

Um dono por tipo de arquivo:

| Arquivo | Dono |
| --- | --- |
| `.ts` | TypeScript (tipos), ESLint (lint) e Prettier (formato) |
| `.js` | ESLint (lint, sem regras com tipos) e Prettier (formato) |
| `.json`, exceto o lockfile | Prettier (formato) |
| `.yml` | Prettier (formato); os de `.github/workflows/` também passam pelo `action-validator` (esquema) |
| `.md` | `rumdl` (lint e formato) |
| `package-lock.json` | `lockfile-lint` |
| `.npmrc`, `.node-version`, `.gitignore`, `.gitattributes`, `.prettierignore`, `.rumdl.toml`, `.editorconfig`, `LICENSE`, `docs/specs/.gitkeep` | nenhum; o `.editorconfig` só orienta o editor |

Arquivos de configuração e o que cada um declara:

| Arquivo | Declara |
| --- | --- |
| `.npmrc` | `save-exact=true`, `ignore-scripts=true` e `engine-strict=true` |
| `.node-version` e `engines.node` | a mesma versão exata de Node |
| `tsconfig.json` | modo estrito, sem emissão, sintaxe apagável apenas, e a opção `incremental` com o arquivo de build em `.cache/typescript/`; as opções `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noUncheckedSideEffectImports`, `allowUnreachableCode: false` e `allowUnusedLabels: false`; `apps`, `packages` e `vitest.config.ts` incluídos |
| `eslint.config.js` | o preset `recommended` do ESLint, os presets `strictTypeChecked` e `stylisticTypeChecked` do typescript-eslint, o plugin de testes do Vitest, o `eslint-config-prettier` por último, diretivas sem uso como erro, a pasta `.cache` ignorada, e as regras `eqeqeq`, `no-implicit-coercion`, `explicit-module-boundary-types`, `no-unsafe-type-assertion`, `require-array-sort-compare`, `strict-boolean-expressions` e `switch-exhaustiveness-check` |
| `vitest.config.ts` | cobertura V8 sobre `apps/*/src` e `packages/*/src`, sem os arquivos de teste, com mínimo de 90 em linhas, ramos, funções e instruções, relatório em texto, e `cacheDir` e `reportsDirectory` em `.cache/` |
| `.prettierignore` | `*.md` e `package-lock.json` |
| `.rumdl.toml` | largura de 120 colunas com reflow dos parágrafos e sem limite nos blocos de código, títulos `atx`, listas com `-`, ênfase com `*`, o título de front matter lido da chave `name`, e `cache-dir` em `.cache/rumdl` |
| `.editorconfig` | UTF-8, fim de linha LF, indentação de dois espaços, quebra de linha final e sem espaço no fim da linha |

Pacotes de desenvolvimento, todos com versão exata: `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`,
`eslint-config-prettier`, `@vitest/eslint-plugin`, `prettier`, `rumdl`, `vitest`, `@vitest/coverage-v8`, `@types/node`,
`lockfile-lint`, `@action-validator/cli` e `@action-validator/core`.

Workspaces:

| Caminho | Pacote |
| --- | --- |
| `apps/api` | `@ticketdesk/api` |
| `packages/contract` | `@ticketdesk/contract` |

O `apps/api` depende do `@ticketdesk/contract` pelo nome do pacote. Cada pacote tem um módulo mínimo, sem regra de
negócio, e `apps/api` tem um teste que exercita o código do `contract`.

Workflows:

| Arquivo | Job | Gatilho | Passos |
| --- | --- | --- | --- |
| `check.yml` | `check` | push | `npm ci` e `npm run check` |
| `audit.yml` | `audit` | push e agenda | `npm ci`, `npm audit --audit-level=high` e `npm audit signatures` |

## Critérios de aceite

1. `npm ci` termina com código 0 em uma cópia limpa e não modifica o `package-lock.json`.
2. Nenhuma versão declarada nos `package.json` (raiz e workspaces) usa `^`, `~`, faixa ou `latest`.
3. O `.npmrc` tem as três linhas do Contrato, com os mesmos valores, e `.node-version` é igual a `engines.node`.
4. `npm ci` termina com código diferente de 0 quando `engines.node` declara uma versão exata diferente da de Node em
   uso.
5. Um teste em `apps/api` exercita código do `packages/contract` importado pelo nome do pacote e passa.
6. Cada ferramenta do `check`, rodada sozinha sobre a árvore sem alterações, termina com código 0 sem apontar nenhum
   arquivo do repositório, e o Vitest imprime o relatório de cobertura com as quatro métricas no mínimo ou acima dele.
7. Cada ferramenta do `check`, rodada sozinha sobre a sua provocação do canário, termina com código diferente de 0 e
   imprime o arquivo da provocação junto da regra ou do diagnóstico que a reprovou.
8. Sobre um arquivo `.ts` mal formatado e um `let` nunca reatribuído, `fix` corrige os dois, e o ESLint e o Prettier,
   rodados sozinhos, terminam com código 0 sobre eles depois.
9. Depois do `fix`, o `rumdl`, rodado sozinho, termina com código 0 sem apontar arquivo sobre todos os `.md` do
   repositório.
10. O `check.yml` tem o job `check`, disparado por push, que roda `npm ci` e depois `npm run check`; o `audit.yml` tem o
    job `audit`, disparado por push e por agenda, que roda `npm ci`, `npm audit --audit-level=high` e
    `npm audit signatures`.
11. Os dois workflows declaram `permissions: contents: read`, `persist-credentials: false`,
    `node-version-file: .node-version` e `timeout-minutes`, e referenciam cada ação por SHA de commit.
12. Cada ferramenta, rodada com a flag de redução que o script `check` ou `fix` lhe dá, imprime sobre a árvore limpa só
    o que a flag permite (nada, ou o relatório de cobertura), e sobre a provocação do canário ainda imprime o arquivo e
    a regra ou o diagnóstico; os scripts não contêm `>` nem `|`.
13. O run do `check.yml` para o SHA do `HEAD` de `dev` termina com conclusão `success`.
14. Depois de rodar sozinhas as ferramentas de tipos, lint, formato, Markdown e testes na árvore sem alterações,
    `git status --porcelain --ignored` não lista nada além de `node_modules/` e `.cache/`.
15. A seção "Como rodar" do `README.md` cita `npm ci`, `npm run check`, `npm run fix` e `.node-version`, e cada comando
    citado existe como comando ou script do repositório. O `CLAUDE.md` aponta o CI como portão do push para `dev` e não
    traz mais a frase de que o push só acontece depois de todas as verificações; o `docs-auditor`, rodado sobre o diff
    do passo 7, não reporta `Omissão de comando`, `Referência pendurada`, `Valor repetido` nem contradição entre o
    `CLAUDE.md` e o Contrato.
16. Cada passo de 2 a 6 acrescenta ao Registro de decisões do `README.md`, no mesmo commit que traz o código, a linha da
    decisão que o passo introduz, com a alternativa descartada e o trade-off aceito.

## Casos de teste

Todos os casos de ferramenta rodam o comando real na raiz, com os comandos em sintaxe de `sh`, e a ferramenta roda
sozinha: nenhum caso roda o `check` inteiro. Canário é a provocação aplicada num clone descartável do repositório, no
scratchpad, no caminho que a ferramenta cobre (por exemplo `apps/*/src`), e descartada depois; o resultado que prova o
passo vai ao `IA.md`, em "O que validei".

Canário de cada ferramenta, uma provocação e o que a reprova:

| Ferramenta | Provocação | Reprovação esperada |
| --- | --- | --- |
| TypeScript | Função com tipo de retorno incompatível | Diagnóstico de tipo apontando o arquivo da provocação |
| ESLint | Um `==` e um `if` sobre um `number \| undefined` | Uma regra do ESLint apontando cada uma |
| Prettier | Uma linha `.ts` mal formatada | O arquivo listado como fora do formato |
| `rumdl` | Um parágrafo de Markdown acima de 120 colunas | A regra de largura apontando o arquivo |
| `lockfile-lint` | Uma dependência resolvida fora do registro do npm ou sem https | A dependência apontada |
| `action-validator` | Uma chave inválida em um workflow | O erro de esquema apontando o arquivo |
| Vitest com cobertura | Uma função exportada sem teste | Cobertura abaixo do mínimo, nomeando o arquivo |

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Integração | `npm ci` sai com 0 e o hash do `package-lock.json` é o mesmo antes e depois. Bordas: cópia sem `node_modules`; lockfile e manifestos coerentes. |
| 2 | Integração | Buscar `^`, `~`, `>`, `<`, `*`, `latest` e `x` nas versões dos `package.json` não encontra nada. Bordas: raiz, `apps/api`, `packages/contract`, versão do pacote interno. |
| 3 | Integração | O conteúdo de `.node-version` é igual a `engines.node`; `save-exact=true`, `ignore-scripts=true` e `engine-strict=true` aparecem como linhas do `.npmrc`. |
| 4 | Integração | Com `engines.node` trocado por outra versão exata, `npm ci` sai com código diferente de 0 e a saída traz a versão exigida e a em uso. |
| 5 | Integração | `vitest run` sozinho passa e lista o teste de `apps/api` como aprovado; o teste chama a função do `contract` pelo nome do pacote. |
| 6 | Integração | Cada uma das sete ferramentas, sozinha, sai com 0 e a saída não aponta arquivo; o Vitest imprime as quatro métricas de cobertura no mínimo ou acima. Borda: segunda execução seguida, com a pasta de cache já criada. |
| 7 | Integração | Cada linha da tabela de canários: a ferramenta sai com código diferente de 0 e a saída traz o arquivo e a regra ou o diagnóstico. Borda: o código de saída sozinho não prova. |
| 8 | Integração | Num arquivo `.ts` mal formatado e com um `let` nunca reatribuído, `fix` sai com 0; depois, ESLint e Prettier sozinhos saem com 0 sobre ele. Borda: arquivo sem quebra de linha final. |
| 9 | Integração | Depois do `fix`, `rumdl check .` sai com 0 e a saída não aponta arquivo. Borda: um parágrafo acima de 120 colunas em um `.md` existente. |
| 10 | Integração | O `check.yml` contém o job `check`, o gatilho `push`, e `npm ci` antes de `npm run check`; o `audit.yml` contém o job `audit`, os gatilhos `push` e `schedule`, e os três comandos na ordem do Contrato. |
| 11 | Integração | Em cada workflow, `grep` acha as quatro declarações, e cada `uses` tem um SHA de 40 caracteres. |
| 12 | Integração | Cada ferramenta com a sua flag de redução: na árvore limpa a saída é vazia (ou só o relatório de cobertura); na provocação do canário a saída traz o arquivo e a regra ou o diagnóstico. Borda: uma flag que esconda a falha reprova o passo. `grep` de `>` e `\|` nos dois scripts não acha nada. |
| 13 | Integração | `gh run list --workflow check.yml --branch dev --commit <sha do HEAD> --json conclusion --jq '.[0].conclusion'` imprime `success`. Borda: run ainda em andamento não conta. |
| 14 | Integração | Em árvore sem alterações, depois das cinco ferramentas rodadas sozinhas, `git status --porcelain --ignored` só lista `!! node_modules/` e `!! .cache/`. |
| 15 | Regressão | `grep` dos quatro termos na seção "Como rodar" acha todos; `npm run check` e `npm run fix` existem em `scripts`; `grep` da frase antiga no `CLAUDE.md` não acha nada; o `docs-auditor` sobre o diff do passo 7 não reporta os quatro achados. |
| 16 | Regressão | Em cada commit dos passos 2 a 6, o diff do `README.md` traz uma linha nova no Registro de decisões, com as três colunas preenchidas. |

A regra de `CLAUDE.md` sobre quando o `check` e o `fix` rodam é instrução para a IA e não tem teste de texto: a IA é
medida pelas ferramentas dela, e o `docs-auditor` confere que o documento dono a traz. Ela mora só no `CLAUDE.md`.

## Restrições

- Gerenciador de pacotes: npm com workspaces. Versões exatas nos manifestos e no lockfile; a versão de cada ferramenta
  mora em `package.json`, nunca em documento.
- Sem etapa de build; o verificador de tipos só verifica. A sintaxe de TypeScript é restrita à apagável.
- Sem scripts de instalação de dependências, sem hook local, sem script orquestrador e sem Makefile: os portões são o
  encadeamento direto dos scripts `check` e `fix` no `package.json` da raiz.
- A saída é reduzida pelas flags de cada ferramenta e nunca por redirecionamento, filtro ou `|`: sobre a árvore limpa a
  saída é mínima, e sobre uma falha ela ainda traz o arquivo e a regra ou o diagnóstico. Custo aceito: o contexto extra
  que a saída padrão traria some, e uma flag que esconda a falha só aparece no canário.
- Todo cache do tooling vive em `.cache/`, ignorado pelo git; nenhuma ferramenta deixa pasta ou arquivo de cache na
  raiz.
- O Prettier fica fora dos `*.md`: o `rumdl` é o único dono do Markdown.
- O CI usa a versão de Node de `.node-version`, instala por `npm ci`, declara permissão de leitura do conteúdo e fixa
  cada ação por SHA de commit. O `audit` fica em workflow próprio, separado do `check`.
- O `check` é o único portão e roda no CI; nenhum passo desta spec o roda fora do CI. Quando ele e o `fix` rodam fora
  dos passos é regra do `CLAUDE.md`.

## Validação

Comandos em sintaxe de `sh`, cada ferramenta sozinha:

```sh
npm ci
tsc --noEmit
vitest run --coverage
git status --porcelain --ignored
gh run list --workflow check.yml --branch dev --commit "$(git rev-parse HEAD)" --json conclusion --jq '.[0].conclusion'
```

O primeiro sai com 0, os dois seguintes saem com 0 sobre a árvore sem alterações, o quarto só lista `node_modules/` e
`.cache/`, e o quinto imprime `success`, depois do push de `dev`. As demais ferramentas têm o canário do passo que as
instala.

## Passos

Os scripts `check` e `fix` nascem pequenos e crescem a cada passo até a forma final do Contrato. Em todo passo, os
critérios 1 e 2 continuam valendo: `npm ci` não altera o lockfile e nenhuma versão vira faixa.

1. Raiz e workspaces: `.npmrc`, `.node-version`, `.editorconfig`, `package.json` da raiz com `engines` e workspaces, os
   dois pacotes com um módulo mínimo cada e o `package-lock.json`. Os arquivos deste passo existem na partida, e o passo
   não muda nenhum. Prova: critérios 1 a 4.
2. TypeScript estrito, com o arquivo de build em `.cache/typescript/`, e o script `check` com a etapa de tipos; o
   Registro de decisões ganha a linha da pinagem exata com `ignore-scripts` e `engine-strict`. Prova: critérios 6 e 7
   para o TypeScript, 14 e 16.
3. Vitest com cobertura e cache em `.cache/`, o teste que cruza os dois pacotes e a etapa de testes no `check`; o
   Registro ganha a linha da cobertura mínima. Prova: critérios 5, 6 e 7 para o Vitest, 14 e 16.
4. ESLint com os presets, as regras extras e o plugin de testes, Prettier com o `.prettierignore`, o script `fix`, e as
   etapas de lint e formato no `check`, com cache em `.cache/`; o Registro ganha a linha do Prettier fora dos `*.md`.
   Prova: critérios 6, 7 e 8 para o ESLint e o Prettier, 14 e 16.
5. `rumdl` com o `.rumdl.toml`, a formatação dos `.md` do repositório pelo `fix`, rodado uma vez, e a etapa no `check`;
   o Registro ganha as linhas do `rumdl` como dono do Markdown e do `.cache`. Prova: critérios 6, 7 e 9 para o `rumdl`,
   14 e 16.
6. `lockfile-lint`, os workflows `check.yml` e `audit.yml` e as etapas de `lockfile-lint` e `action-validator` no
   `check`; o Registro ganha as linhas do CI como único portão, do `audit` em workflow próprio e do canário no lugar da
   suíte de linter. Prova: critérios 6 e 7 para o `lockfile-lint` e o `action-validator`, 10 a 14 e 16.
7. Documentação do repositório e do harness local: no `README.md`, a seção "Como rodar" com `npm ci`, `npm run check`,
   `npm run fix` e o `.node-version`; no `CLAUDE.md`, a regra do push para `dev` reescrita para apontar o CI como
   portão, sem a frase `só acontece depois que todas as verificações`, e a regra de quando o `check` e o `fix` rodam
   fora do CI, escrita só ali. Prova: critério 15.
