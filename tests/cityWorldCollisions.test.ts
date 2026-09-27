import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CityWorld } from '../src/world/CityWorld';
import { ItemCatalog } from '../src/world/ItemCatalog';
import { RollingBall } from '../src/physics/RollingBall';

describe('CityWorld Collisions & Object Distinction', () => {
  let scene: THREE.Scene;
  let cityWorld: CityWorld;
  let catalog: ItemCatalog;

  beforeEach(() => {
    scene = new THREE.Scene();
    catalog = new ItemCatalog();
    cityWorld = new CityWorld(scene, { itemCount: 80 });
  });

  it('should register static obstacles for maze walls and barricades', () => {
    expect(cityWorld.staticObstacles.length).toBeGreaterThan(0);
    const hedgeWalls = cityWorld.staticObstacles.filter((o) => o.label === 'hedge_wall');
    const barricades = cityWorld.staticObstacles.filter((o) => o.label === 'barricade');

    expect(hedgeWalls.length).toBeGreaterThan(0);
    expect(barricades.length).toBeGreaterThan(0);
  });

  it('should block the ball and prevent passing through hedge maze walls', () => {
    // Pick the first hedge wall
    const wall = cityWorld.staticObstacles.find((o) => o.label === 'hedge_wall' && o.type === 'box');
    expect(wall).toBeDefined();
    if (!wall || wall.type !== 'box') return;

    // Place ball moving towards the wall from the positive X side
    const ball = new RollingBall({
      initialRadius: 0.5,
      initialPosition: new THREE.Vector3(wall.x + wall.hw + 0.2, 0.5, wall.z),
    });
    ball.getVelocity().set(-5.0, 0, 0); // Moving left into wall

    cityWorld.checkCollisions(ball, 0.016);

    // Ball should be pushed outside the wall
    const ballPos = ball.getPosition();
    expect(ballPos.x).toBeGreaterThanOrEqual(wall.x + wall.hw + 0.49);

    // Velocity should be reflected back (positive X)
    expect(ball.getVelocity().x).toBeGreaterThan(0);
  });

  it('should bounce off unabsorbable objects and trigger onObjectBlocked callback', () => {
    const ball = new RollingBall({
      initialRadius: 0.2, // 20cm ball
      initialPosition: new THREE.Vector3(150, 0.2, 150),
    });
    ball.getVelocity().set(4.0, 0, 0);

    // Create a large unabsorbable item (e.g. car or tree, tier 4, radius ~2.0m)
    const largeItem = catalog.createItem('car', 4, new THREE.Vector3(151.5, 0, 150));
    cityWorld.addItem(largeItem);

    expect(ball.canAbsorb(largeItem)).toBe(false);

    let blockedName = '';
    let reqCm = 0;
    let curCm = 0;
    cityWorld.onObjectBlocked = (name, req, cur) => {
      blockedName = name;
      reqCm = req;
      curCm = cur;
    };

    cityWorld.checkCollisions(ball, 0.016);

    // Ball should bounce back (velocity.x should reverse)
    expect(ball.getVelocity().x).toBeLessThan(0);

    // onObjectBlocked should have fired
    expect(blockedName).toBe(largeItem.name);
    expect(reqCm).toBeGreaterThan(curCm);
    expect(curCm).toBeCloseTo(40, 1); // 0.2m * 200 = 40cm
  });

  it('should update proximity indicators with distinct colors for absorbable and too big items', () => {
    const ball = new RollingBall({
      initialRadius: 0.5, // 50cm radius (100cm ball)
      initialPosition: new THREE.Vector3(20, 0.5, 20),
    });

    // 1. Small absorbable candy nearby (radius ~0.15m)
    const smallItem = catalog.createItem('candy', 1, new THREE.Vector3(21.0, 0, 20));
    cityWorld.addItem(smallItem);

    // 2. Large unabsorbable skyscraper nearby (radius ~9.8m)
    const largeItem = catalog.createItem('skyscraper', 5, new THREE.Vector3(22.0, 0, 22));
    cityWorld.addItem(largeItem);

    cityWorld.updateProximityIndicators(ball);

    // Verify indicator rings are visible
    // Filter visible rings in scene
    const rings = (cityWorld as any).indicatorPool.filter((r: THREE.Mesh) => r.visible);
    expect(rings.length).toBeGreaterThanOrEqual(2);

    // There should be at least one cyan/emerald ring (#00f5d4) and at least one amber ring (#ff7b00)
    const colors = rings.map((r: THREE.Mesh) => (r.material as THREE.MeshBasicMaterial).color.getHex());
    expect(colors).toContain(0x00f5d4); // Absorbable
    expect(colors).toContain(0xff7b00); // Too big
  });
});
