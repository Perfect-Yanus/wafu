import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MovingCactusHazard, StreetMonsterHazard, PatrollingSawbladeHazard } from '../src/world/Hazards';
import { RollingBall } from '../src/physics/RollingBall';

describe('Moving Hazards and Street Monster AI', () => {
  describe('MovingCactusHazard', () => {
    it('should patrol between start and end positions and bounce vertically', () => {
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(10, 0, 0);
      const cactus = new MovingCactusHazard('cactus-1', p1, p2);

      const initialPos = cactus.position.clone();
      cactus.update(0.1, new THREE.Vector3(50, 0, 50), 0.5);

      // Position should have moved along direction towards p2
      expect(cactus.position.x).toBeGreaterThan(initialPos.x);
      // Hop should have lifted cactus off ground
      expect(cactus.mesh.position.y).toBeGreaterThanOrEqual(0);
    });

    it('should shrink the ball on collision and trigger bounce', () => {
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(5, 0, 0);
      const cactus = new MovingCactusHazard('cactus-2', p1, p2);
      const ball = new RollingBall({
        initialRadius: 0.5, // 100cm ball
        initialPosition: new THREE.Vector3(0.2, 0.5, 0),
      });

      const initialTargetRadius = ball.getTargetRadius();
      const hit = cactus.checkCollision(ball);

      expect(hit).toBe(true);
      expect(ball.getTargetRadius()).toBeLessThan(initialTargetRadius);
      expect(ball.getTargetRadius()).toBeCloseTo(initialTargetRadius * (1 - cactus.shrinkFraction), 2);
    });
  });

  describe('StreetMonsterHazard', () => {
    it('should chase the ball when ball is smaller than 170cm', () => {
      const monster = new StreetMonsterHazard('monster-1', new THREE.Vector3(10, 0, 0));
      const ballPos = new THREE.Vector3(0, 0.4, 0); // Ball radius 0.4m = 80cm diameter < 170cm

      const initialDist = monster.position.distanceTo(ballPos);
      monster.update(0.2, ballPos, 0.4);

      const newDist = monster.position.distanceTo(ballPos);
      // Monster should have moved closer to the player
      expect(newDist).toBeLessThan(initialDist);
    });

    it('should flee and be absorbable when ball is 170cm or larger', () => {
      const monster = new StreetMonsterHazard('monster-2', new THREE.Vector3(2, 0, 0));
      const ballRadius = 0.9; // 180cm diameter >= 170cm
      const ball = new RollingBall({
        initialRadius: ballRadius,
        initialPosition: new THREE.Vector3(0, 0.9, 0),
      });

      // Update AI with giant ball - monster should panic and flee away
      const initialDist = monster.position.distanceTo(ball.getPosition());
      monster.update(0.1, ball.getPosition(), ballRadius);
      const newDist = monster.position.distanceTo(ball.getPosition());
      expect(newDist).toBeGreaterThan(initialDist);

      // Giant ball catches up to fleeing monster and collides: monster gets absorbed!
      ball.getPosition().copy(monster.position);
      const initialTargetRadius = ball.getTargetRadius();
      monster.checkCollision(ball);

      expect(monster.isDead).toBe(true);
      // Ball should have absorbed monster and grown by +45cm (+0.225m)
      expect(ball.getTargetRadius()).toBeGreaterThan(initialTargetRadius);
      expect(ball.getTargetRadius()).toBeCloseTo(initialTargetRadius + 0.225, 2);
    });
  });

  describe('PatrollingSawbladeHazard', () => {
    it('should reciprocate back and forth between endpoints', () => {
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(10, 0, 0);
      const saw = new PatrollingSawbladeHazard('saw-1', p1, p2);

      saw.update(1.0, new THREE.Vector3(50, 0, 50), 0.5);
      expect(saw.position.x).toBeGreaterThan(0);
      expect(saw.position.x).toBeLessThanOrEqual(10);
    });
  });
});
