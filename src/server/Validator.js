import { z } from 'zod';

const nicknameSchema = z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Nickname can only contain alphanumeric characters and underscores.');
const movementSchema = z.object({
    angle: z.number(),
    isBoosting: z.boolean(),
    seq: z.number().optional()
});
const agentDataSchema = z.object({
    nickname: nicknameSchema,
    skin: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

class Validator {
    static validateNickname(nickname) {
        try {
            nicknameSchema.parse(nickname);
            return true;
        } catch (error) {
            return false;
        }
    }

    static validateMovement(data) {
        try {
            movementSchema.parse(data);
            return true;
        } catch (error) {
            return false;
        }
    }

    static validateAgentData(data) {
        try {
            agentDataSchema.parse(data);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default Validator;
