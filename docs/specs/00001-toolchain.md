# Toolchain mínimo: pinagem, portões e CI

## Objetivo

Um repositório que instala de forma reproduzível, verifica tipos, lint, formato, Markdown, lockfile, workflows e testes
com um único comando, e prova essa verificação em um CI, antes de existir qualquer regra de negócio.

## Fora do escopo

- Fastify, Zod, PostgreSQL, migrations, React e `apps/web`: entram nas specs das suas fatias.
- Domínio, camadas e regras de importação entre elas.
- Contêiner, `compose` e a fixação de imagens.
- Teste de integração (com contêiner ou com duas instâncias da API) e teste de mutação.
- Hook local de git, script orquestrador dos portões e arquivo de tarefas (Makefile).
- Configuração do host do repositório (ruleset, check obrigatório) e atualização automática de dependências.
- Validar os arquivos sem dono na tabela de donos (`.npmrc`, `.node-version`, `.gitignore`, `.gitattributes`,
  `.prettierignore`, `.rumdl.toml`, `.editorconfig`, `LICENSE`, `docs/specs/.gitkeep`): nenhuma etapa os valida.

## Contrato

Comandos, executados na raiz:

```sh
npm ci
npm run check
npm run fix
```

Scripts do `package.json` da raiz. O `check` para na primeira etapa que falha, e nenhum dos dois filtra ou formata a
saída das ferramentas:

```json
"check": "tsc --noEmit && eslint . --max-warnings 0 --cache --cache-strategy content --cache-location .cache/eslint/ && prettier --check . --cache --cache-strategy content --cache-location .cache/prettier/cache && rumdl check . && lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https --validate-integrity && action-validator .github/workflows/check.yml && action-validator .github/workflows/audit.yml && vitest run --coverage",
"fix": "eslint --fix . --cache --cache-strategy content --cache-location .cache/eslint/ && prettier --write . --cache --cache-strategy content --cache-location .cache/prettier/cache && rumdl fmt ."
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
5. `npm run check` termina com código 0 em uma árvore sem alterações, e também em uma segunda execução seguida.
6. Cada provocação da lista do caso 6, aplicada sozinha, faz `npm run check` terminar com código diferente de 0.
7. `npm run fix` deixa em conformidade um arquivo `.ts` mal formatado, um `let` nunca reatribuído e um parágrafo de
   Markdown acima de 120 colunas, e `npm run check` termina com código 0 depois.
8. Um teste em `apps/api` exercita código do `packages/contract` importado pelo nome do pacote e passa.
9. `npm run check` termina com código 0 com o ambiente reduzido a `PATH` e `HOME`.
10. Depois de `npm run check` em uma árvore sem alterações, `git status --porcelain --ignored` não lista nada além de
    `node_modules/` e `.cache/`.
11. Os scripts `check` e `fix` não contêm `--quiet`, `--silent`, `--log-level`, `--reporter`, `>` nem `|`.
12. O `check.yml` tem o job `check`, disparado por push, que roda `npm ci` e depois `npm run check`.
13. O `audit.yml` tem o job `audit`, disparado por push e por agenda, que roda `npm ci`, `npm audit --audit-level=high`
    e `npm audit signatures`.
14. Os dois workflows declaram `permissions: contents: read`, `persist-credentials: false`,
    `node-version-file: .node-version` e `timeout-minutes`, e referenciam cada ação por SHA de commit.
15. O run do `check.yml` para o SHA do `HEAD` de `dev` termina com conclusão `success`.
16. A seção "Como rodar" do `README.md` cita `npm ci`, `npm run check` e `.node-version`, e não contém a versão de Node
    pinada.
17. O Registro de decisões do `README.md` tem cinco linhas de tabela distintas, que contêm respectivamente
    `ignore-scripts`, `cobertura`, `CI`, `rumdl` e `.cache`.
18. O `CLAUDE.md` contém `CI` na seção Commits, não contém a frase `só acontece depois que todas as verificações` e
    contém `spec: none (format)` na regra de spec.
19. A skill `docs` e o agente `docs-auditor` contêm a exceção de formatação na regra de spec congelada, e `grep` de
    `formatação` acha a linha da regra nos dois.
20. A skill `docs` e o agente `docs-auditor` contêm a regra de voz do `IA.md` (primeira pessoa do autor, a IA em
    terceira pessoa), `grep` de `primeira pessoa` acha a linha da regra nos dois, e `grep` de `autor` no `IA.md` não
    acha nada.

## Casos de teste

Todos os casos são de integração: cada um roda o comando real na raiz, com os comandos em sintaxe de `sh`. As
provocações dos casos 4, 6 e 7 são feitas e desfeitas antes do commit.

Caso 6, cada provocação aplicada sozinha:

1. Assertiva errada em um teste.
2. Função com tipo de retorno incompatível.
3. Indexar um array sem tratar `undefined`.
4. Atribuir `undefined` a uma propriedade opcional.
5. Sobrescrever um método sem `override`.
6. Acessar por ponto uma chave de assinatura de índice.
7. Função com um caminho sem `return`.
8. Código depois de `return`.
9. Um `enum`.
10. Um `as` que estreita um `unknown`.
11. Um `!!` sobre um valor.
12. Um `if` sobre um `number | undefined`.
13. Um `.sort()` sem comparador.
14. Um `switch` que não cobre todos os casos de uma união.
15. Um `==`.
16. Uma função exportada sem tipo de retorno.
17. Um `let` nunca reatribuído.
18. Uma diretiva `eslint-disable` sem efeito.
19. Um `it.only`.
20. Um teste sem `expect`.
21. Uma linha `.ts` mal formatada.
22. Um título de Markdown que pula um nível.
23. Um bloco de código de Markdown sem linguagem.
24. Uma linha de Markdown acima de 120 colunas.
25. Uma dependência do lockfile resolvida fora de `registry.npmjs.org` ou sem https.
26. Uma chave inválida em um workflow.
27. Uma função exportada sem teste.
28. Um `if` com um ramo sem teste.

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Integração | `npm ci` sai com 0; `git diff --exit-code package-lock.json` sai com 0. Bordas: cópia sem `node_modules`; lockfile e manifestos coerentes. |
| 2 | Integração | Buscar `^`, `~`, `>`, `<`, `*`, `latest` e `x` nas versões dos `package.json` não encontra nada. Bordas: raiz, `apps/api`, `packages/contract`, versão do pacote interno. |
| 3 | Integração | O conteúdo de `.node-version` é igual a `engines.node`; `save-exact=true`, `ignore-scripts=true` e `engine-strict=true` aparecem como linhas do `.npmrc`. |
| 4 | Integração | Com `engines.node` trocado por outra versão exata, `npm ci` sai com código diferente de 0. |
| 5 | Integração | `npm run check` sai com 0 depois de `npm ci`, e sai com 0 de novo na execução seguinte, com a pasta de cache já criada. |
| 6 | Integração | Cada item da lista acima faz `npm run check` sair com código diferente de 0. |
| 7 | Integração | Com um `.ts` mal formatado, um `let` nunca reatribuído e um parágrafo de Markdown acima de 120 colunas, `npm run fix` sai com 0 e `npm run check` sai com 0 depois. Borda: arquivo sem quebra de linha final. |
| 8 | Integração | O teste de `apps/api` passa e chama a função do `contract`. |
| 9 | Integração | `env -i PATH="$PATH" HOME="$HOME" npm run check` sai com 0. |
| 10 | Integração | Em árvore sem alterações, `git status --porcelain --ignored` depois do `check` só lista `!! node_modules/` e `!! .cache/`. |
| 11 | Integração | `grep` dos seis termos no valor dos dois scripts não acha nada. |
| 12 | Integração | O `check.yml` contém o job `check`, o gatilho `push`, e `npm ci` aparece antes de `npm run check`. |
| 13 | Integração | O `audit.yml` contém o job `audit`, os gatilhos `push` e `schedule`, e os três comandos na ordem do Contrato. |
| 14 | Integração | Em cada workflow, `grep` acha as quatro declarações, e cada `uses` tem um SHA de 40 caracteres. |
| 15 | Integração | `gh run list --workflow check.yml --branch dev --commit <sha do HEAD> --json conclusion --jq '.[0].conclusion'` imprime `success`. Borda: run ainda em andamento não conta. |
| 16 | Integração | `grep` dos três termos na seção "Como rodar" acha todos; `grep` do conteúdo de `.node-version` na seção não acha nada. |
| 17 | Integração | Na tabela do Registro de decisões, os cinco termos aparecem em cinco linhas diferentes. |
| 18 | Integração | `grep` da frase proibida no `CLAUDE.md` não acha nada; `grep` de `CI` na seção Commits e de `spec: none (format)` na regra de spec acha. |
| 19 | Integração | `grep` de `formatação` acha a linha da regra de spec congelada na skill `docs` e no `docs-auditor`. |
| 20 | Integração | `grep` de `primeira pessoa` acha a linha da regra de voz na skill `docs` e no `docs-auditor`; `grep` de `autor` no `IA.md` não acha nada. |

## Restrições

- Gerenciador de pacotes: npm com workspaces. Versões exatas nos manifestos e no lockfile; a versão de cada ferramenta
  mora em `package.json`, nunca em documento.
- Sem etapa de build; o verificador de tipos só verifica. A sintaxe de TypeScript é restrita à apagável.
- Sem scripts de instalação de dependências, sem hook local, sem script orquestrador e sem Makefile: os portões são o
  encadeamento direto dos scripts `check` e `fix` no `package.json` da raiz.
- A saída das ferramentas é a padrão: nenhum script filtra, resume ou formata o que elas imprimem.
- Todo cache do tooling vive em `.cache/`, ignorado pelo git; nenhuma ferramenta deixa pasta ou arquivo de cache na
  raiz.
- O Prettier fica fora dos `*.md`: o `rumdl` é o único dono do Markdown.
- O CI usa a versão de Node de `.node-version`, instala por `npm ci`, declara permissão de leitura do conteúdo e fixa
  cada ação por SHA de commit. O `audit` fica em workflow próprio, separado do `check`.
- Uma spec já commitada só é editada para formatação, pelo `npm run fix`, e o commit usa `spec: none (format)`; o
  conteúdo nunca muda.

## Validação

Comandos em sintaxe de `sh`:

```sh
npm ci
npm run check
git status --porcelain --ignored
gh run list --workflow check.yml --branch dev --commit "$(git rev-parse HEAD)" --json conclusion --jq '.[0].conclusion'
```

Os dois primeiros comandos saem com 0; o terceiro só lista `node_modules/` e `.cache/`; o quarto imprime `success`,
depois do push de `dev`.

## Passos

Os scripts `check` e `fix` nascem pequenos e crescem a cada passo até a forma final do Contrato. Em todo passo, os
critérios 1 e 2 continuam valendo: `npm ci` não altera o lockfile e nenhuma versão vira faixa.

1. Raiz e workspaces: `.npmrc`, `.node-version`, `.editorconfig`, `package.json` da raiz com `engines` e workspaces, os
   dois pacotes com um módulo mínimo cada e o `package-lock.json`. Prova: critérios 1 a 4.
2. TypeScript estrito, com o arquivo de build em `.cache/typescript/`, e o script `check` com a etapa de tipos. Prova:
   critério 5 e as provocações 2 a 9 do critério 6.
3. Vitest com cobertura e cache em `.cache/`, o teste que cruza os dois pacotes e a etapa de testes no `check`. Prova:
   critério 8 e as provocações 1, 27 e 28 do critério 6.
4. ESLint com os presets, as regras extras e o plugin de testes, Prettier com o `.prettierignore`, o script `fix`, e as
   etapas de lint e formato no `check`, com cache em `.cache/`. Prova: critério 7, na parte do `.ts` e do `let`, e as
   provocações 10 a 21 do critério 6.
5. `rumdl` com o `.rumdl.toml`, a formatação dos `.md` do repositório pelo `fix` e a etapa no `check`. Prova: critério
   7, na parte do Markdown, e as provocações 22 a 24 do critério 6.
6. `lockfile-lint`, os workflows `check.yml` e `audit.yml` e as etapas de `lockfile-lint` e `action-validator` no
   `check`. Prova: critérios 9 a 15 e as provocações 25 e 26 do critério 6.
7. Documentação do harness local e do repositório: seção "Como rodar" e Registro de decisões do `README.md`; no
   `CLAUDE.md`, a regra do push para `dev` reescrita para apontar o CI como portão, sem a frase
   `só acontece depois que todas as verificações`, e a regra de spec congelada com a exceção de formatação; e a mesma
   exceção na regra de spec congelada da skill `docs` e do `docs-auditor`; e a regra de voz do `IA.md` na skill `docs` e
   no `docs-auditor`. Prova: critérios 16 a 20.
