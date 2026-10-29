# Diário de IA

Relato honesto do uso de IA neste projeto. Cada afirmação cita o rodapé `spec:` do trabalho que a sustenta; o commit se acha com `git log --grep`. O arquivo cresce com as specs.

## Onde usei

- `spec: none (scaffold)`: a IA entrevistou o autor sobre a estrutura do repositório e redigiu o `README.md`, o `IA.md`, o `CLAUDE.md`, a skill `docs`, o agente `docs-auditor` e o `settings.json`, a partir das decisões que o autor tomou na entrevista.

## O que validei

- `spec: none (scaffold)`: conferi à mão que o `settings.json` é JSON válido, que `AGENTS.md` aponta para `CLAUDE.md`, que a documentação não tem árvore desenhada, versão nem tempo medido, e que cada caminho citado existe.

## Um erro da IA

- `spec: none (scaffold)`: no primeiro rascunho de spec, a IA escreveu um critério de tempo ("o hook conclui em até 10 segundos") que ninguém mediu. Percebi que uma afirmação não determinística faria uma spec congelada envelhecer; o critério saiu, junto com versões e fatos externos, e a regra entrou na skill `docs`.
- `spec: none (scaffold)`: a IA descreveu a estrutura de pastas como uma árvore desenhada com caracteres num bloco de código. Pedi tabelas simples de markdown, e a regra de estilo entrou na skill `docs`.

## Uma decisão minha

- `spec: none (scaffold)`: specs congeladas, sem status nem registro. A IA tinha proposto um status e um registro editáveis; decidi que a spec nunca é editada depois do commit que a introduz.
- `spec: none (scaffold)`: auditor de documentação como convenção do `CLAUDE.md`, e não como hook. A IA recomendou um hook de commit; recusei para deixar livres os commits manuais ou só de formatação.
- `spec: none (scaffold)`: specs numeradas em `docs/specs/` para praticar desenvolvimento orientado por especificação. A IA tinha proposto só o `README.md`.

## Onde a IA não entrou

- `spec: none (scaffold)`: a IA redigiu todos os arquivos desta estrutura inicial, então nenhum deles foi escrito sem ela. As decisões listadas em "Uma decisão minha" e a aprovação do texto final são do autor.
