import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RollingBall } from '../src/physics/RollingBall';
import { CactusHazard, SpikeTrapHazard, SawbladeHazard, TimeBonusItem } from '../src/world/Hazards';

describe('Hazards & Shrinkage Mechanics', () => {
  let ball: RollingBall;

  beforeEach(() => {
    ball = new RollingBall({ initialRadius: 1.2, initialPosition: new THREE.Vector3(0, 1.2, 0) });
  });

  it('should shrink ball on CactusHazard collision', () => {
    const cactus = new CactusHazard('cactus-1', new THREE.Vector3(0, 0, 0));
    const initialTargetRadius = ball.getTargetRadius();

    const collided = cactus.checkCollision(ball);
    expect(collided).toBe(true);
    expect(ball.getTargetRadius()).toBeLessThan(initialTargetRadius);
    expect(ball.isInvulnerable()).toBe(true);
  });

  it('should not damage invulnerable ball on consecutive collision', () => {
    const cactus = new CactusHazard('cactus-1', new THREE.Vector3(0, 0, 0));
    cactus.checkCollision(ball);
    expect(ball.isInvulnerable()).toBe(true);

    const targetR = ball.getTargetRadius();
    const secondCollided = cactus.checkCollision(ball);
    expect(secondCollided).toBe(false);
    expect(ball.getTargetRadius()).toBe(targetR);
  });

  it('should shrink ball on SpikeTrapHazard collision', () => {
    const spike = new SpikeTrapHazard('spike-1', new THREE.Vector3(0, 0, 0));
    spike.update(0.016);
    const initialTargetRadius = ball.getTargetRadius();

    const collided = spike.checkCollision(ball);
    expect(collided).toBe(true);
    expect(ball.getTargetRadius()).toBeLessThan(initialTargetRadius);
  });

  it('should rotate blade and shrink ball on SawbladeHazard collision', () => {
    const saw = new SawbladeHazard('saw-1', new THREE.Vector3(0, 0, 0));
    saw.update(0.1);
    const initialTargetRadius = ball.getTargetRadius();

    const collided = saw.checkCollision(ball);
    expect(collided).toBe(true);
    expect(ball.getTargetRadius()).toBeLessThan(initialTargetRadius);
  });

  it('should collect TimeBonusItem and mark it collected', () => {
    const clock = new TimeBonusItem('clock-1', new THREE.Vector3(0, 0, 0));
    expect(clock.isCollected()).toBe(false);

    clock.update(0.016);
    const collected = clock.checkCollection(ball);
    expect(collected).toBe(true);
    expect(clock.isCollected()).toBe(true);

    // Subsequent check should return false
    expect(clock.checkCollection(ball)).toBe(false);
  });
});
