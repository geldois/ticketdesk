# ticketdesk

Sistema de tickets de atendimento full-stack em TypeScript, Node e PostgreSQL: uma operadora registra tickets de clientes, acompanha o andamento até a resolução, consulta o histórico de cada mudança e nunca sobrescreve, sem aviso, a alteração de outra operadora.

## Como este projeto é desenvolvido

Desenvolvimento orientado por especificação: cada fatia nasce como uma spec congelada em [docs/specs/](docs/specs/), e cada passo dela vira um commit que cita a spec. As regras de trabalho estão em [CLAUDE.md](CLAUDE.md) e o uso de IA está relatado, por spec, em [IA.md](IA.md).

## Como rodar

### Para quem desenvolve

O projeto usa uma única versão de Node, exata, declarada em [.node-version](.node-version) e em `engines.node` do
`package.json`. O `.npmrc` liga o `engine-strict`: com qualquer outra versão, o `npm` recusa a instalação. A versão não é
repetida aqui; o `.node-version` é o dono dela.

Para ter essa versão no `PATH`, use um gerenciador de versões configurado para ler o `.node-version` ou instale a versão
direto. O repositório não depende de nenhum gerenciador específico.

## Visão geral da arquitetura

Ainda sem conteúdo.

## Premissas

Ainda sem conteúdo.

## O que faria com mais tempo

Ainda sem conteúdo.

## Registro de decisões

Da mais antiga para a mais recente.

| Decisão | Alternativa descartada | Trade-off aceito |
| --- | --- | --- |
| Specs congeladas, sem status nem registro; andamento vem do git e o comportamento da IA vem do `IA.md` | Specs com status e registro editáveis | Corrigir uma decisão custa uma spec nova |
| Documentação concentrada no `README.md` e no `IA.md`, com as specs em `docs/specs/` e sem outras pastas de docs | Uma pasta de documentação por área | O `README.md` pode crescer; o código é a fonte da verdade e o mantém enxuto |
| Auditor de documentação como convenção explícita do `CLAUDE.md`, sem hook que o imponha | Hook de commit que recusa sem a auditoria | Depende de disciplina, e deixa livres os commits manuais ou só de formatação |
| Documentação e comentários em português, código em inglês | Tudo em inglês | Uma tradução posterior da documentação é um commit à parte |
| Fluxo em duas branches (a regra está em `CLAUDE.md`), com um ruleset do GitHub que bloqueia exclusão e force push, sem exigir pull request | Pull request obrigatória para a `main` | Nada impede um push direto na `main`; a regra depende de disciplina, e o ciclo fica mais curto |
| Spec só quando a mudança exige (o critério está em `CLAUDE.md`); o resto entra como `tweak`, e o auditor olha só o diff e o que o tangencia | Spec para toda mudança e auditoria do repositório inteiro a cada commit | Menos rastro formal em mudança pequena, e uma deriva fora do alcance do diff só aparece numa auditoria completa pedida |
| Skill `docs` como lei única de toda a documentação, com o `CLAUDE.md` só reforçando gatilhos | Lei dividida entre a skill e o `CLAUDE.md`, ou uma skill nova com outro nome | Toda mudança de regra de documentação passa pela skill, e o `CLAUDE.md` não define regra sozinho |
| Auditor nos dois sentidos, deriva e omissão, com a omissão como achado de gravidade média | Auditor só de deriva | Mais achados por rodada e mais custo por auditoria |
| Teste mede comportamento, e o harness é medido pelas ferramentas da própria IA | Teste de texto sobre skill e `CLAUDE.md` | Medir o auditor exige clones com defeito e custa execuções do próprio auditor |
| Auditor uma vez por commit que toca documento, e achado baixo só registrado | Auditor a cada commit, repetido até o relatório vir limpo | Menos custo por commit, e um detalhe baixo pode ficar sem correção |
| Spec que substitui outra se chama `0000N-nome-replaces-0000M` | Editar a spec antiga | A spec substituída vira só registro, e a nova absorve tudo o que continua valendo, inclusive o que ainda não foi feito |
| Versões exatas, sem scripts de instalação (`ignore-scripts`) e com Node exato recusado por `engine-strict` | Faixas semver, scripts de instalação liberados e uma faixa de Node | Toda atualização é um commit `deps-bump` à parte, e quem tem outro Node não instala |
| Cobertura mínima em linhas, ramos, funções e instruções desde o primeiro teste | Sem mínimo enquanto houver um único teste trivial, ou um mínimo mais alto | O mínimo reprova o `check` desde o início, e cada arquivo novo exige teste |
| Prettier só para `.ts`, `.js`, `.json` e `.yml`, fora dos `*.md` e do lockfile, com o ESLint cuidando só de lint | Prettier também nos `*.md`, ou formato dentro do ESLint | Um dono por tipo de arquivo, e o `eslint-config-prettier` precisa ficar por último na configuração |