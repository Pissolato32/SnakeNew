import { z } from 'zod';

const nicknameSchema = z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Nickname can only contain alphanumeric characters and underscores.');
const movementSchema = z.object({
    angle: z.number().finite(),
    isBoosting: z.boolean(),
    seq: z.number().int().nonnegative().optional()
});
const focusSchema = z.object({
    food: z.number().int().min(1).max(5).optional(),
    safety: z.number().int().min(1).max(5).optional(),
    exploration: z.number().int().min(1).max(5).optional(),
    combat: z.number().int().min(1).max(5).optional(),
    cooperation: z.number().int().min(1).max(5).optional(),
    growth: z.number().int().min(1).max(5).optional(),
    energy: z.number().int().min(1).max(5).optional()
}).strict();
const strategySchema = z.object({
    type: z.literal('STRATEGY_UPDATE').optional(),
    focus: focusSchema,
    strategy: z.record(z.string(), z.number().finite()).optional()
}).strict();
const agentDataSchema = z.object({
    nickname: nicknameSchema,
    skin: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    token: z.string().min(8).max(256).optional()
});

class Validator {
    static validateNickname(nickname) {
        try { nicknameSchema.parse(nickname); return true; } catch { return false; }
    }

    static validateMovement(data) {
        try { movementSchema.parse(data); return true; } catch { return false; }
    }

    static validateStrategy(data) {
        try {
            const parsed = strategySchema.parse(data);
            return Object.keys(parsed.focus || {}).length > 0;
        } catch { return false; }
    }

    static validateAgentData(data) {
        try { agentDataSchema.parse(data); return true; } catch { return false; }
    }
}

export default Validator;
