import { describe, it, expect } from '@jest/globals';
import Validator from '../server/Validator.js';

describe('Validator', () => {
    describe('validateNickname', () => {
        it('should return true for valid nicknames', () => {
            expect(Validator.validateNickname('Player1')).toBe(true);
            expect(Validator.validateNickname('Test-Name')).toBe(false);
            expect(Validator.validateNickname('a_b_c')).toBe(true);
            expect(Validator.validateNickname('12345')).toBe(true);
        });

        it('should return false for nicknames that are too short', () => {
            expect(Validator.validateNickname('a')).toBe(false);
        });

        it('should return false for nicknames that are too long', () => {
            expect(Validator.validateNickname('a'.repeat(25))).toBe(false);
        });

        it('should return false for nicknames with invalid characters', () => {
            expect(Validator.validateNickname('Player 1!')).toBe(false);
            expect(Validator.validateNickname('Test<Name>')).toBe(false);
            expect(Validator.validateNickname(' ')).toBe(false);
        });

        it('should return false for empty or null nicknames', () => {
            expect(Validator.validateNickname('')).toBe(false);
            expect(Validator.validateNickname(null)).toBe(false);
            expect(Validator.validateNickname(undefined)).toBe(false);
        });
    });

    describe('validateMovement', () => {
        it('should return true for valid movement data', () => {
            const validData = {
                angle: Math.PI,
                isBoosting: true,
            };
            expect(Validator.validateMovement(validData)).toBe(true);
        });

        it('should return false if data is null or not an object', () => {
            expect(Validator.validateMovement(null)).toBe(false);
            expect(Validator.validateMovement(undefined)).toBe(false);
            expect(Validator.validateMovement(123)).toBe(false);
        });

        it('should return false if angle is not a number', () => {
            const invalidData = {
                angle: 'not-a-number',
                isBoosting: false,
            };
            expect(Validator.validateMovement(invalidData)).toBe(false);
        });

        it('should return false if isBoosting is not a boolean', () => {
            const invalidData = {
                angle: 0,
                isBoosting: 'not-a-boolean',
            };
            expect(Validator.validateMovement(invalidData)).toBe(false);
        });

        it('should return false if properties are missing', () => {
            expect(Validator.validateMovement({ angle: 0 })).toBe(false);
            expect(Validator.validateMovement({ isBoosting: false })).toBe(false);
        });
    });
});
