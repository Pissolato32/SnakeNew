import { describe, it, expect } from '@jest/globals';
import Validator from '../src/server/Validator.js';

describe('Validator', () => {
    describe('validateNickname', () => {
        it('should return true for valid nicknames', () => {
            expect(Validator.validateNickname('Player1')).toBe(true);
            expect(Validator.validateNickname('a_b_c')).toBe(true);
            expect(Validator.validateNickname('user_123')).toBe(true);
            expect(Validator.validateNickname('player')).toBe(true);
        });

        it('should return false for nicknames that are too short (less than 3 chars)', () => {
            expect(Validator.validateNickname('a')).toBe(false);
            expect(Validator.validateNickname('ab')).toBe(false);
        });

        it('should return false for nicknames that are too long (more than 20 chars)', () => {
            expect(Validator.validateNickname('a'.repeat(21))).toBe(false);
        });

        it('should return false for nicknames with invalid characters (only alphanumeric and underscore allowed)', () => {
            expect(Validator.validateNickname('Player 1')).toBe(false); // space
            expect(Validator.validateNickname('Player-1')).toBe(false); // hyphen
            expect(Validator.validateNickname('Player!')).toBe(false); // exclamation mark
            expect(Validator.validateNickname(' ')).toBe(false);
        });

        it('should return false for non-string or empty inputs', () => {
            expect(Validator.validateNickname('')).toBe(false);
            expect(Validator.validateNickname(null)).toBe(false);
            expect(Validator.validateNickname(undefined)).toBe(false);
            expect(Validator.validateNickname(12345)).toBe(false);
        });
    });

    describe('validateMovement', () => {
        it('should return true for valid movement data', () => {
            expect(Validator.validateMovement({ angle: Math.PI, isBoosting: true })).toBe(true);
            expect(Validator.validateMovement({ angle: 0, isBoosting: false })).toBe(true);
        });

        it('should return true for valid movement data with optional seq number', () => {
            expect(Validator.validateMovement({ angle: 1.5, isBoosting: false, seq: 123 })).toBe(true);
        });

        it('should return false if data is not an object', () => {
            expect(Validator.validateMovement(null)).toBe(false);
            expect(Validator.validateMovement('string')).toBe(false);
        });

        it('should return false for invalid data types', () => {
            expect(Validator.validateMovement({ angle: 'not-a-number', isBoosting: true })).toBe(false);
            expect(Validator.validateMovement({ angle: 0, isBoosting: 'true' })).toBe(false);
            expect(Validator.validateMovement({ angle: 0, isBoosting: true, seq: '123' })).toBe(false);
        });

        it('should return false if required properties are missing', () => {
            expect(Validator.validateMovement({ angle: 0 })).toBe(false);
            expect(Validator.validateMovement({ isBoosting: false })).toBe(false);
        });
    });

    describe('validatePlayerData', () => {
        it('should return true for valid player data', () => {
            expect(Validator.validatePlayerData({ nickname: 'good_nick' })).toBe(true);
            expect(Validator.validatePlayerData({ nickname: 'good_nick', skin: 'neon' })).toBe(true);
            expect(Validator.validatePlayerData({ nickname: 'good_nick', color: '#123abc' })).toBe(true);
            expect(Validator.validatePlayerData({ nickname: 'good_nick', skin: 'default', color: '#FF5733' })).toBe(true);
        });

        it('should return false for invalid nicknames', () => {
            expect(Validator.validatePlayerData({ nickname: 'a' })).toBe(false);
            expect(Validator.validatePlayerData({ nickname: 'bad nick' })).toBe(false);
        });

        it('should return false for invalid colors (must be valid hex)', () => {
            expect(Validator.validatePlayerData({ nickname: 'good_nick', color: '123456' })).toBe(false);
            expect(Validator.validatePlayerData({ nickname: 'good_nick', color: '#123' })).toBe(false);
            expect(Validator.validatePlayerData({ nickname: 'good_nick', color: '#GGGGGG' })).toBe(false);
        });

        it('should return false if nickname is missing', () => {
            expect(Validator.validatePlayerData({ skin: 'default' })).toBe(false);
        });
    });
});
