import * as THREE from 'three';
import { AbsorbableItem } from '../physics/AbsorbableItem';
import { ItemCatalog } from './ItemCatalog';
import { RollingBall } from '../physics/RollingBall';
import { BoostPad, Trampoline, DestructibleWall, SuperMagnetGadget } from './CityGadgets';
import { Hazard, CactusHazard, SpikeTrapHazard, SawbladeHazard, TimeBonusItem } from './Hazards';
import { STAGES, StageConfig, DimensionPortal } from './StageManager';
import { LivingCharacter } from './Characters';
import { asmrAudio } from '../audio/AsmrAudioEngine';

export interface StaticBoxObstacle {
  type: 'box';
  x: number;
  z: number;
  hw: number;
  hd: number;
  h: number;
  label?: string;
}

export interface StaticCylinderObstacle {
  type: 'cylinder';
  x: number;
  z: number;
  radius: number;
  height: number;
  label?: string;
}

export type StaticObstacle = StaticBoxObstacle | StaticCylinderObstacle;

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

  // Static Obstacles (Maze walls, barricades, fountain)
  public readonly staticObstacles: StaticObstacle[] = [];

  // Proximity Indicator Pool (Green = can absorb, Orange = too big)
  private indicatorGroup: THREE.Group = new THREE.Group();
  private indicatorPool: THREE.Mesh[] = [];
  private readonly MAX_INDICATORS = 24;

  // Stage & Portal
  public currentStage: StageConfig = STAGES[0];
  public portal: DimensionPortal | null = null;

  // Living Animated Characters
  public readonly characters: LivingCharacter[] = [];

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
  public onPortalEntered?: () => void;
  public onPortalBlocked?: (requiredCm: number) => void;
  public onObjectBlocked?: (itemName: string, requiredCm: number, currentCm: number) => void;
  private lastBlockedAlertTime: number = 0;

  constructor(scene: THREE.Scene, config: CityWorldConfig = {}) {
    this.scene = scene;
    this.catalog = new ItemCatalog();
    this.citySize = config.citySize ?? 120;
    this.groundGroup = new THREE.Group();
    this.scene.add(this.groundGroup);

    this.initIndicatorPool();
    this.createCityGround();
    this.createLighting();
    this.spawnGadgets();
    this.spawnHazardsAndBonuses();
    this.spawnCharacters(24);
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

    // 2. City blocks & parks with Hedge Mazes and Alley Dividers
    const blockSize = 30;
    const roadWidth = 10;
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.85 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.5 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.8 });

    for (let x = -this.citySize + blockSize; x < this.citySize - blockSize; x += blockSize + roadWidth) {
      for (let z = -this.citySize + blockSize; z < this.citySize - blockSize; z += blockSize + roadWidth) {
        const isPark = (Math.abs(x + z) % (blockSize * 2)) === 0;
        const tileColor = isPark ? 0x38b000 : 0x495057;
        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColor,
          roughness: 0.8,
        });

        const tile = new THREE.Mesh(new THREE.BoxGeometry(blockSize, 0.2, blockSize), tileMat);
        tile.position.set(x, 0.1, z);
        tile.receiveShadow = true;
        this.groundGroup.add(tile);

        if (isPark) {
          // Park Hedge Maze Labyrinth Walls
          const mazeWalls = [
            { w: 22, h: 2.2, d: 1.2, ox: 0, oz: -8 },
            { w: 1.2, h: 2.2, d: 16, ox: -8, oz: 0 },
            { w: 16, h: 2.2, d: 1.2, ox: 2, oz: 7 },
            { w: 1.2, h: 2.2, d: 10, ox: 8, oz: -2 },
          ];
          for (const mw of mazeWalls) {
            const hw = new THREE.Mesh(new THREE.BoxGeometry(mw.w, mw.h, mw.d), hedgeMat);
            hw.position.set(x + mw.ox, mw.h / 2 + 0.2, z + mw.oz);
            hw.castShadow = true;
            hw.receiveShadow = true;
            this.groundGroup.add(hw);

            this.staticObstacles.push({
              type: 'box',
              x: x + mw.ox,
              z: z + mw.oz,
              hw: mw.w / 2,
              hd: mw.d / 2,
              h: mw.h + 0.2,
              label: 'hedge_wall',
            });
          }
        } else {
          // Urban Alley Barricades & Jersey Barriers
          const barriers = [
            { w: 12, h: 1.2, d: 0.6, ox: -5, oz: 5, mat: barrierMat },
            { w: 0.6, h: 1.2, d: 10, ox: 6, oz: -4, mat: concreteMat },
          ];
          for (const b of barriers) {
            const bm = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), b.mat);
            bm.position.set(x + b.ox, b.h / 2 + 0.2, z + b.oz);
            bm.castShadow = true;
            bm.receiveShadow = true;
            this.groundGroup.add(bm);

            this.staticObstacles.push({
              type: 'box',
              x: x + b.ox,
              z: z + b.oz,
              hw: b.w / 2,
              hd: b.d / 2,
              h: b.h + 0.2,
              label: 'barricade',
            });
          }
        }
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

      this.staticObstacles.push({
        type: 'box',
        x: posX,
        z: posZ,
        hw: width / 2,
        hd: depth / 2,
        h: wallHeight,
        label: 'perimeter_wall',
      });
    };

    createWall(this.citySize * 2, wallThickness, 0, -this.citySize);
    createWall(this.citySize * 2, wallThickness, 0, this.citySize);
    createWall(wallThickness, this.citySize * 2, -this.citySize, 0);
    createWall(wallThickness, this.citySize * 2, this.citySize, 0);
  }

  private spawnGadgets(): void {
    // 1. Boost Pads on roads and maze entrances
    const boostConfigs = [
      { pos: new THREE.Vector3(0, 0, 25), dir: new THREE.Vector3(0, 0, 1) },
      { pos: new THREE.Vector3(0, 0, -25), dir: new THREE.Vector3(0, 0, -1) },
      { pos: new THREE.Vector3(25, 0, 0), dir: new THREE.Vector3(1, 0, 0) },
      { pos: new THREE.Vector3(-25, 0, 0), dir: new THREE.Vector3(-1, 0, 0) },
      { pos: new THREE.Vector3(40, 4.0, 0), dir: new THREE.Vector3(0, 0, 1) }, // on bridge
      { pos: new THREE.Vector3(-50, 0, 40), dir: new THREE.Vector3(1, 0, 0) },
      { pos: new THREE.Vector3(50, 0, -30), dir: new THREE.Vector3(-1, 0, 0) },
      { pos: new THREE.Vector3(-30, 0, -50), dir: new THREE.Vector3(0, 0, 1) },
    ];

    for (const cfg of boostConfigs) {
      const pad = new BoostPad(cfg.pos, cfg.dir);
      this.boostPads.push(pad);
      this.scene.add(pad.mesh);
    }

    // 2. Trampolines across open parks and plazas
    const trampConfigs = [
      new THREE.Vector3(-30, 0, -30),
      new THREE.Vector3(30, 0, 30),
      new THREE.Vector3(-45, 0, 20),
      new THREE.Vector3(50, 0, -45),
      new THREE.Vector3(0, 0, 50),
      new THREE.Vector3(-10, 0, -55),
    ];

    for (const pos of trampConfigs) {
      const tr = new Trampoline(pos, 2.2);
      this.trampolines.push(tr);
      this.scene.add(tr.mesh);
    }

    // 3. Destructible Walls blocking alleys (rewarding balls that grow big enough to smash them!)
    const wallConfigs = [
      { pos: new THREE.Vector3(-20, 0, 15), w: 6.0 },
      { pos: new THREE.Vector3(20, 0, -15), w: 6.0 },
      { pos: new THREE.Vector3(-35, 0, -10), w: 5.0 },
      { pos: new THREE.Vector3(15, 0, 35), w: 5.0 },
      { pos: new THREE.Vector3(-10, 0, 40), w: 5.5 },
      { pos: new THREE.Vector3(35, 0, -10), w: 5.5 },
      { pos: new THREE.Vector3(-45, 0, -45), w: 6.0 },
      { pos: new THREE.Vector3(45, 0, 45), w: 6.0 },
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
      new THREE.Vector3(48, 0, 30),
    ];

    for (const pos of magnetPos) {
      const mag = new SuperMagnetGadget(pos);
      this.superMagnets.push(mag);
      this.scene.add(mag.mesh);
    }
  }

  private spawnHazardsAndBonuses(): void {
    // 1. Cacti (parks, maze borders, and open plaza)
    const cactusLocations = [
      new THREE.Vector3(-25, 0, -25),
      new THREE.Vector3(25, 0, 25),
      new THREE.Vector3(-45, 0, -35),
      new THREE.Vector3(35, 0, -35),
      new THREE.Vector3(-15, 0, 45),
      new THREE.Vector3(55, 0, 15),
      new THREE.Vector3(-35, 0, 20),
      new THREE.Vector3(20, 0, -50),
      new THREE.Vector3(-55, 0, -15),
      new THREE.Vector3(10, 0, 55),
    ];
    cactusLocations.forEach((pos, idx) => {
      const cactus = new CactusHazard(`cactus-${idx}`, pos);
      this.hazards.push(cactus);
      this.scene.add(cactus.mesh);
    });

    // 2. Spike Traps (narrow alleys and maze turns)
    const spikeLocations = [
      new THREE.Vector3(-15, 0, 0),
      new THREE.Vector3(15, 0, 0),
      new THREE.Vector3(0, 0, -35),
      new THREE.Vector3(30, 0, 45),
      new THREE.Vector3(-40, 0, 15),
      new THREE.Vector3(-28, 0, 35),
      new THREE.Vector3(25, 0, -28),
      new THREE.Vector3(45, 0, 10),
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
      new THREE.Vector3(-50, 0, -25),
      new THREE.Vector3(30, 0, -15),
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
      new THREE.Vector3(-20, 0.5, -50),
      new THREE.Vector3(20, 0.5, 50),
      new THREE.Vector3(0, 0.5, 0), // At central plaza fountain
    ];
    bonusLocations.forEach((pos, idx) => {
      const tb = new TimeBonusItem(`bonus-${idx}`, pos);
      this.timeBonuses.push(tb);
      this.scene.add(tb.mesh);
    });
  }

  public spawnCharacters(count: number = 24): void {
    for (const c of this.characters) {
      this.scene.remove(c.mesh);
    }
    this.characters.length = 0;

    const types: ('human' | 'cat' | 'dog' | 'cyclist' | 'car')[] = ['human', 'cat', 'dog', 'cyclist', 'car'];
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * (this.citySize - 35);
      const pos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

      const char = new LivingCharacter(type, `${i}`, pos);
      this.characters.push(char);
      this.addItem(char.item);
    }
  }

  public loadStage(stage: StageConfig, itemCount: number = 650): void {
    this.currentStage = stage;

    // Portal cleanup & spawn
    if (this.portal) {
      this.scene.remove(this.portal.mesh);
      this.portal = null;
    }
    if (stage.hasPortalExit) {
      this.portal = new DimensionPortal(new THREE.Vector3(60, 0, 60));
      this.scene.add(this.portal.mesh);
    }

    // Refresh hazards & bonuses
    for (const hz of this.hazards) {
      this.scene.remove(hz.mesh);
    }
    this.hazards.length = 0;

    for (const tb of this.timeBonuses) {
      this.scene.remove(tb.mesh);
    }
    this.timeBonuses.length = 0;

    this.spawnHazardsAndBonuses();
    this.spawnCharacters(stage.isPlanetSphere ? 16 : 28);
    this.populateCity(itemCount);
  }

  public populateCity(count: number = 650): void {
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

    // 1. Update Living Characters (wandering, panicking, animated limbs)
    for (const char of this.characters) {
      char.update(dt, ballPos, ballRadius);
    }

    // 2. Check Portal Exit (Stage 2)
    if (this.portal) {
      this.portal.update(dt);
      if (this.portal.checkEntry(ballPos, ballRadius)) {
        if (ballRadius * 200 >= this.currentStage.targetDiameterCm) {
          this.onPortalEntered?.();
        } else {
          this.onPortalBlocked?.(this.currentStage.targetDiameterCm);
        }
      }
    }

    // 3. Update & check Boost Pads
    for (const pad of this.boostPads) {
      pad.update(dt);
      pad.checkInteraction(ball);
    }

    // 4. Update & check Trampolines
    for (const tr of this.trampolines) {
      tr.update(dt);
      tr.checkInteraction(ball);
    }

    // 5. Update & check Destructible Walls
    for (const wall of this.destructibleWalls) {
      wall.update(dt);
      wall.checkCollision(ball);
    }

    // 6. Check & update Super Magnets
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

    // 7. Check Hazards (Cactus, Spike Traps, Sawblades)
    for (const hz of this.hazards) {
      hz.update(dt);
      const hit = hz.checkCollision(ball);
      if (hit) {
        this.onBallShrunk?.(hz.type);
      }
    }

    // 8. Check Time Bonus Pickups (+15s Clocks)
    for (const tb of this.timeBonuses) {
      tb.update(dt);
      if (tb.checkCollection(ball)) {
        this.onTimeBonusCollected?.(tb.bonusSeconds);
      }
    }

    // 9. Static Obstacle Collisions (Hedge maze walls, barricades, fountain, boundaries)
    this.resolveStaticObstacleCollisions(ball);

    // 10. Absorbable items collision
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

            // Trigger character reaction if this was a living character
            for (const char of this.characters) {
              if (char.item === item) {
                char.triggerAbsorbReaction();
                break;
              }
            }
          }
        } else {
          const overlap = combinedRadius - dist;
          if (dist > 0.0001) {
            const normalX = dx / dist;
            const normalZ = dz / dist;

            // Elastic separation push-out
            ballPos.x += normalX * (overlap + 0.015);
            ballPos.z += normalZ * (overlap + 0.015);

            const vel = ball.getVelocity();
            const dot = vel.x * normalX + vel.z * normalZ;

            if (dot < 0) {
              // Elastic bounce restitution
              vel.x -= (1 + 0.35) * dot * normalX;
              vel.z -= (1 + 0.35) * dot * normalZ;

              // Heavy bounce ASMR sound
              asmrAudio.playBounceHeavy(Math.min(1.0, Math.abs(dot) / 5.0));

              // Inform player why the ball bounced
              const now = performance.now();
              if (now - this.lastBlockedAlertTime > 1200) {
                this.lastBlockedAlertTime = now;
                const reqCm = (item.radius / 0.95) * 200;
                const curCm = ballRadius * 200;
                this.onObjectBlocked?.(item.name, reqCm, curCm);
              }
            }
          }
        }
      }
    }

    // 11. Update proximity indicator rings (green for absorbable, amber for too big)
    this.updateProximityIndicators(ball);
  }

  private initIndicatorPool(): void {
    this.indicatorGroup = new THREE.Group();
    this.scene.add(this.indicatorGroup);

    const ringGeom = new THREE.RingGeometry(0.82, 1.0, 24);
    ringGeom.rotateX(-Math.PI / 2);

    for (let i = 0; i < this.MAX_INDICATORS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f5d4,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeom, mat);
      ring.position.y = 0.04;
      ring.visible = false;
      this.indicatorPool.push(ring);
      this.indicatorGroup.add(ring);
    }
  }

  public updateProximityIndicators(ball: RollingBall): void {
    const ballPos = ball.getPosition();
    const maxDistSq = 16.0 * 16.0;

    let ringIdx = 0;
    const time = Date.now() * 0.005;

    for (let i = 0; i < this.items.length; i++) {
      if (ringIdx >= this.MAX_INDICATORS) break;
      const item = this.items[i];
      if (item.isAbsorbed()) continue;

      const itemPos = item.getWorldPosition();
      const dx = ballPos.x - itemPos.x;
      const dz = ballPos.z - itemPos.z;
      const dSq = dx * dx + dz * dz;

      if (dSq <= maxDistSq) {
        const ring = this.indicatorPool[ringIdx];
        const canEat = ball.canAbsorb(item);
        const ringMat = ring.material as THREE.MeshBasicMaterial;

        ring.visible = true;
        ring.position.set(itemPos.x, 0.04, itemPos.z);
        const scale = item.radius * 1.35;
        ring.scale.set(scale, 1, scale);

        if (canEat) {
          // Emerald Green / Cyan pulsing aura (Absorbable)
          ringMat.color.setHex(0x00f5d4);
          ringMat.opacity = 0.65 + 0.25 * Math.sin(time + ringIdx);
        } else {
          // Amber / Orange warning ring (Too big / bounce)
          ringMat.color.setHex(0xff7b00);
          ringMat.opacity = 0.5 + 0.2 * Math.sin(time * 0.8 + ringIdx);
        }

        ringIdx++;
      }
    }

    // Hide remaining unused rings
    for (let i = ringIdx; i < this.MAX_INDICATORS; i++) {
      this.indicatorPool[i].visible = false;
    }
  }

  public resolveStaticObstacleCollisions(ball: RollingBall): boolean {
    const ballPos = ball.getPosition();
    const ballRadius = ball.getRadius();
    const vel = ball.getVelocity();
    let collided = false;

    for (let i = 0; i < this.staticObstacles.length; i++) {
      const obs = this.staticObstacles[i];

      if (obs.type === 'box') {
        if (ballPos.y > obs.h + ballRadius) continue;

        const clampedX = Math.max(obs.x - obs.hw, Math.min(obs.x + obs.hw, ballPos.x));
        const clampedZ = Math.max(obs.z - obs.hd, Math.min(obs.z + obs.hd, ballPos.z));

        const dx = ballPos.x - clampedX;
        const dz = ballPos.z - clampedZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < ballRadius * ballRadius) {
          collided = true;
          const dist = Math.sqrt(distSq);
          let normalX = 0;
          let normalZ = 1;
          let pen = ballRadius - dist;

          if (dist > 0.0001) {
            normalX = dx / dist;
            normalZ = dz / dist;
          } else {
            // Ball center inside box: find shallowest axis to eject cleanly
            const penLeft = (ballPos.x - (obs.x - obs.hw));
            const penRight = ((obs.x + obs.hw) - ballPos.x);
            const penBottom = (ballPos.z - (obs.z - obs.hd));
            const penTop = ((obs.z + obs.hd) - ballPos.z);
            const minPen = Math.min(penLeft, penRight, penBottom, penTop);

            if (minPen === penLeft) {
              normalX = -1; normalZ = 0; pen = penLeft + ballRadius;
            } else if (minPen === penRight) {
              normalX = 1; normalZ = 0; pen = penRight + ballRadius;
            } else if (minPen === penBottom) {
              normalX = 0; normalZ = -1; pen = penBottom + ballRadius;
            } else {
              normalX = 0; normalZ = 1; pen = penTop + ballRadius;
            }
          }

          ballPos.x += normalX * pen;
          ballPos.z += normalZ * pen;

          const dot = vel.x * normalX + vel.z * normalZ;
          if (dot < 0) {
            vel.x -= (1 + 0.35) * dot * normalX;
            vel.z -= (1 + 0.35) * dot * normalZ;
            asmrAudio.playWallBump(Math.min(1.0, Math.abs(dot) / 5.0));
          }
        }
      } else if (obs.type === 'cylinder') {
        if (ballPos.y > obs.height + ballRadius) continue;

        const dx = ballPos.x - obs.x;
        const dz = ballPos.z - obs.z;
        const dist = Math.hypot(dx, dz);
        const combRadius = obs.radius + ballRadius;

        if (dist < combRadius) {
          collided = true;
          const normalX = dist > 0.0001 ? dx / dist : 1;
          const normalZ = dist > 0.0001 ? dz / dist : 0;
          const pen = combRadius - dist;

          ballPos.x += normalX * pen;
          ballPos.z += normalZ * pen;

          const dot = vel.x * normalX + vel.z * normalZ;
          if (dot < 0) {
            vel.x -= (1 + 0.35) * dot * normalX;
            vel.z -= (1 + 0.35) * dot * normalZ;
            asmrAudio.playWallBump(Math.min(1.0, Math.abs(dot) / 5.0));
          }
        }
      }
    }
    return collided;
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
    this.loadStage(this.currentStage, itemCount);
  }
}
