import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RollingBall } from '../src/physics/RollingBall';
import { AbsorbableItem } from '../src/physics/AbsorbableItem';

describe('RollingBall & Katamari Absorption', () => {
  let ball: RollingBall;

  beforeEach(() => {
    ball = new RollingBall({ initialRadius: 0.6 });
  });

  it('should initialize with initial radius and mass', () => {
    expect(ball.getRadius()).toBeCloseTo(0.6);
    expect(ball.getAbsorbedCount()).toBe(0);
    expect(ball.getTotalMass()).toBeGreaterThan(0);
  });

  it('should absorb items smaller than threshold and grow', () => {
    const smallItem = new AbsorbableItem({
      id: 'candy-1',
      name: 'Strawberry Candy',
      tier: 1,
      radius: 0.2,
      mass: 0.1,
      mesh: new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2)),
    });

    const initialRadius = ball.getRadius();
    const canAbsorb = ball.canAbsorb(smallItem);
    expect(canAbsorb).toBe(true);

    const absorbed = ball.tryAbsorb(smallItem);
    expect(absorbed).toBe(true);
    expect(ball.getAbsorbedCount()).toBe(1);
    expect(ball.getTargetRadius()).toBeGreaterThan(initialRadius);
    ball.update(0.1);
    expect(ball.getRadius()).toBeGreaterThan(initialRadius);
  });

  it('should reject items that are too large for current ball size', () => {
    const hugeBuilding = new AbsorbableItem({
      id: 'building-1',
      name: 'Skyscraper',
      tier: 5,
      radius: 5.0,
      mass: 100.0,
      mesh: new THREE.Mesh(new THREE.BoxGeometry(5, 10, 5)),
    });

    expect(ball.canAbsorb(hugeBuilding)).toBe(false);
    const absorbed = ball.tryAbsorb(hugeBuilding);
    expect(absorbed).toBe(false);
    expect(ball.getAbsorbedCount()).toBe(0);
  });

  it('should update position and rotation on movement physics step', () => {
    const initialPos = ball.getPosition().clone();
    ball.applyInput(new THREE.Vector2(0, 1), 0.016); // Move forward
    ball.update(0.016);

    const newPos = ball.getPosition();
    expect(newPos.distanceTo(initialPos)).toBeGreaterThan(0);
  });

  it('should apply jump velocity and fall back to ground', () => {
    expect(ball.isGrounded()).toBe(true);
    const jumped = ball.jump(12.0);
    expect(jumped).toBe(true);
    expect(ball.isGrounded()).toBe(false);
    expect(ball.getVelocity().y).toBeGreaterThan(0);

    // Simulate physics until landing
    for (let i = 0; i < 120; i++) {
      ball.update(0.016);
    }
    expect(ball.isGrounded()).toBe(true);
    expect(ball.getPosition().y).toBeCloseTo(ball.getRadius());
  });

  it('should activate boost and increase speed cap', () => {
    ball.triggerBoost(1.5);
    expect(ball.isBoosting()).toBe(true);
    expect(ball.getMaxSpeed()).toBeGreaterThan(50);
  });
});
