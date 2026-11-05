# Diário de IA

Relato honesto do uso de IA neste projeto. Cada afirmação cita o rodapé `spec:` do trabalho que a sustenta; o commit se
acha com `git log --grep`. O arquivo cresce com as specs.

## Onde usei

- `spec: none (scaffold)`: a IA me entrevistou sobre a estrutura do repositório e redigiu o `README.md`, o `IA.md`, o
  `CLAUDE.md`, a skill `docs`, o agente `docs-auditor` e o `settings.json`, a partir das decisões que tomei na
  entrevista.
- `spec: 00001`: a IA me entrevistou sobre o toolchain mínimo, rodou um spike descartável e redigiu o rascunho da spec,
  que o `docs-auditor` revisou antes do commit. Prompts relevantes: "e se o gate não travar localmente com githook, mas
  for um CI que explode na branch dev?", "sem aproveitar agregador, só o que for de alto ROI, pinando versões
  brutalmente" e "toolkit mais enxuto possível, sem sobreposição, tudo comprovado, tudo configurado da forma mais padrão
  e organizada e sem muitas exceções".
- `spec: 00002`: a IA me entrevistou sobre as regras de documentação do harness local e redigiu o rascunho da spec, que
  o `docs-auditor` revisou antes do commit. Prompts relevantes: "a skill obriga o preenchimento adequado das docs,
  README.md com os trade-offs/decisões, IA.md, etc? e o docs-auditor pega não só os drifts, como a ausência de
  preenchimento deles?" e "contexto mora sempre nos locais mais adequados possíveis, sem redundância, sem sobreposição,
  explícitos e com gatilhos corretos". Também pedi que o `CLAUDE.md` mande rodar `npm run fix` antes de qualquer
  `git add` ou commit; a IA apontou que o comando ainda não existia, propôs esperar por ele e confirmei a ordem.
- `spec: 00003`: a IA me entrevistou sobre como substituir a spec 00001, em rodadas de perguntas fechadas, e redigiu o
  rascunho da spec, que o `docs-auditor` revisou antes do commit. Prompts relevantes: "e a lógica é a spec de replace
  sempre absorver a spec deprecada" e "check roda apenas uma vez, obrigatoriamente, no CI de linting, como montamos, ou
  uma vez, opcional, explicitamente permitido antes do seu commit, ou quando explicitamente solicitado".
- `spec: 00004`: a IA me entrevistou sobre o domínio do ticket e redigiu o rascunho da spec, que o `docs-auditor`
  revisou antes do commit. Prompt relevante: "é um dicionário de movimentos permitidos, certo? cada status é uma chave,
  com um set de valores dos status 'para' permitidos [...] assim, o custo fica O(1), sem complexidade e sem ifs
  condicionais".
- `spec: 00004`, passo 1: a IA escreveu os corpos dos testes das classes de erro, da normalização, dos predicados, dos
  normalizadores de canal e prioridade, do instante e do `createTicketChange`, a partir dos casos da spec.
- `spec: 00004`, passo 2: a IA escreveu os corpos dos testes do `transitTicketChange`, da tabela de transições e do
  normalizador de status, e, a meu pedido, as duas classes de erro de texto fora do destino e a troca, no meu
  `validateTransitionUnexpected`, dos dois erros que ele lançava por elas.
- `spec: 00004`, passo 3: a IA escreveu a regra de isolamento do domínio no `eslint.config.js` e os arquivos de
  provocação descartáveis, um por fonte recusada. Depois, a meu pedido, a IA trocou a lista de fontes proibidas pela
  regra do `eslint-plugin-import-x` e refez as provocações.
- `spec: 00005`: a IA me entrevistou sobre o esquema do banco e as migrations, rodou um experimento descartável sobre a
  equivalência dos regex e redigiu o rascunho da spec, que o `docs-auditor` revisou antes do commit. Prompt relevante:
  "se o banco nunca persistir antes de virar entidade de domínio [...] isso garante que a persistência sempre refletirá
  a invariante de construção dos textos e a mesma normalização. correto?".
- `spec: 00005`, passo 1: a IA pesquisou as versões ao vivo, instalou as dependências e escreveu o `compose.yaml` com o
  serviço `db`, a função `migrate`, o auxiliar de banco (menos a criação do banco de teste, que é minha) e os corpos dos
  testes de banco e o prefixo do script `check`. A checagem do container runtime, que a IA escreveu primeiro, eu
  reescrevi à mão depois, e a IA só trocou uma palavra da mensagem.
- `spec: none (tweak)`, lint e formato do SQL: a IA pesquisou as ferramentas, instalou o Postgres Language Server,
  escreveu o `postgres-language-server.jsonc`, os passos do `check` e do `fix`, a porta do `db` no compose e a seção do
  `README.md`. Pedi a cobertura máxima do servidor num arquivo versionado, sem senha, e a IA propôs o `--disable-db`.
- `spec: 00005`, passo 2: a IA escreveu fora do repositório a sonda com os casos dos critérios 1, 3 a 6, 10 e 11 e, como
  tutora, apontou o sintoma de cada erro até ela ficar toda verde. O SQL das tabelas é meu. A IA acrescentou a cláusula
  opcional do `TEMPLATE` na criação do banco de teste, trocou o nome da função nos testes que a chamam e escreveu os
  corpos dos testes de integração do esquema, a partir das linhas da sonda e derivando do domínio os conjuntos, os
  tamanhos e os pares.
- `spec: 00005`, passo 3: a IA escreveu fora do repositório a sonda com os casos dos critérios 7 e 8 e, como tutora, deu
  o caminho (função de gatilho e gatilho) e um exemplo de sintaxe sobre outra tabela. O SQL é meu. Por ordem minha, a IA
  escreveu os corpos dos testes de integração, no mesmo commit, e rodou o linter para explicar os avisos dos gatilhos.
- `spec: 00005`, passo 5: por ordem minha, a IA escreveu o serviço `migrate` passo a passo, explicando cada peça: a
  sonda fora do repositório com os casos do critério 14, o script de entrada `migrate.ts`, o `apps/api/Dockerfile`, o
  `.dockerignore`, o serviço no `compose.yaml`, os corpos dos testes do script e as seções do `README.md`. Conferiu ao
  vivo que a tag da imagem do Node existe.
- `spec: 00005`, passo 1, reaberto: a meu pedido, a IA trocou o leitor da imagem do `compose.yaml` por um parser de
  YAML, pesquisou a versão do pacote `yaml` ao vivo e reescreveu os testes do leitor.
- `spec: 00006`: a IA me entrevistou sobre o escopo da fatia, o status de cada falha e o formato das respostas, e
  redigiu o rascunho da spec, que o `docs-auditor` revisou antes do commit; os oito achados médios foram corrigidos na
  spec antes de congelá-la.
- `spec: 00006`, passo 1: a IA pesquisou ao vivo as versões do `fastify` e do `zod` e as instalou como dependências
  exatas de `apps/api`, explicando cada passo.
- `spec: 00006`, passo 2: a IA escreveu fora do repositório a sonda com os casos dos critérios 1 a 3 e deu exemplos de
  sintaxe de TypeScript sobre outros domínios (interface, classe que a implementa, consulta parametrizada, `map` e
  transação). A IA escreveu o `pool.ts` e os corpos dos testes de integração do pool e do repositório, a partir das
  linhas da sonda.
- `spec: 00006`, passo 3: a IA escreveu fora do repositório a sonda do passo e orientou a sintaxe de TypeScript enquanto
  eu escrevia os casos de uso. A IA escreveu o `application/errors.ts` e os testes dos erros e dos três casos de uso,
  contra o PostgreSQL real e com o relógio por argumento.
- `spec: 00006`, passo 4: a IA escreveu o servidor Fastify, as três rotas, os esquemas do Zod, o mapeador de erros em
  `problem+json` e os tipos do contrato, explicando cada peça antes de seguir, e os testes do servidor.
- `spec: 00007`: a IA me entrevistou sobre o fatiamento da fatia, o formato do `If-Match` e do `ETag`, o que o
  repositório devolve quando a condição falha e a ordem das checagens, e redigiu o rascunho da spec, que o
  `docs-auditor` revisou antes do commit; os seis achados médios foram corrigidos na spec antes de congelá-la.
- `spec: 00007`, passo 1: a IA escreveu fora do repositório a sonda com os casos dos critérios 1 e 2 e, a partir das
  linhas dela, os corpos dos testes do `updateTicketChange`.
- `spec: 00007`, passo 2: a IA escreveu fora do repositório a sonda com os casos do critério 4, a classe
  `VersionConflictError`, a entrada 409 do mapeador e, a partir da sonda, os corpos dos testes do caso de uso; o método
  privado de leitura do `TransitTicketUseCase` também veio dela, por ordem minha.
- `spec: 00007`, passo 3: a IA escreveu fora do repositório a sonda do critério 3 e completou as asserções do estado
  final do teste de conflito do repositório.
- `spec: 00007`, passo 4: a IA escreveu fora do repositório a sonda dos critérios 5 a 9 e 11 e, por delegação minha, a
  rota `POST /tickets/:id/transitions`, a leitura do `If-Match`, o `ETag`, os dois erros novos, o membro `ticket` do
  409, os tipos do contrato e os testes do servidor, explicando cada peça.
- `spec: 00007`, passo 5: a IA escreveu fora do repositório a sonda dos critérios 10 e 12 e o teste HTTP da corrida, por
  delegação minha.
- `spec: 00008`: a IA me entrevistou sobre o cursor, o formato da resposta e do cabeçalho `Link`, os filtros, o limite
  da página e o índice, e redigiu o rascunho da spec, que o `docs-auditor` revisou antes do commit; os seis achados
  médios foram corrigidos na spec antes de congelá-la.
- `spec: 00008`, passo 1: a IA escreveu fora do repositório a sonda do índice e, por delegação minha, o teste do índice
  no `schema.test.ts` e a linha do Registro de decisões.
- `spec: 00008`, passo 2: a IA escreveu fora do repositório a sonda do repositório e, por delegação minha, os testes de
  `listTickets` no `pg-ticket-repository.test.ts` e a linha do Registro de decisões.
- `spec: 00008`, passo 3: a IA escreveu fora do repositório a sonda do caso de uso e, por delegação minha, o esqueleto
  do arquivo, o `InvalidLimitError` com a entrada dele no mapeador e os testes do `list-tickets.test.ts`.
- `spec: 00008`, passo 4: a IA escreveu fora do repositório a sonda da rota e, por delegação minha, em cinco peças, uma
  de cada vez, com a explicação de cada uma: os tipos da lista em `packages/contract`, o `InvalidCursorError` com a
  entrada no mapeador, o `cursor.ts` com o `CURSOR_SCHEMA`, o esquema da consulta, a rota `GET /tickets` com o
  `presentNextLink` e o `listTicketsUseCase` no `Container`, os testes do `cursor.test.ts`, do `schemas.test.ts` e do
  `server.test.ts` e a linha do Registro.
- `spec: 00004`, testes: a IA revisou todos os testes contra a regra de testes do `CLAUDE.md`, apontou os que só
  afirmavam a presença de texto, os de detalhe de implementação e os repetidos, e, por ordem minha, os removeu ou uniu.
- `spec: 00009`: a IA me entrevistou sobre a tela, o cliente HTTP, como o front chega ao usuário e onde mora o
  `Dockerfile`, e redigiu o rascunho da spec, que o `docs-auditor` revisou antes do commit; os oito achados médios foram
  corrigidos na spec antes de congelá-la.
- `spec: 00009`, passo 2: por delegação minha, a IA pesquisou as versões do front no registro do npm, provou a
  compatibilidade num projeto descartável fora do repositório, escreveu a sonda e, em quatro peças, uma de cada vez, com
  a explicação de cada uma, o `package.json` e o `tsconfig.json` do `apps/web`, a página mínima, o script `build` da
  raiz, a cobertura dos portões do `check` e o teste do build.
- `spec: 00009`, passo 3: por delegação minha, a IA pesquisou a versão do servidor de arquivos oficial do Fastify,
  provou fora do repositório que ele serve a página e os arquivos, que o 404 do mapeador continua valendo e que ele só
  avisa, sem falhar, diante de uma pasta inexistente, escreveu a sonda e, em peças, uma de cada vez, com a explicação de
  cada uma, a variável no `Settings`, o plugin que serve a pasta, a assinatura nova do `buildServer`, os testes e a
  linha do Registro.
- `spec: 00009`, passo 4: por delegação minha, a IA escreveu a sonda e, em peças, uma de cada vez, com a explicação de
  cada uma, a liberação do `apps/web` no `.dockerignore`, o estágio do `Dockerfile` que constrói o front, a cópia dele
  para o alvo `api` e as passagens do `README.md`.
- `spec: 00010`: a IA me entrevistou em três rodadas sobre o fatiamento do front, o desenvolvimento contra a API, a
  autoria do cliente HTTP, os testes, os tipos compartilhados, o idioma e o conteúdo da tela, e redigiu o rascunho da
  spec, que o `docs-auditor` revisou antes do commit; os oito achados médios foram corrigidos na spec antes de
  congelá-la.
- `spec: 00010`, passo 1: por delegação minha, a IA escreveu a sonda e, em peças, uma de cada vez, com a explicação de
  cada uma, o proxy do `vite.config.ts`, o script `dev:web` e as passagens do `README.md`.
- `spec: 00010`, passo 2: por delegação minha, a IA escreveu a sonda e fez a ligação do `apps/web` ao pacote do
  contrato: a dependência no `package.json`, o lockfile e as cópias do pacote no estágio `web` do `Dockerfile`.
- `spec: 00011`: a IA me entrevistou sobre onde ficam o formulário e as transições, como o conflito aparece e quanto da
  regra mora na API, e redigiu o rascunho da spec, que o `docs-auditor` revisou antes do commit; os sete achados médios
  foram corrigidos antes de congelá-la.
- `spec: 00012`: depois que decidi fechar os dois pontos fracos do front, o corpo lido sem validação e o cliente sem
  teste, a IA redigiu o rascunho da spec, que o `docs-auditor` revisou antes do commit; os nove achados médios foram
  corrigidos antes de congelá-la.
- `spec: 00010`, passo 6: por delegação minha, a IA pesquisou as versões do `stylelint` e do `html-validate`, escreveu a
  sonda com os dezesseis defeitos provocados, montou `.stylelintrc.json` e `.htmlvalidate.json`, ligou os dois ao
  `check` e ao `fix` e corrigiu o CSS e o HTML que as regras reprovaram.
- `spec: 00010`, `spec: 00011` e `spec: 00012`: orquestrei a implementação do `apps/web`, decidindo o desenho (a regra
  na API, o front no mínimo, o `.env` como única fonte dos valores) e corrigindo o rumo a cada passo, e a IA a executou
  a partir das specs: o cliente HTTP com a leitura validada pelos esquemas do contrato, os hooks que guardam o estado da
  lista, do painel, da criação e da transição, os componentes e o CSS responsivo, e, do lado da API, a apresentação que
  diz em cada ticket para onde ele pode ir. Cada passo partiu de uma sonda fora do repositório, e os testes do cliente
  rodam contra a API e o banco reais.
- `spec: 00013`: a IA me entrevistou sobre o desenho da saúde e do log e redigiu o rascunho da spec, que o
  `docs-auditor` revisou antes do commit; o catálogo de eventos de log, que o auditor mostrou depender de um logger
  ainda não provado, guardei para depois.
- `spec: 00013`, passos 1 a 3: sob as minhas decisões e correções, a IA implementou a saúde, o log e o healthcheck do
  compose, com sondas e testes.
- `spec: none (tweak)`: a IA reescreveu o CSS do front com variáveis de cor, espaço e tamanho num só lugar, deu à tabela
  e ao painel o mesmo desenho de cartão, acrescentou o `data-status` que colore o status e trocou os dois `select` de
  filtro por grupos de botões dentro do cartão da tabela, a partir do que pedi.
- `spec: 00007`: a unidade de trabalho é minha, do desenho ao código. Decidi tirar a transação do repositório e
  entregá-la ao caso de uso, e escrevi à mão o contrato `UoW`, a base `UseCase` com a fábrica injetada, o `PgUoW`, a
  refatoração do `PgTicketRepository` para trabalhar sobre a conexão da unidade, a fábrica no container e a conversão do
  primeiro caso de uso, o `GetTicketUseCase`. A IA entrou como tutora de sintaxe e como executora mecânica: ensinou o
  equivalente em TypeScript de `async with` (`await using` e `[Symbol.asyncDispose]`), apontou o `BEGIN` que faltava e o
  `begin()` chamado sem `await` no construtor, propôs a fábrica assíncrona com construtor privado, que reescrevi, depois
  converteu os outros quatro casos de uso e o container para o padrão, e escreveu a sonda, os testes do `PgUoW` e a
  adaptação dos testes que já existiam. Prompts relevantes: "estou procurando algo como um `__aenter__`, `__aexit__` e
  with aqui no TS" e "garanta absolutamente que funciona. nada pode regredir".

## O que validei

- `spec: none (scaffold)`: conferi à mão que o `settings.json` é JSON válido, que `AGENTS.md` aponta para `CLAUDE.md`,
  que a documentação não tem árvore desenhada, versão nem tempo medido, e que cada caminho citado existe.
- `spec: 00001`: antes de congelar a spec, a IA provou, a meu pedido, num esqueleto descartável fora do repositório, que
  o `npm ci` com `ignore-scripts` e `engine-strict` passa no Node pinado e é recusado em outro, que cada uma das 28
  provocações da spec (teste, tipos, lint, formato, Markdown, lockfile, workflow e cobertura) faz o `check` sair com
  código diferente de 0, que o `fix` conserta formato, lint e a largura do Markdown, que o `npm audit` e as assinaturas
  passam, e que todo cache do tooling cai em `.cache/` sem deixar nada novo na raiz. Aprovei o toolkit a partir desse
  relatório, e os critérios da spec repetem as provas como comandos que qualquer pessoa pode rodar.
- `spec: 00001`, passo 1: a IA escreveu uma sonda fora do repositório, com sete casos (instalação limpa, lockfile
  intacto, versões exatas, `.npmrc`, `.node-version` igual a `engines.node`, recusa de outro Node e importação entre os
  dois pacotes), que ficou vermelha antes do código e verde depois dele.
- `spec: 00003`, passo 2: a IA escreveu uma sonda fora do repositório, com dez casos (instalação limpa e lockfile
  intacto, versões exatas, `tsc --noEmit` sem erro, arquivo de build só em `.cache/`, raiz sem arquivo novo, e a linha
  do Registro de decisões), que ficou vermelha antes do código e verde depois dele. O canário do TypeScript, num clone
  descartável, mostrou o `tsc` reprovando um retorno incompatível, uma indexação de array sem tratar `undefined` e um
  `enum`, cada um apontando o arquivo da provocação. O `check` não foi rodado.
- `spec: 00003`, passo 3: a IA escreveu uma sonda fora do repositório, com onze casos (instalação limpa, versões exatas,
  `tsc` sem erro, o teste de `apps/api` aprovado, cobertura com as quatro métricas no mínimo ou acima, cache em
  `.cache/`, raiz sem arquivo novo, e a linha do Registro), vermelha antes do código e verde depois dele. O canário do
  Vitest, num clone descartável, mostrou a cobertura reprovando uma função exportada sem teste, nomeando o arquivo e o
  mínimo. O `check` não foi rodado.
- `spec: 00003`, passo 4: a IA escreveu uma sonda fora do repositório, com onze casos (instalação limpa, versões exatas,
  ESLint e Prettier sem saída sobre a árvore limpa, cache em `.cache/`, raiz sem arquivo novo, os canários e a linha do
  Registro), vermelha antes do código e verde depois dele. Os canários, em clones descartáveis, mostraram o ESLint
  reprovando um `==` e um `if` sobre `number | undefined` pelas regras `eqeqeq` e `strict-boolean-expressions`, o
  Prettier reprovando uma linha mal formatada, e o `fix` trocando um `let` nunca reatribuído por `const` e formatando o
  arquivo. O `fix` rodou uma vez no repositório e só reformatou o `.claude/settings.json`. O `check` não foi rodado.
- `spec: 00003`, passo 5: a IA escreveu uma sonda fora do repositório, com dez casos (instalação limpa, versões exatas,
  `rumdl` sem saída sobre todos os `.md`, cache em `.cache/rumdl`, raiz sem arquivo novo, os canários, a quebra de linha
  final e as linhas do Registro), vermelha antes do código e verde depois dele. Os canários, em clones descartáveis,
  mostraram o `rumdl` reprovando um parágrafo acima de 120 colunas pela regra `MD013` e o `fix` quebrando o parágrafo em
  até 120 colunas. O `fix` rodou uma vez no repositório e só reformatou os `.md`: o reflow dos que já estavam
  commitados, menos o `README.md`, foi para um commit à parte com `spec: none (format)`, e o do `README.md` entrou junto
  com este passo. O `check` não foi rodado.
- `spec: 00003`, passo 6: a IA escreveu uma sonda fora do repositório, com doze casos (instalação limpa, versões exatas,
  `lockfile-lint` e `action-validator` sobre os arquivos do repositório, os dois canários, os jobs, gatilhos e comandos
  dos workflows lidos como YAML, permissões, ações por SHA, a forma final do `check`, raiz sem arquivo novo e as linhas
  do Registro), vermelha antes do código e verde depois dele. Os canários, em clones descartáveis, mostraram o
  `lockfile-lint` reprovando uma dependência fora do registro e sem https, nomeando o pacote, e o `action-validator`
  reprovando uma chave inválida no workflow. O `check` não foi rodado, e o run do `check.yml` no CI só se prova depois
  do push.
- `spec: 00003`, passo 7: a IA escreveu uma sonda fora do repositório, com sete casos (os comandos e o `.node-version`
  em "Como rodar", os scripts existentes, a versão do Node fora do README, a frase antiga do push fora do `CLAUDE.md`, o
  CI na seção Commits, a regra do `check` e do `fix` e o `rumdl` sem apontar arquivo), vermelha antes dos textos e verde
  depois deles. A regra de quando o `check` e o `fix` rodam não tem teste de texto: o `docs-auditor` confere que o
  documento dono a traz. O `check` não foi rodado.
- `spec: 00002`, passo 1: a IA mediu o `docs-auditor` novo com clones do repositório, um defeito por clone. Dos 8 clones
  rodados, 5 trouxeram a categoria e a gravidade esperadas, e 3 trouxeram a categoria com gravidade alta em vez de
  média, o que levou à correção da regra de gravidade no agente. Os outros 8 casos da spec ficaram sem medir, por custo.
- `spec: 00004`, passo 1: a IA rodou os testes das classes de erro e da normalização com `vitest` e conferiu `tsc`,
  `eslint` e `prettier --check`, cada ferramenta sozinha. O `check` não foi rodado.
- `spec: 00004`, passo 1: a meu pedido, a IA rodou uma tabela de 12 casos, entre aceitos e recusados pela etapa 2 da
  spec, sobre cada tentativa do meu regex dos campos de texto livre; a cada rodada apontou os casos que ainda passavam,
  e o regex final passa os 12.
- `spec: 00004`, passo 1: a IA escreveu fora do repositório uma sonda com os casos do passo, que parte vermelha e
  termina com as 31 linhas verdes sobre o meu `createTicketChange`, e rodou os testes com cobertura de 100% nas quatro
  métricas do domínio, além de `tsc`, `eslint` e `prettier`, cada ferramenta sozinha. O `check` não foi rodado.
- `spec: 00004`, passo 2: a IA escreveu fora do repositório uma sonda com os casos do passo, que parte vermelha e
  termina toda verde sobre o meu `transitTicketChange`. Uma linha dela apontou, no meu código, que o `createdAt` do
  ticket devolvido dividia o objeto `Date` com o ticket recebido; corrigi, e um teste agora trava o caso. O
  `npm run check` passou, com 100% de cobertura nas quatro métricas do domínio.
- `spec: 00004`, passo 3: a IA rodou o ESLint real num clone descartável, com um arquivo de provocação em
  `apps/api/src/domain/` para cada fonte recusada (`application`, `infrastructure`, `interface`, `pg`, `fastify` e
  `zod`). Cada um saiu com código 1 e a saída trouxe o arquivo e a regra `no-restricted-imports`; sobre a árvore sem
  provocação, saiu com 0. O critério 15, do CI, só se prova depois do push.
- `spec: 00004`, passo 3: antes de adotar o `eslint-plugin-import-x`, a IA pesquisou a versão ao vivo, conferiu que o
  `peerDependencies` dele aceita o ESLint em uso e o provou num clone descartável: um `import` de `../infrastructure`,
  de `../` fora do domínio e de um pacote instalado saíram com código 1 apontando o arquivo e a regra
  `import-x/no-restricted-paths`; um de `node:fs` saiu com código 1 pela `import-x/no-nodejs-modules`; um de subpasta do
  domínio, com `../` de volta para dentro dele, saiu com 0. A IA também mostrou que o plugin não barra um pacote ainda
  não instalado (quem reprova é o `tsc`), e que os testes do domínio importam o `vitest`, o que moveu a regra para fora
  dos `*.test.ts`.
- `spec: 00005`: a meu pedido, a IA subiu um PostgreSQL de teste num contêiner descartável e comparou, para cada ponto
  de código, o regex do domínio com o melhor regex equivalente do banco. Os dois divergem nos dois sentidos: no nome, o
  banco recusaria 5.576 pontos de código que o domínio aceita e aceitaria 1.495 que o domínio recusa; no texto livre, a
  conta é 4.658 e 148.652. O resultado tirou o formato de caractere do que o banco espelha e entrou na spec.
- `spec: 00005`: a IA conferiu no código do pacote do `node-pg-migrate` que ele carrega migrations em SQL puro com os
  marcadores de aplicar e reverter, antes de a spec nomear a ferramenta.
- `spec: 00005`, passo 1: a IA escreveu fora do repositório uma sonda com treze casos (dependências exatas, `npm ci` sem
  alterar o lockfile, o compose, o `.env.example`, o `.env` ignorado, a forma do script `check`, a suíte com cobertura,
  os dois testes nomeados, o README e a checagem do container runtime), que partiu com nove falhas e terminou toda
  verde. Num clone com uma violação de lint, o `check` com container runtime mostrou o diagnóstico do lint e, com o
  socket do container runtime escondido num namespace de montagem, parou na hora com a mensagem, sem rodar linter nem
  teste. Uma linha da sonda tinha um regex errado, que tratava `${POSTGRES_PASSWORD:?...}` como valor; corrigi a sonda e
  não o compose.
- `spec: 00005`, passo 1: a IA tentou fechar a leitura de `.env*` menos o `.env.example` com padrões de glob (`!(...)`,
  `[^e]` e `[!e]`) e provou, com arquivos descartáveis, que a permissão do Claude Code não aceita nenhum deles; só `?*`
  funciona. A negação voltou a `.env*` sem commit.
- `spec: none (tweak)`, lint e formato do SQL: a IA instalou o pacote num diretório descartável, com `ignore-scripts`, e
  provou que o binário roda; provou numa cópia das migrations que o `check` acusa o `DROP TABLE` e que o comentário
  `pgls-ignore` com o motivo cala o aviso, que o `format` falha com o SQL fora do estilo, que `format --write` o corrige
  e que um segundo `format` sai com 0. Sem `--disable-db` e sem banco, o `check` espera o tempo de conexão, e com a
  opção termina na hora. Numa pasta sem nenhum `.sql`, os dois comandos saem com erro, por isso os passos olham
  `apps/api`, que tem a fixture de migration dos testes.
- `spec: 00005`, passo 2: a sonda de 26 linhas partiu toda vermelha e terminou toda verde com as duas migrations. Ela
  confere o catálogo (tabelas, colunas, tipos e obrigatoriedade), os conjuntos, o tamanho em pontos de código com letras
  fora do plano básico, a nota e o motivo, os quatro pares aceitos e os oito recusados, a chave estrangeira sem cascata
  e o `id` do histórico crescente. Os testes de integração do esquema, que afirmam também o nome da constraint que
  recusa, e o de aplicar, reverter e aplicar as migrations reais passam no `check`.
- `spec: 00005`, passo 3: a sonda de onze linhas partiu com seis vermelhas (o `UPDATE` e o `DELETE` aceitos) e terminou
  toda verde com o meu `00003`. Os testes de integração afirmam o erro do gatilho (código e mensagem) e a linha igual
  depois do `UPDATE` e do `DELETE`, em uma linha e em todas, e depois do `TRUNCATE` da tabela e do `TRUNCATE` do
  `ticket` em cascata, além da ordem por `id`. A reversão do `00003` roda no teste de aplicar, reverter e aplicar.
- `spec: 00005`, passo 5: a sonda do critério 14 partiu com cinco linhas vermelhas e terminou toda verde, com o compose
  de verdade: a recusa sem a senha, a saída 0 e as duas tabelas num banco novo, a repetição sem mudar o esquema e a
  saída diferente de 0 com o banco parado. Os testes do script, que o rodam como processo, passam no `check`.
- `spec: 00005`, passo 1, reaberto: a IA provou o `yaml` fora do repositório, com o Node do projeto: um `import` ESM de
  um `.mts` leu a imagem do `db` de um compose com outro serviço escrito antes do `db`. Os testes novos do leitor
  afirmam a imagem do `db` em qualquer posição e a recusa de um `db` sem imagem, de outro nome de serviço, de um arquivo
  sem `services` e de um arquivo vazio.
- `spec: 00006`, passo 1: a IA provou o `fastify` e o `zod` fora do repositório, com o Node do projeto: uma rota `POST`
  com `inject` respondeu 201 a um corpo válido e 400 `application/problem+json` a um corpo com campo a mais
  (`strictObject`), e o `fastify` respondeu 400 sozinho a um JSON com sintaxe inválida, com o corpo de erro dele, então
  o mapeador de erros do passo 4 precisa cobrir esse caso. O `npm ci` não alterou o lockfile e o `check` passou. O
  `npm audit` listava os mesmos avisos moderados antes e depois da instalação, nenhum dos pacotes novos, e o CI só
  reprova de `high` para cima.
- `spec: 00006`, passo 2: a sonda de dez linhas partiu com uma falha (o arquivo do repositório não existia) e terminou
  toda verde com o repositório que escrevi. Os testes de integração do pool e do repositório, que afirmam a gravação
  atômica (nenhum ticket fica quando o banco recusa a entrada), a ordem do histórico, a ausência do identificador do
  banco na entrada e o instante igual ao milissegundo, passam no `check`.
- `spec: 00006`, passo 3: a sonda partiu vermelha (os casos de uso não existiam) e terminou verde com os que escrevi. Os
  testes afirmam o 404 de um `id` inexistente no `GetTicketUseCase` e no histórico, e a recusa do domínio saindo como
  erro do domínio pela criação; o `check` passou.
- `spec: 00006`, serviço `api` do compose: a IA construiu as duas imagens do `Dockerfile`, uma por alvo, e conferiu que
  a da `api` importa o código com o Node do projeto e não leva arquivo de teste. Em seguida subiu o compose inteiro num
  projeto descartável: o `db` ficou saudável, o `migrate` saiu com 0, a `api` respondeu 404 a um `id` inexistente e o
  `docker compose stop` a encerrou com código 0. O `check` não exercita a imagem nem o compose, então esse é o único
  teste dessa parte.
- `spec: 00006`, passo 4, "Como rodar": a IA provou num projeto descartável que `docker compose run --rm migrate` só
  devolve o controle depois da migração e que `docker compose up -d migrate` não espera por ela, e que um segundo
  `up -d` reconstrói a imagem da `api`. O README usa o primeiro no caminho de quem desenvolve.
- `spec: 00007`, passo 4: a sonda dos critérios 5 a 9 e 11 ficou vermelha antes da rota, com 16 casos reprovados, e
  verde depois dela, com os 19 casos aprovados; os testes do servidor repetem esses casos e o `check` passou com a
  cobertura mínima.
- `spec: 00007`, passo 5: a sonda ficou vermelha nas linhas da corrida e verde com o teste, que dispara duas requisições
  juntas e afirma um 200, um 409, uma só entrada nova e a `version` 2; o `check` passou sobre a árvore inteira.
- `spec: 00008`, passo 1: a sonda do índice ficou vermelha antes da migration, com quatro casos reprovados, e verde
  depois dela, com os oito aprovados, o que inclui reverter e aplicar de novo; o teste do `schema.test.ts` afirma a
  definição do índice no catálogo do banco.
- `spec: 00008`, passo 2: a sonda do repositório ficou vermelha antes do método e verde depois dele, com os dezoito
  casos aprovados, um deles o da leitura pelo `id`, que não podia quebrar, e os outros dezessete de listagem: percorrer
  páginas de 1, 2 e 3 sobre empates e vizinhos de microssegundo, a posição de um ticket apagado e os filtros. Os testes
  de `listTickets` repetem esses dezessete casos contra um banco só deles.
- `spec: 00008`, passo 3: a sonda do caso de uso ficou vermelha antes do ajuste final e verde depois dele, com os nove
  casos aprovados: página cheia com posição, última página sem posição, página de tamanho exato, lista vazia, filtros e
  percurso completo sem repetir ticket. Os testes do `list-tickets.test.ts` repetem esses casos com o repositório real e
  somam os limites aceitos e recusados.
- `spec: 00008`, passo 4: a sonda da rota partiu com os 44 casos vermelhos, porque a rota não existia, e ficou toda
  verde depois da rota; os testes do `server.test.ts` repetem os casos pela interface do servidor, sem abrir porta, e o
  do `invalid_limit` exercita o mapeador com um erro real lançado numa rota mínima, sem dublê.
- `spec: 00004`, testes: depois da limpeza, a IA rodou o `npm run fix` e o `npm run check`, que passou com a cobertura
  de linhas, ramos, funções e instruções ainda em 100%, e conferiu que os testes dos `normalize*` e dos `validate*`
  cobrem o que os removidos cobriam.
- `spec: 00009`, passo 2: antes de qualquer arquivo, a IA provou num projeto descartável, com o Node pinado do
  repositório, que as versões escolhidas do Vite, do plugin de React, do React e dos tipos compilam com o TypeScript do
  repositório em modo estrito, com JSX e DOM, e geram um `index.html` com o script que ele referencia. A sonda do passo
  partiu com dez dos catorze casos vermelhos e ficou toda verde, inclusive o `npm ci` sem alterar o lockfile e o
  `npm run check` com código 0; o teste do build repete o caso do `index.html` contra uma pasta temporária.
- `spec: 00009`, passo 3: a IA provou, num projeto descartável com o Fastify do repositório, que o servidor de arquivos
  responde 200 com o tipo de mídia do arquivo, mantém o 404 `route_not_found` para o desconhecido e para o caminho que
  sobe da pasta, e que uma pasta inexistente não impede o `ready()`, o que mostrou que o critério 6 pedia uma checagem
  própria. A sonda do passo partiu com quatro dos treze casos vermelhos e ficou toda verde; os testes do
  `server.test.ts` e do `settings.test.ts` repetem esses casos contra uma pasta temporária real.
- `spec: 00009`, passo 4: a sonda subiu a pilha inteira num projeto descartável do compose, com portas livres para não
  colidir com a minha, e partiu com dois dos nove casos vermelhos (a página e o script do build) e os outros sete
  verdes, entre eles o de que a imagem da `api` não traz o Vite nem o React; ficou toda verde depois do estágio novo,
  com a página, o script, a lista e o 404 respondendo pela porta publicada.
- `spec: 00010`, passo 1: antes de fechar o desenho do proxy, a IA provou num projeto descartável, com o Vite do
  repositório e o Node pinado, que um `import` estático de um pacote que o estágio do build não tem quebra o
  `vite build` com `ERR_MODULE_NOT_FOUND`, e que o `import()` dinâmico só no `serve` não quebra; a prova pesou na minha
  decisão de não compartilhar um pacote de configuração com o front. A sonda do passo partiu toda vermelha e ficou toda
  verde: a página, o proxy devolvendo o mesmo status e corpo da API e a recusa de subir sem `API_PORT`.
- `spec: 00010`, passo 2: a sonda checou o lockfile antes e depois do `npm ci`, o `tsc` do front sobre um arquivo que
  importa `TicketResponse`, o `docker build` dos alvos `migrate` e `api` e a pilha de pé num projeto descartável do
  compose. Só duas das oito linhas partiram vermelhas (a dependência e o lockfile); uma nona, que a própria sonda
  acrescentou, provou que o estágio `web` resolve o contrato e ficou vermelha até o `Dockerfile` copiar o pacote.
- `spec: 00010`, passo 3: a sonda roda o cliente contra a API real num projeto descartável do compose, com 45 tickets
  semeados, empates de `created_at` forçados no banco, tickets com transições e um servidor local que responde 502 com
  texto; antes de entregá-la, a IA a provou contra um cliente descartável seu, fora do repositório, e depois o apagou.
  Ela partiu vermelha, na importação do arquivo, e ficou toda verde com onze linhas.
- `spec: 00011` e `spec: 00012`: o teste do cliente roda contra a API real e o banco real, com 45 tickets e empates de
  `created_at`, cada filtro, o histórico em ordem, os erros e vinte rodadas de duas transições disparadas juntas, que
  dão sempre um sucesso e um conflito; um servidor local entra só para o que a API não produz, como o 502 em texto e o
  corpo fora do contrato. Cada passo da 00011 e da 00012 partiu de uma sonda vermelha fora do repositório e fechou com
  `fix` e `check` verdes.
- `spec: 00010`, passo 6: antes de entrar no repositório, as versões dos linters de CSS e de HTML foram pesquisadas no
  registro do npm e provadas num diretório descartável com dezesseis defeitos provocados, oito de CSS e oito de HTML,
  cada um reprovado pela regra esperada; no repositório, os arquivos limpos passam, o `fix` conserta o defeito de ordem
  das propriedades e nenhum cache aparece fora de `.cache/`.
- `spec: none (tweak)`: uma subida do zero do `docker compose` falhou uma vez, com o `migrate` recusado pelo banco. Pedi
  a um agente da IA que testasse a hipótese num clone do repositório, com projeto e volumes próprios, sem tocar na minha
  pilha: em 44 subidas do zero, nenhuma falhou. A mesma medição mostrou o mecanismo possível, em que o Postgres declara
  "pronto" duas vezes na inicialização e o `pg_isready` por socket pode marcar o banco saudável por cerca de um décimo
  de segundo antes de a porta de rede abrir. A falha não reproduziu, então a causa segue como hipótese e o
  `compose.yaml` não mudou.
- `spec: 00013`: cada passo partiu de uma sonda vermelha que ficou verde. A prontidão foi medida contra um Postgres de
  verdade pausado com `docker pause`, um teste executa o comando do healthcheck contra uma API de pé e contra uma sem
  banco, e o teste do log varre as linhas no nível `trace` atrás de texto do ticket e de query string.
- `spec: none (tweak)`: pedi à IA uma passada completa pela tela e pela API vivas, numa pilha descartável do `compose`
  com portas próprias e um Chromium controlado por CDP. Passaram criar, iniciar, resolver, reabrir, o conflito 409, a
  paginação sem repetição, os filtros, a API fora do ar com "Tentar de novo", o duplo clique, o texto com HTML, o
  celular e o teclado; trinta requisições inválidas à API responderam todas com o status e o `code` certos, e as 134
  linhas de log eram JSON, sem nível `error`, sem 500 e sem o texto de um ticket. A passada achou três defeitos pequenos
  da tela (o aviso de erro que ficava depois de uma ação bem-sucedida, o pedido do `favicon.ico` que dava 404 e o
  `detail` em inglês numa tela em português), corrigidos e conferidos de novo na tela. O healthcheck do `db` por rede
  foi provado em três subidas do zero.
- `spec: 00004`: a regra de texto dos quatro campos passou de uma lista do que se aceita para uma lista do que se
  recusa. Uma sonda de 33 casos nasceu vermelha (emoji composto, marca combinante de vários idiomas, apóstrofo curvo e
  ponto no nome) e ficou verde; um caso da própria sonda estava errado (cento e vinte famílias de cinco pontos de código
  não cabem em 120) e foi corrigido na sonda, não no código.
- `spec: none (tweak)`: a tela nova foi conferida no Chromium contra a API real, com 26 tickets: "Carregar mais" dentro
  do cartão da tabela, cada filtro, a combinação de filtros e o estado vazio, cliques rápidos nos filtros (fica o
  último), o hover do botão marcado, o ciclo de criar, iniciar, resolver e reabrir, a nota de resolução obrigatória, o
  conflito 409 e a API parada com "Tentar de novo". A página não ganha rolagem horizontal em 1280, 1024, 820, 600 e 375
  pixels, os campos, os selects e o botão do formulário têm 36 pixels de altura, e não houve exceção no console nem
  resposta 5xx.
- `spec: 00007`: pedi uma sonda vermelha antes de qualquer teste, e a IA a escreveu fora do repositório, contra um
  PostgreSQL real, com 21 linhas: as 10 de regressão dos casos de uso passam no commit anterior e as 11 da unidade de
  trabalho falham ali, porque o `PgUoW` não existe; na árvore nova passam as 21. Pedi que nada regredisse: os testes de
  atomicidade que viviam no repositório foram movidos para o `PgUoW` com a mesma asserção, sem apagar nenhum, e a
  corrida de duas gravações passou a usar duas unidades. A IA introduziu quatro defeitos de propósito, um por vez, e os
  testes falharam em todos (o `dispose` sem `rollback`, o `commit` sem `COMMIT`, o `BEGIN` que falha sem liberar a
  conexão e a transição sem `commit`). A suíte inteira, com 740 testes, passa acima do piso de cobertura, e uma pilha
  descartável do compose, com a imagem construída do zero, respondeu às 11 checagens de HTTP, entre elas a corrida de
  seis transições, com um `200` e cinco `409`, sem linha de erro, sem `5xx` e sem transação aberta.

## Um erro da IA

- `spec: none (scaffold)`: no primeiro rascunho de spec, a IA escreveu um critério de tempo ("o hook conclui em até 10
  segundos") que ninguém mediu. Percebi que uma afirmação não determinística faria uma spec congelada envelhecer; o
  critério saiu, junto com versões e fatos externos, e a regra entrou na skill `docs`.
- `spec: none (scaffold)`: a IA descreveu a estrutura de pastas como uma árvore desenhada com caracteres num bloco de
  código. Pedi tabelas simples de markdown, e a regra de estilo entrou na skill `docs`.
- `spec: 00001`: o primeiro rascunho da spec trazia critérios que um comando não decide (o relatório do próprio
  `docs-auditor` como critério), um caso que dependia do Node da máquina de quem roda, afirmações sobre o que o Node
  executa e comandos encadeados com `&&`. O `docs-auditor` apontou esses desvios ao revisar o rascunho, e os critérios
  foram reescritos como condições binárias, com as provocações em casos controlados.
- `spec: 00001`: a primeira versão do reforço do tooling era um conjunto inchado, com plugins de segurança, de
  comentários, de YAML e de JSON, dezenas de regras de ESLint e opções do `tsconfig` que repetiam o ESLint. Exigi um
  toolkit enxuto, sem sobreposição e com poucas exceções; a IA cortou o que se repetia e, na poda, trocou o
  `@eslint/markdown` pelo `rumdl` e tirou duas opções do `tsc` que o ESLint já cobria.
- `spec: 00001`: a IA escreveu várias entradas deste arquivo se referindo a mim em terceira pessoa, quando o diário é
  escrito por mim, em primeira pessoa, com a IA como terceira pessoa. Percebi ao ler e pedi a correção; as entradas
  foram reescritas e a regra de voz é entregue pela spec 00002.
- `spec: 00002`: a IA escreveu, para uma spec de harness, casos de teste que procuravam frases na skill e no
  `CLAUDE.md`, primeiro com frases-âncora e depois com `grep` estrutural. Teste de texto não trava comportamento nenhum;
  apontei que um teste trava o comportamento do código e que a IA é medida pelas próprias ferramentas, e a regra é
  entregue pela spec 00002.
- `spec: 00002`: a IA escreveu na spec 00001 critérios com asserção fraca, que afirmam só que o `check` sai com código
  diferente de 0, sem o diagnóstico específico de cada falha. Apontei que teste mede comportamento, sempre; uma spec
  nova vai substituir a 00001 com a asserção do diagnóstico exato.
- `spec: 00002`: a IA disparou 14 auditores em paralelo para medir o `docs-auditor`, perto de 770 mil tokens, sem
  perguntar o custo antes. Percebi pelo gasto e cobrei; a IA parou as execuções e as medições que sobraram passam a
  depender da minha ordem.
- `spec: 00003`: na 00001 a IA tinha escrito critérios que rodavam o `check` dezenas de vezes, uma por provocação, sem
  pesar que o `check` roda todos os linters do repositório e atrasaria cada passo. Apontei o custo; a 00003 troca a
  lista de provocações por um canário de cada ferramenta, rodando só aquela ferramenta, e o `check` roda uma vez no CI.
- `spec: 00003`: a IA escreveu na spec que `vitest run` sozinho lista o teste de `apps/api` como aprovado, mas o
  reporter padrão só imprime as contagens. A própria IA percebeu ao escrever a sonda do passo 3 e perguntou como provar
  o caso; como a spec já estava congelada, a sonda roda o Vitest com `--reporter=verbose` para ver o nome do teste e lê
  o resumo de cobertura que ele imprime.
- `spec: 00003`: a IA escreveu na spec que cada ferramenta reprovada imprime o arquivo da provocação, mas o
  `action-validator` imprime só o caminho dentro do workflow e a chave inválida, sem o nome do arquivo, e não tem flag
  para isso. A própria IA percebeu ao rodar o canário do passo 6 e perguntou como tratar; decidi aceitar o desvio, com a
  spec congelada, e o canário passa a conferir a chave e o caminho no lugar do arquivo.
- `spec: none (scaffold)`: a IA escreveu no `CLAUDE.md` que o `settings.json` nega "commitar sem passar pelo hook", mas
  o repositório não tem hook algum. O `docs-auditor` apontou o desvio; a linha passou a listar as negações que o arquivo
  tem de fato.
- `spec: none (tweak)`: a IA propôs ligar o `check` obrigatório no ruleset `protect-branches`, que cobre também a `dev`,
  o que travaria o meu push direto nela, porque o GitHub exige o check antes de aceitar o push. Percebi ao ver a tela do
  ruleset e perguntei; o check obrigatório ficou num ruleset à parte, o `protect-main`, só para a `main`.
- `spec: 00004`: a IA escreveu os tipos, os erros e um esqueleto da criação do ticket no domínio, que eu escrevo à mão,
  e a spec trazia o contrato desse código como assinaturas e classes. Interrompi, mandei apagar tudo o que a IA escreveu
  nesses arquivos e exigi que a spec fixe só nomes públicos, tipos e invariantes; a regra entrou na skill `docs` e no
  `CLAUDE.md`.
- `spec: 00004`: no passo 1, a IA respondeu mais de uma vez sem reler o arquivo que eu tinha acabado de salvar, e eu
  precisei repetir o pedido. Percebi pela demora e cobrei a leitura do arquivo antes de cada resposta.
- `spec: 00004`, passo 1: a IA apontou imports inexistentes no meu `lifecycle.ts` porque leu uma versão antiga do
  `ticket.ts`, em que eu já tinha renomeado os tipos, e renomeou `createTicketChange` para `createTicket` sem eu pedir.
  Percebi ao ler a resposta e pedi para manter o nome; a IA voltou o nome e passou a reler o arquivo antes de apontar.
- `spec: 00005`, passo 2: a sonda aceitava como recusa do histórico um erro do `INSERT` do ticket que ela mesma montava,
  e duas linhas (versão 0 e `created_at` ausente) passavam por engano, porque a recusa vinha do `NOT NULL` de outra
  coluna. A IA percebeu ao ler a própria saída com o esquema ainda incompleto e corrigiu a sonda antes de eu escrever o
  histórico: a montagem do ticket virou uma falha à parte, e cada linha ganhou um caso válido de controle. Depois, o
  `docs-auditor`, ao conferir o `IA.md` contra o SQL, apontou dois buracos no meu SQL que a sonda não cobria, um par com
  os dois status desconhecidos e um motivo de reabertura na entrada de criação; a IA os confirmou, acrescentou as duas
  linhas à sonda e eu corrigi as restrições.
- `spec: 00005`, passo 3: a IA recomendou `ticket_history_entry_immutable_trigger` para o gatilho de `UPDATE` e `DELETE`
  e, ao eu decidir bloquear também o `TRUNCATE`, sugeriu um segundo gatilho com outro nome, o que deixava o primeiro com
  um nome que prometia a imutabilidade inteira. Percebi pelo nome e apontei; a IA concordou e propôs nomear os dois pelo
  nível em que atuam, `row` e `table`. Também escreveu no motivo do `pgls-ignore` que a tabela era nova e vazia, o que
  só vale no primeiro deploy; apontei e a IA tirou essa parte.
- `spec: 00005`, passo 5: a sonda do critério 14 reprovou a recusa sem a senha por culpa dela e não do compose: o
  compose lê o `.env` da pasta sozinho, e o parâmetro com valor padrão trocava o `undefined` pela senha de teste. A IA
  percebeu ao rodar o compose cru, que recusava e nomeava a variável, e corrigiu a sonda sem mudar o caso. Antes disso,
  a primeira versão do script de entrada lia uma `DATABASE_URL` que o compose montaria com a senha, e uma senha com `@`
  ou `/` a quebraria; a IA trocou por variáveis `PG*` separadas antes de eu pedir.
- `spec: 00006`, passo 4: o `Dockerfile` e o `.dockerignore` do `migrate` copiavam só o `settings.ts` e não o
  `errors.ts` que ele importa, e a imagem quebraria ao rodar. A IA achou e corrigiu antes de commitar a configuração;
  nenhum teste constrói essa imagem (o `migrate.test.ts` só lê o texto do `Dockerfile`), e só o `docker build` do commit
  do serviço `api` a construiu de verdade.
- `spec: 00007`, passo 2: a IA sugeriu que o caso de uso lançasse um erro comum (um 500) quando, depois de um `null`, a
  `version` relida fosse igual à esperada, como forma de não deixar um defeito silencioso. Percebi que o caso não
  existe: o `from` vem da mesma leitura que passou na comparação da `version`, e a `version` só sobe, então um `null`
  sempre vem com uma `version` diferente. A IA concordou, retirou a sugestão e ficou o `version_conflict` simples da
  spec, sem desvio.
- `spec: 00007`, passo 4: o caso de ordem das checagens da sonda mandava um JSON quebrado sem `If-Match` e esperava 428,
  mas o Fastify recusa o JSON antes de a rota rodar, e a resposta é 400. A sonda mostrou o caso vermelho com o código
  pronto, a IA apresentou as duas saídas e eu aceitei o desvio: o caso passou a usar um JSON válido de forma errada, e o
  desvio fica declarado no parágrafo do commit.
- `spec: 00008`, passo 2: a sonda do repositório chamava `listTickets` sem `status`, `channel` e `after`, que o contrato
  tipa como `null`, e eles chegavam como `undefined`. Os dezessete casos de listagem reprovaram com o mesmo erro de
  leitura de `createdAt`. A IA apontou que a falha era da sonda, e não do repositório, e a corrigiu para completar os
  campos com `null`, sem afrouxar a checagem do repositório.
- `spec: 00009`, passo 2: o script `build` da raiz foi escrito sem o `--` que repassa argumentos, então o `--outDir` do
  teste do build virou argumento do `npm`, e o Vite tomou a pasta temporária como raiz do projeto. O teste reprovou na
  primeira rodada, a IA achou a causa e acrescentou o `--` ao script.
- `spec: 00009`, passo 3: quando perguntei por que a checagem da pasta não ficava no `Settings`, a IA concordou de
  imediato e propôs mover a checagem para lá. Só ao eu perguntar como isso se comportaria em deploy ela notou que o
  `migrate.ts` também lê o `Settings` e passaria a falhar por causa de uma pasta do front, e voltou atrás: a checagem
  fica no plugin que consome a pasta, e o `fromEnv` continua só lendo o texto.
- `spec: 00010`, passo 2: a IA previu que o `docker build` quebraria assim que o `apps/web` declarasse o contrato, e a
  sonda mostrou o contrário: o build seguiu verde, porque o `vite build` apaga os `import type`. Ela corrigiu o
  entendimento e trocou a premissa por uma checagem de que o estágio `web` resolve o pacote, que ficou vermelha até o
  `Dockerfile` copiá-lo.
- `spec: 00010`, passo 3: a primeira versão da sonda reabria o ticket de `resolved` para `in_progress`, e a API recusou
  com 422 `invalid_transition`: a reabertura volta para `open`. A IA só percebeu ao validar a sonda contra o cliente
  descartável, e corrigiu a sonda, não a API.
- `spec: 00010`, passos 4 e 5: a regra responsiva da tabela vinha antes da regra base de mesmo peso e era sobrescrita, e
  clicar de novo na linha já selecionada deixava o painel preso em "Carregando ticket…". A IA achou o primeiro ao
  escrever o painel e o auditor apontou o segundo antes do commit; os dois foram corrigidos.
- `spec: 00013`, passo 1: a sonda de prontidão desistia da espera no prazo, mas a consulta pendurada seguia ocupando uma
  vaga do pool, e um banco mudo podia esgotá-lo. Uma nota de outro agente apontou, e a IA reproduziu com o Postgres
  pausado e fez o pool destruir a conexão e a consulta que não terminam no prazo.
- `spec: 00013`, passo 2: o serializador de erro padrão do logger gravava o `detail` do Postgres, que traz a linha que
  violou uma restrição, com o texto do ticket. Surgiu quando pedi a comparação com um logger profissional, e a IA o
  trocou por um de lista fechada, com um teste que quebra uma restrição de propósito.
- `spec: none (tweak)`: o primeiro CSS da IA deixava a página mais larga que a janela (847 pixels de largura a 600),
  porque a grade da tela não limitava a coluna ao espaço disponível, e deixava estreito o campo da nota de resolução do
  painel. Apareceram ao medir a página no Chromium, e a IA corrigiu os dois antes do commit.
- `spec: 00007`: na primeira conversão dos casos de uso, a IA escreveu `uow.ticketRepository!`, que o ESLint do projeto
  recusa, e, quando a fábrica passou a ser assíncrona, deixou o `GetTicketUseCase` sem o `await` na fábrica, de modo que
  `uow` seria uma `Promise`. A IA percebeu ao revisar o resultado e corrigiu os dois; a causa do `!` era o campo
  opcional que a fábrica assíncrona eliminou.

## Uma decisão minha

- `spec: none (scaffold)`: specs congeladas, sem status nem registro. A IA tinha proposto um status e um registro
  editáveis; decidi que a spec nunca é editada depois do commit que a introduz.
- `spec: none (scaffold)`: auditor de documentação como convenção do `CLAUDE.md`, e não como hook. A IA recomendou um
  hook de commit; recusei para deixar livres os commits manuais ou só de formatação.
- `spec: none (scaffold)`: specs numeradas em `docs/specs/` para praticar desenvolvimento orientado por especificação. A
  IA tinha proposto só o `README.md`.
- `spec: none (scaffold)`: proteção das branches sem pull request obrigatória. A IA recomendou exigir pull request para
  a `main`; decidi só bloquear exclusão e force push, para iterar com push direto em `dev` e merge local.
- `spec: 00001`: o CI como único portão, sem hook local. A IA tinha proposto um hook de pre-commit e depois a
  redundância dos dois; decidi só o CI, sem script orquestrador dos portões nem lógica de árvore de trabalho, para
  iterar mais rápido localmente.
- `spec: 00001`: limite mínimo de cobertura desde a primeira spec. A IA recomendou não fixar limite enquanto houvesse um
  único teste trivial; decidi o limite desde já.
- `spec: 00001`: largura de 120 colunas com reflow em todos os `.md`, como no meu outro projeto. A IA recomendou
  preservar as quebras de linha, sem regra de largura; decidi padronizar a largura e permitir que uma spec já commitada
  seja editada só na formatação, pelo `fix`, sem mudar o conteúdo.
- `spec: 00001`: cache do tooling em `.cache/`, saída padrão dos scripts sem filtro e um toolkit mínimo com um dono por
  tipo de arquivo. A IA tinha começado por um conjunto maior de verificações; a poda foi decisão minha.
- `spec: 00002`: a skill `docs` como única fonte da lei, com o `CLAUDE.md` só reforçando o gatilho. A IA propôs a skill
  como lei e o `CLAUDE.md` com o gatilho; exigi que o gatilho nunca sobreponha a descrição da skill, só a reforce.
- `spec: 00002`: a skill `docs` reescrita no mesmo nome, governando toda a documentação do harness, e não substituída
  por uma skill nova com outro nome. A IA propôs uma skill `specs` à parte; exigi que continuasse `docs`. Defini também
  que uma spec que substitui outra se chama `0000N-nome-replaces-0000M`.
- `spec: none (tweak)`: spec só quando a mudança exige, pelo critério do `CLAUDE.md`, e o auditor só sobre o diff e o
  que o tangencia. A IA tinha mantido spec para toda mudança e a auditoria do repositório inteiro a cada commit; decidi
  flexibilizar as duas coisas para iterar mais rápido.
- `spec: none (tweak)`: o auditor roda uma vez por commit que toca documento, sem repetir até o relatório vir limpo, e
  só os achados de gravidade alta ou média bloqueiam. A IA tinha a regra de repetir até vir limpo; troquei por uma mais
  consciente, porque cada rodada custava dezenas de milhares de tokens e as últimas só achavam detalhes baixos.
- `spec: none (tweak)`: a spec que substitui outra sempre absorve a substituída, inclusive o que ainda não foi feito, e
  a substituída deixa de ser fonte de passos. A IA tinha escrito só que a substituta diz o que continua valendo; exigi a
  absorção como regra explícita da skill `docs`.
- `spec: none (tweak)`: o README aponta para os workflows em vez de listar os comandos que o CI roda. A IA tinha escrito
  na skill `docs` que o README cita cada comando do CI, e o auditor me fez listar os `npm audit`; decidi trocar a regra
  por citar só os comandos que uma pessoa digita e apontar para `.github/workflows/`, para não duplicar a fonte.
- `spec: 00004`: o que escrevo à mão não tem forma prescrita pela spec. A IA tinha escrito o contrato como código
  (tipos, classes e assinaturas); decidi que a spec fixa só nomes públicos, tipos e invariantes, e que a seção "Como
  este projeto é desenvolvido" do README vale para a IA como regra.
- `spec: 00004`: renomeei os campos `note` e `reason` da entrada do histórico para `resolutionNote` e `reopenReason`,
  para os nomes dizerem a que se referem. É um desvio da spec congelada, que a IA me apresentou como pergunta; aceitei o
  desvio e o commit o registra num parágrafo próprio.
- `spec: 00004`: os erros do domínio como uma `DomainError` abstrata e uma classe filha por código, cada uma com o
  `code` e a mensagem fixos, e não uma classe única que recebe o código na hora de lançar. A IA recomendou a classe
  única; decidi pelas filhas para a mensagem ter um dono só e o ponto de lançamento não repetir código nem texto,
  aceitando uma classe pequena por código no lugar de uma só.
- `spec: 00004`: o regex, o máximo e as duas classes de erro de cada campo de texto viajam juntos numa constante por
  campo, e `normalizeInvariantField` recebe o texto e essa constante. Eu tinha parâmetros soltos e apontei que o máximo
  podia chegar errado; a IA recomendou a constante por campo, no lugar de validar o número em execução, e aceitei o
  custo de um tipo a mais.
- `spec: 00004`: as constantes dos campos moram em `invariants.ts`, fora de `ticket.ts`, que fica só com tipos. Eu
  queria a normalização dentro de `ticket.ts`; a IA recomendou mover só as constantes para lá; propus o `invariants.ts`
  e aceitei um arquivo a mais para o `ticket.ts` ficar só com tipos.
- `spec: 00004`: fundi o arquivo da normalização de texto no `invariants.ts`, porque a normalização é a parte da
  invariante que a faz valer e separá-las criava um ciclo de importação. A IA ofereceu um `normalization.ts` com o tipo
  movido para o `invariants.ts`; escolhi a fusão e aceitei um arquivo maior no lugar da separação entre dado e
  algoritmo.
- `spec: 00004`: os nomes do domínio seguem um vocabulário só: o prefixo `Ticket` nos tipos, nas listas e nos erros de
  canal e prioridade, os erros e códigos de nota e motivo pelo nome do campo (`resolution_note`, `reopen_reason`) e
  `TicketHistoryEntry` no lugar de `HistoryEntry`. A IA tinha nomeado `MissingNoteError` e `CHANNELS`; apontei a
  inconsistência e mandei trocar todos. É um desvio da spec congelada, que fixa os códigos e `HistoryEntry`, e o commit
  o registra num parágrafo próprio. Mantive `at` como nome do valor do instante, o mesmo da spec, e `instante` como o
  nome do conceito, apesar de o auditor ter apontado os dois nomes.
- `spec: 00004`: o nome do cliente aceita só letras, números, espaço, apóstrofo e hífen, mais restrito que a etapa 2 da
  spec, que aceita toda pontuação. A IA apontou o desvio e recomendou o mesmo regex dos outros campos; mantive o mais
  restrito porque um nome só precisa de apóstrofo e hífen, aceitando recusar nomes com outra pontuação, e o commit
  registra o desvio.
- `spec: 00004`, passo 2: a transição recusa a nota ou o motivo que não pertencem ao destino, com um erro próprio por
  campo, e exige as duas chaves sempre, com `null` quando não se aplicam. A spec congelada manda ignorar o texto fora do
  destino, e a IA recomendou seguir a spec e levar a dúvida para a spec da API. Escolhi falhar alto e rápido, porque
  perder um dado em silêncio é pior que recusar a chamada; aceitei que quem chama monte o corpo conforme o destino. O
  desvio vai declarado no parágrafo do commit. A IA recomendou a ordem em que o texto sobrando vem antes do faltando, e
  aceitei.
- `spec: 00005`: o banco espelha estrutura, tamanho, transições e presença de nota e motivo, e não espelha formato de
  caractere nem caractere de controle. Pedi o espelho total com testes de divergência; depois do experimento, a IA
  recomendou espelhar só o que dá para espelhar exato e manter no banco um `CHECK` contra caractere de controle e quebra
  de linha. Mantive o primeiro corte e tirei também o controle, porque confio no domínio como único dono dos caracteres,
  e aceitei que o banco admita um texto que o domínio recusaria.
- `spec: 00005`, passo 2: a IA criou as migrations como `001_create-ticket.sql`, e mandei renomear para
  `00001-create-ticket.sql`, sem underline e com cinco dígitos, como os números das specs. Para os testes do `migrate`,
  que trazem as próprias migrations, a IA recomendou um banco vazio no lugar de uma tabela de controle à parte, e
  aceitei; o parâmetro da função comum é uma união de texto em vez do `bool` que eu tinha proposto.
- `spec: 00005`, passo 5: a IA recomendava uma imagem do Node com o repositório montado, e escolhi o `Dockerfile`
  próprio, porque quero que quem clonar rode o comando sem nada instalado além do container runtime, e aceitei o custo
  de um build. O caminho `apps/api/Dockerfile`, com o contexto na raiz, também é decisão minha. Mantive
  `PGPASSWORD=postgres` no `.env.example` por ergonomia, contra o critério 15 da spec, e tirei o teste que o provava,
  por frágil; a IA tinha escrito esse teste e o apontou como reprovado.
- `spec: 00005`, passo 1, reaberto: apontei que o leitor da imagem dependia de o `db` vir primeiro no arquivo e propus
  fixar a versão do PostgreSQL numa variável do `.env.example`. A IA recomendou contra (o `.env` é por máquina, o CI não
  o tem e o `compose.yaml` deixaria de ser dono da imagem) e propôs ler o serviço `db` pelo nome. Aceitei e escolhi o
  parser de YAML em vez de uma regex presa ao bloco do `db`.
- `spec: 00006`: escolhi a fatia fina (repositório, criar e ler) e o repositório à mão, 400 para corpo malformado e 422
  para regra do domínio, 400 para um `:id` que não é UUID e 404 para um que não existe, e o histórico em rota própria,
  que a IA recomendou. Pedi que o identificador numérico das entradas do histórico nunca saia numa resposta, por
  segurança; a IA corrigiu que o `id` do ticket é um UUID v7 e que o `bigint` é o da entrada, e o critério 10 ficou com
  isso. Confirmei que o Zod recuse campo desconhecido e que a gravação das transições fique para a spec da concorrência.
- `spec: 00006`, passo 2: a IA recomendou três funções que recebem o pool, e escolhi uma classe com o pool no
  construtor, atrás de uma interface na camada de aplicação. Para o retorno do `insertTicketChange`, a IA recomendou o
  `StoredTicket` nos dois métodos de leitura e escrita, e escolhi devolver só a referência (`id` e `version`) no
  `insert`, com `StoredTicket` aninhando `ref` e `ticket`.
- `spec: 00006`, passo 3: a IA escreveu cinco casos de recusa do domínio nos testes da criação; mandei reduzir a um,
  porque os outros repetiam regras que a suíte do domínio já cobre.
- `spec: 00006`, serviço `api` do compose: a IA criou um segundo Dockerfile para a imagem da `api`, e mandei desfazer e
  usar um só, em estágios, com um alvo por serviço, para a versão do Node e a instalação das dependências morarem num
  lugar só. Escolhi também as variáveis `API_PUBLISH_HOST` e `API_PUBLISH_PORT`, no lugar de publicar sempre no
  loopback, e exigidas sem valor padrão, como `PGHOST` e `PGPORT`. A porta publicada difere da do `npm run dev` por
  construção: bati na colisão de porta rodando o dev com a `api` do compose no ar, e a IA propôs só uma mensagem melhor;
  escolhi separar as portas, para o choque deixar de depender de lembrar um comando. Mandei trocar `HOST` e `PORT` por
  `API_HOST` e `API_PORT`, porque outras ferramentas exportam os nomes soltos e um valor do shell vence o `.env` sem
  aviso. O commit declara o desvio da spec, que deixava o serviço de fora.
- `spec: 00006`, passo 4: a IA propôs mapear à mão os códigos de erro do Fastify para o `problem+json`, e corrigi: o
  mapeador preserva o status de qualquer 4xx que o Fastify devolve (por exemplo, o 413 de um corpo grande) sob
  `invalid_request` e colapsa todo 5xx em `internal_error`, em vez de dobrar tudo em 400. Escolhi também a classe
  `Settings`, que lê as variáveis de ambiente num lugar só, no lugar de o pool ler as `PG*` direto.
- `spec: 00007`, passo 1: pedi para extrair o `INSERT` da entrada do histórico para um método só, usado pelo
  `insertTicketChange` e pelo `updateTicketChange`, e a IA mostrou que ele não podia entrar na interface da camada de
  aplicação, porque receberia o `client` do `pg`; ficou como método privado da classe. Mandei também verificar se a
  entrada foi gravada (`rowCount`), que eu não verificava.
- `spec: 00007`, passo 2: mantive o `version_conflict` simples quando a IA ofereceu um erro de 500 para o `null` com a
  mesma `version`, mandei a leitura do ticket para um método privado do caso de uso, usado também na releitura depois do
  `null`, e mantive o `to` no corpo da requisição quando perguntei se o servidor não podia só avançar o status. A IA
  recomendou manter o `to` pelos dados que cada destino exige (nota e motivo) e pelo contrato estável.
- `spec: 00008`, passo 3: a IA recomendou tirar do caso de uso a validação do `limit`, porque a rota já a faz e a regra
  ficaria num lugar só; decidi manter a defesa em profundidade, com um erro de aplicação próprio, o `InvalidLimitError`,
  mesmo duplicando a regra. Decidi também renomear o campo da posição da próxima página para `afterPosition`, depois de
  perceber que `nextPosition` sugeria a posição do ticket seguinte quando o valor é a do último ticket da página.
- `spec: 00008`, passo 3: a IA tinha escrito a regra de vocabulário em dois lugares, no `README.md` e no `CLAUDE.md`;
  decidi que o `README.md` fixa o princípio da linguagem ubíqua e o `CLAUDE.md` aponta para ele e mantém só a regra
  operacional de coesão dos nomes, sem duplicar a fonte da verdade.
- `spec: none (tweak)`: decidi unir a seção "Filosofia" do `README.md` à seção "Como este projeto é desenvolvido",
  porque dizem quase a mesma coisa e a Filosofia não acrescentava um tópico próprio.
- `spec: 00008`, passo 4: o campo `after` do `ListTicketsQuery` ainda tinha outro nome que o `afterPosition` do
  `TicketPage`; percebi e mandei renomear, para o conceito ter um nome só na consulta, na página e nas sondas. Mandei
  também que o `MIN_LIMIT` fosse explícito no esquema, sem confiar só no regex, e que os limites tivessem um dono só, o
  caso de uso, que o esquema da rota importa. Decidi que a listagem só avança, sem `rel="prev"` nem `rel="last"`, e
  registrei os dois em "O que faria com mais tempo".
- `spec: 00009`, passo 3: a IA propôs a pasta do front como segundo argumento posicional do `buildServer`, e mandei a
  forma nomeada, como o `Settings`. Mandei `null` para a pasta ausente, por ser o que o projeto usa para "sem valor", e
  um passo `npm run build` explícito antes do `npm run dev`, sem acoplá-lo ao script. Mandei também que o serviço de
  arquivos tivesse uma subpasta e um `errors.ts` próprios, contra a proposta de mantê-lo solto em `interface/http/`, e
  um nome que reaproveitasse o `webDistDir`, no lugar de "shell", que é o vocabulário da spec.
- `spec: 00010`: a IA recomendou só o Prettier para o primeiro CSS, e mandei o `stylelint` na configuração mais
  rigorosa, a melhor versão, a maior cobertura e a integração máxima no `check` e no `fix`, e depois mandei o mesmo para
  um linter de HTML, ambos provados por canários de provocação.
- `spec: 00010`, passo 1: a IA escreveu o proxy com `127.0.0.1` e `3000` como padrão, como a spec manda, e mandei que o
  `.env` fosse a única fonte dos valores e que o front não tivesse nenhum escrito no código: ele lê `API_HOST` e
  `API_PORT` sem padrão e se recusa a subir sem elas, um desvio do critério 1. Cogitei mover a leitura de env para um
  pacote compartilhado e dividir o `Settings` da API, a IA listou o custo de cada caminho (um workspace novo, o
  `Dockerfile` e o `migrate`, que usa o mesmo leitor), e decidi deixar a API como está e abrir a divisão só quando ela
  ganhar outra variável.
- `spec: 00011` e `spec: 00012`: mandei que a regra morasse na API e que o front guardasse o mínimo: cada ticket diz
  para onde pode ir e o que a transição exige, e a tela só desenha. Mandei também fechar os dois pontos fracos do front,
  o corpo sem validação e o cliente sem teste: o contrato virou um esquema por resposta, o cliente valida cada corpo e o
  teste dele roda contra a API real. Quando a IA propôs a opção mais simples, pedi a mais profissional e defensável, sem
  duplicar nenhuma fonte da verdade.
- `spec: 00013`: escolhi os dois endpoints de saúde, um de vida e um de prontidão, e o logger embutido do Fastify em
  JSON, em vez de uma biblioteca de log à parte.
- `spec: 00013`, passo 3: apontei a porta repetida no comando do healthcheck, que passou a ler o `API_PORT`, e a ordem
  que os prazos têm de guardar, que virou um teste; mandei padronizá-los em múltiplos de cinco segundos e renomear o
  `withDeadline`, que a convenção de verbo não admitia.
- `spec: none (tweak)`: recusei o primeiro resultado do CSS por parecer cru e mandei um layout mais compacto e coeso,
  com tabela, painel e formulários do mesmo desenho e os filtros como botões integrados à tabela; escolhi o CSS sem
  dependência, sem biblioteca, entre as três opções que a IA apresentou.
- `spec: 00007`: decidi que a transação é do caso de uso, por uma unidade de trabalho, e não de métodos do repositório
  que a abrissem sozinhos: o ticket e a entrada do histórico precisam da mesma transação, e uma operação com mais uma
  escrita, como uma chave de idempotência, também precisará, e o repositório não deve conhecer isso. A IA, quando
  perguntei, recomendou o mesmo. Perguntei também se os casos de uso de leitura precisavam do `commit` que a IA tinha
  posto neles e se não era melhor confiar no `rollback`; ficou assim, e só a escrita confirma.

## Onde a IA não entrou

- `spec: none (scaffold)`: a IA redigiu todos os arquivos desta estrutura inicial, então nenhum deles foi escrito sem
  ela. As decisões listadas em "Uma decisão minha" e a aprovação do texto final são minhas.
- `spec: 00001`: o texto do rascunho foi redigido pela IA a partir das minhas respostas na entrevista. O escopo, a
  pinagem, o CI como único portão, o toolkit, a largura do Markdown e o limite de cobertura são decisões minhas, e
  revisei o texto antes do commit.
- `spec: 00002`: o texto do rascunho foi redigido pela IA a partir das minhas respostas. A lei de documentação, a prova
  por comportamento, o padrão `replaces` e a divisão entre a skill `docs` e o `CLAUDE.md` são decisões minhas, e revisei
  o texto antes do commit.
- `spec: 00003`: o texto do rascunho foi redigido pela IA a partir das minhas respostas. O pino de Node, a absorção da
  00001, o `check` rodando uma vez no CI e o canário por ferramenta no lugar de uma suíte de linter são decisões minhas,
  e revisei o texto antes do commit.
- `spec: 00004`: os tipos de `ticket.ts`, o conjunto de códigos e a união `DomainErrorCode` de `errors.ts`, a
  `DomainError` abstrata e a primeira classe filha, em que a IA só corrigiu a declaração do `code`, são meus.
- `spec: 00004`, passo 1: as etapas de normalização do `invariants.ts` (NFC, espaço em branco, corte) são minhas; os
  regex de categorias aceitas de cada campo, que também eram meus, foram depois trocados pela regra única de caracteres
  recusados descrita em "O que validei".
- `spec: 00004`, passo 1: o `createTicketChange` com a ordem das checagens e as cópias do instante, o `validateInstant`,
  os predicados `isTicket…` e os normalizadores de canal e prioridade são meus.
- `spec: 00004`, passo 2: a tabela `TRANSITION_TICKET_STATUSES`, o `transitTicketChange` com a ordem das checagens e as
  cópias dos instantes, e as funções `validateTransition…` são meus, exceto a troca dos dois erros do
  `validateTransitionUnexpected`.
- `spec: 00005`, passo 1: a checagem do container runtime, reescrita à mão, e a criação do banco de teste, hoje
  `createMigratedTestDatabase` e `createEmptyTestDatabase`, são meus, exceto a cláusula do `TEMPLATE`. Nelas a IA, como
  tutora, só apontou o sintoma de cada erro até os testes passarem.
- `spec: 00005`, passo 2: o SQL das tabelas `ticket` e `ticket_history_entry`, com os `CHECK`, as chaves e as partes que
  revertem, é meu. A IA, como tutora, só apontou o sintoma de cada erro, e acrescentou o comentário `pgls-ignore` do
  `DROP TABLE` de cada reversão.
- `spec: 00005`, passo 3: o SQL do `00003` (a função de gatilho, os dois gatilhos e a reversão) e a mensagem de erro são
  meus. A IA, como tutora, só apontou o sintoma de cada erro e acrescentou os comentários `pgls-ignore`. Decidi também
  bloquear o `TRUNCATE`, que a spec não pede.
- `spec: 00006`, passo 2: o contrato `TicketRepository`, os tipos `StoredTicket` e `StoredTicketRef`, as linhas
  `InsertedTicketRow`, `TicketRow` e `TicketHistoryEntryRow` e os três métodos de `PgTicketRepository`
  (`findTicketById`, `insertTicketChange`, com a transação, e `listTicketHistoryEntries`) são meus. A IA deu exemplos de
  sintaxe de TypeScript, escreveu a mensagem de um erro e, por pedido meu, renomeou os membros da `TicketRow` e o
  `clientPool` para `client`.
- `spec: 00006`, passo 3: `CreateTicketUseCase`, `GetTicketUseCase` e `ListTicketHistoryEntriesUseCase` são meus, com o
  repositório no construtor e o 404 decidido no caso de uso. A IA orientou a sintaxe de TypeScript e escreveu o
  `application/errors.ts` e os testes.
- `spec: 00006`, passo 4: o `main.ts`, a raiz de composição que monta o contêiner, sobe o servidor e encerra o pool nos
  sinais, é meu.
- `spec: 00007`, passo 3: escrevi a estrutura do teste de conflito do repositório: as rodadas com um ticket novo cada,
  as duas gravações disparadas juntas no `Promise.all` com instantes diferentes e a contagem de quem perde.
- `spec: 00008`, passo 1: a migration do índice, com o `CREATE INDEX` e o `DROP INDEX`, é minha.
- `spec: 00013`, passo 1: o contrato `ReadinessProbe`, o `CheckReadinessUseCase` e o primeiro rascunho da
  `PgReadinessProbe` (a primeira versão) são meus.
- `spec: 00007`: o contrato `UoW`, a base `UseCase`, o `PgUoW` (a fábrica assíncrona, a guarda `finished` e o
  `dispose`), a refatoração do `PgTicketRepository` para receber a conexão e a fábrica do container são meus. A IA
  corrigiu três detalhes nos meus arquivos (a declaração do campo `ticketRepository` no `PgUoW`, um ponto e vírgula e o
  tipo inferível de `finished`), trocou o tipo da fábrica do `UseCase` por uma que devolve `Promise` e converteu os
  outros quatro casos de uso e as chamadas do container. A sonda e os testes do `PgUoW`, e a adaptação dos testes dos
  casos de uso e do repositório, foram escritos pela IA.
