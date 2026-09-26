import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/state/GameState';

describe('GameState State Machine', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState();
  });

  it('should initialize in CITY mode by default', () => {
    expect(state.getMode()).toBe('CITY');
  });

  it('should transition between CITY and STUDIO modes', () => {
    state.setMode('STUDIO');
    expect(state.getMode()).toBe('STUDIO');

    state.setMode('CITY');
    expect(state.getMode()).toBe('CITY');
  });

  it('should update and notify stats changes', () => {
    let notified = false;
    state.onStatsChange(() => {
      notified = true;
    });

    state.updateStats({
      currentDiameterCm: 150,
      absorbedCount: 12,
      score: 1200,
    });

    expect(state.getStats().currentDiameterCm).toBe(150);
    expect(state.getStats().absorbedCount).toBe(12);
    expect(notified).toBe(true);
  });
});
