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

  // Physics constants - balanced, comfortable Katamari rolling feel (1/3 scale)
  private maxSpeed: number = 11.5;
  private accelRate: number = 24.0;
  private decelRate: number = 15.0;
  private brakeRate: number = 36.0;

  // Jump & vertical physics
  private gravity: number = -22.0;
  private grounded: boolean = true;
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;

  // Stored analog input vector (direction + throttle magnitude)
  private inputVector: THREE.Vector2 = new THREE.Vector2(0, 0);

  // Boost mechanic
  private boostTimer: number = 0;

  // Hazard damage & invulnerability blink
  private invulnerableTimer: number = 0;

  // Visual & Material properties
  private ballMaterial: THREE.MeshStandardMaterial;

  constructor(config: RollingBallConfig = {}) {
    this.radius = config.initialRadius ?? 0.125; // 25cm starting diameter
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
    const scaleFactor = 1 + Math.log10(this.radius / 0.125 + 1) * 0.30;
    const base = this.maxSpeed * scaleFactor;
    return this.isBoosting() ? base * 1.45 : base;
  }

  public triggerBoost(duration: number = 2.0): void {
    this.boostTimer = duration;
    asmrAudio.playPop();
  }

  public isGrounded(): boolean {
    return this.grounded;
  }

  public jump(strength: number = 8.8): boolean {
    if (this.grounded || this.coyoteTimer > 0) {
      return this.executeJump(strength);
    } else {
      // Buffer the jump request so it triggers immediately upon landing
      this.jumpBufferTimer = 0.22;
      return false;
    }
  }

  private executeJump(strength: number = 8.8): boolean {
    this.velocity.y = strength;
    this.grounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    asmrAudio.playSquish(0.85);
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

    // Calculate new target radius (clamped to min 0.12m)
    const minRadius = Math.min(this.radius, 0.12);
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
   * The ball must be larger than or equal to the item
   */
  public canAbsorb(item: AbsorbableItem): boolean {
    if (item.isAbsorbed()) return false;
    // Ball can absorb items slightly smaller or equal to its size
    return item.radius <= this.radius * 0.95;
  }

  /**
   * Attempt to absorb an item: Katamari surface attachment & radial orientation
   */
  public tryAbsorb(item: AbsorbableItem): boolean {
    if (!this.canAbsorb(item)) return false;

    item.setAbsorbed(true);
    this.absorbedItems.push(item);
    this.totalMass += item.mass;

    const itemMesh = item.mesh;
    const itemWorldPos = item.getWorldPosition();
    const ballPos = this.position;

    // Contact normal from ball center to item
    let normal = itemWorldPos.clone().sub(ballPos);
    if (normal.lengthSq() < 0.0001) {
      normal = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5 + 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();
    } else {
      normal.normalize();
    }

    item.surfaceNormal = normal.clone();
    item.surfaceOffset = item.radius * 0.25;

    // Detach from previous scene and add to absorbedGroup
    if (itemMesh.parent) {
      itemMesh.parent.remove(itemMesh);
    }
    this.absorbedGroup.add(itemMesh);

    // Position flush on ball surface
    itemMesh.position.copy(normal).multiplyScalar(this.radius * 0.94 + item.surfaceOffset);

    // Orient mesh radially outward from the sphere center
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(defaultUp, normal);
    const twistQuat = new THREE.Quaternion().setFromAxisAngle(normal, (Math.random() - 0.5) * 0.8);
    itemMesh.quaternion.copy(twistQuat.multiply(alignQuat));

    // Calculate Katamari growth: Sphere volume V = (4/3) * pi * R^3
    const currentVol = Math.pow(this.targetRadius, 3);
    const itemVol = Math.pow(item.radius, 3) * 0.75;
    this.targetRadius = Math.cbrt(currentVol + itemVol);

    // Trigger ASMR chime & squish sound
    asmrAudio.playAbsorb(item.tier);

    return true;
  }

  /**
   * Apply directional input (normalized or analog 2D vector in camera space)
   */
  public applyInput(inputDir: THREE.Vector2, _dt?: number): void {
    this.inputVector.copy(inputDir);
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

      // Keep all attached items positioned on the expanding outer surface
      for (let i = 0; i < this.absorbedItems.length; i++) {
        const item = this.absorbedItems[i];
        if (item.surfaceNormal) {
          const offset = item.surfaceOffset ?? item.radius * 0.25;
          item.mesh.position.copy(item.surfaceNormal).multiplyScalar(this.radius * 0.94 + offset);
        }
      }
    }

    // 2. Horizontal Acceleration, Deceleration & Analog Steering
    const throttle = Math.min(1.0, this.inputVector.length());
    const curMaxSpeed = this.getMaxSpeed();
    const isGrounded = this.grounded;

    if (throttle > 0.04) {
      const targetSpeed = curMaxSpeed * throttle;
      const targetDir = this.inputVector.clone().normalize();
      const targetVelX = targetDir.x * targetSpeed;
      const targetVelZ = targetDir.y * targetSpeed;

      const diffX = targetVelX - this.velocity.x;
      const diffZ = targetVelZ - this.velocity.z;
      const diffDist = Math.hypot(diffX, diffZ);

      // Check if steering opposite to current movement (snappy braking)
      const dot = this.velocity.x * targetVelX + this.velocity.z * targetVelZ;
      let rate = dot < -0.1 ? this.brakeRate : this.accelRate;

      // Heavy balls carry more inertia/momentum
      const massInertia = Math.pow(5.0 / Math.max(5.0, this.totalMass), 0.15);
      rate *= massInertia;

      if (!isGrounded) {
        rate *= 0.55; // Air steering retains forward momentum while allowing adjustments
      }

      const maxStep = rate * dt;
      if (diffDist <= maxStep) {
        this.velocity.x = targetVelX;
        this.velocity.z = targetVelZ;
      } else {
        this.velocity.x += (diffX / diffDist) * maxStep;
        this.velocity.z += (diffZ / diffDist) * maxStep;
      }
    } else {
      // Natural rolling coasting deceleration when no input is pressed
      const currentHorizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (currentHorizSpeed > 0.001) {
        const decelStep = (isGrounded ? this.decelRate : this.decelRate * 0.25) * dt;
        if (currentHorizSpeed <= decelStep || currentHorizSpeed < 0.08) {
          this.velocity.x = 0;
          this.velocity.z = 0;
        } else {
          const newSpeed = currentHorizSpeed - decelStep;
          const scale = newSpeed / currentHorizSpeed;
          this.velocity.x *= scale;
          this.velocity.z *= scale;
        }
      }
    }

    // Clamp absolute top speed (for boost pads, collisions, etc.)
    const curHorizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const absCap = curMaxSpeed * 1.5;
    if (curHorizSpeed > absCap) {
      const scale = absCap / curHorizSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    // 3. Vertical Physics (Gravity & Jumping) with bumpy Katamari surface physics
    this.velocity.y += this.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);

    // Subtle Katamari bumpy wobble on ground contact when items are attached
    const bumpyOffset =
      this.absorbedItems.length > 0
        ? Math.abs(Math.sin((this.position.x + this.position.z) * 1.5)) * Math.min(0.12, this.radius * 0.05)
        : 0;
    const effectiveGroundRadius = this.radius + bumpyOffset;

    // Ground collision check with generous grounded tolerance
    const isAtGroundLevel = this.position.y <= effectiveGroundRadius + 0.12 && this.velocity.y <= 0.5;
    if (isAtGroundLevel) {
      if (this.position.y < effectiveGroundRadius) {
        this.position.y = effectiveGroundRadius;
      }
      if (!this.grounded && this.velocity.y < -3.0) {
        asmrAudio.playSquish(0.5); // Landing squish!
      }
      this.grounded = true;
      this.coyoteTimer = 0.22; // 220ms coyote time
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
    } else {
      this.grounded = false;
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // Process buffered jump if landed within buffer window
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      if (this.grounded || this.coyoteTimer > 0) {
        this.executeJump();
      }
    }

    this.group.position.copy(this.position);

    // 4. Calculate realistic rolling rotation: axis = (UP x horizontalVelocity).normalized
    const finalHorizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (finalHorizSpeed > 0.01) {
      const rollAxis = new THREE.Vector3(0, 1, 0).cross(new THREE.Vector3(this.velocity.x, 0, this.velocity.z)).normalize();
      const rollAngle = (finalHorizSpeed * dt) / this.radius;

      const rotQuat = new THREE.Quaternion().setFromAxisAngle(rollAxis, rollAngle);
      this.visualBall.quaternion.premultiply(rotQuat);
      this.absorbedGroup.quaternion.premultiply(rotQuat);
    }

    // 5. Update procedural rolling rumble ASMR sound
    asmrAudio.updateRollRumble(this.grounded ? finalHorizSpeed : 0, 'pavement');
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
  public reset(initialRadius: number = 0.125): void {
    this.radius = initialRadius;
    this.targetRadius = initialRadius;
    this.totalMass = 5.0;
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.inputVector.set(0, 0);
    this.invulnerableTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
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
