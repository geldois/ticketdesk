# A casca do front: o workspace e o servidor que o serve

## Objetivo

Criar o workspace `apps/web` (Vite, React e TypeScript estrito) com uma página mínima e fazer o servidor da API servir o
resultado do build, no mesmo processo e na mesma porta, de modo que `docker compose up` entregue a API e a página num
serviço só, sem CORS. O `Dockerfile` sobe para a raiz, porque passa a construir a API e o front.

## Fora do escopo

- A tela de tickets (criar, listar, filtrar, transitar, histórico), o cliente HTTP e o tratamento do conflito.
- O proxy do servidor de desenvolvimento do front para a API.
- Roteador, fallback de página para rotas desconhecidas, cabeçalhos de cache, compressão e `GET /health`.
- CORS: o front e a API compartilham a origem, então nenhuma resposta ganha cabeçalho `access-control-*`.
- Teste de componente do front e qualquer biblioteca de estado, de dados ou de estilo.
- A forma do código: a organização dos arquivos e o desenho do registro do servidor de arquivos são de quem implementa.
  Esta spec fixa só nomes públicos, caminhos e comportamento observável.

## Contrato

Variável nova, lida pelo `Settings` junto das demais:

| Variável | Quem lê | Valor | Padrão |
| --- | --- | --- | --- |
| `WEB_DIST_DIR` | O `Settings` | Caminho da pasta que o build do front gerou | Ausente: a API não serve o front |

O `Settings` ganha o campo `webDistDir`, o caminho lido ou a ausência dele. Uma variável vazia, ou só com espaços, vale
como ausente. O `main.ts` passa o `webDistDir` ao `buildServer`, que o recebe além do contêiner de dependências.

Estrutura nova:

| Caminho | Papel |
| --- | --- |
| `apps/web` | Workspace do front; o build gera `dist/index.html` e os arquivos que ele referencia, e o `package.json` da raiz expõe o script `build` que o dispara |
| `Dockerfile` | Na raiz; os alvos `migrate` e `api` e o estágio que constrói o front; substitui `apps/api/Dockerfile` |

Comportamento do servidor:

| Condição | `GET /` | Arquivo do `dist` | Demais rotas |
| --- | --- | --- | --- |
| `WEB_DIST_DIR` aponta para uma pasta com `index.html` | 200, `text/html`, o `index.html` | 200 com o tipo de mídia do arquivo | Mesmo status e corpo de antes, e um caminho desconhecido segue 404 `route_not_found` em `application/problem+json` |
| `WEB_DIST_DIR` ausente | 404 `route_not_found`, como hoje | 404 `route_not_found` | Inalteradas |
| `WEB_DIST_DIR` aponta para uma pasta que não existe | O servidor não fica pronto | O servidor não fica pronto | O servidor não fica pronto |

No contêiner, a imagem do alvo `api` traz o `dist` e define `WEB_DIST_DIR` para ele, então a página responde na porta
publicada pela `api`.

## Critérios de aceite

1. O `Dockerfile` está na raiz, o `apps/api/Dockerfile` não existe, o `compose.yaml` aponta os serviços `migrate` e
   `api` para o novo caminho, e os alvos `migrate` e `api` seguem construindo.
2. `apps/web` é um workspace: `npm ci` o instala sem alterar o lockfile, e o build dele gera um `index.html` e os
   arquivos que ele referencia.
3. Com `WEB_DIST_DIR` apontando para uma pasta com `index.html` e um arquivo em `assets/`, `GET /` responde 200 com o
   `index.html` em `text/html`, e `GET` do arquivo de `assets/` responde 200 com o tipo de mídia dele.
4. Com o `dist` servido, `GET /tickets`, `POST /tickets` e `GET /tickets/:id` respondem com o mesmo status e corpo de
   antes desta spec, e um caminho desconhecido, inclusive dentro de `assets/`, segue 404 `route_not_found` em
   `application/problem+json`.
5. Sem `WEB_DIST_DIR`, `GET /` responde 404 `route_not_found`, como antes.
6. Com `WEB_DIST_DIR` apontando para uma pasta que não existe, o servidor não fica pronto.
7. `Settings.fromEnv` devolve `webDistDir` ausente quando a variável falta, está vazia ou só tem espaços, e o caminho
   quando ela existe.
8. Depois de `docker compose up -d` com o `.env.example`, `GET /` na porta publicada responde 200 com o `index.html` do
   build, `GET /tickets` responde 200 com um array, e `GET /nowhere` responde 404 `route_not_found`.
9. O `npm run check` passa e cobre o `apps/web` com tipos (JSX e DOM), lint e formatação; a cobertura mínima continua
   valendo para a API e o contrato, e o `apps/web` fica fora dela por não ter teste de componente.

## Casos de teste

Os casos dos critérios 3 a 6 são de integração pela interface HTTP do servidor, sem abrir porta, com uma pasta
temporária que o próprio teste monta (um `index.html` e um `assets/app.js`) e o mesmo banco dos demais testes do
servidor. O do critério 7 é unitário. O do critério 2 constrói o front de verdade, numa pasta temporária. O do critério
1 lê o `compose.yaml` e o `Dockerfile`, e o do critério 8 é de contêiner, provado por uma sonda que sobe a pilha num
projeto descartável.

| Critério | Nível | Asserção e bordas |
| --- | --- | --- |
| 1 | Regressão | O `Dockerfile` existe na raiz e `apps/api/Dockerfile` não; o `compose.yaml` traz o novo caminho nos dois serviços; o teste que lê o texto do `Dockerfile` lê o novo caminho |
| 2 | Integração | O build do `apps/web` numa pasta temporária produz um `index.html` com um elemento raiz e um `script` cujo `src` existe na pasta |
| 3 | Integração | `GET /` devolve o corpo do `index.html` montado, com `text/html`; `GET /assets/app.js` devolve o corpo do arquivo, com tipo de mídia de JavaScript |
| 4 | Integração | Com o `dist` servido: `GET /tickets` devolve o array de antes, `POST /tickets` cria um ticket (201), `GET /tickets/:id` o devolve, `GET /nowhere` é 404 `route_not_found` com os cinco campos do `problem+json`, e `GET /assets/inexistente.js` também é 404 `route_not_found` |
| 5 | Integração | Servidor sem `WEB_DIST_DIR`: `GET /` e `GET /assets/app.js` são 404 `route_not_found` |
| 6 | Integração | Servidor construído com uma pasta inexistente: prepará-lo (`ready`) rejeita |
| 7 | Unitário | Variável ausente, vazia e só com espaços: `webDistDir` ausente; um caminho: `webDistDir` igual ao caminho |
| 8 | Regressão | Na sonda, com a pilha de pé: `GET /` é 200 e traz o elemento raiz do build, `GET /tickets` é 200 com array, `GET /nowhere` é 404 `route_not_found`; `docker build` dos alvos `migrate` e `api` sai com 0; `down` ao fim |
| 9 | Regressão | O `npm run check` sai com 0 sobre a árvore sem alterações |

## Restrições

- Dependências novas, todas nomeadas aqui e com a versão exata só no manifesto e no lockfile: no `apps/web`, o Vite, o
  plugin de React do Vite, o React e o React DOM, com os tipos deles; no `apps/api`, o servidor de arquivos oficial do
  Fastify (`@fastify/static`). Cada versão é pesquisada ao vivo e a compatibilidade é provada fora do repositório, nos
  passos 2 e 3.
- Cada dependência de execução mora no `package.json` do workspace que a executa (`@fastify/static` em `apps/api`, o
  React e o React DOM em `apps/web`), e a ferramenta de build do front (o Vite e o plugin de React) é dependência de
  desenvolvimento do `apps/web`; a raiz guarda só ferramenta compartilhada, como hoje.
- TypeScript estrito no front, com os mesmos portões do restante (`tsc`, ESLint, Prettier) no `check`; o `tsc` do front
  usa a configuração própria dele, com JSX e DOM, e a do restante segue sem eles.
- A instalação da imagem da `api` segue só com as dependências de execução da `api`; o estágio do front instala as do
  `apps/web`, e o `.dockerignore` libera ao build só o que cada estágio precisa.
- Sem roteador, sem biblioteca de estado ou de dados e sem framework de estilo.
- O domínio e o caso de uso não conhecem o front: ele vive só na interface e na configuração.
- A pasta servida nunca vem do pedido: é fixa pela configuração.

## Validação

Comandos em sintaxe de `sh`:

```sh
npm ci && git diff --exit-code package-lock.json
npm run check
docker compose up -d --build
curl -fsS "http://${API_PUBLISH_HOST}:${API_PUBLISH_PORT}/"
curl -fsS "http://${API_PUBLISH_HOST}:${API_PUBLISH_PORT}/tickets"
docker compose down
```

Os dois primeiros saem com 0 sobre a árvore sem alterações, com um executor de contêineres disponível. Os `curl` saem
com 0 com o `.env` baseado no `.env.example`, e o critério 8 também confere o corpo e o 404.

## Passos

Em todo passo, o `npm ci` não altera o lockfile e nenhuma versão vira faixa.

1. Mover o `Dockerfile` para a raiz e ajustar o `compose.yaml`, o teste que o lê e os trechos do `README.md` que citam o
   caminho antigo, inclusive a linha do Registro de decisões que nomeia o `apps/api/Dockerfile`; sem mudança de
   comportamento. Prova: critério 1.
2. O workspace `apps/web`: Vite, React e TypeScript estrito, uma página mínima, o build, o script `build` da raiz e a
   cobertura dos portões do `check`, com o `apps/web` fora da cobertura mínima. As versões são pesquisadas ao vivo e
   provadas fora do repositório; commit `deps-bump` para as dependências. Prova: critérios 2 e 9.
3. A API serve o `dist`: `@fastify/static`, a variável `WEB_DIST_DIR` no `Settings`, o registro no servidor e a linha do
   Registro de decisões do front servido pelo mesmo processo, com o CORS descartado como alternativa. Prova: critérios
   3, 4, 5, 6 e 7.
4. O estágio do `Dockerfile` que constrói o front, o `.dockerignore`, o `WEB_DIST_DIR` definido na imagem da `api` e o
   `README.md` (o script `build` e a variável `WEB_DIST_DIR` em "Como rodar", a tabela de variáveis e a de endereços).
   Prova: critério 8.
