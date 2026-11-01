# ticketdesk

Roteador: só o que nenhum outro arquivo guarda. Todo o resto mora no dono dele; vá lá e nunca o repita aqui.

## Fontes de verdade

Cada contexto vive em um só lugar. Se o contexto cabe em dois, ele pertence ao primeiro da coluna "Vive em" e o outro
aponta para ele.

| Contexto | Vive em | Nunca em |
| --- | --- | --- |
| O que muda, o contrato de uma fatia e os passos dela | `docs/specs/` | `README.md`, `IA.md` |
| O andamento (o que já foi feito) | o git, pelo rodapé `spec: 0000N` | specs, `README.md` |
| Como rodar, arquitetura e premissas | `README.md` | specs |
| Uma decisão técnica de alto ROI, o motivo e o trade-off aceito | Registro de decisões do `README.md` | specs |
| O comportamento da IA: prompts relevantes, erros pegos, divergências do autor, validações e o que o autor escreveu | `IA.md` | specs, `README.md` |
| Versões e dependências | os manifestos | qualquer documento |
| As regras de processo: dependências e gatilhos de commit e de documentação | `CLAUDE.md` | a skill `docs`, `README.md` |
| Como um teste é escrito | `CLAUDE.md` | a skill `docs` |
| Como cada documento é escrito | a skill `docs` | `CLAUDE.md` |
| O que o sistema faz hoje | o código | qualquer documento |

## Documentação

- Toda escrita ou revisão de documentação passa pela skill `docs`: invoque-a antes, sem exceção.
- Ao commitar, confira a lei de completude da skill `docs`.

## Desenvolvimento orientado por especificação

- A Filosofia do `README.md` é lei para a IA: ela nunca escreve o que a Filosofia reserva à mão (nem em código, nem em
  scaffold, nem em esqueleto). Em dúvida sobre de quem é uma peça, pergunta-se antes de escrever.
- Uma spec em `docs/specs/` é obrigatória só quando a mudança altera um contrato público ou um comportamento observável,
  tem vários passos ou carrega uma decisão com trade-off que outras specs vão consumir. Uma mudança pequena, local e
  reversível dispensa spec: entra num commit rápido com `spec: none (tweak)`, e o registro que couber vai para o
  Registro de decisões do `README.md` ou para o `IA.md`.
- A spec vem antes do código: o commit da spec precede os commits dos seus passos.
- O conteúdo de uma spec nunca é editado depois do commit que a introduz; só a formatação pode mudar, com
  `spec: none (format)`.
- Dependência nova ou atualizada: a versão é pesquisada ao vivo, a compatibilidade é provada fora do repositório, a
  versão exata mora só no manifesto e no lockfile, nunca em spec ou documento, a prova entra no `IA.md`, em "O que
  validei", quando a IA a faz, e a atualização é um commit `deps-bump`.
- Todo teste afirma comportamento, nunca detalhe de implementação: afirma o que quem usa a interface pública do que está
  sob teste observa, de forma específica (o valor devolvido, o estado ou efeito visível, o erro com o seu `code`), e
  nunca só a presença de texto, só um código de saída ou só uma contagem. Uma refatoração que preserva o comportamento
  não quebra teste algum. Vale em todo nível, que só muda onde fica essa interface: a função exportada no unitário, a
  fronteira real (banco, HTTP) na integração e o sintoma original do defeito na regressão. Dublê só na fronteira que o
  projeto não controla (relógio, rede), nunca num colaborador interno. A cobertura é piso do `check`, não prova de
  comportamento. Gatilho: escrever ou revisar qualquer teste.

## Commits

- Conventional Commits, assunto em linha única: `tipo(escopo): descrição`. O commit da própria spec usa o tipo `spec`.
- Todo commit cita a spec no rodapé: `spec: 0000N` (minúsculo, como os demais rodapés do Conventional Commits).
- Todo commit leva, entre o assunto e o rodapé, um parágrafo único, separado por linhas vazias, sem quebra de linha e em
  inglês, como o resto do commit. Ele é curto e descritivo: diz a intenção e acrescenta ao assunto o que o assunto
  sozinho não diz, para localizar a intenção de cada commit no `git log`. Quando não houver nada a acrescentar, o
  parágrafo se dispensa. A ordem é assunto, linha vazia, parágrafo, linha vazia e rodapé `spec: 0000N`.
- Um commit que contraria ou conflita com a spec que cita leva esse parágrafo sempre, e ele diz também quais foram os
  conflitos e por quê. A spec é a fonte da verdade congelada, mas não é imune a erro, falta de clareza ou bug local, e o
  parágrafo é o registro do desvio. Uma mudança duradoura de contrato abre uma spec nova, como manda a skill `docs`.
- Só dispensa spec, com `spec: none (motivo)`, o que cabe num motivo desta lista fechada: `typo`, `format`, `deps-bump`
  (sem mudança de comportamento), `revert`, `tweak` (mudança pequena, local e reversível, sem contrato público nem
  decisão que outras specs consumam) ou `scaffold` (estrutura do repositório criada antes de existir a primeira spec;
  depois dela, nunca mais).
- Commits pequenos e focados: um passo termina em um ou mais commits, todos com o rodapé da spec.
- Todo commit que muda comportamento sobe com os testes que o provam, no mesmo commit; para ele não há exceção. Não
  mudam comportamento, e por isso não levam teste: documentação, formatação, `typo`, `spec`, `deps-bump`, `revert`,
  `scaffold` e ferramental ou configuração cujo efeito o próprio `check` exercita. Gatilho: fechar o commit de um passo.
- Duas branches: todo commit e todo push vão para `dev`; a `main` só recebe o merge de `dev` e nunca um commit direto. A
  IA nunca pusha a `main` nem faz o merge para ela: é ordem do usuário.
- O CI é o único portão do push para `dev`: o `check` roda nele a cada push, sem hook local, e um commit quebrado pode
  entrar em `dev`.

## Idioma e comentários

- Documentação e comentários em português do Brasil; código (identificadores, mensagens de erro, rotas) e mensagens de
  commit em inglês.
- O vocabulário é um só em todo o projeto: o mesmo conceito tem o mesmo nome em parâmetros, funções, classes, tipos,
  interfaces, valores, constantes, códigos de erro e testes. Antes de nomear algo, procure como o conceito já se chama e
  reuse; um nome novo para um conceito que já tem nome é um defeito, e renomear tudo de uma vez custa menos que conviver
  com dois. Gatilho: escrever, renomear ou revisar qualquer identificador, de parâmetro a constante. O procedimento tem
  quatro passos:
  1. Antes de nomear, `grep` do conceito no repositório; o que já existe vence.
  2. O nome carrega o conceito inteiro e o mesmo qualificador em toda parte: `databaseUrl` em todo lugar, nunca `url`
     num e `databaseUrl` noutro, nem um mesmo nome para dois conceitos (uma função e um parâmetro `databaseUrl`).
  3. O nome que uma biblioteca impõe (`connectionString`, `dir`) fica só na linha que a chama; o resto do código usa o
     nome do projeto.
  4. Antes de commitar, varre-se o diff atrás de dois nomes para um conceito e de um nome para dois, e corrige-se no
     mesmo commit.
- Uma operação se nomeia por um verbo (`createTicketChange`, `transitTicketChange`, `validateTransition`), e o
  substantivo nomeia o conceito (`InvalidTransitionError`, `TRANSITION_TICKET_STATUSES`). Gatilho: nomear uma função.
- Uma constraint do banco se nomeia `<tabela>_<coluna>[_<regra>]_<tipo>`, com o tipo `pkey`, `fkey` ou `check`, como o
  próprio PostgreSQL nomeia, e uma palavra por regra: `length`, `set`, `presence`, `pair` ou `min`. Uma regra nova
  reaproveita a palavra que já existe. Gatilho: escrever uma migration.
- Comentário é permitido quando atômico, enxuto e capaz de provar o próprio valor; nunca repete o que o código já diz. O
  código é a fonte da verdade.

## Antes de commitar

- Em todo commit, de IA ou manual, decide-se antes se o passo gera registro no `IA.md`: houve uso relevante de IA, um
  erro da IA percebido, uma divergência do autor em relação ao que a IA propôs ou uma validação que provou o resultado?
  Se sim, o registro entra no mesmo commit do passo, no formato da skill `docs`. Se não, nada é registrado, e um
  registro nunca é inventado para preencher o arquivo.
- Quando o commit de uma IA toca documento (`README.md`, `IA.md`, `CLAUDE.md`, `AGENTS.md`, specs, a skill ou os
  agentes), ela roda antes o agente `docs-auditor` uma vez sobre o diff e sobre tudo que o tangencia, inclusive sobre o
  rascunho de uma spec antes do commit `spec(...)`. Corrige os achados de gravidade alta ou média pela skill `docs`, sem
  rodar o agente de novo; achado baixo é registrado. O agente roda uma única vez por commit. Commit que só toca código,
  commit manual e commit só de formatação não precisam dele. A auditoria do repositório inteiro só acontece quando o
  usuário a pede.
- Antes de todo commit de IA, ela roda o `npm run fix` e depois o `npm run check`, nessa ordem e uma vez cada, e só
  então o `docs-auditor`, para ele auditar o documento já formatado. Se o `check` reprovar, ela reporta ao usuário e
  pergunta antes de commitar, sem rodar de novo. Fora desse momento, só os roda quando o usuário pedir.
- O harness local só é carregado quando a sessão da IA abre dentro deste repositório.

## Pausas

- Ambiguidade, trade-off ou decisão que a spec não resolveu: pergunta-se antes de assumir.

## Harness local

O harness local é versionado, nasce no primeiro commit e muda como o código: pela regra de spec acima, em commits
pequenos.

| Peça | Papel | Como operar |
| --- | --- | --- |
| `.claude/skills/docs/` | Lei de escrita da documentação | Invocar antes de tocar em qualquer documentação; alterá-la é mudança de harness |
| `.claude/agents/docs-auditor.md` | Auditor de deriva, só leitura | Rodar antes do commit de IA que toca documento, sobre o diff e o que o tangencia; ele reporta e nunca corrige |
| `.claude/settings.json` | Negações: ler `.env*`, pular verificações com `--no-verify` ou `-n`, force push e `git reset --hard`. Pergunta antes de `git commit` e `git push` | Não afrouxar nenhuma negação nem pergunta sem uma spec que o decida |
| `.claude/settings.local.json` | Preferências pessoais de quem trabalha no repositório | Fica fora do git e nunca é versionado |
| `AGENTS.md` | Symlink para este arquivo, para outras ferramentas | Nunca editar como arquivo; edite `CLAUDE.md` |
