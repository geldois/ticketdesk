# ticketdesk

Sistema de tickets de atendimento full-stack em TypeScript, Node e PostgreSQL: uma operadora registra tickets de clientes, acompanha o andamento até a resolução, consulta o histórico de cada mudança e nunca sobrescreve, sem aviso, a alteração de outra operadora.

## Como este projeto é desenvolvido

Desenvolvimento orientado por especificação: cada fatia nasce como uma spec congelada em [docs/specs/](docs/specs/), e cada passo dela vira um commit que cita a spec. As regras de trabalho estão em [CLAUDE.md](CLAUDE.md) e o uso de IA está relatado, por spec, em [IA.md](IA.md).

## Como rodar

Ainda sem conteúdo.

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
