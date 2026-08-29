import { GoalType } from '../types/GoalType.js';

class FleeEvaluator {
    evaluate(agent, context) {
        const threats = agent.blackboard?.worldModel?.threats || [];
        if (threats.length === 0) return { score: 0, goal: GoalType.FLEE, targetId: null, reasons: ['Nenhum predador detectado'] };

        let highestDanger = 0;
        let mainThreat = null;
        for (const t of threats) {
            if (t.danger > highestDanger) {
                highestDanger = t.danger;
                mainThreat = t;
            }
        }

        const fearDrive = agent.needs.fear * 2;
        const focus = agent.focus?.safety ?? 3;
        const focusMultiplier = 0.5 + (focus / 5);
        const score = ((highestDanger * 0.5 * (agent.strategy.caution / 50)) + fearDrive) * focusMultiplier;

        return {
            score,
            goal: GoalType.FLEE,
            targetId: mainThreat ? mainThreat.id : null,
            reasons: [
                `+ ameaça ativa detectada (perigo: ${highestDanger})`,
                `+ foco segurança ${focus}/5 (x${focusMultiplier.toFixed(2)})`,
                `+ medo interno (+${fearDrive.toFixed(1)})`
            ]
        };
    }
}

export default FleeEvaluator;
