# ticketdesk

Roteador: só o que nenhum outro arquivo guarda. Todo o resto mora no dono dele; vá lá e nunca o repita aqui.

## Fontes de verdade

Cada contexto vive em um só lugar. Se o contexto cabe em dois, ele pertence ao primeiro da coluna "Vive em" e o outro aponta para ele.

| Contexto | Vive em | Nunca em |
| --- | --- | --- |
| O que muda, o contrato de uma fatia e os passos dela | `docs/specs/` | `README.md`, `IA.md` |
| O andamento (o que já foi feito) | o git, pelo rodapé `spec: 0000N` | specs, `README.md` |
| Como rodar, arquitetura e premissas | `README.md` | specs |
| Uma decisão técnica, o motivo e o trade-off aceito | Registro de decisões do `README.md` | specs, `IA.md` |
| O comportamento da IA: prompts relevantes, erros pegos, divergências do autor, validações e o que o autor escreveu | `IA.md` | specs, `README.md` |
| Versões e dependências | os manifestos | qualquer documento |
| Como cada documento é escrito | a skill `docs` | `CLAUDE.md` |
| O que o sistema faz hoje | o código | qualquer documento |

## Documentação

- Toda escrita ou revisão de documentação passa pela skill `docs`: invoque-a antes, sem exceção.

## Desenvolvimento orientado por especificação

- Nada é escrito (implementação, teste, configuração, documentação ou harness) sem um passo numa spec de `docs/specs/`. Trabalho que nenhum passo cobre exige uma spec nova antes.
- A spec vem antes do código: o commit da spec precede os commits dos seus passos.
- Uma spec nunca é editada depois do commit que a introduz.

## Commits

- Conventional Commits, linha única: `tipo(escopo): descrição`. O commit da própria spec usa o tipo `spec`.
- Todo commit cita a spec no rodapé: `spec: 0000N` (minúsculo, como os demais rodapés do Conventional Commits).
- Só dispensa spec, com `spec: none (motivo)`, o que cabe num motivo desta lista fechada: `typo`, `format`, `deps-bump` (sem mudança de comportamento), `revert` ou `scaffold` (estrutura do repositório criada antes de existir a primeira spec; depois dela, nunca mais).
- Commits pequenos e focados: um passo termina em um ou mais commits, todos com o rodapé da spec.

## Idioma e comentários

- Documentação e comentários em português do Brasil; código (identificadores, mensagens de erro, rotas) em inglês.
- Comentário é permitido quando atômico, enxuto e capaz de provar o próprio valor; nunca repete o que o código já diz. O código é a fonte da verdade.

## Antes de commitar

- Em todo commit, de IA ou manual, decide-se antes se o passo gera registro no `IA.md`: houve uso relevante de IA, um erro da IA percebido, uma divergência do autor em relação ao que a IA propôs ou uma validação que provou o resultado? Se sim, o registro entra no mesmo commit do passo, no formato da skill `docs`. Se não, nada é registrado, e um registro nunca é inventado para preencher o arquivo.
- Quando uma IA vai commitar, ela roda antes o agente `docs-auditor` sobre o repositório inteiro, inclusive sobre o rascunho de uma spec antes do commit `spec(...)`, corrige os achados pela skill `docs` e roda o agente de novo até o relatório vir limpo. Commits manuais e puramente de formatação não precisam dele.
- O harness local só é carregado quando a sessão da IA abre dentro deste repositório.

## Pausas

- Ambiguidade, trade-off ou decisão que a spec não resolveu: pergunta-se antes de assumir.

## Harness local

O harness local é versionado, nasce no primeiro commit e muda como o código: um passo numa spec, um commit pequeno, nenhuma edição fora disso.

| Peça | Papel | Como operar |
| --- | --- | --- |
| `.claude/skills/docs/` | Lei de escrita da documentação | Invocar antes de tocar em qualquer documentação; alterá-la é mudança de harness |
| `.claude/agents/docs-auditor.md` | Auditor de deriva, só leitura | Rodar antes de todo commit feito por IA; ele reporta e nunca corrige |
| `.claude/settings.json` | Negações: ler `.env*` e commitar sem passar pelo hook | Não afrouxar nenhuma negação sem uma spec que o decida |
| `.claude/settings.local.json` | Preferências pessoais de quem trabalha no repositório | Fica fora do git e nunca é versionado |
| `AGENTS.md` | Symlink para este arquivo, para outras ferramentas | Nunca editar como arquivo; edite `CLAUDE.md` |
