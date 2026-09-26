import * as THREE from 'three';
import { AbsorbableItem } from '../physics/AbsorbableItem';
import { ItemCatalog } from './ItemCatalog';
import { RollingBall } from '../physics/RollingBall';
import { BoostPad, Trampoline, DestructibleWall, SuperMagnetGadget } from './CityGadgets';
import { Hazard, CactusHazard, SpikeTrapHazard, SawbladeHazard, TimeBonusItem } from './Hazards';

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

  // Interactive Gadgets
  public readonly boostPads: BoostPad[] = [];
  public readonly trampolines: Trampoline[] = [];
  public readonly destructibleWalls: DestructibleWall[] = [];
  public readonly superMagnets: SuperMagnetGadget[] = [];

  // Hazards & Bonus Pickups
  public readonly hazards: Hazard[] = [];
  public readonly timeBonuses: TimeBonusItem[] = [];

  // Event Callbacks
  public onTimeBonusCollected?: (bonusSeconds: number) => void;
  public onBallShrunk?: (hazardType: string) => void;

  constructor(scene: THREE.Scene, config: CityWorldConfig = {}) {
    this.scene = scene;
    this.catalog = new ItemCatalog();
    this.citySize = config.citySize ?? 120;
    this.groundGroup = new THREE.Group();
    this.scene.add(this.groundGroup);

    this.createCityGround();
    this.createLighting();
    this.spawnGadgets();
    this.spawnHazardsAndBonuses();
    this.populateCity(config.itemCount ?? 260);
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
    const ambientLight = new THREE.HemisphereLight(0xecf8ff, 0x5a7d65, 0.75);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.3);
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
      color: 0x32373e,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.groundGroup.add(ground);

    // 2. City blocks & parks
    const blockSize = 30;
    const roadWidth = 10;

    for (let x = -this.citySize + blockSize; x < this.citySize - blockSize; x += blockSize + roadWidth) {
      for (let z = -this.citySize + blockSize; z < this.citySize - blockSize; z += blockSize + roadWidth) {
        const isPark = (Math.abs(x + z) % (blockSize * 2)) === 0;
        const tileColor = isPark ? 0x38b000 : 0x6c757d;
        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColor,
          roughness: 0.8,
        });

        const tile = new THREE.Mesh(new THREE.BoxGeometry(blockSize, 0.2, blockSize), tileMat);
        tile.position.set(x, 0.1, z);
        tile.receiveShadow = true;
        this.groundGroup.add(tile);
      }
    }

    // 3. Central Plaza with Fountain
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xadb5bd, roughness: 0.6 });
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 0.4, 32), plazaMat);
    plaza.position.set(0, 0.2, 0);
    plaza.receiveShadow = true;
    this.groundGroup.add(plaza);

    const fountainMat = new THREE.MeshStandardMaterial({ color: 0x0077b6, roughness: 0.1 });
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.8, 24), fountainMat);
    fountain.position.set(0, 0.6, 0);
    this.groundGroup.add(fountain);

    // 4. Elevated Highway Bridge with Ramps
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x495057, roughness: 0.7 });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 60), bridgeMat);
    bridge.position.set(40, 4.0, 0);
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    this.groundGroup.add(bridge);

    // North Ramp
    const rampNorth = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 20), bridgeMat);
    rampNorth.rotation.x = -Math.atan2(4.0, 20);
    rampNorth.position.set(40, 2.0, 39);
    rampNorth.receiveShadow = true;
    this.groundGroup.add(rampNorth);

    // South Ramp
    const rampSouth = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 20), bridgeMat);
    rampSouth.rotation.x = Math.atan2(4.0, 20);
    rampSouth.position.set(40, 2.0, -39);
    rampSouth.receiveShadow = true;
    this.groundGroup.add(rampSouth);

    // 5. Perimeter Boundary Walls
    const wallHeight = 7;
    const wallThickness = 2.5;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x212529, roughness: 0.9 });

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

  private spawnGadgets(): void {
    // 1. Boost Pads on roads
    const boostConfigs = [
      { pos: new THREE.Vector3(0, 0, 25), dir: new THREE.Vector3(0, 0, 1) },
      { pos: new THREE.Vector3(0, 0, -25), dir: new THREE.Vector3(0, 0, -1) },
      { pos: new THREE.Vector3(25, 0, 0), dir: new THREE.Vector3(1, 0, 0) },
      { pos: new THREE.Vector3(-25, 0, 0), dir: new THREE.Vector3(-1, 0, 0) },
      { pos: new THREE.Vector3(40, 4.0, 0), dir: new THREE.Vector3(0, 0, 1) }, // on bridge!
      { pos: new THREE.Vector3(-50, 0, 40), dir: new THREE.Vector3(1, 0, 0) },
    ];

    for (const cfg of boostConfigs) {
      const pad = new BoostPad(cfg.pos, cfg.dir);
      this.boostPads.push(pad);
      this.scene.add(pad.mesh);
    }

    // 2. Trampolines
    const trampConfigs = [
      new THREE.Vector3(-30, 0, -30),
      new THREE.Vector3(30, 0, 30),
      new THREE.Vector3(-45, 0, 20),
      new THREE.Vector3(50, 0, -45),
    ];

    for (const pos of trampConfigs) {
      const tr = new Trampoline(pos, 2.2);
      this.trampolines.push(tr);
      this.scene.add(tr.mesh);
    }

    // 3. Destructible Walls blocking alleys
    const wallConfigs = [
      { pos: new THREE.Vector3(-20, 0, 15), w: 6.0 },
      { pos: new THREE.Vector3(20, 0, -15), w: 6.0 },
      { pos: new THREE.Vector3(-35, 0, -10), w: 5.0 },
      { pos: new THREE.Vector3(15, 0, 35), w: 5.0 },
    ];

    for (const cfg of wallConfigs) {
      const dw = new DestructibleWall(this.scene, cfg.pos, cfg.w, 2.4);
      this.destructibleWalls.push(dw);
    }

    // 4. Super Magnets
    const magnetPos = [
      new THREE.Vector3(0, 0, 48),
      new THREE.Vector3(-48, 0, 0),
      new THREE.Vector3(40, 4.2, -15), // On highway bridge
    ];

    for (const pos of magnetPos) {
      const mag = new SuperMagnetGadget(pos);
      this.superMagnets.push(mag);
      this.scene.add(mag.mesh);
    }
  }

  private spawnHazardsAndBonuses(): void {
    // 1. Cacti (parks and open plaza)
    const cactusLocations = [
      new THREE.Vector3(-25, 0, -25),
      new THREE.Vector3(25, 0, 25),
      new THREE.Vector3(-45, 0, -35),
      new THREE.Vector3(35, 0, -35),
      new THREE.Vector3(-15, 0, 45),
      new THREE.Vector3(55, 0, 15),
    ];
    cactusLocations.forEach((pos, idx) => {
      const cactus = new CactusHazard(`cactus-${idx}`, pos);
      this.hazards.push(cactus);
      this.scene.add(cactus.mesh);
    });

    // 2. Spike Traps (narrow alleys and intersections)
    const spikeLocations = [
      new THREE.Vector3(-15, 0, 0),
      new THREE.Vector3(15, 0, 0),
      new THREE.Vector3(0, 0, -35),
      new THREE.Vector3(30, 0, 45),
      new THREE.Vector3(-40, 0, 15),
    ];
    spikeLocations.forEach((pos, idx) => {
      const spike = new SpikeTrapHazard(`spike-${idx}`, pos);
      this.hazards.push(spike);
      this.scene.add(spike.mesh);
    });

    // 3. Sawblades (highway ramp entrances and road crossings)
    const sawLocations = [
      new THREE.Vector3(40, 4.0, 15),
      new THREE.Vector3(40, 4.0, -15),
      new THREE.Vector3(-25, 0, -10),
      new THREE.Vector3(10, 0, -50),
    ];
    sawLocations.forEach((pos, idx) => {
      const saw = new SawbladeHazard(`saw-${idx}`, pos);
      this.hazards.push(saw);
      this.scene.add(saw.mesh);
    });

    // 4. Time Bonus Pickups (+15s Golden Clocks)
    const bonusLocations = [
      new THREE.Vector3(0, 0.5, 30),
      new THREE.Vector3(0, 0.5, -30),
      new THREE.Vector3(-35, 0.5, -35),
      new THREE.Vector3(35, 0.5, 35),
      new THREE.Vector3(40, 4.6, 0), // center of elevated highway bridge
      new THREE.Vector3(-50, 0.5, 25),
      new THREE.Vector3(50, 0.5, -25),
    ];
    bonusLocations.forEach((pos, idx) => {
      const tb = new TimeBonusItem(`bonus-${idx}`, pos);
      this.timeBonuses.push(tb);
      this.scene.add(tb.mesh);
    });
  }

  public populateCity(count: number = 260): void {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
    }
    this.items = [];
    this.absorbedCount = 0;

    const range = this.citySize - 12;

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let tier = 1;
      let minRadiusFromCenter = 3;

      if (rand < 0.45) {
        tier = 1;
        minRadiusFromCenter = 3;
      } else if (rand < 0.72) {
        tier = 2;
        minRadiusFromCenter = 12;
      } else if (rand < 0.88) {
        tier = 3;
        minRadiusFromCenter = 22;
      } else if (rand < 0.96) {
        tier = 4;
        minRadiusFromCenter = 35;
      } else {
        tier = 5;
        minRadiusFromCenter = 50;
      }

      const angle = Math.random() * Math.PI * 2;
      const dist = minRadiusFromCenter + Math.random() * (range - minRadiusFromCenter);
      const posX = Math.cos(angle) * dist;
      const posZ = Math.sin(angle) * dist;

      const type = this.catalog.getRandomTypeForTier(tier);
      const item = this.catalog.createItem(type, tier, new THREE.Vector3(posX, 0, posZ));
      item.mesh.rotation.y = Math.random() * Math.PI * 2;

      this.addItem(item);
    }
  }

  public checkCollisions(ball: RollingBall, dt: number = 0.016): void {
    const ballPos = ball.getPosition();
    const ballRadius = ball.getRadius();
    const checkRadius = ballRadius + 12.0;

    // 1. Update & check Boost Pads
    for (const pad of this.boostPads) {
      pad.update(dt);
      pad.checkInteraction(ball);
    }

    // 2. Update & check Trampolines
    for (const tr of this.trampolines) {
      tr.update(dt);
      tr.checkInteraction(ball);
    }

    // 3. Update & check Destructible Walls
    for (const wall of this.destructibleWalls) {
      wall.update(dt);
      wall.checkCollision(ball);
    }

    // 4. Check & update Super Magnets
    for (const mag of this.superMagnets) {
      if (!mag.isActive()) {
        const dx = ballPos.x - mag.position.x;
        const dz = ballPos.z - mag.position.z;
        if (Math.hypot(dx, dz) < ballRadius + 1.2) {
          mag.activate(ball, 10.0);
          this.scene.remove(mag.mesh);
        }
      }
      mag.update(dt, ball, this.items);
    }

    // 5. Check Hazards (Cactus, Spike Traps, Sawblades)
    for (const hz of this.hazards) {
      hz.update(dt);
      const hit = hz.checkCollision(ball);
      if (hit) {
        this.onBallShrunk?.(hz.type);
      }
    }

    // 6. Check Time Bonus Pickups (+15s Clocks)
    for (const tb of this.timeBonuses) {
      tb.update(dt);
      if (tb.checkCollection(ball)) {
        this.onTimeBonusCollected?.(tb.bonusSeconds);
      }
    }

    // 7. Absorbable items collision
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

      if (distSq > checkRadius * checkRadius) {
        continue;
      }

      const dist = Math.sqrt(distSq);
      const combinedRadius = ballRadius + item.radius;

      if (dist <= combinedRadius) {
        if (ball.canAbsorb(item)) {
          const absorbed = ball.tryAbsorb(item);
          if (absorbed) {
            this.items.splice(i, 1);
            this.absorbedCount++;
          }
        } else {
          const overlap = combinedRadius - dist;
          if (dist > 0.001) {
            const pushX = (dx / dist) * overlap * 0.4;
            const pushZ = (dz / dist) * overlap * 0.4;
            ballPos.x += pushX;
            ballPos.z += pushZ;

            const vel = ball.getVelocity();
            vel.x *= -0.25;
            vel.z *= -0.25;
          }
        }
      }
    }
  }

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

  public reset(itemCount: number = 260): void {
    // Remove existing hazard and bonus meshes
    for (const hz of this.hazards) {
      this.scene.remove(hz.mesh);
    }
    this.hazards.length = 0;

    for (const tb of this.timeBonuses) {
      this.scene.remove(tb.mesh);
    }
    this.timeBonuses.length = 0;

    this.spawnHazardsAndBonuses();
    this.populateCity(itemCount);
  }
}
