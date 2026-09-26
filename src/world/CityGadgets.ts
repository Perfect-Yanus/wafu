import * as THREE from 'three';
import { RollingBall } from '../physics/RollingBall';
import { AbsorbableItem } from '../physics/AbsorbableItem';
import { asmrAudio } from '../audio/AsmrAudioEngine';

/**
 * 1. BOOST PAD (고속 네온 가속 패드)
 */
export class BoostPad {
  public readonly position: THREE.Vector3;
  public readonly forward: THREE.Vector3;
  public readonly mesh: THREE.Group;
  private cooldown: number = 0;

  constructor(position: THREE.Vector3, forward: THREE.Vector3 = new THREE.Vector3(0, 0, 1)) {
    this.position = position.clone();
    this.forward = forward.clone().normalize();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Chevron base
    const baseGeo = new THREE.PlaneGeometry(3.5, 4.5);
    const baseMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.05;

    // Glowing arrow strips
    const arrowGeo = new THREE.ConeGeometry(1.0, 1.8, 3);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = -Math.PI / 2;
    arrow.rotation.z = Math.atan2(this.forward.x, this.forward.z);
    arrow.position.y = 0.08;

    this.mesh.add(base, arrow);
  }

  public checkInteraction(ball: RollingBall): boolean {
    if (this.cooldown > 0) return false;

    const ballPos = ball.getPosition();
    const dx = ballPos.x - this.position.x;
    const dz = ballPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < (ball.getRadius() + 1.8) * (ball.getRadius() + 1.8)) {
      this.cooldown = 0.8;
      ball.triggerBoost(2.5);

      // Launch forward with punchy boost speed
      const vel = ball.getVelocity();
      vel.x = this.forward.x * 18.0;
      vel.z = this.forward.z * 18.0;

      asmrAudio.playPop();
      return true;
    }
    return false;
  }

  public update(dt: number): void {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
    }
  }
}

/**
 * 2. TRAMPOLINE (슈퍼 트램펄린 점프대)
 */
export class Trampoline {
  public readonly position: THREE.Vector3;
  public readonly radius: number;
  public readonly mesh: THREE.Group;
  private cooldown: number = 0;

  constructor(position: THREE.Vector3, radius: number = 2.0) {
    this.position = position.clone();
    this.radius = radius;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.15, 12, 32), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.2;

    // Bouncy canvas center
    const matCanvas = new THREE.MeshStandardMaterial({ color: 0x3a86ff, roughness: 0.3 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.1, 24), matCanvas);
    pad.position.y = 0.15;

    this.mesh.add(rim, pad);
  }

  public checkInteraction(ball: RollingBall): boolean {
    if (this.cooldown > 0) return false;

    const ballPos = ball.getPosition();
    const dx = ballPos.x - this.position.x;
    const dz = ballPos.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < this.radius + ball.getRadius() * 0.5) {
      this.cooldown = 0.5;
      ball.jump(14.5); // Arcade trampoline launch!
      asmrAudio.playSquish(1.0);
      return true;
    }
    return false;
  }

  public update(dt: number): void {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
    }
  }
}

/**
 * 3. DESTRUCTIBLE WALL (부술 수 있는 나무 울타리 & 유리벽)
 */
export class DestructibleWall {
  public readonly position: THREE.Vector3;
  public readonly width: number;
  public readonly height: number;
  public readonly mesh: THREE.Group;
  private scene: THREE.Scene;
  private destroyed: boolean = false;
  private shards: { mesh: THREE.Mesh; vel: THREE.Vector3 }[] = [];

  constructor(scene: THREE.Scene, position: THREE.Vector3, width: number = 5.0, height: number = 2.5) {
    this.scene = scene;
    this.position = position.clone();
    this.width = width;
    this.height = height;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Build brick/wood planks
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xa06535, roughness: 0.8 });
    const cols = 5;
    const plankWidth = width / cols;

    for (let i = 0; i < cols; i++) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(plankWidth * 0.92, height, 0.25),
        woodMat
      );
      plank.position.set(-width / 2 + (i + 0.5) * plankWidth, height / 2, 0);
      plank.castShadow = true;
      this.mesh.add(plank);
    }

    this.scene.add(this.mesh);
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }

  public checkCollision(ball: RollingBall): boolean {
    if (this.destroyed) return false;

    const ballPos = ball.getPosition();
    const ballRadius = ball.getRadius();

    const dx = ballPos.x - this.position.x;
    const dz = ballPos.z - this.position.z;

    if (Math.abs(dz) < ballRadius + 0.5 && Math.abs(dx) < this.width / 2 + ballRadius) {
      const speed = ball.getVelocity().length();

      // Shatter condition: speed >= 13 or radius >= 1.1
      if (speed >= 13.0 || ballRadius >= 1.1) {
        this.shatter(ball.getVelocity());
        return true;
      } else {
        // Push back
        ballPos.z = this.position.z + (dz > 0 ? (ballRadius + 0.6) : -(ballRadius + 0.6));
        ball.getVelocity().z *= -0.3;
      }
    }
    return false;
  }

  private shatter(impactVel: THREE.Vector3): void {
    this.destroyed = true;
    asmrAudio.playCrack();
    asmrAudio.playCrunch(1.0);

    // Turn planks into flying physics shards
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0] as THREE.Mesh;
      this.mesh.remove(child);
      this.scene.add(child);

      const shardVel = new THREE.Vector3(
        (Math.random() - 0.5) * 8 + impactVel.x * 0.3,
        Math.random() * 8 + 4,
        (Math.random() - 0.5) * 8 + impactVel.z * 0.3
      );
      this.shards.push({ mesh: child, vel: shardVel });
    }
  }

  public update(dt: number): void {
    if (!this.destroyed) return;

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.vel.y -= 25 * dt; // Gravity
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += dt * 5;
      s.mesh.rotation.y += dt * 3;

      if (s.mesh.position.y < 0.1) {
        s.mesh.position.y = 0.1;
        s.vel.set(0, 0, 0);
      }
    }
  }
}

/**
 * 4. SUPER MAGNET GADGET (주변 물체를 끌어당기는 초자석)
 */
export class SuperMagnetGadget {
  public readonly position: THREE.Vector3;
  public readonly mesh: THREE.Group;
  private duration: number = 0;
  private active: boolean = false;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Golden magnet mesh
    const magnetMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
    });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 12, 24, Math.PI), magnetMat);
    torus.rotation.z = Math.PI;
    torus.position.y = 0.6;
    this.mesh.add(torus);
  }

  public isActive(): boolean {
    return this.active;
  }

  public activate(_ball: RollingBall, duration: number = 10.0): void {
    this.active = true;
    this.duration = duration;
    asmrAudio.playAbsorb(5);
  }

  public update(dt: number, ball: RollingBall, items: AbsorbableItem[]): void {
    if (!this.active) return;

    this.duration -= dt;
    if (this.duration <= 0) {
      this.active = false;
      return;
    }

    const ballPos = ball.getPosition();
    const pullRadius = 26.0;

    for (const item of items) {
      if (item.isAbsorbed()) continue;
      const itemPos = item.getWorldPosition();
      const dist = ballPos.distanceTo(itemPos);

      if (dist < pullRadius && ball.canAbsorb(item)) {
        // Fly directly towards the ball
        item.mesh.position.lerp(ballPos, dt * 6.5);
      }
    }
  }
}
