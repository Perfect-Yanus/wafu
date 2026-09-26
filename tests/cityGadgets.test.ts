import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BoostPad, Trampoline, DestructibleWall, SuperMagnetGadget } from '../src/world/CityGadgets';
import { RollingBall } from '../src/physics/RollingBall';

describe('CityGadgets System', () => {
  let ball: RollingBall;

  beforeEach(() => {
    ball = new RollingBall({ initialRadius: 0.8 });
  });

  it('should trigger boost on BoostPad collision', () => {
    const boostPad = new BoostPad(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
    expect(ball.isBoosting()).toBe(false);

    boostPad.checkInteraction(ball);
    expect(ball.isBoosting()).toBe(true);
    expect(ball.getVelocity().z).toBeGreaterThan(20);
  });

  it('should launch ball into air on Trampoline collision', () => {
    const trampoline = new Trampoline(new THREE.Vector3(0, 0, 0), 2.0);
    expect(ball.isGrounded()).toBe(true);

    trampoline.checkInteraction(ball);
    expect(ball.isGrounded()).toBe(false);
    expect(ball.getVelocity().y).toBeGreaterThan(15);
  });

  it('should shatter DestructibleWall when hit with sufficient speed', () => {
    const scene = new THREE.Scene();
    const wall = new DestructibleWall(scene, new THREE.Vector3(0, 0, 0), 4.0, 2.0);
    expect(wall.isDestroyed()).toBe(false);

    // Roll with high speed
    ball.getVelocity().set(0, 0, 25.0);
    const shattered = wall.checkCollision(ball);
    expect(shattered).toBe(true);
    expect(wall.isDestroyed()).toBe(true);
  });

  it('should activate magnet mode on SuperMagnetGadget absorption', () => {
    const magnet = new SuperMagnetGadget(new THREE.Vector3(0, 0, 0));
    expect(magnet.isActive()).toBe(false);

    magnet.activate(ball);
    expect(magnet.isActive()).toBe(true);
  });
});
