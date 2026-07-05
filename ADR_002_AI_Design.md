# ADR 002: Design da Inteligência Artificial

## Status
Aceito

## Contexto
Temos que migrar a IA de um Behavior Tree instintivo e direto para uma engine orientada a objetivos (Goal-Oriented) e Utility AI (para decisões de momento), suportada por um repositório de memória (Blackboard).

## Decisões
1. **Blackboard:** O estado mental será armazenado centralmente. A percepção alimentará o Blackboard.
2. **Ciclo Cognitivo do Agente:** A cada Tick de IA (5Hz ou dependente do Scheduler), o fluxo será:
   - *Percepção (Sensor/Vision)* -> Atualiza Blackboard.
   - *Memory Update* -> Combina percepções recentes com histórico (locais perigosos, aglomerações).
   - *Goal Engine (1Hz)* -> Lê o Blackboard e necessidades, decide o "O Quê" (ex: "Preciso de comida").
   - *Utility Engine (5Hz)* -> Lê o Objetivo Atual e o Blackboard. Avalia opções ("Qual comida?") usando pontuações combinadas baseadas na personalidade e instinto (Agressividade, Medo).
   - *Steering/Execution (60Hz)* -> Converte a decisão pontuada em impulsos de física determinística para a cobra seguir a rota.
3. **Memória de Curto e Longo Prazo:** Cobras devem registrar incidentes espaciais (mortes, riqueza de alimento, conflitos) limitando a retenção de dados para preservar RAM (Decay system).
4. **Needs (Sistema de Sobrevivência):** Fome aumenta com o tempo/movimento; Energia é consumida pelo Boost; Stress aumenta perto de ameaças. O comportamento emergirá ao balancear essas barras.

## Consequências
- IAs parecerão mais vivas e menos algorítmicas, possivelmente desenvolvendo comportamentos de covardia, territorialidade e oportunidade sem a gente explicitamente codar.
- Requer testes unitários específicos nos módulos de IA para testar a combinação matemática das pontuações (Scores).
