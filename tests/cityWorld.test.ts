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
    expect(item3.radius).toBeGreaterThan(item1.radius);
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

  it('should initialize hazards and time bonuses and trigger callbacks', () => {
    expect(cityWorld.hazards.length).toBeGreaterThan(0);
    expect(cityWorld.timeBonuses.length).toBeGreaterThan(0);

    let shrunkHazard = '';
    cityWorld.onBallShrunk = (type) => {
      shrunkHazard = type;
    };

    let bonusGiven = 0;
    cityWorld.onTimeBonusCollected = (sec) => {
      bonusGiven = sec;
    };

    // Place ball directly on first hazard
    const firstHazard = cityWorld.hazards[0];
    const ball = new RollingBall({ initialRadius: 1.0, initialPosition: firstHazard.position.clone() });

    cityWorld.checkCollisions(ball, 0.016);
    expect(shrunkHazard).toBe(firstHazard.type);

    // Place ball directly on first time bonus
    const firstBonus = cityWorld.timeBonuses[0];
    const ball2 = new RollingBall({ initialRadius: 1.0, initialPosition: firstBonus.mesh.position.clone() });
    cityWorld.checkCollisions(ball2, 0.016);
    expect(bonusGiven).toBe(15);
  });
});
