import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ItemCatalog } from '../src/world/ItemCatalog';
import { CityWorld } from '../src/world/CityWorld';
import { RollingBall } from '../src/physics/RollingBall';

describe('ItemCatalog & CityWorld', () => {
  let catalog: ItemCatalog;
  let cityWorld: CityWorld;
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    catalog = new ItemCatalog();
    cityWorld = new CityWorld(scene, { itemCount: 60 });
  });

  it('should generate items across all tiers', () => {
    const item1 = catalog.createItem('candy', 1, new THREE.Vector3(0, 0, 0));
    expect(item1.tier).toBe(1);
    expect(item1.radius).toBeLessThanOrEqual(0.4);

    const item3 = catalog.createItem('bench', 3, new THREE.Vector3(10, 0, 10));
    expect(item3.tier).toBe(3);
    expect(item3.radius).toBeGreaterThan(0.9);
  });

  it('should populate city with items and ground', () => {
    expect(cityWorld.getTotalItemCount()).toBeGreaterThan(0);
    expect(cityWorld.getAbsorbedCount()).toBe(0);
  });

  it('should detect collisions and absorb nearby items into RollingBall', () => {
    const ball = new RollingBall({ initialRadius: 1.0 });
    // Place a small tier 1 item directly in front of the ball
    const targetItem = catalog.createItem('candy', 1, new THREE.Vector3(0.5, 0.2, 0));
    cityWorld.addItem(targetItem);

    // Update city world collision detection
    cityWorld.checkCollisions(ball);

    expect(targetItem.isAbsorbed()).toBe(true);
    expect(ball.getAbsorbedCount()).toBe(1);
  });
});
