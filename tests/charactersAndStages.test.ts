import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LivingCharacter } from '../src/world/Characters';
import { DimensionPortal, STAGES } from '../src/world/StageManager';

describe('LivingCharacter & StageManager', () => {
  it('should create living characters with valid mesh and item properties', () => {
    const human = new LivingCharacter('human', '1', new THREE.Vector3(0, 0, 0));
    expect(human.item.name).toContain('산책하는 시민');
    expect(human.item.tier).toBe(2);

    const cat = new LivingCharacter('cat', '2', new THREE.Vector3(5, 0, 5));
    expect(cat.item.name).toContain('길고양이');
    expect(cat.item.tier).toBe(1);

    const dog = new LivingCharacter('dog', '3', new THREE.Vector3(-5, 0, 5));
    expect(dog.item.name).toContain('시바견');

    const car = new LivingCharacter('car', '4', new THREE.Vector3(10, 0, 0));
    expect(car.item.name).toContain('미니 시티카');
  });

  it('should update character animation and wander movement', () => {
    const human = new LivingCharacter('human', '1', new THREE.Vector3(0, 0, 0));
    const initPos = human.mesh.position.clone();

    // Normal update with far away ball
    human.update(0.1, new THREE.Vector3(100, 0, 100), 1.0);
    expect(human.mesh.position.distanceTo(initPos)).toBeGreaterThan(0);
  });

  it('should panic and flee when huge ball is nearby', () => {
    const human = new LivingCharacter('human', '1', new THREE.Vector3(5, 0, 0));
    // Ball nearby at (0, 0, 0) with huge radius
    human.update(0.1, new THREE.Vector3(0, 0, 0), 2.5);

    // Should have moved further away from ball (x > 5)
    expect(human.mesh.position.x).toBeGreaterThan(5);
  });

  it('should initialize stages and verify dimension portal entry', () => {
    expect(STAGES.length).toBe(3);
    const portal = new DimensionPortal(new THREE.Vector3(20, 0, 20));

    // Outside entry
    expect(portal.checkEntry(new THREE.Vector3(0, 0, 0), 1.0)).toBe(false);

    // Inside entry
    expect(portal.checkEntry(new THREE.Vector3(20, 0.5, 20), 1.0)).toBe(true);
  });

  it('should compute camera-relative steering directions accurately', () => {
    // When cameraAzimuth = 0 (looking from +Z toward origin, forward is -Z)
    const azimuth0 = 0;
    const inputForward = new THREE.Vector2(0, -1); // Up / W
    const worldDir0 = new THREE.Vector2(
      inputForward.x * Math.cos(azimuth0) + inputForward.y * Math.sin(azimuth0),
      -inputForward.x * Math.sin(azimuth0) + inputForward.y * Math.cos(azimuth0)
    );
    expect(worldDir0.x).toBeCloseTo(0, 4);
    expect(worldDir0.y).toBeCloseTo(-1, 4); // rolls forward along -Z

    // When camera is rotated 90 deg (Math.PI / 2)
    const azimuth90 = Math.PI / 2;
    const worldDir90 = new THREE.Vector2(
      inputForward.x * Math.cos(azimuth90) + inputForward.y * Math.sin(azimuth90),
      -inputForward.x * Math.sin(azimuth90) + inputForward.y * Math.cos(azimuth90)
    );
    // Pushing forward now rolls along -X
    expect(worldDir90.x).toBeCloseTo(-1, 4);
    expect(worldDir90.y).toBeCloseTo(0, 4);
  });
});
