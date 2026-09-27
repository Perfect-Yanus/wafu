import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/state/GameState';
import { RollingBall } from '../src/physics/RollingBall';
import { STAGES } from '../src/world/StageManager';
import { CollectionManager } from '../src/customizer/CollectionManager';

describe('Stage Progression and State Reset Tests', () => {
  let state: GameState;
  let ball: RollingBall;
  let collection: CollectionManager;

  beforeEach(() => {
    localStorage.clear();
    state = new GameState();
    ball = new RollingBall({ initialRadius: 0.125 });
    collection = new CollectionManager();
  });

  it('Stage 1 starts with 120cm target and 130s time', () => {
    const stats = state.getStats();
    expect(stats.stageIndex).toBe(0);
    expect(stats.targetDiameterCm).toBe(120.0);
    expect(stats.stageBriefingActive).toBe(true);
    expect(stats.isVictory).toBe(false);
    expect(stats.isGameOver).toBe(false);
  });

  it('Stage 1 clears when reaching or exceeding 120cm', () => {
    state.closeBriefing();
    // Simulate ball reaching 120cm (0.6m radius)
    state.updateStats({ currentDiameterCm: 121.5 });
    state.tickTimer(0.1, false);

    const stats = state.getStats();
    expect(stats.isVictory).toBe(true);
    expect(stats.isGameOver).toBe(false);
  });

  it('Advancing from Stage 1 to Stage 2 properly sets target to 180cm and resets victory state', () => {
    // Stage 1 victory
    state.closeBriefing();
    state.updateStats({ currentDiameterCm: 125.0 });
    state.tickTimer(0.1, false);
    expect(state.getStats().isVictory).toBe(true);

    // Advance to Stage 2
    const stage2 = STAGES[1];
    state.setStage(1, stage2.targetDiameterCm, stage2.timeLimitSec, stage2.initialDiameterCm ?? 25.0);

    const stats = state.getStats();
    expect(stats.stageIndex).toBe(1);
    expect(stats.targetDiameterCm).toBe(180.0);
    expect(stats.timeRemaining).toBe(130.0);
    expect(stats.stageBriefingActive).toBe(true);
    expect(stats.isVictory).toBe(false);
    expect(stats.isGameOver).toBe(false);
  });

  it('Restarting Stage 1 completely resets game state and ball physics', () => {
    // Modify ball and state
    ball.triggerBoost(2.0);
    ball.getVelocity().set(10, 5, 10);
    ball.setTargetRadius(0.8);
    state.updateStats({
      currentDiameterCm: 160.0,
      absorbedCount: 35,
      isVictory: true,
      timeRemaining: 45.0,
    });

    // Reset ball and state for Stage 1
    const stage1 = STAGES[0];
    ball.reset(stage1.initialDiameterCm / 200.0);
    state.setStage(0, stage1.targetDiameterCm, stage1.timeLimitSec, stage1.initialDiameterCm);

    expect(ball.getRadius()).toBeCloseTo(0.125, 3);
    expect(ball.getVelocity().length()).toBe(0);
    expect(ball.isBoosting()).toBe(false);
    expect(ball.isGrounded()).toBe(true);
    expect(ball.getAbsorbedCount()).toBe(0);

    const stats = state.getStats();
    expect(stats.stageIndex).toBe(0);
    expect(stats.currentDiameterCm).toBe(25.0);
    expect(stats.targetDiameterCm).toBe(120.0);
    expect(stats.timeRemaining).toBe(130.0);
    expect(stats.isVictory).toBe(false);
    expect(stats.isGameOver).toBe(false);
    expect(stats.stageBriefingActive).toBe(true);
    expect(stats.absorbedCount).toBe(0);
  });

  it('Saving ball to inventory records stage origin and enables smash plays', () => {
    const saved = collection.saveBall({
      name: '골드 와뿌볼 (Stage 1)',
      maxDiameterCm: 145.2,
      itemsAbsorbedCount: 42,
      materialPreset: 'glitter',
      color: '#ffd700',
      playsRemaining: 5,
      unlimitedPlays: false,
    });

    expect(saved.id).toBeDefined();
    expect(collection.getAll().length).toBeGreaterThanOrEqual(1);
    expect(collection.getById(saved.id)).toBeDefined();
    expect(saved.maxDiameterCm).toBe(145.2);
    expect(saved.playsRemaining).toBe(5);

    const playResult = collection.consumePlay(saved.id);
    expect(playResult.allowed).toBe(true);
    expect(playResult.remaining).toBe(4);
  });
});
