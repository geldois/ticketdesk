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
cada passo dela vira um commit que cita a spec. As regras de trabalho estão em [CLAUDE.md](CLAUDE.md) e o uso de IA está
relatado, por spec, em [IA.md](IA.md).

## Filosofia

Este repositório é estudo e trabalho ao mesmo tempo. A spec vem antes do código, e cada trade-off dela é decidido em
entrevista, nunca assumido; a IA pesquisa, aponta alternativas e revisa, mas nunca decide o domínio. A regra de autoria:
o que exige raciocínio sobre estado e falha é escrito à mão, e o que é encanamento é delegado à IA e revisado.

| À mão | Delegado à IA, revisado |
| --- | --- |
| O núcleo: regras do domínio, concorrência e tratamento de erros | Ferramentas e CI, rotas, front-end, corpos de teste, documentação |

O que a IA de fato fez em cada spec está em [IA.md](IA.md).

## Como rodar

### Para quem desenvolve

O projeto usa uma única versão de Node, exata, declarada em [.node-version](.node-version) e em `engines.node` do
`package.json`. O `.npmrc` liga o `engine-strict`: com qualquer outra versão, o `npm` recusa a instalação. A versão não
é repetida aqui; o `.node-version` é o dono dela.

Para ter essa versão no `PATH`, use um gerenciador de versões configurado para ler o `.node-version` ou instale a versão
direto. O repositório não depende de nenhum gerenciador específico.

Comandos, executados na raiz:

| Comando | O que faz |
| --- | --- |
| `npm ci` | Instala as dependências exatas do lockfile |
| `npm run check` | Roda todas as verificações do repositório, mesmo que uma falhe, e sai com erro se qualquer uma falhou; é o que o CI roda a cada push |
| `npm run fix` | Corrige o que o lint e os formatadores sabem corrigir |

O que o CI roda, incluindo a auditoria de dependências, está em [.github/workflows/](.github/workflows/).

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
