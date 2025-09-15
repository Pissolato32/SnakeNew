import { describe, test, expect } from '@jest/globals';
import { hslToRgb, getSafeSpawnPoint } from '../Utils.js';

describe('Utils', () => {
  test('hslToRgb converts HSL to RGB correctly for red', () => {
    const rgb = hslToRgb(0, 100, 50); // Red
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('hslToRgb converts HSL to RGB correctly for green', () => {
    const rgb = hslToRgb(120, 100, 50); // Green
    expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
  });

  test('hslToRgb converts HSL to RGB correctly for blue', () => {
    const rgb = hslToRgb(240, 100, 50); // Blue
    expect(rgb).toEqual({ r: 0, g: 0, b: 255 });
  });

  // Note: getSafeSpawnPoint is harder to test in isolation due to its dependency on random numbers and world size.
  // It would require mocking Math.random and potentially the worldSize constant, or testing its behavior with a fixed set of players.
  // For now, we'll focus on hslToRgb which is a pure function.
});