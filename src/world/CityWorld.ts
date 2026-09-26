import * as THREE from 'three';
import { AbsorbableItem } from '../physics/AbsorbableItem';
import { ItemCatalog } from './ItemCatalog';
import { RollingBall } from '../physics/RollingBall';

export interface CityWorldConfig {
  itemCount?: number;
  citySize?: number; // Half-width of the city
}

export class CityWorld {
  public readonly scene: THREE.Scene;
  public readonly catalog: ItemCatalog;
  private items: AbsorbableItem[] = [];
  private absorbedCount: number = 0;
  private citySize: number;
  private groundGroup: THREE.Group;

  constructor(scene: THREE.Scene, config: CityWorldConfig = {}) {
    this.scene = scene;
    this.catalog = new ItemCatalog();
    this.citySize = config.citySize ?? 120;
    this.groundGroup = new THREE.Group();
    this.scene.add(this.groundGroup);

    this.createCityGround();
    this.createLighting();
    this.populateCity(config.itemCount ?? 180);
  }

  public getTotalItemCount(): number {
    return this.items.length + this.absorbedCount;
  }

  public getRemainingItemCount(): number {
    return this.items.length;
  }

  public getAbsorbedCount(): number {
    return this.absorbedCount;
  }

  public addItem(item: AbsorbableItem): void {
    this.items.push(item);
    this.scene.add(item.mesh);
  }

  private createLighting(): void {
    // Soft sky ambient light
    const ambientLight = new THREE.HemisphereLight(0xecf8ff, 0x5a7d65, 0.7);
    this.scene.add(ambientLight);

    // Warm sun light with directional shadow
    const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.2);
    sunLight.position.set(40, 70, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 250;
    const d = 80;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);
  }

  private createCityGround(): void {
    // 1. Base asphalt ground
    const groundGeo = new THREE.PlaneGeometry(this.citySize * 2, this.citySize * 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3a3f47,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.groundGroup.add(ground);

    // 2. Decorative road grid & green park tiles
    const blockSize = 30;
    const roadWidth = 8;

    for (let x = -this.citySize + blockSize; x < this.citySize - blockSize; x += blockSize + roadWidth) {
      for (let z = -this.citySize + blockSize; z < this.citySize - blockSize; z += blockSize + roadWidth) {
        // Sidewalk / Grass Plaza tile
        const isPark = (Math.abs(x + z) % (blockSize * 2)) === 0;
        const tileColor = isPark ? 0x489655 : 0x7a828e;
        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColor,
          roughness: 0.8,
        });

        const tile = new THREE.Mesh(new THREE.BoxGeometry(blockSize, 0.15, blockSize), tileMat);
        tile.position.set(x, 0.075, z);
        tile.receiveShadow = true;
        this.groundGroup.add(tile);
      }
    }

    // 3. Perimeter Boundary Walls
    const wallHeight = 6;
    const wallThickness = 2;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x24272c,
      roughness: 0.9,
    });

    const createWall = (width: number, depth: number, posX: number, posZ: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), wallMat);
      wall.position.set(posX, wallHeight / 2, posZ);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.groundGroup.add(wall);
    };

    createWall(this.citySize * 2, wallThickness, 0, -this.citySize);
    createWall(this.citySize * 2, wallThickness, 0, this.citySize);
    createWall(wallThickness, this.citySize * 2, -this.citySize, 0);
    createWall(wallThickness, this.citySize * 2, this.citySize, 0);
  }

  public populateCity(count: number): void {
    // Clear any existing items
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.items = [];
    this.absorbedCount = 0;

    const range = this.citySize - 12;

    // Distribute objects across tiers:
    // Tier 1 (Tiny): 45% (easy starting absorption near center)
    // Tier 2 (Small): 28%
    // Tier 3 (Medium): 16%
    // Tier 4 (Large): 8%
    // Tier 5 (Huge): 3% (scattered farther out)

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let tier = 1;
      let minRadiusFromCenter = 3;

      if (rand < 0.45) {
        tier = 1;
        minRadiusFromCenter = 3;
      } else if (rand < 0.73) {
        tier = 2;
        minRadiusFromCenter = 12;
      } else if (rand < 0.89) {
        tier = 3;
        minRadiusFromCenter = 22;
      } else if (rand < 0.97) {
        tier = 4;
        minRadiusFromCenter = 35;
      } else {
        tier = 5;
        minRadiusFromCenter = 50;
      }

      // Generate random position within bounds
      const angle = Math.random() * Math.PI * 2;
      const dist = minRadiusFromCenter + Math.random() * (range - minRadiusFromCenter);
      const posX = Math.cos(angle) * dist;
      const posZ = Math.sin(angle) * dist;

      const type = this.catalog.getRandomTypeForTier(tier);
      const item = this.catalog.createItem(type, tier, new THREE.Vector3(posX, 0, posZ));

      // Random slight Y-rotation for natural look
      item.mesh.rotation.y = Math.random() * Math.PI * 2;

      this.addItem(item);
    }
  }

  /**
   * Collision detection and absorption against the player's RollingBall
   */
  public checkCollisions(ball: RollingBall): void {
    const ballPos = ball.getPosition();
    const ballRadius = ball.getRadius();
    const checkRadius = ballRadius + 10.0; // Broad-phase distance filter

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.isAbsorbed()) {
        this.items.splice(i, 1);
        continue;
      }

      const itemPos = item.getWorldPosition();
      const dx = ballPos.x - itemPos.x;
      const dz = ballPos.z - itemPos.z;
      const distSq = dx * dx + dz * dz;

      // Broad-phase check
      if (distSq > checkRadius * checkRadius) {
        continue;
      }

      const dist = Math.sqrt(distSq);
      const combinedRadius = ballRadius + item.radius;

      // Narrow-phase collision check
      if (dist <= combinedRadius) {
        if (ball.canAbsorb(item)) {
          const absorbed = ball.tryAbsorb(item);
          if (absorbed) {
            this.items.splice(i, 1);
            this.absorbedCount++;
          }
        } else {
          // Object is too big to absorb: push ball back gently (solid obstacle bounce)
          const overlap = combinedRadius - dist;
          if (dist > 0.001) {
            const pushX = (dx / dist) * overlap * 0.4;
            const pushZ = (dz / dist) * overlap * 0.4;
            ballPos.x += pushX;
            ballPos.z += pushZ;

            // Dampen ball velocity on impact with unabsorbable obstacle
            const vel = ball.getVelocity();
            vel.x *= -0.25;
            vel.z *= -0.25;
          }
        }
      }
    }
  }

  /**
   * Keep ball inside city boundaries
   */
  public clampBallToBounds(ball: RollingBall): void {
    const pos = ball.getPosition();
    const limit = this.citySize - ball.getRadius() - 1.5;
    const vel = ball.getVelocity();

    if (pos.x < -limit) {
      pos.x = -limit;
      vel.x = Math.abs(vel.x) * 0.5;
    } else if (pos.x > limit) {
      pos.x = limit;
      vel.x = -Math.abs(vel.x) * 0.5;
    }

    if (pos.z < -limit) {
      pos.z = -limit;
      vel.z = Math.abs(vel.z) * 0.5;
    } else if (pos.z > limit) {
      pos.z = limit;
      vel.z = -Math.abs(vel.z) * 0.5;
    }
  }

  public reset(itemCount: number = 180): void {
    this.populateCity(itemCount);
  }
}
