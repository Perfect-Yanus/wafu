import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CollectionManager } from '../src/customizer/CollectionManager';
import { CityWorld } from '../src/world/CityWorld';
import { ItemCatalog } from '../src/world/ItemCatalog';
import { RollingBall } from '../src/physics/RollingBall';
import { RepulsionBlastItem } from '../src/world/CityGadgets';

describe('Magnetism and Ball Inventory Management', () => {
  let collection: CollectionManager;

  beforeEach(() => {
    localStorage.clear();
    collection = new CollectionManager();
  });

  describe('Inventory & Play Limits', () => {
    it('should save a cleared ball with stage origin, 5 default plays, and unlimited false', () => {
      const saved = collection.saveBall({
        name: '용기 있는 와뿌볼',
        color: '#ff4d6d',
        materialPreset: 'clear-jelly',
        maxDiameterCm: 220.5,
        itemsAbsorbedCount: 45,
        stageName: 'Stage 2',
      });

      expect(saved.id).toBeDefined();
      expect(saved.stageName).toBe('Stage 2');
      expect(saved.playsRemaining).toBe(5);
      expect(saved.unlimitedPlays).toBe(false);
    });

    it('should consume plays when playing with a saved ball', () => {
      const saved = collection.saveBall({
        name: '크런치 테이프볼',
        color: '#ffdd00',
        materialPreset: 'tape-ball',
        maxDiameterCm: 150,
        itemsAbsorbedCount: 20,
      });

      // 1st play
      const res1 = collection.consumePlay(saved.id);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(4);

      // Consume remaining 4 plays
      collection.consumePlay(saved.id);
      collection.consumePlay(saved.id);
      collection.consumePlay(saved.id);
      const res4 = collection.consumePlay(saved.id);
      expect(res4.allowed).toBe(true);
      expect(res4.remaining).toBe(0);

      // 6th play should be disallowed
      const res5 = collection.consumePlay(saved.id);
      expect(res5.allowed).toBe(false);
      expect(res5.remaining).toBe(0);
    });

    it('should allow unlimited plays once unlocked', () => {
      const saved = collection.saveBall({
        name: '다이아 와뿌볼',
        color: '#00e5ff',
        materialPreset: 'silicone',
        maxDiameterCm: 300,
        itemsAbsorbedCount: 80,
      });

      // Exhaust plays
      for (let i = 0; i < 5; i++) {
        collection.consumePlay(saved.id);
      }
      expect(collection.consumePlay(saved.id).allowed).toBe(false);

      // Unlock unlimited
      const unlocked = collection.unlockUnlimited(saved.id);
      expect(unlocked).toBe(true);

      const check = collection.getById(saved.id);
      expect(check?.unlimitedPlays).toBe(true);

      // Subsequent plays should always be allowed
      const res = collection.consumePlay(saved.id);
      expect(res.allowed).toBe(true);
      expect(res.unlimited).toBe(true);
    });
  });

  describe('Passive Magnetism & Repulsion Blast Item', () => {
    let scene: THREE.Scene;
    let cityWorld: CityWorld;
    let catalog: ItemCatalog;

    beforeEach(() => {
      scene = new THREE.Scene();
      catalog = new ItemCatalog();
      cityWorld = new CityWorld(scene, { itemCount: 10 });
    });

    it('should gently pull nearby absorbable items towards the ball via passive micro-magnetism', () => {
      const ball = new RollingBall({
        initialRadius: 0.3, // 60cm diameter ball
        initialPosition: new THREE.Vector3(150, 0.3, 150),
      });

      // Place a small candy within passive magnetism range (ballRadius * 1.6 + 2.8 = ~3.2m)
      const candy = catalog.createItem('candy', 1, new THREE.Vector3(152.0, 0, 150));
      cityWorld.addItem(candy);

      const initialDist = candy.mesh.position.distanceTo(ball.getPosition());
      expect(initialDist).toBeCloseTo(2.0, 1);

      // Simulate a physics step
      cityWorld.checkCollisions(ball, 0.05);

      // Candy position should have lerped closer towards ball
      const newDist = candy.mesh.position.distanceTo(ball.getPosition());
      expect(newDist).toBeLessThan(initialDist);
    });

    it('should trigger shockwave and grant protective shield when RepulsionBlastItem is picked up', () => {
      const ball = new RollingBall({
        initialRadius: 0.4,
        initialPosition: new THREE.Vector3(100, 0.4, 100),
      });

      const repulsionItem = new RepulsionBlastItem('rep-1', new THREE.Vector3(100.2, 0, 100));
      cityWorld.repulsionItems.push(repulsionItem);

      let triggered = false;
      cityWorld.onRepulsionBlastTriggered = () => {
        triggered = true;
      };

      cityWorld.checkCollisions(ball, 0.016);

      expect(triggered).toBe(true);
      expect(repulsionItem.isCollected()).toBe(true);
      expect(cityWorld.repulsionShieldTimer).toBeGreaterThan(0);
    });
  });
});
