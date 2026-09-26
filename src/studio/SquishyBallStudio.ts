import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { DeformableMesh } from './DeformableMesh';
import { asmrAudio } from '../audio/AsmrAudioEngine';
import { AbsorbableItem } from '../physics/AbsorbableItem';
import { WafuMaker } from './WafuMaker';

export type StudioTool =
  | 'poke'
  | 'stretch'
  | 'crack'
  | 'slice'
  | 'hammer'
  | 'hydraulic'
  | 'wire_cutter'
  | 'pop';

export class SquishyBallStudio {
  public readonly scene: THREE.Scene;
  public readonly studioGroup: THREE.Group;
  public deformableBall: DeformableMesh;
  public readonly wafuMaker: WafuMaker;

  private currentTool: StudioTool = 'poke';
  private pedestal: THREE.Mesh;
  private particleGroup: THREE.Group;
  private crackGroup: THREE.Group;
  private sliceLinesGroup: THREE.Group;
  private internalItemsGroup: THREE.Group;

  // Interaction tracking
  private isPointerDown: boolean = false;
  private lastHitPoint: THREE.Vector3 | null = null;
  private dragStartPoint: THREE.Vector3 | null = null;

  // Visual particles
  private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

  constructor(scene: THREE.Scene, initialRadius: number = 0.8) {
    this.scene = scene;
    this.wafuMaker = new WafuMaker();
    this.studioGroup = new THREE.Group();
    this.scene.add(this.studioGroup);

    // 1. Pedestal Stand
    const pedestalGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.4, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      roughness: 0.3,
      metalness: 0.8,
    });
    this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.pedestal.position.y = -0.2;
    this.pedestal.receiveShadow = true;
    this.studioGroup.add(this.pedestal);

    // Glowing rim ring on pedestal
    const ringGeo = new THREE.TorusGeometry(1.65, 0.04, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff66bb });
    const rimRing = new THREE.Mesh(ringGeo, ringMat);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.01;
    this.studioGroup.add(rimRing);

    // 2. Deformable Squishy Ball
    const ballGeo = new THREE.SphereGeometry(initialRadius, 40, 40);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xff6b8b,
      roughness: 0.25,
      metalness: 0.1,
    });
    this.deformableBall = new DeformableMesh(ballGeo, ballMat);
    this.deformableBall.mesh.position.set(0, initialRadius + 0.1, 0);
    this.studioGroup.add(this.deformableBall.mesh);

    // 3. Child groups
    this.internalItemsGroup = new THREE.Group();
    this.deformableBall.mesh.add(this.internalItemsGroup);

    this.crackGroup = new THREE.Group();
    this.deformableBall.mesh.add(this.crackGroup);

    this.sliceLinesGroup = new THREE.Group();
    this.deformableBall.mesh.add(this.sliceLinesGroup);

    this.particleGroup = new THREE.Group();
    this.studioGroup.add(this.particleGroup);

    this.setupStudioLighting();
    this.refreshFillings(initialRadius);
  }

  private setupStudioLighting(): void {
    const spot = new THREE.SpotLight(0xfff5ea, 2.5);
    spot.position.set(5, 12, 8);
    spot.angle = Math.PI / 4;
    spot.penumbra = 0.6;
    spot.castShadow = true;
    this.studioGroup.add(spot);

    const rimPink = new THREE.DirectionalLight(0xff4499, 1.8);
    rimPink.position.set(-6, 3, -4);
    this.studioGroup.add(rimPink);

    const rimCyan = new THREE.DirectionalLight(0x00e5ff, 1.4);
    rimCyan.position.set(6, 2, -5);
    this.studioGroup.add(rimCyan);
  }

  public setTool(tool: StudioTool): void {
    this.currentTool = tool;

    // Direct action tools:
    if (tool === 'hammer') {
      this.triggerHammerSmash();
    } else if (tool === 'hydraulic') {
      this.triggerHydraulicCrush();
    } else if (tool === 'wire_cutter') {
      this.triggerWireCutter();
    } else if (tool === 'pop') {
      this.triggerPop();
    }
  }

  public getTool(): StudioTool {
    return this.currentTool;
  }

  public refreshFillings(radius?: number): void {
    const r = radius ?? (this.deformableBall.mesh.geometry.boundingSphere?.radius || 0.8);
    while (this.internalItemsGroup.children.length > 0) {
      this.internalItemsGroup.remove(this.internalItemsGroup.children[0]);
    }
    const fillingsMesh = this.wafuMaker.createFillingGroup(r);
    this.internalItemsGroup.add(fillingsMesh);
  }

  public syncFromRollingBall(radius: number, material: THREE.Material, items: readonly AbsorbableItem[]): void {
    this.deformableBall.setBaseRadius(radius);
    this.deformableBall.mesh.material = material;
    this.deformableBall.mesh.position.set(0, radius + 0.1, 0);

    this.refreshFillings(radius);

    // Also include miniature representations of absorbed items
    const maxPreviewItems = Math.min(items.length, 25);
    for (let i = 0; i < maxPreviewItems; i++) {
      const item = items[i];
      const clone = item.mesh.clone();
      clone.scale.multiplyScalar(0.25);

      const u = Math.random();
      const r = (radius * 0.7) * Math.cbrt(u);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      clone.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      this.internalItemsGroup.add(clone);
    }
  }

  public onPointerDown(intersection: THREE.Intersection): void {
    this.isPointerDown = true;
    const localHit = this.deformableBall.mesh.worldToLocal(intersection.point.clone());
    this.lastHitPoint = localHit.clone();
    this.dragStartPoint = localHit.clone();

    switch (this.currentTool) {
      case 'poke': {
        this.deformableBall.poke(localHit, 0.45, 0.55);
        this.spawnParticles(intersection.point, 4, 0xff70a6);

        // Sound according to selected fillings
        const soundType = this.wafuMaker.getPrimaryTouchSound();
        if (soundType === 'orbeez') {
          asmrAudio.playWaterBeads();
        } else if (soundType === 'floam') {
          asmrAudio.playFloamCrunch();
        } else if (soundType === 'clay') {
          asmrAudio.playClayCrack();
        } else {
          asmrAudio.playSquish(0.85);
        }
        break;
      }
      case 'crack': {
        this.deformableBall.poke(localHit, 0.25, 0.4);
        this.addCrackDecal(localHit);
        this.spawnParticles(intersection.point, 12, 0xffffff);
        asmrAudio.playCrack();
        asmrAudio.playCrunch(0.9);
        break;
      }
      case 'slice': {
        this.deformableBall.poke(localHit, 0.15, 0.3);
        asmrAudio.playSlice();
        break;
      }
      case 'stretch': {
        asmrAudio.playStretch(0.4);
        break;
      }
      case 'hammer': {
        this.triggerHammerSmash(intersection.point);
        break;
      }
      case 'hydraulic': {
        this.triggerHydraulicCrush();
        break;
      }
      case 'wire_cutter': {
        this.triggerWireCutter();
        break;
      }
      case 'pop': {
        this.triggerPop(intersection.point);
        break;
      }
    }
  }

  public onPointerMove(intersection: THREE.Intersection | null, dragDelta?: THREE.Vector2): void {
    if (!this.isPointerDown) return;

    if (intersection) {
      const localHit = this.deformableBall.mesh.worldToLocal(intersection.point.clone());

      if (this.currentTool === 'poke') {
        this.deformableBall.poke(localHit, 0.28, 0.45);
        asmrAudio.playSquish(0.4);
      } else if (this.currentTool === 'slice' && this.lastHitPoint) {
        this.addSliceSegment(this.lastHitPoint, localHit);
        this.deformableBall.poke(localHit, 0.2, 0.3);
        this.spawnParticles(intersection.point, 2, 0xffe066);
        asmrAudio.playCrunch(0.6);
      } else if (this.currentTool === 'crack') {
        this.addCrackDecal(localHit);
        asmrAudio.playCrunch(0.7);
      }

      this.lastHitPoint = localHit.clone();
    } else if (this.currentTool === 'stretch' && dragDelta && this.dragStartPoint) {
      const pullVec = new THREE.Vector3(dragDelta.x * 0.015, -dragDelta.y * 0.015, 0.1);
      this.deformableBall.pinchAndPull(this.dragStartPoint, pullVec, 0.65);
    }
  }

  public onPointerUp(): void {
    if (this.isPointerDown && this.currentTool === 'stretch') {
      asmrAudio.playSquish(0.6);
    }
    this.isPointerDown = false;
    this.lastHitPoint = null;
    this.dragStartPoint = null;
  }

  /**
   * 🔨 SMASH: Super Hammer Smash
   */
  public triggerHammerSmash(hitPos?: THREE.Vector3): void {
    const center = hitPos ?? this.deformableBall.mesh.position.clone();
    asmrAudio.playHammerSmash();

    // Heavy vertex deformation
    this.deformableBall.hammerSmashDeform(new THREE.Vector3(0, 1.0, 0), 0.95);

    // Spiderweb cracks
    for (let i = 0; i < 4; i++) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.8, (Math.random() - 0.5) * 0.4);
      this.addCrackDecal(offset);
    }

    // Blast particles outward
    this.spawnParticles(center, 40, 0xffffff, 4.0);
    this.spawnParticles(center, 20, 0xff0055, 3.5);
  }

  /**
   * ⚡ CRUSH: Hydraulic Press Flattening
   */
  public triggerHydraulicCrush(): void {
    asmrAudio.playHydraulicCrush();

    // Squash into flat pancake
    this.deformableBall.squashPancake(0.85);

    // Squirt fluid drops outward horizontally
    const origin = this.deformableBall.mesh.position.clone();
    origin.y = 0.1;
    this.spawnParticles(origin, 35, 0x00e5ff, 3.0);
  }

  /**
   * 🧇 SHRED: Wire Grid Cutter
   */
  public triggerWireCutter(): void {
    asmrAudio.playWireShred();

    // Create waffle grid cut lines
    for (let x = -0.6; x <= 0.6; x += 0.3) {
      this.addSliceSegment(new THREE.Vector3(x, 1.0, -0.6), new THREE.Vector3(x, 1.0, 0.6));
      this.addSliceSegment(new THREE.Vector3(-0.6, 1.0, x), new THREE.Vector3(0.6, 1.0, x));
    }

    this.deformableBall.poke(new THREE.Vector3(0, 0.8, 0), 0.5, 1.2);
    this.spawnParticles(this.deformableBall.mesh.position, 25, 0xffdd00, 2.5);
  }

  /**
   * 💥 POP: Mega Burst & Confetti
   */
  public triggerPop(worldPos?: THREE.Vector3): void {
    const burstCenter = worldPos ?? this.deformableBall.mesh.position.clone();
    asmrAudio.playPop();

    try {
      confetti({
        particleCount: 100,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#ff4499', '#00e5ff', '#ffdd00', '#99ff33', '#ffffff', '#7209b7'],
      });
    } catch {
      // Test environment fallback
    }

    this.spawnParticles(burstCenter, 45, 0xff4499, 5.0);
    this.deformableBall.poke(new THREE.Vector3(0, 0, 0), -0.7, 2.0);
    this.clearCracksAndSlices();
  }

  private addCrackDecal(localPoint: THREE.Vector3): void {
    const crackMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const numBranches = 5;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < numBranches; i++) {
      const angle = (i / numBranches) * Math.PI * 2 + Math.random() * 0.5;
      const len = 0.2 + Math.random() * 0.25;
      const endPoint = localPoint.clone().add(
        new THREE.Vector3(Math.cos(angle) * len, Math.sin(angle) * len, Math.sin(angle * 2) * 0.05)
      );
      points.push(localPoint.clone(), endPoint);
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineSegments(geo, crackMat);
    this.crackGroup.add(line);
  }

  private addSliceSegment(p1: THREE.Vector3, p2: THREE.Vector3): void {
    const sliceMat = new THREE.LineBasicMaterial({ color: 0xffffaa, linewidth: 3 });
    const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const line = new THREE.Line(geo, sliceMat);
    this.sliceLinesGroup.add(line);
  }

  public clearCracksAndSlices(): void {
    while (this.crackGroup.children.length > 0) {
      this.crackGroup.remove(this.crackGroup.children[0]);
    }
    while (this.sliceLinesGroup.children.length > 0) {
      this.sliceLinesGroup.remove(this.sliceLinesGroup.children[0]);
    }
  }

  private spawnParticles(origin: THREE.Vector3, count: number, color: number, speedMult: number = 1.0): void {
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(origin);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4.5 * speedMult,
        (Math.random() * 4.5 + 1.2) * speedMult,
        (Math.random() - 0.5) * 4.5 * speedMult
      );

      this.particleGroup.add(mesh);
      this.particles.push({ mesh, vel, life: 1.0 });
    }
  }

  public update(dt: number): void {
    this.deformableBall.updateSprings(dt);

    if (!this.isPointerDown) {
      this.deformableBall.mesh.rotation.y += dt * 0.25;
      this.pedestal.rotation.y += dt * 0.25;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 2.0;

      if (p.life <= 0) {
        this.particleGroup.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(Math.max(0.01, p.life));
    }
  }

  public setVisible(visible: boolean): void {
    this.studioGroup.visible = visible;
  }
}
