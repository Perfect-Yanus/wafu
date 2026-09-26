import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/state/GameState';

describe('GameState Challenge & Time Limit', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState();
  });

  it('should initialize with default challenge mode and timer', () => {
    const stats = state.getStats();
    expect(stats.challengeMode).toBe(true);
    expect(stats.timeRemaining).toBeGreaterThan(0);
    expect(stats.targetDiameterCm).toBeGreaterThan(0);
    expect(stats.isGameOver).toBe(false);
    expect(stats.isVictory).toBe(false);
  });

  it('should countdown timer and trigger game over when reaching 0', () => {
    state.resetChallenge(250, 2); // 2 seconds
    expect(state.getStats().timeRemaining).toBe(2);

    state.tickTimer(1.0);
    expect(state.getStats().timeRemaining).toBeCloseTo(1.0);
    expect(state.getStats().isGameOver).toBe(false);

    state.tickTimer(1.2);
    expect(state.getStats().timeRemaining).toBe(0);
    expect(state.getStats().isGameOver).toBe(true);
  });

  it('should add bonus time', () => {
    state.resetChallenge(250, 60);
    state.addBonusTime(15);
    expect(state.getStats().timeRemaining).toBe(75);
  });

  it('should trigger victory when target diameter is reached before time runs out', () => {
    state.resetChallenge(200, 60);
    state.updateStats({ currentDiameterCm: 210 });
    state.tickTimer(0.1);

    expect(state.getStats().isVictory).toBe(true);
    expect(state.getStats().isGameOver).toBe(false);
  });

  it('should toggle challenge mode on and off', () => {
    expect(state.getStats().challengeMode).toBe(true);
    state.setChallengeMode(false);
    expect(state.getStats().challengeMode).toBe(false);

    // Free roll mode should not countdown timer or trigger game over
    state.tickTimer(100);
    expect(state.getStats().isGameOver).toBe(false);
  });
});
