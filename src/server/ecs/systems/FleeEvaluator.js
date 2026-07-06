import { GoalType } from '../types/GoalType.js';

class FleeEvaluator {
    evaluate(agent, context) {
        const threats = agent.blackboard?.worldModel?.threats || [];
        if (threats.length === 0) {
            return { score: 0, goal: GoalType.FLEE, targetId: null, reasons: ['Nenhum predador detectado'] };
        }

        // Encontra a ameaça mais perigosa
        let highestDanger = 0;
        let mainThreat = null;
        for (const t of threats) {
            if (t.danger > highestDanger) {
                highestDanger = t.danger;
                mainThreat = t;
            }
        }

        const fearDrive = agent.needs.fear * 2;
        const score = (highestDanger * 0.5 * (agent.strategy.caution / 50)) + fearDrive;

        return {
            score,
            goal: GoalType.FLEE,
            targetId: mainThreat ? mainThreat.id : null,
            reasons: [
                `+ ameaça ativa detectada (perigo: ${highestDanger})`,
                `+ medo interno (+${fearDrive.toFixed(1)})`
            ]
        };
    }
}

export default FleeEvaluator;
