# Roadmap Técnico: The Persistent Ecosystem (Snake ALife)

## MVP (Mínimo Produto Viável) - Foco em Fundação e IA Base
- [ ] Refatoração Arquitetural (ECS e EventBus).
- [ ] Implementar Scheduler de frequências.
- [ ] Implementar Goal Engine e Utility AI com as necessidades básicas (Comida, Fuga, Exploração).
- [ ] Refatorar Cliente para atuar como Espectador/Painel de Estratégia.
- [ ] Ajuste do Mundo para rodar contínua e infinitamente (Room -> World).

## Alpha - Foco em Simulação e Persistência
- [ ] Memória Espacial das cobras (evitar zonas onde muita gente morre).
- [ ] Persistência com SQLite ou JSON (Agent stats e configurações de Player).
- [ ] Sistema de Necessidades (Fome que mata e consumo progressivo por Idade/Metabolismo).
- [ ] Interface de Estratégia Avançada (Sliders de DNA em tempo real pelo cliente).

## Beta - Comportamento Emergente e Balanceamento Data-Driven
- [ ] Migração de todas as constantes e pesos de Utility AI para arquivos JSON configuráveis "a quente".
- [ ] Implementação de novos comportamentos de Bando, Territorialidade ou Covardia extrema.
- [ ] Módulo Genético Básico (Cross-over entre cobras ao procriar - opcional, ou respawn com mutações).
- [ ] Relatórios de Telemetria (Heatmaps do mundo no admin).

## Versão 1.0 - O Ecossistema Vivo Completo
- [ ] Clãs e Agrupamentos.
- [ ] Estações/Clima afetando a disponibilidade de comida e as rotas.
- [ ] Balanceamento final.
