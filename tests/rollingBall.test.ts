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
    const normalSpeed = ball.getMaxSpeed();
    ball.triggerBoost(1.5);
    expect(ball.isBoosting()).toBe(true);
    expect(ball.getMaxSpeed()).toBeGreaterThan(normalSpeed);
  });

  it('should shrink ball radius and shed items on hazard hit', () => {
    // Absorb an item first
    const item = new AbsorbableItem({
      id: 'coin-1',
      name: 'Gold Coin',
      tier: 1,
      radius: 0.15,
      mass: 0.2,
      mesh: new THREE.Mesh(),
    });
    ball.tryAbsorb(item);
    expect(ball.getAbsorbedCount()).toBe(1);

    const prevTargetR = ball.getTargetRadius();
    const result = ball.shrink(0.2);

    expect(result.newRadius).toBeLessThan(prevTargetR);
    expect(result.lostItems.length).toBe(1);
    expect(ball.getAbsorbedCount()).toBe(0);
    expect(ball.isInvulnerable()).toBe(true);
    expect(ball.getInvulnerableTimer()).toBeGreaterThan(0);

    // Consecutive hit during invulnerability should not shrink again
    const secondHit = ball.shrink(0.2);
    expect(secondHit.lostItems.length).toBe(0);
  });

  it('should smoothly accelerate with input and cap around 1/3 speed scale (~11.5 - 15 m/s)', () => {
    expect(ball.getMaxSpeed()).toBeLessThan(20.0);
    expect(ball.getMaxSpeed()).toBeGreaterThan(10.0);

    ball.applyInput(new THREE.Vector2(0, 1));
    ball.update(0.016);
    const speedFrame1 = Math.hypot(ball.getVelocity().x, ball.getVelocity().z);
    expect(speedFrame1).toBeGreaterThan(0);

    // Accelerate over several frames
    for (let i = 0; i < 30; i++) {
      ball.applyInput(new THREE.Vector2(0, 1));
      ball.update(0.016);
    }
    const speedFrame30 = Math.hypot(ball.getVelocity().x, ball.getVelocity().z);
    expect(speedFrame30).toBeGreaterThan(speedFrame1);
    expect(speedFrame30).toBeLessThanOrEqual(ball.getMaxSpeed() * 1.05);
  });

  it('should coast and decelerate smoothly to zero when input stops', () => {
    // Accelerate up to speed first
    for (let i = 0; i < 20; i++) {
      ball.applyInput(new THREE.Vector2(1, 0));
      ball.update(0.016);
    }
    const activeSpeed = Math.hypot(ball.getVelocity().x, ball.getVelocity().z);
    expect(activeSpeed).toBeGreaterThan(2.0);

    // Release input (coasting deceleration)
    ball.applyInput(new THREE.Vector2(0, 0));
    ball.update(0.016);
    const coastingSpeed1 = Math.hypot(ball.getVelocity().x, ball.getVelocity().z);
    expect(coastingSpeed1).toBeLessThan(activeSpeed);

    // Simulate coasting to stop
    for (let i = 0; i < 60; i++) {
      ball.applyInput(new THREE.Vector2(0, 0));
      ball.update(0.016);
    }
    const stoppedSpeed = Math.hypot(ball.getVelocity().x, ball.getVelocity().z);
    expect(stoppedSpeed).toBeCloseTo(0, 1);
  });

  it('should scale target speed proportionally with analog throttle', () => {
    const gentleBall = new RollingBall({ initialRadius: 0.125 });
    const fullBall = new RollingBall({ initialRadius: 0.125 });

    // Apply gentle throttle (0.35) vs full throttle (1.0)
    for (let i = 0; i < 40; i++) {
      gentleBall.applyInput(new THREE.Vector2(0.35, 0));
      fullBall.applyInput(new THREE.Vector2(1.0, 0));
      gentleBall.update(0.016);
      fullBall.update(0.016);
    }

    const gentleSpeed = Math.hypot(gentleBall.getVelocity().x, gentleBall.getVelocity().z);
    const fullSpeed = Math.hypot(fullBall.getVelocity().x, fullBall.getVelocity().z);

    expect(gentleSpeed).toBeLessThan(fullSpeed * 0.6);
    expect(gentleSpeed).toBeGreaterThan(0.5);
  });
});

