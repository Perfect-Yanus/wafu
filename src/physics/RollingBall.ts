import * as THREE from 'three';
import { AbsorbableItem } from './AbsorbableItem';
import { asmrAudio } from '../audio/AsmrAudioEngine';

export interface RollingBallConfig {
  initialRadius?: number;
  initialPosition?: THREE.Vector3;
  baseMass?: number;
  color?: number | string;
}

export class RollingBall {
  public readonly group: THREE.Group;
  public readonly visualBall: THREE.Mesh;
  public readonly absorbedGroup: THREE.Group;

  private position: THREE.Vector3;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private acceleration: THREE.Vector3 = new THREE.Vector3();

  private radius: number;
  private targetRadius: number;
  private totalMass: number;
  private absorbedItems: AbsorbableItem[] = [];

  // Physics constants - ~10x ultra-high speed and arcade Katamari responsiveness
  private maxSpeed: number = 180.0;
  private moveForce: number = 950.0;
  private drag: number = 1.4;

  // Jump & vertical physics
  private gravity: number = -36.0;
  private grounded: boolean = true;

  // Boost mechanic
  private boostTimer: number = 0;

  // Hazard damage & invulnerability blink
  private invulnerableTimer: number = 0;

  // Visual & Material properties
  private ballMaterial: THREE.MeshStandardMaterial;

  constructor(config: RollingBallConfig = {}) {
    this.radius = config.initialRadius ?? 0.6;
    this.targetRadius = this.radius;
    this.totalMass = config.baseMass ?? 5.0;
    this.position = config.initialPosition?.clone() ?? new THREE.Vector3(0, this.radius, 0);

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    // Ball visual geometry & material
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    this.ballMaterial = new THREE.MeshStandardMaterial({
      color: config.color ?? 0xff6b8b, // vibrant squishy pastel pink
      roughness: 0.35,
      metalness: 0.1,
    });
    this.visualBall = new THREE.Mesh(geometry, this.ballMaterial);
    this.visualBall.castShadow = true;
    this.visualBall.receiveShadow = true;

    this.absorbedGroup = new THREE.Group();

    this.group.add(this.visualBall);
    this.group.add(this.absorbedGroup);
  }

  public getRadius(): number {
    return this.radius;
  }

  public getTargetRadius(): number {
    return this.targetRadius;
  }

  public getPosition(): THREE.Vector3 {
    return this.position;
  }

  public getVelocity(): THREE.Vector3 {
    return this.velocity;
  }

  public getTotalMass(): number {
    return this.totalMass;
  }

  public getAbsorbedCount(): number {
    return this.absorbedItems.length;
  }

  public getAbsorbedItems(): readonly AbsorbableItem[] {
    return this.absorbedItems;
  }

  public isBoosting(): boolean {
    return this.boostTimer > 0;
  }

  public getMaxSpeed(): number {
    const scaleFactor = 1 + Math.log10(this.radius / 0.6 + 1) * 0.5;
    const base = this.maxSpeed * scaleFactor;
    return this.isBoosting() ? base * 1.85 : base;
  }

  public triggerBoost(duration: number = 2.0): void {
    this.boostTimer = duration;
    asmrAudio.playPop();
  }

  public isGrounded(): boolean {
    return this.grounded;
  }

  public jump(strength: number = 18.0): boolean {
    if (!this.grounded) return false;
    this.velocity.y = strength;
    this.grounded = false;
    asmrAudio.playSquish(0.8);
    return true;
  }

  public isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  public getInvulnerableTimer(): number {
    return this.invulnerableTimer;
  }

  /**
   * Shrink the ball when hitting sharp hazards (cactus, spikes, sawblades).
   * Reduces ball radius by fraction (min 0.5m), sheds some absorbed items, and gives brief invulnerability.
   */
  public shrink(fraction: number = 0.2): { lostItems: AbsorbableItem[]; newRadius: number } {
    if (this.invulnerableTimer > 0) {
      return { lostItems: [], newRadius: this.radius };
    }

    this.invulnerableTimer = 1.2; // 1.2s invulnerability window

    // Play puncture & deflation sound
    asmrAudio.playPuncture();

    // Calculate new target radius (clamped to min 0.5m)
    const minRadius = 0.5;
    this.targetRadius = Math.max(minRadius, this.targetRadius * (1 - fraction));

    // Bounce back velocity slightly
    this.velocity.x *= -0.5;
    this.velocity.z *= -0.5;
    this.velocity.y = 8.0; // little hop

    // Shed 20-30% of absorbed items back into the world
    const lostItems: AbsorbableItem[] = [];
    const dropCount = Math.min(this.absorbedItems.length, Math.max(1, Math.ceil(this.absorbedItems.length * 0.25)));

    for (let i = 0; i < dropCount; i++) {
      const item = this.absorbedItems.pop();
      if (item) {
        this.absorbedGroup.remove(item.mesh);
        this.totalMass = Math.max(5.0, this.totalMass - item.mass);
        lostItems.push(item);
      }
    }

    return { lostItems, newRadius: this.targetRadius };
  }

  public getMaterial(): THREE.MeshStandardMaterial {
    return this.ballMaterial;
  }

  public setMaterial(material: THREE.MeshStandardMaterial): void {
    this.ballMaterial = material;
    this.visualBall.material = material;
  }

  /**
   * Check if an item can be absorbed according to Katamari threshold
   * The ball must be larger than the item by a safe margin
   */
  public canAbsorb(item: AbsorbableItem): boolean {
    if (item.isAbsorbed()) return false;
    // Item radius must be smaller than ball radius * 0.82
    return item.radius <= this.radius * 0.82;
  }

  /**
   * Attempt to absorb an item
   */
  public tryAbsorb(item: AbsorbableItem): boolean {
    if (!this.canAbsorb(item)) return false;

    item.setAbsorbed(true);
    this.absorbedItems.push(item);
    this.totalMass += item.mass;

    // Attach item mesh to ball's local absorbed group preserving relative transform
    const itemMesh = item.mesh;
    this.group.updateMatrixWorld(true);
    itemMesh.updateMatrixWorld(true);

    // Reparent using Three.js attach helper
    this.absorbedGroup.attach(itemMesh);

    // Calculate growth: Sphere volume V = (4/3) * pi * R^3
    // New R = cbrt(R^3 + factor * r_item^3)
    const currentVol = Math.pow(this.targetRadius, 3);
    const itemVol = Math.pow(item.radius, 3) * 0.75; // Packing factor
    this.targetRadius = Math.cbrt(currentVol + itemVol);

    // Trigger ASMR chime & squish sound
    asmrAudio.playAbsorb(item.tier);

    return true;
  }

  /**
   * Apply directional input (normalized 2D vector in camera space)
   */
  public applyInput(inputDir: THREE.Vector2, dt: number): void {
    if (inputDir.lengthSq() > 0.0001) {
      const massScale = Math.pow(this.totalMass / 5.0, 0.3);
      let accelForce = this.moveForce * massScale;

      if (this.isBoosting()) {
        accelForce *= 2.2;
      }

      // Snappy turn reversal: if steering opposite to current movement, add braking boost
      const horizDot = this.velocity.x * inputDir.x + this.velocity.z * inputDir.y;
      if (horizDot < -1.0) {
        accelForce *= 1.8;
      }

      this.acceleration.x += inputDir.x * accelForce * dt;
      this.acceleration.z += inputDir.y * accelForce * dt;
    }
  }

  /**
   * Update physics step: integration, drag, gravity, rolling rotation, dynamic scaling
   */
  public update(dt: number): void {
    // 0. Update boost timer & invulnerability timer
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
    }
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
      // Fast blinking effect during damage invulnerability
      this.visualBall.visible = Math.floor(this.invulnerableTimer * 14) % 2 === 0;
    } else {
      this.visualBall.visible = true;
    }

    // 1. Smoothly interpolate radius to targetRadius
    if (Math.abs(this.targetRadius - this.radius) > 0.001) {
      const growthLerp = Math.min(1.0, dt * 6.0);
      this.radius += (this.targetRadius - this.radius) * growthLerp;

      // Rescale core visual sphere
      const scaleFactor = this.radius / (this.visualBall.geometry as THREE.SphereGeometry).parameters.radius;
      this.visualBall.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    // 2. Integrate horizontal velocity & acceleration
    this.velocity.x += this.acceleration.x * dt;
    this.velocity.z += this.acceleration.z * dt;
    this.acceleration.set(0, 0, 0);

    // Apply linear drag to horizontal movement
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizSpeed > 0.0001) {
      const dragFactor = Math.max(0, 1 - (this.grounded ? this.drag : this.drag * 0.4) * dt);
      this.velocity.x *= dragFactor;
      this.velocity.z *= dragFactor;

      // Clamp max horizontal speed
      const curMaxSpeed = this.getMaxSpeed();
      const newHorizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (newHorizSpeed > curMaxSpeed) {
        const ratio = curMaxSpeed / newHorizSpeed;
        this.velocity.x *= ratio;
        this.velocity.z *= ratio;
      }
    }

    // 3. Vertical Physics (Gravity & Jumping)
    this.velocity.y += this.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);

    // Ground collision check
    if (this.position.y <= this.radius) {
      this.position.y = this.radius;
      if (!this.grounded && this.velocity.y < -3.0) {
        asmrAudio.playSquish(0.5); // Landing squish!
      }
      this.grounded = true;
      this.velocity.y = 0;
    } else {
      this.grounded = false;
    }

    this.group.position.copy(this.position);

    // 4. Calculate realistic rolling rotation: axis = (UP x horizontalVelocity).normalized
    if (horizSpeed > 0.01) {
      const rollAxis = new THREE.Vector3(0, 1, 0).cross(new THREE.Vector3(this.velocity.x, 0, this.velocity.z)).normalize();
      const rollAngle = (horizSpeed * dt) / this.radius;

      const rotQuat = new THREE.Quaternion().setFromAxisAngle(rollAxis, rollAngle);
      this.visualBall.quaternion.premultiply(rotQuat);
      this.absorbedGroup.quaternion.premultiply(rotQuat);
    }

    // 5. Update procedural rolling rumble ASMR sound
    asmrAudio.updateRollRumble(this.grounded ? horizSpeed : 0, 'pavement');
  }

  /**
   * Set custom ball color and update visual material
   */
  public setColor(color: number | string): void {
    this.ballMaterial.color.set(color);
  }

  /**
   * Reset ball to initial state
   */
  public reset(initialRadius: number = 0.6): void {
    this.radius = initialRadius;
    this.targetRadius = initialRadius;
    this.totalMass = 5.0;
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.invulnerableTimer = 0;
    this.visualBall.visible = true;

    // Remove all absorbed items from group
    while (this.absorbedGroup.children.length > 0) {
      this.absorbedGroup.remove(this.absorbedGroup.children[0]);
    }
    this.absorbedItems = [];

    const scaleFactor = this.radius / (this.visualBall.geometry as THREE.SphereGeometry).parameters.radius;
    this.visualBall.scale.set(scaleFactor, scaleFactor, scaleFactor);
    this.visualBall.quaternion.identity();
    this.absorbedGroup.quaternion.identity();
    this.position.set(0, this.radius, 0);
    this.group.position.copy(this.position);
  }
}
