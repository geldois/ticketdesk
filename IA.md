# Diário de IA

Relato honesto do uso de IA neste projeto. Cada afirmação cita o rodapé `spec:` do trabalho que a sustenta; o commit se acha com `git log --grep`. O arquivo cresce com as specs.

## Onde usei

- `spec: none (scaffold)`: a IA me entrevistou sobre a estrutura do repositório e redigiu o `README.md`, o `IA.md`, o `CLAUDE.md`, a skill `docs`, o agente `docs-auditor` e o `settings.json`, a partir das decisões que tomei na entrevista.
- `spec: 00001`: a IA me entrevistou sobre o toolchain mínimo, rodou um spike descartável e redigiu o rascunho da spec, que o `docs-auditor` revisou antes do commit. Prompts relevantes: "e se o gate não travar localmente com githook, mas for um CI que explode na branch dev?", "sem aproveitar agregador, só o que for de alto ROI, pinando versões brutalmente" e "toolkit mais enxuto possível, sem sobreposição, tudo comprovado, tudo configurado da forma mais padrão e organizada e sem muitas exceções".

## O que validei

- `spec: none (scaffold)`: conferi à mão que o `settings.json` é JSON válido, que `AGENTS.md` aponta para `CLAUDE.md`, que a documentação não tem árvore desenhada, versão nem tempo medido, e que cada caminho citado existe.
- `spec: 00001`: antes de congelar a spec, a IA provou, a meu pedido, num esqueleto descartável fora do repositório, que o `npm ci` com `ignore-scripts` e `engine-strict` passa no Node pinado e é recusado em outro, que cada uma das 28 provocações da spec (teste, tipos, lint, formato, Markdown, lockfile, workflow e cobertura) faz o `check` sair com código diferente de 0, que o `fix` conserta formato, lint e a largura do Markdown, que o `npm audit` e as assinaturas passam, e que todo cache do tooling cai em `.cache/` sem deixar nada novo na raiz. Aprovei o toolkit a partir desse relatório, e os critérios da spec repetem as provas como comandos que qualquer pessoa pode rodar.
- `spec: 00001`, passo 1: a IA escreveu uma sonda fora do repositório, com sete casos (instalação limpa, lockfile intacto, versões exatas, `.npmrc`, `.node-version` igual a `engines.node`, recusa de outro Node e importação entre os dois pacotes), que ficou vermelha antes do código e verde depois dele.

## Um erro da IA

- `spec: none (scaffold)`: no primeiro rascunho de spec, a IA escreveu um critério de tempo ("o hook conclui em até 10 segundos") que ninguém mediu. Percebi que uma afirmação não determinística faria uma spec congelada envelhecer; o critério saiu, junto com versões e fatos externos, e a regra entrou na skill `docs`.
- `spec: none (scaffold)`: a IA descreveu a estrutura de pastas como uma árvore desenhada com caracteres num bloco de código. Pedi tabelas simples de markdown, e a regra de estilo entrou na skill `docs`.
- `spec: 00001`: o primeiro rascunho da spec trazia critérios que um comando não decide (o relatório do próprio `docs-auditor` como critério), um caso que dependia do Node da máquina de quem roda, afirmações sobre o que o Node executa e comandos encadeados com `&&`. O `docs-auditor` apontou esses desvios ao revisar o rascunho, e os critérios foram reescritos como condições binárias, com as provocações em casos controlados.
- `spec: 00001`: a primeira versão do reforço do tooling era um conjunto inchado, com plugins de segurança, de comentários, de YAML e de JSON, dezenas de regras de ESLint e opções do `tsconfig` que repetiam o ESLint. Exigi um toolkit enxuto, sem sobreposição e com poucas exceções; a IA cortou o que se repetia e, na poda, trocou o `@eslint/markdown` pelo `rumdl` e tirou duas opções do `tsc` que o ESLint já cobria.
- `spec: 00001`: a IA escreveu várias entradas deste arquivo se referindo a mim em terceira pessoa, quando o diário é escrito por mim, em primeira pessoa, com a IA como terceira pessoa. Percebi ao ler e pedi a correção; as entradas foram reescritas e a regra de voz entra na skill `docs` e no `docs-auditor`.
- `spec: none (scaffold)`: a IA escreveu no `CLAUDE.md` que o `settings.json` nega "commitar sem passar pelo hook", mas o repositório não tem hook algum. O `docs-auditor` apontou o desvio; a linha passou a listar as negações que o arquivo tem de fato.

## Uma decisão minha

- `spec: none (scaffold)`: specs congeladas, sem status nem registro. A IA tinha proposto um status e um registro editáveis; decidi que a spec nunca é editada depois do commit que a introduz.
- `spec: none (scaffold)`: auditor de documentação como convenção do `CLAUDE.md`, e não como hook. A IA recomendou um hook de commit; recusei para deixar livres os commits manuais ou só de formatação.
- `spec: none (scaffold)`: specs numeradas em `docs/specs/` para praticar desenvolvimento orientado por especificação. A IA tinha proposto só o `README.md`.
- `spec: none (scaffold)`: proteção das branches sem pull request obrigatória. A IA recomendou exigir pull request para a `main`; decidi só bloquear exclusão e force push, para iterar com push direto em `dev` e merge local.
- `spec: 00001`: o CI como único portão, sem hook local. A IA tinha proposto um hook de pre-commit e depois a redundância dos dois; decidi só o CI, sem script orquestrador dos portões nem lógica de árvore de trabalho, para iterar mais rápido localmente.
- `spec: 00001`: limite mínimo de cobertura desde a primeira spec. A IA recomendou não fixar limite enquanto houvesse um único teste trivial; decidi o limite desde já.
- `spec: 00001`: largura de 120 colunas com reflow em todos os `.md`, como no meu outro projeto. A IA recomendou preservar as quebras de linha, sem regra de largura; decidi padronizar a largura e permitir que uma spec já commitada seja editada só na formatação, pelo `fix`, sem mudar o conteúdo.
- `spec: 00001`: cache do tooling em `.cache/`, saída padrão dos scripts sem filtro e um toolkit mínimo com um dono por tipo de arquivo. A IA tinha começado por um conjunto maior de verificações; a poda foi decisão minha.

## Onde a IA não entrou

- `spec: none (scaffold)`: a IA redigiu todos os arquivos desta estrutura inicial, então nenhum deles foi escrito sem ela. As decisões listadas em "Uma decisão minha" e a aprovação do texto final são minhas.
- `spec: 00001`: o texto do rascunho foi redigido pela IA a partir das minhas respostas na entrevista. O escopo, a pinagem, o CI como único portão, o toolkit, a largura do Markdown e o limite de cobertura são decisões minhas, e revisei o texto antes do commit.
