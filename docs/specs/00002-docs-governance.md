# Skill docs: dono do contexto, completude, prova por comportamento e substituição de spec

## Objetivo

A skill `docs` é reescrita como a única lei de toda a documentação do repositório e do seu harness local: README, IA.md,
CLAUDE.md, AGENTS.md, specs, a própria skill e o agente. O `CLAUDE.md` apenas reforça os gatilhos, o `docs-auditor`
confere a lei nos dois sentidos, deriva e omissão, e todo teste mede comportamento, nunca texto nem um código de saída
sozinho.

## Fora do escopo

- Tooling, CI, configuração de editor e o gatilho do `npm run fix`, que pertencem à spec do toolchain.
- O conteúdo do toolchain, que pertence à spec que substitui a 00001.
- Qualquer verificação automática fora do `docs-auditor`.

## Contrato

Nesta spec de harness, o contrato são as regras em prosa de cada arquivo, e não código. Arquivos e o que cada um
declara:

| Arquivo | Declara |
| --- | --- |
| `.claude/skills/docs/SKILL.md` | a lei nova, no lugar da antiga, com as seções abaixo |
| `.claude/agents/docs-auditor.md` | o fiscal da lei nova, nos dois sentidos, com as checagens novas |
| `CLAUDE.md` | os gatilhos que reforçam a skill, a regra de dependências, a linha de regras de processo na tabela de fontes de verdade e a linha de spec congelada, que passa a admitir a edição só de formatação |
| `README.md` | no Registro de decisões, uma linha para cada decisão desta spec |

Seções da skill `docs` nova, nesta ordem:

| Seção | O que a lei diz |
| --- | --- |
| Escopo | governa toda a documentação do repositório e do seu harness local: README, IA.md, CLAUDE.md, AGENTS.md, specs, a skill e os agentes |
| Princípios | o código é a fonte da verdade, nada que envelhece sozinho, frases curtas em português do Brasil |
| Estilo | tabelas para comparar, listas numeradas para sequências, sem árvore desenhada, um H1 por arquivo, bloco de código só para código ou comando |
| Onde o contexto mora | todo contexto vive só no dono que a tabela de fontes de verdade do `CLAUDE.md` indica; um contexto sem dono ganha primeiro uma linha na tabela; toda regra declara o seu dono e o seu gatilho; uma regra é escrita uma vez e os outros documentos apontam ou reforçam o gatilho |
| Completude | o `README.md` cita cada comando que o CI exercita; o Registro de decisões tem uma linha para cada decisão técnica com alternativa descartada, no mesmo commit que traz o código; uma seção só diz `Ainda sem conteúdo.` enquanto não existe o que descrever; o documento dono de um fato muda no mesmo commit que o fato |
| Documentos | formato fixo de README, IA.md (primeira pessoa do autor, a IA em terceira pessoa) e CLAUDE.md como roteador; o `README.md` só leva os pontos dignos de nota para quem clona o repositório, isto é, o que o código não diz e o que não é comportamento da IA, que mora só no `IA.md` |
| Specs | os oito campos, a spec congelada no conteúdo e editável só na formatação com `spec: none (format)`, e a substituição de spec |
| Prova | um teste mede comportamento: afirma o resultado observável e específico, nunca a presença de texto nem só um código de saída; uma instrução para a IA é medida pelas ferramentas da própria IA, e numa spec de harness os casos descrevem o comportamento da ferramenta diante de um defeito |
| Fechamento | o `docs-auditor` confere a lei depois de toda escrita |

A substituição de spec segue um padrão: o arquivo se chama `0000N-nome-replaces-0000M.md` e a linha `Substitui: 0000M`
vem logo abaixo do H1. A spec nova diz o que continua valendo do que ela substitui, e a substituída fica como registro:
o auditor confere só a estrutura dela, nunca a qualidade dos casos.

O `docs-auditor` declara estas checagens, além das de deriva que já tem. `Contexto fora do dono` cobre o fato que está
em um único lugar, mas no lugar errado; `Sobreposição`, que já existe, cobre o fato com dois donos:

| Checagem | O que reportar |
| --- | --- |
| Omissão de comando | Script, comando ou workflow que existe no repositório e que o documento dono não cita |
| Decisão sem registro | Decisão técnica com alternativa descartada, visível em spec, commit ou código, sem linha no Registro de decisões |
| Seção vazia com sustento | `Ainda sem conteúdo.` numa seção cujo conteúdo já existe no repositório |
| Contexto fora do dono | Fato escrito fora do dono que a tabela de fontes de verdade indica |
| Regra sem dono ou gatilho | Regra em documento que não diz o seu dono ou quando se aplica |
| Dependência | Versão com `^`, `~`, faixa ou `latest` em manifesto |
| Asserção fraca | Em rascunho de spec ou em spec ainda não substituída, caso de teste que afirma só a presença de texto, só um código de saída ou só uma contagem, sem o resultado observável |
| Teste de texto em harness | Em rascunho de spec ou em spec ainda não substituída, caso de teste que procura frase em skill, agente, `CLAUDE.md` ou hook, em vez de medir o comportamento da ferramenta |
| Substituição fora do padrão | Spec com `Substitui:` cujo arquivo não termina em `-replaces-0000M`, ou o contrário |
| Voz do IA.md | `IA.md` que fala do autor em terceira pessoa ou da IA em primeira |
| Ruído no README | Linha do `README.md` que o código ou outro dono já diz, que não é digna de nota para quem clona, ou que é comportamento da IA |

O relatório usa as gravidades alta, para o que bloqueia o commit, média, para toda omissão, e baixa. A checagem de spec
commitada alterada continua bloqueante, e uma mudança só de formatação não é achado.

O `CLAUDE.md` declara, sem repetir a lei:

| Seção | Declara |
| --- | --- |
| Fontes de verdade | uma linha para as regras de processo, com o próprio `CLAUDE.md` como dono |
| Documentação | o gatilho: ao commitar, conferir a lei de completude da skill `docs` |
| Desenvolvimento orientado por especificação | a regra de dependências: versão pesquisada ao vivo, compatibilidade provada fora do repositório, versão exata só no manifesto e no lockfile, prova registrada no `IA.md` em "O que validei" e atualização em commit `deps-bump`; e a spec congelada no conteúdo, editável só na formatação |

## Critérios de aceite

1. Para cada defeito da tabela de casos, o relatório do `docs-auditor` sobre um clone do repositório com esse defeito
   traz o achado esperado, com o arquivo e a linha do defeito e com a gravidade indicada.
2. O relatório sobre o clone sem defeito, depois de todos os passos, e sobre o clone só reformatado não traz achado.

## Casos de teste

O comportamento medido é o do `docs-auditor` diante de um defeito, introduzido sozinho num clone do repositório fora
dele, com o histórico do git, porque duas checagens dependem dele. O nível é de integração: o agente roda sobre arquivos
reais.

| Critério | Nível | Defeito introduzido | Achado esperado |
| --- | --- | --- | --- |
| 1 | Integração | Script no `package.json` que o "Como rodar" do `README.md` não cita | `Omissão de comando`, média |
| 1 | Integração | Restrição de spec com alternativa descartada e sem linha no Registro de decisões | `Decisão sem registro`, média |
| 1 | Integração | `Ainda sem conteúdo.` em "Como rodar" com script existente | `Seção vazia com sustento`, média |
| 1 | Integração | Regra de commit escrita no `README.md` | `Contexto fora do dono`, média |
| 1 | Integração | Regra no `CLAUDE.md` sem dizer quando se aplica | `Regra sem dono ou gatilho`, média |
| 1 | Integração | Dependência com `^` num `package.json` | `Dependência`, média |
| 1 | Integração | Caso de teste de spec que só confere que o código de saída é diferente de 0 | `Asserção fraca`, média |
| 1 | Integração | Caso de teste de spec que procura uma frase no `CLAUDE.md` | `Teste de texto em harness`, média |
| 1 | Integração | Spec com `Substitui:` e nome sem `-replaces-` | `Substituição fora do padrão`, média |
| 1 | Integração | `IA.md` com "o autor" no lugar de "eu" | `Voz do IA.md`, média |
| 1 | Integração | A mesma regra escrita na skill e no `CLAUDE.md` | `Sobreposição`, média |
| 1 | Integração | Linha do Registro de decisões sobre algo que o código já mostra, sem alternativa descartada | `Ruído no README`, média |
| 1 | Integração | Um erro da IA descrito no `README.md` | `Ruído no README`, média |
| 1 | Integração | Spec commitada com o conteúdo de um critério mudado | `Spec commitada alterada`, alta |
| 2 | Integração | Nenhum, depois de todos os passos | sem achado |
| 2 | Integração | Só a quebra de linha de uma spec commitada mudou | sem achado |

## Restrições

- A skill `docs` é a fonte da verdade da lei de documentação; o `CLAUDE.md` só reforça os gatilhos dela e nunca redefine
  o que ela define. As regras de processo, como a de dependências, moram no `CLAUDE.md`.
- A tabela de fontes de verdade do `CLAUDE.md` é o único mapa de donos, e a skill aponta para ela. As linhas do
  `CLAUDE.md` que dizem como ler essa tabela são do mapa e ficam.
- A skill nova substitui a antiga no mesmo arquivo: não existe uma segunda skill de documentação.
- Nenhum documento escreve versão de dependência, e nenhuma spec fixa versão.

## Validação

Para cada linha da tabela de casos, clonar o repositório para um diretório temporário fora dele, introduzir o defeito e
rodar o agente `docs-auditor` sobre o clone:

```sh
clone=$(mktemp -d)
git clone --quiet . "$clone"
```

Depois de introduzir o defeito em `$clone`, o relatório do agente confere o critério da linha. O clone leva o histórico,
e por isso só enxerga o que já foi commitado.

## Passos

1. Reescrever a skill `docs` e o `docs-auditor` juntos, a lei e o fiscal. Prova: critério 1, com todos os defeitos da
   tabela de casos.
2. `CLAUDE.md`: linha de regras de processo na tabela, gatilho de documentação, regra de dependências e a linha de spec
   congelada. Prova: critério 1, com o defeito de `Regra sem dono ou gatilho` e o de `Spec commitada alterada` medidos
   de novo.
3. Linhas do Registro de decisões do `README.md` para as decisões desta spec. Prova: critério 2.
