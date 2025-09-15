class Validator {
    static validateNickname(nickname) {
        if (typeof nickname !== 'string') return false;
        const trimmed = nickname.trim();
        if (trimmed.length < 3 || trimmed.length > 20) return false;
        // Only allow alphanumeric and underscores
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return false;
        return true;
    }

    static validateMovement(data) {
        if (typeof data !== 'object' || data === null) return false;
        if (typeof data.angle !== 'number' || isNaN(data.angle)) return false;
        if (typeof data.isBoosting !== 'boolean') return false;
        // Add more validation as needed
        return true;
    }
}

export default Validator;
