import * as THREE from 'three';
import { RollingBall } from '../physics/RollingBall';
import { asmrAudio } from '../audio/AsmrAudioEngine';

export interface Hazard {
  readonly id: string;
  readonly type: 'cactus' | 'spike' | 'sawblade' | 'moving_cactus' | 'monster' | 'patrol_sawblade';
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  readonly radius: number;
  readonly shrinkFraction: number;
  isDead?: boolean;
  update(dt: number, ballPos?: THREE.Vector3, ballRadius?: number): void;
  checkCollision(ball: RollingBall): boolean;
}

/**
 * Helper to create an animated danger beacon (overhead pulsing diamond + exclamation mark)
 * and a ground warning perimeter ring
 */
function createDangerMarker(radius: number, topHeight: number) {
  const group = new THREE.Group();

  // 1. Ground warning ring
  const ringGeom = new THREE.RingGeometry(radius * 0.88, radius * 1.18, 28);
  ringGeom.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff0054,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.y = 0.04;
  group.add(ring);

  // 2. Overhead floating danger marker
  const beaconGroup = new THREE.Group();
  beaconGroup.position.y = topHeight;

  const diamondGeom = new THREE.OctahedronGeometry(0.32);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xff0054,
    emissive: 0xff0054,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const diamond = new THREE.Mesh(diamondGeom, diamondMat);
  beaconGroup.add(diamond);

  // Exclamation mark
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const exclBar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), whiteMat);
  exclBar.position.y = 0.04;
  const exclDot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), whiteMat);
  exclDot.position.y = -0.14;
  beaconGroup.add(exclBar, exclDot);

  group.add(beaconGroup);

  return {
    group,
    update: (time: number) => {
      const pulse = 0.45 + 0.35 * Math.sin(time * 5.0);
      ringMat.opacity = pulse;
      ring.scale.setScalar(1.0 + 0.06 * Math.sin(time * 4.0));

      beaconGroup.position.y = topHeight + Math.sin(time * 3.5) * 0.12;
      beaconGroup.rotation.y = time * 2.2;
    },
  };
}

/**
 * 1. CACTUS HAZARD (선인장)
 * Saguaro style prickly cactus with needle spikes and desert flower
 */
export class CactusHazard implements Hazard {
  public readonly id: string;
  public readonly type = 'cactus' as const;
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly radius: number = 0.85;
  public readonly shrinkFraction: number = 0.16;

  private needleGroup: THREE.Group;
  private dangerMarker: ReturnType<typeof createDangerMarker>;
  private elapsedTime: number = 0;

  constructor(id: string, position: THREE.Vector3) {
    this.id = id;
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    const cactusMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.8,
      metalness: 0.1,
    });

    const spineMat = new THREE.MeshStandardMaterial({
      color: 0xfff3b0,
      roughness: 0.4,
    });

    // Main Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 10), cactusMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.mesh.add(trunk);

    // Left Arm
    const leftArmHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), cactusMat);
    leftArmHoriz.rotation.z = Math.PI / 2;
    leftArmHoriz.position.set(-0.4, 1.2, 0);
    this.mesh.add(leftArmHoriz);

    const leftArmVert = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), cactusMat);
    leftArmVert.position.set(-0.65, 1.5, 0);
    leftArmVert.castShadow = true;
    this.mesh.add(leftArmVert);

    // Right Arm
    const rightArmHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), cactusMat);
    rightArmHoriz.rotation.z = Math.PI / 2;
    rightArmHoriz.position.set(0.4, 0.9, 0);
    this.mesh.add(rightArmHoriz);

    const rightArmVert = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8), cactusMat);
    rightArmVert.position.set(0.65, 1.25, 0);
    rightArmVert.castShadow = true;
    this.mesh.add(rightArmVert);

    // Cactus Needle Spikes
    this.needleGroup = new THREE.Group();
    const needleGeom = new THREE.ConeGeometry(0.04, 0.2, 4);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const h = 0.4 + (i % 5) * 0.35;
      const needle = new THREE.Mesh(needleGeom, spineMat);
      needle.position.set(Math.cos(angle) * 0.38, h, Math.sin(angle) * 0.38);
      needle.rotation.x = Math.PI / 2;
      needle.rotation.y = angle;
      this.needleGroup.add(needle);
    }
    this.mesh.add(this.needleGroup);

    // Desert flower on top
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xff0054,
      emissive: 0x990033,
      emissiveIntensity: 0.2,
    });
    const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18), flowerMat);
    flower.position.set(0, 2.25, 0);
    this.mesh.add(flower);

    // Danger indicator
    this.dangerMarker = createDangerMarker(this.radius, 2.85);
    this.mesh.add(this.dangerMarker.group);
  }

  public update(dt: number): void {
    this.elapsedTime += dt;
    this.dangerMarker.update(this.elapsedTime);
  }

  public checkCollision(ball: RollingBall): boolean {
    if (ball.isInvulnerable()) return false;

    const bPos = ball.getPosition();
    const dx = bPos.x - this.position.x;
    const dz = bPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;

    const hitRadius = this.radius + ball.getRadius();
    if (distSq <= hitRadius * hitRadius) {
      if (bPos.y < 2.6) {
        ball.shrink(this.shrinkFraction);
        return true;
      }
    }
    return false;
  }
}

/**
 * 2. SPIKE TRAP HAZARD (가시 트랩)
 * Steel floor plate studded with protruding sharp metallic spikes
 */
export class SpikeTrapHazard implements Hazard {
  public readonly id: string;
  public readonly type = 'spike' as const;
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly radius: number = 1.15;
  public readonly shrinkFraction: number = 0.22;

  private spikeMat: THREE.MeshStandardMaterial;
  private dangerMarker: ReturnType<typeof createDangerMarker>;
  private elapsedTime: number = 0;

  constructor(id: string, position: THREE.Vector3) {
    this.id = id;
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Metal Base plate
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x212529,
      metalness: 0.8,
      roughness: 0.3,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 2.0), baseMat);
    base.position.y = 0.08;
    base.receiveShadow = true;
    this.mesh.add(base);

    // Hazard Stripes on border
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0x553d00,
    });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 2.1), stripeMat);
    stripe.position.y = 0.04;
    this.mesh.add(stripe);

    // 3x3 Grid of sharp spikes
    this.spikeMat = new THREE.MeshStandardMaterial({
      color: 0xe9ecef,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xff3333,
      emissiveIntensity: 0.15,
    });

    const spikeGeom = new THREE.ConeGeometry(0.16, 0.75, 5);
    for (let x = -0.6; x <= 0.6; x += 0.6) {
      for (let z = -0.6; z <= 0.6; z += 0.6) {
        const spike = new THREE.Mesh(spikeGeom, this.spikeMat);
        spike.position.set(x, 0.45, z);
        spike.castShadow = true;
        this.mesh.add(spike);
      }
    }

    // Danger indicator
    this.dangerMarker = createDangerMarker(this.radius, 1.8);
    this.mesh.add(this.dangerMarker.group);
  }

  public update(dt: number): void {
    this.elapsedTime += dt;
    this.dangerMarker.update(this.elapsedTime);

    // Pulse warning glow
    const pulse = (Math.sin(Date.now() * 0.006) + 1) * 0.2 + 0.1;
    this.spikeMat.emissiveIntensity = pulse;
  }

  public checkCollision(ball: RollingBall): boolean {
    if (ball.isInvulnerable()) return false;

    const bPos = ball.getPosition();
    const dx = bPos.x - this.position.x;
    const dz = bPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;

    const hitRadius = this.radius + ball.getRadius();
    if (distSq <= hitRadius * hitRadius) {
      if (bPos.y < ball.getRadius() + 0.8) {
        ball.shrink(this.shrinkFraction);
        return true;
      }
    }
    return false;
  }
}

/**
 * 3. SAWBLADE HAZARD (회전 톱날)
 * Industrial spinning steel circular saw on a motorized post
 */
export class SawbladeHazard implements Hazard {
  public readonly id: string;
  public readonly type = 'sawblade' as const;
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly radius: number = 1.35;
  public readonly shrinkFraction: number = 0.26;

  private bladeMesh: THREE.Group;
  private dangerMarker: ReturnType<typeof createDangerMarker>;
  private elapsedTime: number = 0;

  constructor(id: string, position: THREE.Vector3) {
    this.id = id;
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Stand / pedestal
    const postMat = new THREE.MeshStandardMaterial({ color: 0x343a40, metalness: 0.6 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 8), postMat);
    post.position.y = 0.6;
    this.mesh.add(post);

    // Blade Group
    this.bladeMesh = new THREE.Group();
    this.bladeMesh.position.y = 1.2;

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xadb5bd,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0xff5400,
      emissiveIntensity: 0.25,
    });

    // Central circular disk
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.06, 20), bladeMat);
    disk.rotation.x = Math.PI / 2;
    this.bladeMesh.add(disk);

    // Saw teeth
    const toothGeom = new THREE.ConeGeometry(0.18, 0.45, 3);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const tooth = new THREE.Mesh(toothGeom, bladeMat);
      tooth.position.set(Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, 0);
      tooth.rotation.z = angle - Math.PI / 2 + 0.3; // angled forward
      this.bladeMesh.add(tooth);
    }

    this.mesh.add(this.bladeMesh);

    // Danger indicator
    this.dangerMarker = createDangerMarker(this.radius, 2.5);
    this.mesh.add(this.dangerMarker.group);
  }

  public update(dt: number): void {
    this.elapsedTime += dt;
    this.dangerMarker.update(this.elapsedTime);

    // Spin rapidly
    this.bladeMesh.rotation.z -= dt * 14.0;
  }

  public checkCollision(ball: RollingBall): boolean {
    if (ball.isInvulnerable()) return false;

    const bPos = ball.getPosition();
    const dx = bPos.x - this.position.x;
    const dz = bPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;

    const hitRadius = this.radius + ball.getRadius();
    if (distSq <= hitRadius * hitRadius) {
      if (bPos.y < 2.4) {
        ball.shrink(this.shrinkFraction);
        return true;
      }
    }
    return false;
  }
}

/**
 * 3b. MOVING CACTUS HAZARD (점프하며 순찰하는 움직이는 선인장)
 * Hops back and forth along a patrol path, rotating and prickling
 */
export class MovingCactusHazard implements Hazard {
  public readonly id: string;
  public readonly type = 'moving_cactus' as const;
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly radius: number = 0.9;
  public readonly shrinkFraction: number = 0.18;

  private startPos: THREE.Vector3;
  private endPos: THREE.Vector3;
  private speed: number = 2.8;
  private progress: number = 0;
  private forward: boolean = true;
  private dangerMarker: ReturnType<typeof createDangerMarker>;
  private elapsedTime: number = 0;

  constructor(id: string, startPos: THREE.Vector3, endPos: THREE.Vector3) {
    this.id = id;
    this.startPos = startPos.clone();
    this.endPos = endPos.clone();
    this.position = startPos.clone();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Build hopping cactus body
    const cactusMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332,
      roughness: 0.8,
    });
    const spineMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.3,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 2.0, 10), cactusMat);
    body.position.y = 1.0;
    body.castShadow = true;
    this.mesh.add(body);

    // Arms
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8), cactusMat);
    leftArm.rotation.z = Math.PI / 2;
    leftArm.position.set(-0.4, 1.2, 0);
    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.6, 8), cactusMat);
    rightArm.rotation.z = Math.PI / 2;
    rightArm.position.set(0.4, 1.0, 0);
    this.mesh.add(leftArm, rightArm);

    // Cute funny angry eyebrows and prickles
    const browMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const browL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.05), browMat);
    browL.position.set(-0.16, 1.45, 0.4);
    browL.rotation.z = 0.25;
    const browR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.05), browMat);
    browR.position.set(0.16, 1.45, 0.4);
    browR.rotation.z = -0.25;
    this.mesh.add(browL, browR);

    // Spines
    const needleGeom = new THREE.ConeGeometry(0.04, 0.2, 4);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const needle = new THREE.Mesh(needleGeom, spineMat);
      needle.position.set(Math.cos(angle) * 0.42, 0.6 + (i % 4) * 0.35, Math.sin(angle) * 0.42);
      needle.rotation.x = Math.PI / 2;
      needle.rotation.y = angle;
      this.mesh.add(needle);
    }

    // Danger indicator
    this.dangerMarker = createDangerMarker(this.radius, 2.7);
    this.mesh.add(this.dangerMarker.group);
  }

  public update(dt: number, _ballPos?: THREE.Vector3, _ballRadius?: number): void {
    this.elapsedTime += dt;
    this.dangerMarker.update(this.elapsedTime);

    // Move along patrol segment
    const totalDist = this.startPos.distanceTo(this.endPos);
    if (totalDist > 0.01) {
      const step = (this.speed * dt) / totalDist;
      if (this.forward) {
        this.progress += step;
        if (this.progress >= 1.0) {
          this.progress = 1.0;
          this.forward = false;
        }
      } else {
        this.progress -= step;
        if (this.progress <= 0.0) {
          this.progress = 0.0;
          this.forward = true;
        }
      }
      this.position.lerpVectors(this.startPos, this.endPos, this.progress);
    }

    // Hopping animation
    const hop = Math.abs(Math.sin(this.elapsedTime * 6.5)) * 0.45;
    this.mesh.position.set(this.position.x, this.position.y + hop, this.position.z);
    this.mesh.rotation.y = this.forward ? 0 : Math.PI;
  }

  public checkCollision(ball: RollingBall): boolean {
    if (ball.isInvulnerable()) return false;
    const bPos = ball.getPosition();
    const dx = bPos.x - this.position.x;
    const dz = bPos.z - this.position.z;
    const hitRadius = this.radius + ball.getRadius();

    if (dx * dx + dz * dz <= hitRadius * hitRadius) {
      if (bPos.y < 2.6) {
        ball.shrink(this.shrinkFraction);
        return true;
      }
    }
    return false;
  }
}

/**
 * 3c. STREET MONSTER HAZARD (거리의 추적 몬스터 / 슬라임 비스트)
 * Aggressive monster with glowing red eyes and stomping feet.
 * - Chases the ball if small (shrinks ball on impact)!
 * - But if ball grows >= 0.85m radius (~170cm), monster panics and CAN BE ABSORBED!
 */
export class StreetMonsterHazard implements Hazard {
  public readonly id: string;
  public readonly type = 'monster' as const;
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly radius: number = 1.4;
  public readonly shrinkFraction: number = 0.28;
  public isDead: boolean = false;

  private homePos: THREE.Vector3;
  private roamAngle: number = 0;
  private dangerMarker: ReturnType<typeof createDangerMarker>;
  private eyeMat: THREE.MeshStandardMaterial;
  private bodyMat: THREE.MeshStandardMaterial;
  private legGroup: THREE.Group;
  private elapsedTime: number = 0;
  private isFleeing: boolean = false;

  constructor(id: string, position: THREE.Vector3) {
    this.id = id;
    this.homePos = position.clone();
    this.position = position.clone();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Menacing Dark Purple/Black Body
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3a0ca3,
      emissive: 0x1b004b,
      roughness: 0.4,
      metalness: 0.3,
    });
    const bodyMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), this.bodyMat);
    bodyMesh.position.y = 1.2;
    bodyMesh.castShadow = true;
    this.mesh.add(bodyMesh);

    // Glowing Eyes
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0054,
      emissive: 0xff0054,
      emissiveIntensity: 1.2,
    });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), this.eyeMat);
    eyeL.position.set(-0.35, 1.45, 0.85);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), this.eyeMat);
    eyeR.position.set(0.35, 1.45, 0.85);
    this.mesh.add(eyeL, eyeR);

    // Horns
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.3 });
    const hornGeom = new THREE.ConeGeometry(0.16, 0.6, 5);
    const hornL = new THREE.Mesh(hornGeom, hornMat);
    hornL.position.set(-0.55, 2.05, 0.1);
    hornL.rotation.z = -0.4;
    const hornR = new THREE.Mesh(hornGeom, hornMat);
    hornR.position.set(0.55, 2.05, 0.1);
    hornR.rotation.z = 0.4;
    this.mesh.add(hornL, hornR);

    // 4 Stomping Legs
    this.legGroup = new THREE.Group();
    const legMat = new THREE.MeshStandardMaterial({ color: 0x240046, roughness: 0.6 });
    for (let x of [-0.5, 0.5]) {
      for (let z of [-0.5, 0.5]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.6, 8), legMat);
        leg.position.set(x, 0.3, z);
        this.legGroup.add(leg);
      }
    }
    this.mesh.add(this.legGroup);

    // Danger indicator
    this.dangerMarker = createDangerMarker(this.radius, 2.9);
    this.mesh.add(this.dangerMarker.group);
  }

  public update(dt: number, ballPos?: THREE.Vector3, ballRadius: number = 0.5): void {
    if (this.isDead) return;
    this.elapsedTime += dt;
    this.dangerMarker.update(this.elapsedTime);

    // Leg stomping animation
    const stomp = Math.sin(this.elapsedTime * 9.0) * 0.15;
    this.mesh.position.y = this.position.y + Math.abs(stomp);

    const canBeAbsorbed = ballRadius >= 0.85; // Ball diameter >= 170cm

    if (ballPos) {
      const dx = ballPos.x - this.position.x;
      const dz = ballPos.z - this.position.z;
      const dist = Math.hypot(dx, dz);

      if (canBeAbsorbed) {
        // Monster is SCARED! Turns aqua blue and flees
        if (!this.isFleeing) {
          this.isFleeing = true;
          this.bodyMat.color.setHex(0x4cc9f0);
          this.bodyMat.emissive.setHex(0x0077b6);
          this.eyeMat.color.setHex(0xffffff);
          this.eyeMat.emissive.setHex(0x00f5d4);
        }
        if (dist < 18.0 && dist > 0.001) {
          // Run away from ball
          this.position.x -= (dx / dist) * 3.2 * dt;
          this.position.z -= (dz / dist) * 3.2 * dt;
        }
      } else {
        // Monster is AGGRESSIVE! Turns angry red-purple and chases ball
        if (this.isFleeing) {
          this.isFleeing = false;
          this.bodyMat.color.setHex(0x3a0ca3);
          this.bodyMat.emissive.setHex(0x1b004b);
          this.eyeMat.color.setHex(0xff0054);
          this.eyeMat.emissive.setHex(0xff0054);
        }
        if (dist < 15.0 && dist > 0.001) {
          // Chase ball!
          this.position.x += (dx / dist) * 3.6 * dt;
          this.position.z += (dz / dist) * 3.6 * dt;
          this.mesh.rotation.y = Math.atan2(dx, dz);
        } else {
          // Roam around home position
          this.roamAngle += dt * 0.7;
          const targetX = this.homePos.x + Math.cos(this.roamAngle) * 6.0;
          const targetZ = this.homePos.z + Math.sin(this.roamAngle) * 6.0;
          this.position.x += (targetX - this.position.x) * dt * 1.5;
          this.position.z += (targetZ - this.position.z) * dt * 1.5;
        }
      }
    }

    this.mesh.position.x = this.position.x;
    this.mesh.position.z = this.position.z;
  }

  public checkCollision(ball: RollingBall): boolean {
    if (this.isDead || ball.isInvulnerable()) return false;
    const bPos = ball.getPosition();
    const bRadius = ball.getRadius();
    const dx = bPos.x - this.position.x;
    const dz = bPos.z - this.position.z;
    const hitRadius = this.radius + bRadius;

    if (dx * dx + dz * dz <= hitRadius * hitRadius) {
      if (bRadius >= 0.85) {
        // Player ball absorbs the monster!
        this.isDead = true;
        this.mesh.visible = false;
        ball.setTargetRadius(bRadius + 0.225);
        asmrAudio.playPop();
        asmrAudio.playAbsorb(5);
        return false;
      } else {
        // Monster bites/stomps ball!
        ball.shrink(this.shrinkFraction);
        asmrAudio.playHammerSmash();
        return true;
      }
    }
    return false;
  }
}

/**
 * 3d. PATROLLING SAWBLADE HAZARD (레일을 따라 왕복 순찰하는 톱날)
 */
export class PatrollingSawbladeHazard implements Hazard {
  public readonly id: string;
  public readonly type = 'patrol_sawblade' as const;
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly radius: number = 1.3;
  public readonly shrinkFraction: number = 0.25;

  private startPos: THREE.Vector3;
  private endPos: THREE.Vector3;
  private speed: number = 4.2;
  private progress: number = 0;
  private forward: boolean = true;
  private bladeMesh: THREE.Mesh;
  private dangerMarker: ReturnType<typeof createDangerMarker>;
  private elapsedTime: number = 0;

  constructor(id: string, startPos: THREE.Vector3, endPos: THREE.Vector3) {
    this.id = id;
    this.startPos = startPos.clone();
    this.endPos = endPos.clone();
    this.position = startPos.clone();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Motorized Track Base
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x212529, metalness: 0.8 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), baseMat);
    base.position.y = 0.12;
    this.mesh.add(base);

    // Spinning Sawblade
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe0e1dd,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xff3838,
      emissiveIntensity: 0.35,
    });
    this.bladeMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 18), bladeMat);
    this.bladeMesh.rotation.x = Math.PI / 2;
    this.bladeMesh.position.y = 0.9;
    this.mesh.add(this.bladeMesh);

    // Danger indicator
    this.dangerMarker = createDangerMarker(this.radius, 2.4);
    this.mesh.add(this.dangerMarker.group);
  }

  public update(dt: number, _ballPos?: THREE.Vector3, _ballRadius?: number): void {
    this.elapsedTime += dt;
    this.dangerMarker.update(this.elapsedTime);

    // Spin blade
    this.bladeMesh.rotation.z += dt * 16.0;

    // Move back and forth
    const totalDist = this.startPos.distanceTo(this.endPos);
    if (totalDist > 0.01) {
      const step = (this.speed * dt) / totalDist;
      if (this.forward) {
        this.progress += step;
        if (this.progress >= 1.0) {
          this.progress = 1.0;
          this.forward = false;
        }
      } else {
        this.progress -= step;
        if (this.progress <= 0.0) {
          this.progress = 0.0;
          this.forward = true;
        }
      }
      this.position.lerpVectors(this.startPos, this.endPos, this.progress);
      this.mesh.position.copy(this.position);
    }
  }

  public checkCollision(ball: RollingBall): boolean {
    if (ball.isInvulnerable()) return false;
    const bPos = ball.getPosition();
    const dx = bPos.x - this.position.x;
    const dz = bPos.z - this.position.z;
    const hitRadius = this.radius + ball.getRadius();

    if (dx * dx + dz * dz <= hitRadius * hitRadius) {
      if (bPos.y < 2.4) {
        ball.shrink(this.shrinkFraction);
        return true;
      }
    }
    return false;
  }
}

/**
 * 4. TIME BONUS PICKUP (보너스 시계 / 砂時計 ⏳)
 * Floating golden hourglass or clock that awards +15 seconds
 */
export class TimeBonusItem {
  public readonly id: string;
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly radius: number = 0.9;
  public readonly bonusSeconds: number = 15;

  private collected: boolean = false;
  private baseY: number;
  private ringMesh: THREE.Mesh;

  constructor(id: string, position: THREE.Vector3) {
    this.id = id;
    this.position = position.clone();
    this.baseY = position.y + 0.8;
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.position.x, this.baseY, this.position.z);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x997a00,
      emissiveIntensity: 0.4,
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x06d6a0,
      emissive: 0x06d6a0,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    // Outer golden clock ring
    this.ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 12, 24), goldMat);
    this.mesh.add(this.ringMesh);

    // Inner glowing core
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), glowMat);
    this.mesh.add(core);

    // Hour hand & Minute hand
    const handMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.04), handMat);
    hourHand.position.y = 0.12;
    this.mesh.add(hourHand);

    const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), handMat);
    minHand.position.x = 0.12;
    minHand.rotation.z = Math.PI / 2;
    this.mesh.add(minHand);
  }

  public update(dt: number): void {
    if (this.collected) return;
    this.mesh.rotation.y += dt * 2.2;
    this.mesh.position.y = this.baseY + Math.sin(Date.now() * 0.004) * 0.2;
  }

  public isCollected(): boolean {
    return this.collected;
  }

  public checkCollection(ball: RollingBall): boolean {
    if (this.collected) return false;

    const bPos = ball.getPosition();
    const distSq = bPos.distanceToSquared(this.mesh.position);
    const collectRadius = this.radius + ball.getRadius();

    if (distSq <= collectRadius * collectRadius) {
      this.collected = true;
      asmrAudio.playTimeBonus();
      this.mesh.visible = false;
      return true;
    }
    return false;
  }
}
