class Blackboard {
    constructor() {
        // Cognitive State
        this.currentGoal = 'EXPLORE';
        this.currentTarget = null;
        this.lastDecision = null;
        this.decisionCooldown = 0;
        this.emotionalState = 'CALM'; // CALM, ANXIOUS, PANIC, AGGRESSIVE

        // Memory Maps
        this.lastKnownFood = [];
        this.knownThreats = [];
        this.dangerMap = [];     // Zonas de risco alto
        this.visitedRegions = []; // Histórico de navegação
        this.safeZones = [];
        this.lastDangerArea = null;

        // Pathing
        this.currentPath = null;
    }
}

export default Blackboard;
