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
- `spec: 00004`, testes: a IA revisou todos os testes contra a regra de testes do `CLAUDE.md`, apontou os que só
  afirmavam a presença de texto, os de detalhe de implementação e os repetidos, e, por ordem minha, os removeu ou uniu.

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
- `spec: 00004`, testes: depois da limpeza, a IA rodou o `npm run fix` e o `npm run check`, que passou com a cobertura
  de linhas, ramos, funções e instruções ainda em 100%, e conferiu que os testes dos `normalize*` e dos `validate*`
  cobrem o que os removidos cobriam.

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
  (tipos, classes e assinaturas); decidi que a spec fixa só nomes públicos, tipos e invariantes, e que a Filosofia do
  README vale para a IA como regra.
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
- `spec: 00004`, passo 1: as etapas de normalização do `invariants.ts` (NFC, espaço em branco, corte) e os regex de
  categorias aceitas de cada campo são meus.
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
