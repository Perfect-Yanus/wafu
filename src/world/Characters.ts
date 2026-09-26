import * as THREE from 'three';
import { AbsorbableItem } from '../physics/AbsorbableItem';
import { asmrAudio } from '../audio/AsmrAudioEngine';

export type CharacterType = 'human' | 'cat' | 'dog' | 'cyclist' | 'car';

export class LivingCharacter {
  public readonly item: AbsorbableItem;
  public readonly type: CharacterType;
  public readonly mesh: THREE.Group;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private wanderTimer: number = 0;
  private walkTime: number = Math.random() * 10;
  private walkSpeed: number;
  private isPanicking: boolean = false;

  // Animated Limbs references
  private leftLeg?: THREE.Mesh;
  private rightLeg?: THREE.Mesh;
  private leftArm?: THREE.Mesh;
  private rightArm?: THREE.Mesh;
  private tail?: THREE.Mesh;
  private wheels: THREE.Mesh[] = [];

  constructor(type: CharacterType, id: string, initialPos: THREE.Vector3) {
    this.type = type;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(initialPos);

    let radius = 0.55;
    let mass = 1.8;
    let tier = 2;
    let name = '시민 (Citizen)';

    if (type === 'cat') {
      name = '길고양이 (Cat)';
      radius = 0.35;
      mass = 0.8;
      tier = 1;
      this.walkSpeed = 2.4;
      this.buildCat();
    } else if (type === 'dog') {
      name = '시바견 (Dog)';
      radius = 0.45;
      mass = 1.2;
      tier = 2;
      this.walkSpeed = 3.2;
      this.buildDog();
    } else if (type === 'cyclist') {
      name = '자전거 탄 시민 (Cyclist)';
      radius = 0.95;
      mass = 4.5;
      tier = 3;
      this.walkSpeed = 5.0;
      this.buildCyclist();
    } else if (type === 'car') {
      name = '미니 시티카 (City Car)';
      radius = 1.45;
      mass = 12.0;
      tier = 3;
      this.walkSpeed = 6.5;
      this.buildCar();
    } else {
      name = '산책하는 시민 (Pedestrian)';
      radius = 0.55;
      mass = 2.0;
      tier = 2;
      this.walkSpeed = 2.8;
      this.buildHuman();
    }

    this.item = new AbsorbableItem({
      id: `${type}-${id}`,
      name,
      tier,
      radius,
      mass,
      mesh: this.mesh,
    });

    // Pick random initial movement direction
    const angle = Math.random() * Math.PI * 2;
    this.velocity.set(Math.cos(angle) * this.walkSpeed, 0, Math.sin(angle) * this.walkSpeed);
    this.mesh.rotation.y = angle;
  }

  private buildHuman(): void {
    const shirtColors = [0xff477e, 0x06d6a0, 0x118ab2, 0xffd166, 0x8338ec, 0xf77f00];
    const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), skinMat);
    head.position.y = 1.25;
    this.mesh.add(head);

    // Hair / Cap
    const hair = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), pantsMat);
    hair.position.set(0, 1.32, -0.02);
    this.mesh.add(hair);

    // Torso (Shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.22), shirtMat);
    torso.position.y = 0.88;
    this.mesh.add(torso);

    // Legs
    const legGeom = new THREE.BoxGeometry(0.12, 0.45, 0.12);
    this.leftLeg = new THREE.Mesh(legGeom, pantsMat);
    this.leftLeg.position.set(-0.1, 0.42, 0);
    this.rightLeg = new THREE.Mesh(legGeom, pantsMat);
    this.rightLeg.position.set(0.1, 0.42, 0);

    const shoe1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.18), shoeMat);
    shoe1.position.set(0, -0.22, 0.04);
    this.leftLeg.add(shoe1);

    const shoe2 = shoe1.clone();
    this.rightLeg.add(shoe2);

    this.mesh.add(this.leftLeg, this.rightLeg);

    // Arms
    const armGeom = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    this.leftArm = new THREE.Mesh(armGeom, shirtMat);
    this.leftArm.position.set(-0.25, 0.85, 0);
    this.rightArm = new THREE.Mesh(armGeom, shirtMat);
    this.rightArm.position.set(0.25, 0.85, 0);
    this.mesh.add(this.leftArm, this.rightArm);
  }

  private buildCat(): void {
    const catMat = new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.5), catMat);
    body.position.y = 0.25;
    this.mesh.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), catMat);
    head.position.set(0, 0.38, 0.28);
    this.mesh.add(head);

    // Ears
    const earGeom = new THREE.ConeGeometry(0.06, 0.12, 4);
    const leftEar = new THREE.Mesh(earGeom, whiteMat);
    leftEar.position.set(-0.08, 0.52, 0.28);
    const rightEar = new THREE.Mesh(earGeom, whiteMat);
    rightEar.position.set(0.08, 0.52, 0.28);
    this.mesh.add(leftEar, rightEar);

    // Tail
    this.tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.35), catMat);
    this.tail.position.set(0, 0.4, -0.28);
    this.tail.rotation.x = -0.6;
    this.mesh.add(this.tail);

    // 4 Little Legs
    const pawGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.16);
    const p1 = new THREE.Mesh(pawGeom, whiteMat);
    p1.position.set(-0.12, 0.08, 0.16);
    const p2 = p1.clone();
    p2.position.set(0.12, 0.08, 0.16);
    const p3 = p1.clone();
    p3.position.set(-0.12, 0.08, -0.16);
    const p4 = p1.clone();
    p4.position.set(0.12, 0.08, -0.16);
    this.mesh.add(p1, p2, p3, p4);
  }

  private buildDog(): void {
    const dogMat = new THREE.MeshStandardMaterial({ color: 0xee9b00, roughness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), dogMat);
    body.position.y = 0.32;
    this.mesh.add(body);

    // Head & Snout
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.32), dogMat);
    head.position.set(0, 0.48, 0.32);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), whiteMat);
    snout.position.set(0, 0.42, 0.48);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04), blackMat);
    nose.position.set(0, 0.46, 0.57);
    this.mesh.add(head, snout, nose);

    // Ears
    const earGeom = new THREE.ConeGeometry(0.08, 0.16, 4);
    const ear1 = new THREE.Mesh(earGeom, dogMat);
    ear1.position.set(-0.1, 0.65, 0.3);
    const ear2 = ear1.clone();
    ear2.position.set(0.1, 0.65, 0.3);
    this.mesh.add(ear1, ear2);

    // Tail
    this.tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.28), whiteMat);
    this.tail.position.set(0, 0.48, -0.32);
    this.tail.rotation.x = 0.8;
    this.mesh.add(this.tail);
  }

  private buildCyclist(): void {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a86ff, metalness: 0.8, roughness: 0.2 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

    // Frame
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), metalMat);
    frame.rotation.z = Math.PI / 2;
    frame.position.y = 0.55;
    this.mesh.add(frame);

    // Front & Back Wheels
    const w1 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 20), wheelMat);
    w1.position.set(0, 0.4, 0.7);
    const w2 = w1.clone();
    w2.position.set(0, 0.4, -0.7);
    this.mesh.add(w1, w2);
    this.wheels.push(w1, w2);

    // Mini Rider
    const rider = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.3), new THREE.MeshStandardMaterial({ color: 0xff006e }));
    rider.position.set(0, 0.95, -0.1);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18), new THREE.MeshStandardMaterial({ color: 0xffd166 }));
    head.position.set(0, 1.35, 0);
    this.mesh.add(rider, head);
  }

  private buildCar(): void {
    const bodyColors = [0xe63946, 0x1d3557, 0x2a9d8f, 0xf4a261];
    const bodyColor = bodyColors[Math.floor(Math.random() * bodyColors.length)];
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.6, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xa8dadc, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    // Lower Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2.5), bodyMat);
    chassis.position.y = 0.45;
    this.mesh.add(chassis);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 1.3), glassMat);
    cabin.position.set(0, 0.9, -0.2);
    this.mesh.add(cabin);

    // 4 Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16);
    const wPositions = [
      [-0.75, 0.28, 0.75],
      [0.75, 0.28, 0.75],
      [-0.75, 0.28, -0.75],
      [0.75, 0.28, -0.75],
    ];

    wPositions.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeom, tireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      this.mesh.add(w);
      this.wheels.push(w);
    });
  }

  public update(dt: number, ballPos: THREE.Vector3, ballRadius: number): void {
    if (this.item.isAbsorbed()) return;

    this.walkTime += dt * 3.0;
    this.wanderTimer -= dt;

    const myPos = this.mesh.position;
    const dx = myPos.x - ballPos.x;
    const dz = myPos.z - ballPos.z;
    const distSq = dx * dx + dz * dz;

    // Panic AI: if ball is close (< 14m) and larger than character, run away!
    if (distSq < 14 * 14 && ballRadius >= this.item.radius * 1.1) {
      this.isPanicking = true;
      const escapeDir = new THREE.Vector2(dx, dz).normalize();
      const speed = this.walkSpeed * 2.2;
      this.velocity.set(escapeDir.x * speed, 0, escapeDir.y * speed);
      this.mesh.rotation.y = Math.atan2(escapeDir.x, escapeDir.y);
    } else {
      this.isPanicking = false;
      // Normal wandering
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 3.0 + Math.random() * 4.0;
        const angle = Math.random() * Math.PI * 2;
        this.velocity.set(Math.cos(angle) * this.walkSpeed, 0, Math.sin(angle) * this.walkSpeed);
        this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
      }
    }

    // Step position
    myPos.x += this.velocity.x * dt;
    myPos.z += this.velocity.z * dt;

    // Bounds check within city (-110 to 110)
    const bound = 105;
    if (Math.abs(myPos.x) > bound || Math.abs(myPos.z) > bound) {
      this.velocity.negate();
      this.mesh.rotation.y += Math.PI;
    }

    // Limb Animations
    const animSpeed = this.isPanicking ? 18.0 : 8.0;
    const swing = Math.sin(this.walkTime * animSpeed);

    if (this.leftLeg && this.rightLeg) {
      this.leftLeg.rotation.x = swing * 0.7;
      this.rightLeg.rotation.x = -swing * 0.7;
    }

    if (this.leftArm && this.rightArm) {
      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x = swing * 0.8;
    }

    if (this.tail) {
      this.tail.rotation.y = Math.sin(this.walkTime * 14.0) * 0.5;
    }

    for (const w of this.wheels) {
      w.rotation.x += dt * 12.0;
    }
  }

  public triggerAbsorbReaction(): void {
    asmrAudio.playCharacterReaction(this.type);
  }
}
