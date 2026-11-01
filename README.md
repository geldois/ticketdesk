# ticketdesk

[![check](https://img.shields.io/github/actions/workflow/status/geldois/ticketdesk/check.yml?branch=main&label=check)](https://github.com/geldois/ticketdesk/actions/workflows/check.yml)
[![audit](https://img.shields.io/github/actions/workflow/status/geldois/ticketdesk/audit.yml?branch=main&label=audit)](https://github.com/geldois/ticketdesk/actions/workflows/audit.yml)
[![node](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fgeldois%2Fticketdesk%2Fmain%2Fpackage.json&query=%24.engines.node&label=node)](.node-version)
[![typescript](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fgeldois%2Fticketdesk%2Fmain%2Fpackage.json&query=%24.devDependencies.typescript&label=typescript)](package.json)
[![license](https://img.shields.io/github/license/geldois/ticketdesk)](LICENSE)

Sistema de tickets de atendimento full-stack em TypeScript, Node e PostgreSQL: uma operadora registra tickets de
clientes, acompanha o andamento até a resolução, consulta o histórico de cada mudança e nunca sobrescreve, sem aviso, a
alteração de outra operadora.

## Como este projeto é desenvolvido

Desenvolvimento orientado por especificação: cada fatia nasce como uma spec congelada em [docs/specs/](docs/specs/), e
cada passo dela vira um ou mais commits que citam a spec. As regras de trabalho, entre elas a de que todo commit que
muda comportamento sobe com os seus testes, estão em [CLAUDE.md](CLAUDE.md). A prova de cada passo e o uso de IA estão
relatados, por spec, em [IA.md](IA.md).

## Filosofia

Este repositório é construído com o máximo rigor e a produtividade de uma engenharia real. A spec vem antes do código, e
cada trade-off dela é decidido em entrevista, nunca assumido; a IA pesquisa, aponta alternativas e revisa, mas nunca
decide o domínio. A regra de autoria: o que exige raciocínio sobre estado e falha é escrito à mão, e o que é encanamento
é delegado à IA e revisado.

| À mão | Delegado à IA, revisado |
| --- | --- |
| As regras do domínio | Ferramentas e CI |
| O esquema do banco: o SQL das migrations, as constraints e os gatilhos | As rotas |
| A concorrência: o `UPDATE` condicional e a unidade de trabalho | O front-end |
| O tratamento de erros | Os corpos de teste e a documentação |

O que a IA de fato fez em cada spec está em [IA.md](IA.md).

## Como rodar

### Para quem desenvolve

O projeto usa uma única versão de Node, exata, declarada em [.node-version](.node-version) e em `engines.node` do
`package.json`. O `.npmrc` liga o `engine-strict`: com qualquer outra versão, o `npm` recusa a instalação. A versão não
é repetida aqui; o `.node-version` é o dono dela.

Para ter essa versão no `PATH`, use um gerenciador de versões configurado para ler o `.node-version` ou instale a versão
direto. O repositório não depende de nenhum gerenciador específico.

Os testes de banco sobem um PostgreSQL num contêiner, então o desenvolvimento exige um container runtime acessível. Um
container runtime com o socket no lugar padrão não pede configuração. Com o socket em outro lugar, a variável de
ambiente `DOCKER_HOST` aponta para ele, como a documentação do `testcontainers` descreve.

Comandos, executados na raiz:

| Comando | O que faz |
| --- | --- |
| `npm ci` | Instala as dependências exatas do lockfile |
| `npm run check` | Confere antes de tudo que há um container runtime e, sem ele, para com uma mensagem, sem rodar mais nada; com ele, roda todas as verificações do repositório, o lint e o formato do SQL de `apps/api` inclusos, mesmo que uma falhe, e sai com erro se qualquer uma falhou; é o que o CI roda a cada push |
| `npm run fix` | Corrige o que o lint e os formatadores sabem corrigir, o do SQL incluso |

O que o CI roda, incluindo a auditoria de dependências, está em [.github/workflows/](.github/workflows/).

### Editor com SQL (opcional)

O `postgres-language-server.jsonc`, na raiz, guarda as regras de lint e de formato do SQL. O `npm run check` as aplica
sem banco, e o editor as lê pelo servidor de linguagem do mesmo pacote (`npx postgres-language-server lsp-proxy`), então
as regras de lint e de formato são as mesmas. Sem mais nada, o editor mostra erros de sintaxe e os avisos de lint; com
um banco acessível, soma as verificações que dependem dele.

Para completar tabelas e colunas, o servidor precisa de um banco acessível e de mais dois passos:

1. Tenha `PGPASSWORD` no ambiente do editor, a mesma variável que o `compose.yaml` exige para o serviço `db`. A senha
   nunca entra no repositório.
2. Suba o serviço `db` com o comando de compose do seu container runtime. Ele publica a porta só no endereço de
   loopback, em `127.0.0.1:55432`, e é nessa porta que a configuração aponta.

O banco começa sem tabelas, e o servidor só completa o que as migrations aplicadas criaram.

## Visão geral da arquitetura

Ainda sem conteúdo.

## Premissas

Ainda sem conteúdo.

## O que faria com mais tempo

Ainda sem conteúdo.

## Registro de decisões

Só as decisões de alto ROI, da mais antiga para a mais recente.

| Decisão | Alternativa descartada | Trade-off aceito |
| --- | --- | --- |
| Versões exatas, sem scripts de instalação (`ignore-scripts`) e com Node exato recusado por `engine-strict` | Faixas semver, scripts de instalação liberados e uma faixa de Node | Toda atualização é um commit `deps-bump` à parte, e quem tem outro Node não instala |
| Cobertura mínima em linhas, ramos, funções e instruções desde o primeiro teste | Sem mínimo enquanto houver um único teste trivial, ou um mínimo mais alto | O mínimo reprova o `check` desde o início, e cada arquivo novo exige teste |
| O CI é o único portão, sem hook local, e o `check` é obrigatório só na `main` (ruleset `protect-main`) | Hook de pre-commit, ou os dois, ou um script que orquestra os portões; check obrigatório também na `dev` | Um commit quebrado entra no histórico de `dev`, o `check` roda todas as etapas mesmo após uma falha (para o CI mostrar tudo) e exige shell POSIX, e a `main` só aceita um commit cujo `check` já passou na `dev` |
| `audit` em workflow próprio, não obrigatório, em push e em agenda | `audit` como etapa do `check` | Um advisory novo não trava o push, e o alerta pode passar despercebido até alguém olhar o workflow |
| Falha de domínio lançada como `DomainError` abstrata, com uma subclasse por `code` e mensagem fixa | Devolver um resultado de sucesso ou falha das operações, ou uma classe de erro única que recebe o código ao lançar | Quem chama trata a exceção com `try` e `catch`, e cada código custa uma classe pequena, em troca de código e mensagem num lugar só |
| Texto validado e normalizado pelo próprio domínio, em uma linha só com letras, números, espaço e pontuação (no nome, só apóstrofo e hífen), medido em pontos de código | Validar só na borda e confiar nas camadas internas; aceitar qualquer texto, com emoji, símbolo e quebra de linha | Um texto com emoji ou símbolo é recusado, e o formato vale em qualquer porta de entrada, sem depender de quem validou antes |
| O `Ticket` do domínio sem `id` nem `version`, que a persistência guarda | `id` e `version` dentro do `Ticket` do domínio | Quem persiste junta o `id` e a `version` ao ticket, e o domínio não sabe como o ticket é identificado nem versionado |
| O instante entra por argumento, e o domínio só recusa um `Date` inválido | O domínio ler o relógio e recusar um instante futuro | Quem chama passa o relógio, e a rota, que o carimba no servidor, é o único ponto que decide o "agora"; um teste do domínio usa qualquer data fixa |
| Ordem fixa de checagem, em que a primeira falha vence | Acumular todas as falhas e devolver a lista | Quem chama vê um erro por vez, e a ordem passa a fazer parte do contrato; em troca cada operação lança uma exceção só, com um `code` previsível |
| As transições permitidas como um dicionário que liga cada status ao conjunto de destinos | Uma cadeia de `if` ou `switch` por par de status | Uma regra nova é uma linha na tabela e a consulta custa O(1); em troca o `Record` exige uma chave para cada status e o compilador recusa o status que faltar |
| Uma transição que recebe texto fora do destino, ou sem o texto do destino, falha com erro próprio, e o domínio nunca descarta um dado em silêncio | Ignorar a nota ou o motivo que não pertencem ao destino | Quem chama monta o corpo conforme o destino; em troca nenhum dado enviado some sem aviso |
| O isolamento do domínio provado por regras do ESLint (`eslint-plugin-import-x`) que só deixam o código do domínio importar de dentro de `apps/api/src/domain/`, sem lista de fontes proibidas | Uma lista de pastas e pacotes proibidos no `no-restricted-imports`, ou uma ferramenta de grafo de dependências | Um pacote de desenvolvimento a mais para manter; o pacote só é barrado depois de instalado (antes disso quem reprova é o `tsc`), e os testes do domínio podem importar pacotes |
| Os testes de banco rodam num PostgreSQL real, num contêiner por execução, com cada caso de teste num banco clonado de um modelo já migrado | Um banco simulado em memória, ou uma transação revertida por teste | Os testes exigem um container runtime e cada execução paga a subida do contêiner; em troca o banco é o de produção, com seus `CHECK` e triggers, e o isolamento vale também para DDL |
| O `check` começa por uma checagem do container runtime que, se falhar, trava todo o resto | Deixar os testes de banco falharem com o erro cru da biblioteca, ou pular os testes de banco quando não há container runtime | Quem não tem container runtime não roda nem os linters, e todo `check` paga a checagem; em troca a falha é uma mensagem clara e nenhum teste de banco é pulado em silêncio |
| O lint e o formato do SQL pelo Postgres Language Server, um pacote do npm que também é o servidor de linguagem do editor, com um arquivo de configuração versionado e o `check` rodando sem banco | `sqlfluff` ou `sqruff`, que não vêm pelo npm e ficariam fora do lockfile, ou nenhum linter de SQL | Um projeto ainda jovem, com o formatador reescrevendo o SQL (`integer` vira `int`); em troca o editor e o CI usam as mesmas regras e a ferramenta entra pelo lockfile, com versão exata |
| O banco espelha a estrutura, o tamanho, as transições aceitas e a presença de nota e motivo, e deixa o formato de caractere para o domínio | Espelhar também o formato e os caracteres de controle no banco | Um texto com caractere que o domínio recusa pode entrar no banco; em troca o banco e o domínio não divergem em regex que o PostgreSQL não equipara, e o domínio fica como único dono dos caracteres |
