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

O ticketdesk é um projeto montado para tirar o máximo de produtividade da IA sem abrir mão do rigor, e para isso segue
dois métodos: SDD (desenvolvimento orientado por especificação) e TDD (desenvolvimento orientado por testes).

No SDD, a spec vem antes do código: cada fatia nasce como uma spec congelada em [docs/specs/](docs/specs/), com cada
trade-off decidido em entrevista, e cada passo dela vira um ou mais commits que citam a spec. No TDD, cada passo começa
por uma sonda: um script, fora do repositório, que exercita o passo pela interface pública. Ela nasce vermelha e fica
verde quando o código está pronto, e cada caso de borda descoberto pelo caminho entra nela e vira teste. Esses testes
sobem no mesmo commit da mudança que provam, salvo no front, que não tem teste automatizado e se prova pela sonda e por
uma conferência guiada. As regras de trabalho estão em [CLAUDE.md](CLAUDE.md).

A IA pesquisa, aponta alternativas, revisa e escreve o que lhe cabe, e as decisões de domínio ficam com o autor. A
autoria segue o quanto a peça exige de raciocínio sobre estado e falha: quanto mais exige, mais perto da mão do autor.

| À mão | Semimanual | Delegado à IA, revisado |
| --- | --- | --- |
| As regras do domínio | O tratamento de erros | Ferramentas e CI |
| O SQL do esquema (migrations, constraints e gatilhos) e das consultas | Os casos de uso | As rotas |
| A concorrência: o `UPDATE` condicional e a unidade de trabalho | O front-end | O corpo dos testes (a montagem) e a documentação |
| | A estrutura dos testes (o que se afirma) | |

No semimanual, o autor decide o desenho e escreve o núcleo da peça, a IA escreve o mecânico, e o autor revisa cada
parte.

A linguagem é ubíqua e rigorosa: cada conceito tem um nome só, na spec, no código, nos testes e nos documentos, e um
nome que sugere outro significado do que o valor guarda é tratado como defeito.

A prova de cada passo e o que a IA de fato fez em cada spec estão em [IA.md](IA.md).

## Como rodar

Há dois caminhos, ambos na raiz do repositório, e `docker compose` é o comando de compose do seu container runtime.

| Quero | Preciso de | Vá para |
| --- | --- | --- |
| Rodar o sistema e ver a API responder | Só um container runtime, sem Node e sem `npm ci` | "Só rodar" |
| Mexer no código, rodar a API no host e conferir o repositório | Um container runtime e o Node do `.node-version` | "Para quem desenvolve" |

### Só rodar

Dois comandos, um por vez:

```sh
cp .env.example .env
docker compose up -d
```

O `docker compose up -d` constrói as imagens, sobe o `db`, aplica as migrations e sobe a API, que serve também a página
do front. Nenhuma dependência é instalada no seu host.

Com o `.env.example` sem alterar, a API responde em `http://127.0.0.1:3001` (`API_PUBLISH_HOST` e `API_PUBLISH_PORT`);
se você mudou algum, use os seus. A tela de tickets ainda não existe: o endereço abre a página mínima do front, e as
rotas da API devolvem JSON. Para conferir, um comando por vez:

```sh
curl -i http://127.0.0.1:3001/tickets/019a0000-0000-7000-8000-000000000000
curl -i -X POST http://127.0.0.1:3001/tickets -H 'content-type: application/json' -d '{"customerName":"Ana","description":"Printer is down","channel":"chat","priority":"high"}'
```

O primeiro devolve `404`, porque esse `id` não existe, e prova que a API alcança o banco. O segundo devolve `201` com o
ticket criado, cujo `id` abre em `GET /tickets/<id>` e em `GET /tickets/<id>/history`.

| Para parar | O que faz |
| --- | --- |
| `docker compose stop` | Para os serviços e mantém os dados |
| `docker compose down` | Remove os contêineres e as redes e mantém os dados, no volume `db-data` |
| `docker compose down --volumes` | Remove também o volume: apaga o banco inteiro, sem volta |

### Para quem desenvolve

O Node é de uma única versão exata, declarada em [.node-version](.node-version) e em `engines.node` do `package.json`; o
`.npmrc` liga o `engine-strict`, e qualquer outra versão faz o `npm` recusar a instalação. Os testes de banco sobem um
PostgreSQL num contêiner, então o container runtime precisa estar acessível; com o socket fora do lugar padrão,
`DOCKER_HOST` aponta para ele, como a documentação do `testcontainers` descreve.

Instale as dependências, uma vez, e confira o repositório, o que não precisa de compose nem de `.env`:

```sh
npm ci
npm run check
```

Para rodar a API no host, com o banco em contêiner, um comando por vez, depois do `npm ci`:

```sh
cp .env.example .env
docker compose run --rm migrate
npm run build
npm run dev
```

O `docker compose run --rm migrate` sobe só o `db`, espera ele ficar saudável, aplica as migrations, espera terminar e
deixa o `db` no ar, sem subir a `api` do compose. O `npm run build` gera o front em `apps/web/dist`, a pasta do
`WEB_DIST_DIR`; sem ele, o `npm run dev` recusa subir e diz para rodar o build. O `npm run dev` escuta em
`http://127.0.0.1:3000` (`API_HOST` e `API_PORT`) e serve a página nesse endereço; `Ctrl+C` fecha o servidor e depois o
pool. Os dois caminhos rodam ao mesmo tempo, em portas diferentes, sobre o mesmo banco.

| Comando | O que faz |
| --- | --- |
| `npm ci` | Instala as dependências exatas do lockfile |
| `npm run build` | Gera o front em `apps/web/dist` |
| `npm run dev` | Sobe a API no host, com o `.env` carregado; exige o `db` migrado e, com o `WEB_DIST_DIR` definido, o build feito |
| `npm run check` | Confere que há um container runtime, e sem ele para com uma mensagem; com ele, roda todas as verificações, mesmo que uma falhe, e sai com erro se alguma falhou; é o que o CI roda a cada push |
| `npm run fix` | Corrige o que o lint e os formatadores sabem corrigir, o do SQL incluso |

O que o CI roda, incluindo a auditoria de dependências, está em [.github/workflows/](.github/workflows/).

### Configuração

O `.env` nasce do `cp .env.example .env`, que o git ignora, e o compose o lê sozinho; a senha do exemplo é só de
desenvolvimento. Todas as variáveis são obrigatórias, sem valor padrão, menos onde a tabela diz o contrário; sem alguma
delas, o compose recusa subir e diz qual falta. Cada processo tem o seu endereço, e nenhum se repete.

| Variável | Quem lê | Para quê |
| --- | --- | --- |
| `PGHOST`, `PGPORT` | O compose, o `npm run dev` e o editor | O endereço do `db` no host; `PGHOST` precisa ser um IP, e o do exemplo é o de loopback, que mantém o banco fora da rede |
| `PGUSER`, `PGPASSWORD`, `PGDATABASE` | O compose, o `npm run dev` e o editor | O usuário, a senha e o banco: o `db` os cria na primeira vez, e o `migrate` e a `api` conectam com eles |
| `API_PUBLISH_HOST`, `API_PUBLISH_PORT` | O compose | O endereço da `api` do contêiner no host |
| `API_HOST`, `API_PORT` | O `npm run dev` | Onde a API do host escuta; opcionais, com os padrões `127.0.0.1` e `3000`; o prefixo `API_` evita que um `HOST` ou `PORT` de outra ferramenta mude onde ela escuta |
| `WEB_DIST_DIR` | O `npm run dev` | A pasta do front compilado que a API serve; opcional, e ausente ou vazia a API serve só as rotas; uma pasta que não existe impede a API de subir |

Dentro dos contêineres, e só ali, o `compose.yaml` fixa estes valores, que nunca vêm do `.env`: o `migrate` e a `api`
acham o banco em `db:5432`, a `api` escuta em `0.0.0.0:3000`, e o `WEB_DIST_DIR` dela é o front que o `Dockerfile`
constrói. O `migrate` termina com 0 e rodar de novo não muda nada; a `api` só sobe depois dele, reconstruída a cada
`docker compose up -d` (`pull_policy: build`), e ao receber `SIGTERM` fecha o servidor, depois o pool, e sai com 0. Para
aplicar as migrations de novo, o comando é `docker compose run --rm migrate`.

Duas armadilhas do compose. Uma variável já exportada no shell vence a do `.env`, e o banco e o `migrate` podem divergir
da API sem aviso. E o `db` lê usuário, senha e banco só na primeira inicialização do volume `db-data`: mudá-los depois
não altera um banco que já existe, e a conexão falha até o volume ser recriado. Se uma porta estiver ocupada
(`address already in use`, ou o erro de porta ocupada do container runtime), pare o outro programa ou mude, no `.env`, a
variável que dá o endereço dela.

### Editor com SQL (opcional)

O `postgres-language-server.jsonc` guarda as regras de lint e de formato do SQL, as mesmas que o `npm run check` aplica
sem banco; o editor as lê pelo servidor de linguagem do mesmo pacote (`npx postgres-language-server lsp-proxy`). Para
completar tabelas e colunas, o servidor precisa das variáveis `PG*` do `.env` no ambiente do editor, que ele lê sozinho,
e do serviço `db` no ar; o banco começa sem tabelas, e só o que as migrations aplicadas criaram completa.

## Visão geral da arquitetura

Ainda sem conteúdo.

## Premissas

Ainda sem conteúdo.

## O que faria com mais tempo

- A listagem só avança, pelo `rel="next"` do cabeçalho `Link`. Voltar uma página ou ir à última exigiria os `rel="prev"`
  e `rel="last"`: o `prev` pede um cursor no sentido oposto (a posição do primeiro ticket, com a comparação e a ordem
  invertidas), e o `last` pede saber onde a lista acaba. Hoje quem volta é o cliente, que guarda as URLs das páginas que
  já leu.

## Registro de decisões

Só as decisões de alto ROI, sem contradição entre linhas.

| Decisão | Alternativa descartada | Trade-off aceito |
| --- | --- | --- |
| Versões exatas, sem scripts de instalação (`ignore-scripts`), Node exato recusado por `engine-strict` e `audit` em workflow próprio, não obrigatório | Faixas semver, scripts liberados, uma faixa de Node e `audit` como etapa do `check` | Toda atualização é um commit `deps-bump`, quem tem outro Node não instala, e um advisory novo não trava o push e pode passar despercebido |
| O CI é o único portão, sem hook local, com cobertura mínima desde o primeiro teste e `check` obrigatório só na `main` (ruleset `protect-main`) | Hook de pre-commit, `check` obrigatório também na `dev`, ou cobertura sem mínimo | Um commit quebrado entra em `dev`, cada arquivo novo exige teste e o `check` exige shell POSIX; em troca a `main` só aceita um commit cujo `check` já passou na `dev` |
| Falha lançada como erro tipado: `DomainError` e `ApplicationError` irmãs, sem ancestral comum, uma subclasse por `code` e mensagem fixa | Devolver sucesso ou falha como resultado, uma classe de erro única, ou uma só hierarquia | Quem traduz o erro em resposta trata as duas famílias e cada código custa uma classe; em troca `instanceof` distingue a camada, e código e mensagem moram num lugar só |
| Texto validado e normalizado pelo domínio, em uma linha só, medido em pontos de código: o nome aceita letras, números, espaço, apóstrofo e hífen, e a descrição, a nota e o motivo também pontuação, símbolos e emoji | Validar só na borda, ou aceitar qualquer texto, com caractere de controle e quebra de linha | O nome recusa emoji e símbolo e a tela precisa saber exibir o que os outros campos aceitam; em troca o formato vale em qualquer porta de entrada |
| O `Ticket` do domínio sem `id` nem `version`, que a persistência junta, a entrada do histórico devolvida sem o `id` numérico do banco, e o instante por argumento, com o domínio só recusando um `Date` inválido | `id` e `version` dentro do `Ticket`, a linha inteira do histórico, ou o domínio ler o relógio e recusar instante futuro | Quem chama passa o relógio, e a rota é o único ponto que decide o "agora"; quem precisar do `id` da entrada pede uma operação nova; em troca o domínio não sabe como o ticket é identificado nem versionado, o `id` da entrada nunca vaza numa resposta, e um teste usa qualquer data fixa |
| Ordem fixa de checagem, em que a primeira falha vence, e texto fora do destino ou sem o texto do destino recusado com erro próprio | Acumular todas as falhas, ou ignorar a nota ou o motivo que não pertencem ao destino | Quem chama vê um erro por vez e a ordem faz parte do contrato; em troca cada operação lança uma exceção só, com `code` previsível, e nenhum dado enviado some sem aviso |
| As transições permitidas como um dicionário que liga cada status ao conjunto de destinos | Uma cadeia de `if` ou `switch` por par de status | Uma regra nova é uma linha na tabela e a consulta custa O(1); o `Record` exige uma chave para cada status e o compilador recusa o que faltar |
| O isolamento do domínio provado por regras do ESLint (`eslint-plugin-import-x`) que só deixam o código do domínio importar de dentro de `apps/api/src/domain/` | Uma lista de pastas e pacotes proibidos no `no-restricted-imports`, ou uma ferramenta de grafo de dependências | Um pacote de desenvolvimento a mais; o pacote só é barrado depois de instalado, e os testes do domínio podem importar pacotes |
| Os testes de banco rodam num PostgreSQL real, num contêiner por execução, cada caso num banco clonado de um modelo já migrado, e o `check` começa por uma checagem do container runtime que trava o resto se falhar | Um banco em memória, uma transação revertida por teste, ou deixar o erro cru da biblioteca ou pular os testes de banco | Quem não tem container runtime não roda nem os linters, e cada execução paga a subida do contêiner; em troca o banco é o de produção, com `CHECK` e gatilhos, e nenhum teste é pulado em silêncio |
| O lint e o formato do SQL pelo Postgres Language Server, pacote do npm que é também o servidor de linguagem do editor, com o `check` rodando sem banco | `sqlfluff` ou `sqruff`, que ficariam fora do lockfile, ou nenhum linter de SQL | Um projeto ainda jovem, com o formatador reescrevendo o SQL (`integer` vira `int`); em troca editor e CI usam as mesmas regras e a ferramenta entra com versão exata |
| O banco espelha a estrutura, o tamanho, as transições aceitas e a presença de nota e motivo, e deixa o formato de caractere para o domínio | Espelhar também o formato e os caracteres de controle no banco | Um texto com caractere que o domínio recusa pode entrar no banco; em troca banco e domínio não divergem em regex que o PostgreSQL não equipara, e o domínio é o único dono dos caracteres |
| A imutabilidade do histórico pelo próprio banco, com gatilhos que recusam `UPDATE`, `DELETE` e `TRUNCATE` em `ticket_history_entry` | Recusar na aplicação, ou revogar as permissões do papel da aplicação | O linter avisa dos gatilhos e das reversões, e cada um leva um `pgls-ignore`; em troca nenhum cliente do banco, nem um `psql`, altera o histórico, e o dono da tabela só o altera derrubando o gatilho |
| O `migrate` como serviço de execução única do compose, com a conexão em variáveis `PG*` separadas, e um só `Dockerfile`, na raiz e em estágios, com os alvos `migrate` e `api` sobre a mesma base | Migrar na subida da API, um `npm ci` no host, uma `DATABASE_URL` única, ou um Dockerfile por serviço | Mudar a base ou o `npm ci` afeta os dois serviços e o compose nomeia o alvo, mas o esquema nunca muda como efeito colateral de subir a API; em troca roda sem instalar nada além do container runtime, e a senha não precisa de escape de URL |
| A transação única que grava o ticket e a entrada do histórico, aberta dentro do método do repositório, que é uma classe atrás de uma interface da camada de aplicação | Uma unidade de trabalho explícita na camada de aplicação, ou duas escritas sem transação | Um caso de uso que combine várias chamadas do repositório numa transação exigirá refatorar para uma unidade de trabalho; em troca nenhuma escrita parcial, e os casos de uso dependem só da interface |
| Erro de resposta em `application/problem+json`, com 400 para a requisição malformada e 422 para a que o domínio recusa, e o Zod validando só a forma (tipos e chaves, sem chave a mais) | Um só status para toda falha de entrada, um formato de erro próprio, ou declarar no Zod também tamanho, formato e valores | Quem consome distingue o corpo que não se lê do valor que o domínio recusa e precisa conhecer o `code`, e um texto inválido só é recusado dentro do domínio; em troca o formato é o da RFC 9457 e a regra de conteúdo mora num lugar só |
| O histórico do ticket em rota própria, `GET /tickets/:id/history`, com a ausência do ticket decidida no caso de uso (`TicketNotFoundError`) | Entradas embutidas no `GET /tickets/:id`, ou o repositório lançar a ausência | Quem quer o ticket e o histórico faz duas requisições, e o histórico custa um acesso a mais ao banco; em troca o ticket não cresce a cada transição e o repositório só responde se a linha existe |
| A concorrência otimista pela `version`: a gravação da transição é um `UPDATE` condicional à `version` esperada e ao status de origem, o ticket e a entrada do histórico entram na mesma transação, e zero linhas gravadas devolvem `null`, com a falha inesperada como única exceção | Ler e comparar a versão antes de gravar, travar a linha com `SELECT ... FOR UPDATE`, ou o repositório lançar um erro de conflito | Quem chama leva a `version` que leu e trata a corrida perdida, e o `null` não diz se falhou a `version`, o status ou o `id`; em troca nenhuma operadora sobrescreve a mudança sem saber, nenhum bloqueio dura além da gravação e a corrida perdida, que é esperada, não vira exceção |
| A versão esperada vai no `If-Match` e volta no `ETag`, com a `version` entre aspas, é checada antes da regra do domínio, e a que não bate responde 409, com o ticket atual relido no corpo | A versão no corpo da transição, o 412 que o HTTP reserva à pré-condição falhada, aplicar o domínio primeiro, ou devolver o ticket lido no começo | O 409 não é o código que o padrão indica ao `If-Match`, a corrida perdida custa uma releitura, e uma transição inválida sobre versão velha responde conflito, não recusa; em troca o conflito de versão e o de estado têm um código só, e quem está desatualizado vê o estado atual |
| Um único índice sobre `created_at` e `id`, ambos decrescentes, sustenta a ordem e a posição do cursor, sem índice por filtro; a página seguinte parte da posição `(created_at, id)`, comparada em linha no `WHERE`, com o `created_at` em texto de seis casas de fração, como o banco o escreve | Um índice por `status` e por `channel`, paginar por `OFFSET`, ou guardar o instante como `Date` do JavaScript | Com filtro, o banco lê pela ordem e descarta o que não combina, o que pesa só se o filtro é raro e a tabela é grande, e o cursor depende do formato do texto do banco; em troca cada gravação mantém um índice só, nenhuma transição reescreve índice de `status`, e o `Date`, que perde os microssegundos, não faz a página pular nem repetir tickets de empate |
| A resposta da lista é o array de tickets, e o cursor da próxima página vai no cabeçalho `Link` (`rel="next"`), em caminho relativo, com o erro próprio `invalid_cursor` para o cursor que não decodifica | Um envelope `{ items, nextCursor }` no corpo, ou um único `invalid_request` para tudo | O cliente lê o cabeçalho para paginar e não distingue o cursor ruim do parâmetro ruim sem olhar o `code`; em troca o corpo continua igual ao do `GET /tickets/:id` |
| O front sem teste automatizado, provado pela sonda e por uma conferência guiada | Testar o front, ao menos o cliente HTTP | O `check` só tipa e compila o front, e um defeito do cliente só aparece na conferência; em troca nenhuma ferramenta de teste de front entra no projeto, e a rede de segurança do contrato fica nos testes da API |
| O front compilado é servido pelo mesmo processo da API, a partir de uma pasta que só a configuração fixa, e a API não fica pronta se essa pasta não existe | Liberar a origem do front com CORS, ou um servidor de arquivos à frente da API | A página e a API compartilham a origem, sem cabeçalho `access-control-*`, e o contêiner da `api` entrega as duas; em troca a API conhece o build do front, o que uma CDN evitaria, e quem roda `npm run dev` precisa de `npm run build` antes |
