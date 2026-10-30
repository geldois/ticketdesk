---
name: docs
description: "Governa toda a documentação do repositório: docs/ (as specs numeradas), README.md, IA.md, CLAUDE.md e AGENTS.md. Define o formato, o dono de cada fato e o estilo de cada arquivo. Invocar antes de criar, editar ou revisar qualquer um deles."
---

# docs

Lei de escrita da documentação. Quando escrever e como commitar ficam em `CLAUDE.md`; aqui fica como cada arquivo é escrito.

## Princípios

- Cada fato tem um único dono. Se outro arquivo já o diz, aponte para ele e não repita.
- O código é a fonte da verdade. A documentação descreve o repositório como ele está, nunca como será.
- Nada que envelheça sozinho: sem versão que um manifesto já fixa, sem tempo ou desempenho medido, sem contagem que o código muda, sem fato externo que o mundo muda.
- Frases curtas, voz ativa, português do Brasil. Identificadores, comandos e rotas ficam em inglês, entre crases.

## Estilo

- Para comparar coisas ou listar atributos, tabela simples de markdown. Para sequências, lista numerada.
- Sem árvore de diretórios desenhada com caracteres, sem diagrama de caixas e setas em texto, sem alinhamento por espaços. Uma estrutura de pastas vira uma tabela de caminho e papel.
- Diagrama só em Mermaid, enxuto (no máximo uns doze nós), e só no `README.md`.
- Um H1 por arquivo e níveis de título sem salto.
- Bloco de código só para código ou comando executável.

## docs/specs/

Cada spec é uma fatia de comportamento, contrato, esquema do banco ou dependência, em `docs/specs/0000N-slug.md`: cinco dígitos em sequência sem buracos, slug em inglês e minúsculo.

### Escopo

- Uma spec é tão curta quanto possível e obsessivamente escopada: uma fatia que se prova por inteiro.
- O limite é explícito: a spec termina antes do ponto em que o futuro vira nebuloso, impossível de provar ou pouco determinístico. O que depende de algo ainda não provado fica para uma spec posterior, escrita depois que a dependência for provada, por exemplo por um experimento descartável fora do repositório.
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

Um campo que não se aplica escreve `Não se aplica:` e o motivo em uma frase. Nunca é omitido nem deixado em branco. O motivo diz por que o campo não cabe nesta fatia e não repete o que `IA.md`, `README.md` ou outro documento já guardam.

### Regras

- O autor escreve a spec. A IA entrevista, aponta trade-offs e confere o formato; ela nunca decide o domínio.
- A spec é congelada a partir do commit que a introduz: não tem status, não tem registro e nunca é editada. Corrigir ou mudar uma decisão é abrir uma spec nova, com a linha `Substitui: 0000N` logo abaixo do H1.
- A spec só afirma o que é determinístico e está sob controle do projeto: comportamento, contrato e critérios binários. Nomear a ferramenta escolhida é uma decisão e pode entrar na spec. Ficam de fora tempo, desempenho medido, versão, estimativa, data e qualquer afirmação sobre o comportamento, a versão ou a compatibilidade de uma ferramenta de terceiros.
- Uma decisão com motivo mora no Registro de decisões do `README.md`. Uma versão mora no manifesto.
- Antes do commit `spec(...)`, o rascunho vive só na árvore de trabalho e o agente `docs-auditor` o revisa: é o único momento em que corrigir um defeito não custa uma spec nova.

## README.md

Escrito para quem vai clonar o repositório. Seções fixas, nesta ordem:

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

## IA.md

Diário do uso de IA neste projeto. Seu escopo é o comportamento da IA; não é diário de estudo do autor.

| Título fixo | Conteúdo |
| --- | --- |
| Onde usei | Uma linha por spec com o papel da IA e os prompts realmente relevantes |
| O que validei | Por spec, o que provou que o resultado estava certo |
| Um erro da IA | Erro real, descrito no dia em que acontece, com como foi percebido e o que se fez |
| Uma decisão minha | Divergência real do que a IA propôs, com o motivo |
| Onde a IA não entrou | Por artefato, o que foi escrito pelo autor |

- Toda afirmação cita o rodapé `spec:` do trabalho que a sustenta (`spec: 0000N` e o passo, ou `spec: none (motivo)`), porque o commit se acha com `git log --grep` e um commit não pode citar o próprio hash.
- Todo número de spec existente aparece em "Onde usei", e todo número citado existe em `docs/specs/`.
- Só fatos reais: erro e decisão nunca são escolhidos de antemão nem inventados. Quando registrar é regra de `CLAUDE.md`.
- "Onde a IA não entrou" fala por artefato e nunca diz "sem IA". Corpo de teste gerado por IA é declarado como tal.

## CLAUDE.md e AGENTS.md

- `CLAUDE.md` é roteador, não depósito: só traz regras operacionais que nenhum outro arquivo guarda. Antes de escrever uma linha, confira se outro dono já a tem; se tem, apague a linha.
- Regra definida nesta skill não se repete em `CLAUDE.md`, e o contrário também vale. O escopo da skill está na descrição dela, e `CLAUDE.md` não o repete.
- `AGENTS.md` é um symlink para `CLAUDE.md` e nunca é editado como arquivo.
- Seções de `CLAUDE.md`, nesta ordem: fontes de verdade, documentação, desenvolvimento orientado por especificação, commits, idioma e comentários, antes de commitar, pausas, harness local.

## Fechamento

Terminada qualquer escrita, o agente `docs-auditor` confere o que esta skill define. Quando ele roda é regra de `CLAUDE.md`.
