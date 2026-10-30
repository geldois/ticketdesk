---
name: docs
description: "Governa toda a documentação do repositório e do seu harness local: README.md, IA.md, CLAUDE.md, AGENTS.md, as specs, esta skill e os agentes. Define o formato, o dono de cada contexto, a completude e a prova por comportamento. Invocar antes de criar, editar ou revisar qualquer um deles."
---

# docs

Lei única da documentação. Quando escrever e como commitar ficam em `CLAUDE.md`, que só reforça os gatilhos; aqui fica
como cada arquivo é escrito, onde cada contexto mora e como se prova.

## Escopo

Esta skill governa toda a documentação do repositório e do seu harness local:

| Documento | Onde |
| --- | --- |
| Visão do projeto | `README.md` |
| Uso de IA | `IA.md` |
| Roteador de regras operacionais | `CLAUDE.md` e `AGENTS.md` |
| Specs | `docs/specs/` |
| A própria lei | `.claude/skills/docs/` |
| Os agentes | `.claude/agents/` |

## Princípios

- O código é a fonte da verdade. A documentação descreve o repositório como ele está, nunca como será.
- Nada que envelheça sozinho: sem versão que um manifesto já fixa, sem tempo ou desempenho medido, sem contagem que o
  código muda, sem fato externo que o mundo muda.
- Frases curtas, voz ativa, português do Brasil. Identificadores, comandos e rotas ficam em inglês, entre crases.

## Estilo

- Para comparar coisas ou listar atributos, tabela simples de markdown. Para sequências, lista numerada.
- Sem árvore de diretórios desenhada com caracteres, sem diagrama de caixas e setas em texto, sem alinhamento por
  espaços. Uma estrutura de pastas vira uma tabela de caminho e papel.
- Diagrama só em Mermaid, enxuto (no máximo uns doze nós), e só no `README.md`.
- Um H1 por arquivo e níveis de título sem salto.
- Bloco de código só para código ou comando executável.

## Onde o contexto mora

- Todo contexto vive só no dono que a tabela de fontes de verdade do `CLAUDE.md` indica, e os outros arquivos apontam
  para ele.
- Um contexto sem dono ganha primeiro uma linha na tabela e só depois é escrito.
- Toda regra escrita em documento declara o dono e o gatilho, isto é, a quem pertence e quando se aplica.
- Uma regra é escrita uma vez: os outros documentos apontam para ela ou reforçam o gatilho, sem repetir o texto.

## Completude

- O `README.md` cita, em "Como rodar", cada comando que o CI exercita.
- O Registro de decisões tem uma linha para cada decisão técnica com alternativa descartada, no mesmo commit que traz o
  código.
- Uma seção que diz `Ainda sem conteúdo.` só continua assim enquanto não existe o que descrever.
- O documento dono de um fato muda no mesmo commit que o fato.

## Documentos

### README.md

Escrito para quem vai clonar o repositório, e só com os pontos dignos de nota: o que o código não diz e o que não é
comportamento da IA, que mora só no `IA.md`. Seções fixas, nesta ordem:

| Seção | Papel |
| --- | --- |
| Título e resumo | O que o sistema é |
| Como este projeto é desenvolvido | Um parágrafo que aponta para `docs/specs/`, `IA.md` e `CLAUDE.md` |
| Como rodar | Só comandos que existem e que o CI exercita |
| Visão geral da arquitetura | Prosa curta e, se preciso, um Mermaid enxuto |
| Premissas | Cada uma como "assumi X porque Y" |
| O que faria com mais tempo | Evolução e o que ficou de fora |
| Registro de decisões | Último; da mais antiga para a mais recente |

- Só o que uma pessoa toca: comandos, arquivos, rotas, esquemas, variáveis. Nenhum passo oculto.
- Seção ainda sem conteúdo escreve apenas `Ainda sem conteúdo.` e não promete nada.
- O Registro de decisões é uma tabela com Decisão, Alternativa descartada e Trade-off aceito.

### IA.md

Diário do uso de IA neste projeto, escrito em primeira pessoa pelo autor, com a IA em terceira pessoa. Seu escopo é o
comportamento da IA; não é diário de estudo do autor.

| Título fixo | Conteúdo |
| --- | --- |
| Onde usei | Uma linha por spec com o papel da IA e os prompts realmente relevantes |
| O que validei | Por spec, o que provou que o resultado estava certo |
| Um erro da IA | Erro real, descrito no dia em que acontece, com como foi percebido e o que se fez |
| Uma decisão minha | Divergência real do que a IA propôs, com o motivo |
| Onde a IA não entrou | Por artefato, o que foi escrito pelo autor |

- Toda afirmação cita o rodapé `spec:` do trabalho que a sustenta (`spec: 0000N` e o passo, ou `spec: none (motivo)`),
  porque o commit se acha com `git log --grep` e um commit não pode citar o próprio hash.
- Todo número de spec existente aparece em "Onde usei", e todo número citado existe em `docs/specs/`.
- Só fatos reais: erro e decisão nunca são escolhidos de antemão nem inventados. Quando registrar é regra de
  `CLAUDE.md`.
- "Onde a IA não entrou" fala por artefato e nunca diz "sem IA". Corpo de teste gerado por IA é declarado como tal.

### CLAUDE.md e AGENTS.md

- `CLAUDE.md` é roteador, não depósito: só traz regras operacionais que nenhum outro arquivo guarda.
- `AGENTS.md` é um symlink para `CLAUDE.md` e nunca é editado como arquivo.
- Seções de `CLAUDE.md`, nesta ordem: fontes de verdade, documentação, desenvolvimento orientado por especificação,
  commits, idioma e comentários, antes de commitar, pausas, harness local.

## Specs

Cada spec é uma fatia de comportamento, contrato, esquema do banco ou dependência, em `docs/specs/0000N-slug.md`: cinco
dígitos em sequência sem buracos, slug em inglês e minúsculo.

### Escopo da spec

- Uma spec é tão curta quanto possível e obsessivamente escopada: uma fatia que se prova por inteiro.
- O limite é explícito: a spec termina antes do ponto em que o futuro vira nebuloso, impossível de provar ou pouco
  determinístico. O que depende de algo ainda não provado fica para uma spec posterior, escrita depois que a dependência
  for provada, por exemplo por um experimento descartável fora do repositório.
- Não existe número alvo de specs: nascem tantas quantas forem necessárias.
- Cada passo termina em um ou mais commits.

### Campos

Todos aparecem sempre, nesta ordem:

| Campo | Conteúdo |
| --- | --- |
| Objetivo | A fatia em uma ou duas frases |
| Fora do escopo | O que esta spec deliberadamente não resolve |
| Contrato | Assinatura, esquema, rota ou comando, escrito como código; estrutura de arquivos só como tabela |
| Critérios de aceite | Condições binárias, cada uma verificável por teste ou comando |
| Casos de teste | Por critério, o nível (unitário, integração, regressão) e a asserção; as bordas enumeradas |
| Restrições | Ferramentas e limites que a fatia respeita |
| Validação | O comando exato que prova a fatia |
| Passos | A fatia inteira em ordem; cada passo termina em um ou mais commits e diz o critério que o prova |

Um campo que não se aplica escreve `Não se aplica:` e o motivo em uma frase. Nunca é omitido nem deixado em branco. O
motivo diz por que o campo não cabe nesta fatia e não repete o que `IA.md`, `README.md` ou outro documento já guardam.

### Regras

- O autor escreve a spec. A IA entrevista, aponta trade-offs e confere o formato; ela nunca decide o domínio.
- A spec é congelada no conteúdo a partir do commit que a introduz: não tem status nem registro, e só a formatação pode
  mudar depois, com o commit `spec: none (format)`. Corrigir ou mudar uma decisão é abrir uma spec nova.
- A spec que substitui outra se chama `0000N-nome-replaces-0000M.md` e traz a linha `Substitui: 0000M` logo abaixo do
  H1. A substituta sempre absorve a substituída: tudo o que continua valendo, incluindo o que ainda não foi feito, passa
  a morar nela, e a substituída deixa de ser fonte de qualquer passo. Ela fica só como registro: o auditor confere só a
  estrutura dela, nunca a qualidade dos casos.
- A spec só afirma o que é determinístico e está sob controle do projeto: comportamento, contrato e critérios binários.
  Nomear a ferramenta escolhida é uma decisão e pode entrar na spec. Ficam de fora tempo, desempenho medido, versão,
  estimativa, data e qualquer afirmação sobre o comportamento, a versão ou a compatibilidade de uma ferramenta de
  terceiros.
- Uma decisão com motivo mora no Registro de decisões do `README.md`. Uma versão mora no manifesto.
- Antes do commit `spec(...)`, o rascunho vive só na árvore de trabalho e o agente `docs-auditor` o revisa: é o único
  momento em que corrigir um defeito não custa uma spec nova.

## Prova

- Um teste mede comportamento: afirma o resultado observável e específico, como o diagnóstico exato de uma falha, a
  saída ou o estado produzido. Nunca afirma só a presença de texto, só um código de saída ou só uma contagem.
- Uma instrução para a IA (skill, agente, `CLAUDE.md`, hook) não tem teste de texto: a IA é medida pelas ferramentas da
  própria IA.
- Numa spec de harness, o Contrato são as regras em prosa de cada arquivo, os casos descrevem o comportamento da
  ferramenta diante de um defeito introduzido sozinho num clone do repositório, e a Validação é o procedimento que roda
  a ferramenta sobre o clone.

## Fechamento

Terminada qualquer escrita, o agente `docs-auditor` confere o que esta skill define. Quando ele roda é regra de
`CLAUDE.md`.
