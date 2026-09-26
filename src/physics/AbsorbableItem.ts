import * as THREE from 'three';

export interface AbsorbableItemConfig {
  id: string;
  name: string;
  tier: number; // 1: Tiny, 2: Small, 3: Medium, 4: Large, 5: Huge
  radius: number; // Approximate collision sphere radius
  mass: number;
  mesh: THREE.Object3D;
  pointValue?: number;
  colorHex?: number;
}

export class AbsorbableItem {
  public readonly id: string;
  public readonly name: string;
  public readonly tier: number;
  public readonly radius: number;
  public readonly mass: number;
  public readonly pointValue: number;
  public readonly mesh: THREE.Object3D;
  public surfaceNormal?: THREE.Vector3;
  public surfaceOffset?: number;
  private absorbed: boolean = false;

  constructor(config: AbsorbableItemConfig) {
    this.id = config.id;
    this.name = config.name;
    this.tier = config.tier;
    this.radius = config.radius;
    this.mass = config.mass;
    this.pointValue = config.pointValue ?? Math.round(config.mass * 10);
    this.mesh = config.mesh;

    // Attach reference to object3D for fast raycasting / picking
    this.mesh.userData = {
      isAbsorbable: true,
      itemRef: this,
    };
  }

  public isAbsorbed(): boolean {
    return this.absorbed;
  }

  public setAbsorbed(val: boolean): void {
    this.absorbed = val;
  }

  public getWorldPosition(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    return this.mesh.getWorldPosition(out);
  }
}
