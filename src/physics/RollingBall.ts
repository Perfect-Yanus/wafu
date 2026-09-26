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

  // Physics constants
  private maxSpeed: number = 18.0;
  private moveForce: number = 45.0;
  private drag: number = 2.8;

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
      // Dynamic force scales slightly with mass so player doesn't feel bogged down
      const massScale = Math.pow(this.totalMass / 5.0, 0.4);
      const accelForce = this.moveForce * massScale;

      this.acceleration.x += inputDir.x * accelForce * dt;
      this.acceleration.z += inputDir.y * accelForce * dt;
    }
  }

  /**
   * Update physics step: integration, drag, rolling rotation, dynamic scaling
   */
  public update(dt: number): void {
    // 1. Smoothly interpolate radius to targetRadius
    if (Math.abs(this.targetRadius - this.radius) > 0.001) {
      const growthLerp = Math.min(1.0, dt * 5.0);
      this.radius += (this.targetRadius - this.radius) * growthLerp;

      // Rescale core visual sphere
      const scaleFactor = this.radius / (this.visualBall.geometry as THREE.SphereGeometry).parameters.radius;
      this.visualBall.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    // 2. Integrate velocity & acceleration
    this.velocity.addScaledVector(this.acceleration, dt);
    this.acceleration.set(0, 0, 0);

    // Apply linear drag
    const speed = this.velocity.length();
    if (speed > 0.0001) {
      const dragFactor = Math.max(0, 1 - this.drag * dt);
      this.velocity.multiplyScalar(dragFactor);

      // Clamp max speed (scales slightly as ball grows larger)
      const currentMaxSpeed = this.maxSpeed * (1 + Math.log10(this.radius / 0.6 + 1) * 0.5);
      if (this.velocity.length() > currentMaxSpeed) {
        this.velocity.setLength(currentMaxSpeed);
      }
    }

    // 3. Update position
    this.position.addScaledVector(this.velocity, dt);

    // Keep ball grounded on floor (Y = radius)
    this.position.y = this.radius;
    this.group.position.copy(this.position);

    // 4. Calculate realistic rolling rotation: axis = (UP x velocity).normalized
    const currentSpeed = this.velocity.length();
    if (currentSpeed > 0.01) {
      const rollAxis = new THREE.Vector3(0, 1, 0).cross(this.velocity).normalize();
      const rollAngle = (currentSpeed * dt) / this.radius;

      // Rotate group around ball center
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(rollAxis, rollAngle);
      this.visualBall.quaternion.premultiply(rotQuat);
      this.absorbedGroup.quaternion.premultiply(rotQuat);
    }

    // 5. Update procedural rolling rumble ASMR sound
    asmrAudio.updateRollRumble(currentSpeed, 'pavement');
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
