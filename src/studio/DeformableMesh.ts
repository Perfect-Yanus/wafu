import * as THREE from 'three';

export class DeformableMesh {
  public readonly mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private posAttr: THREE.BufferAttribute;

  private originalPositions: Float32Array;
  private currentPositions: Float32Array;
  private velocities: Float32Array;

  private vertexCount: number;
  private deformed: boolean = false;

  // Spring & damping constants
  private springK: number = 42.0; // Restoring spring stiffness
  private damping: number = 7.0;  // Viscous damping for jelly wobble

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material) {
    // Clone geometry so we have an isolated vertex buffer
    this.geometry = geometry.clone();
    this.posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    this.vertexCount = this.posAttr.count;

    this.originalPositions = new Float32Array(this.posAttr.array);
    this.currentPositions = this.posAttr.array as Float32Array;
    this.velocities = new Float32Array(this.vertexCount * 3);

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  public getVertexCount(): number {
    return this.vertexCount;
  }

  public isDeformed(): boolean {
    return this.deformed;
  }

  /**
   * Pokes vertices inward at local hit point with Gaussian falloff
   */
  public poke(localPoint: THREE.Vector3, intensity: number = 0.4, radius: number = 0.6): void {
    const rSq = radius * radius;
    const invTwoRSq = 1 / (2 * rSq);

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const vx = this.currentPositions[idx];
      const vy = this.currentPositions[idx + 1];
      const vz = this.currentPositions[idx + 2];

      const dx = vx - localPoint.x;
      const dy = vy - localPoint.y;
      const dz = vz - localPoint.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < rSq * 2.25) {
        const falloff = Math.exp(-distSq * invTwoRSq);
        const inwardScale = intensity * falloff;

        // Displace inwards towards origin
        const origLen = Math.hypot(vx, vy, vz) || 1.0;
        const normX = vx / origLen;
        const normY = vy / origLen;
        const normZ = vz / origLen;

        this.currentPositions[idx] -= normX * inwardScale;
        this.currentPositions[idx + 1] -= normY * inwardScale;
        this.currentPositions[idx + 2] -= normZ * inwardScale;

        // Add inward velocity impulse for jelly wobble
        this.velocities[idx] -= normX * inwardScale * 8.0;
        this.velocities[idx + 1] -= normY * inwardScale * 8.0;
        this.velocities[idx + 2] -= normZ * inwardScale * 8.0;
      }
    }

    this.deformed = true;
    this.posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  /**
   * Stretches and pulls vertices in the direction of drag
   */
  public pinchAndPull(localPoint: THREE.Vector3, dragVector: THREE.Vector3, radius: number = 0.7): void {
    const rSq = radius * radius;
    const invTwoRSq = 1 / (2 * rSq);

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const vx = this.currentPositions[idx];
      const vy = this.currentPositions[idx + 1];
      const vz = this.currentPositions[idx + 2];

      const dx = vx - localPoint.x;
      const dy = vy - localPoint.y;
      const dz = vz - localPoint.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < rSq * 2.25) {
        const falloff = Math.exp(-distSq * invTwoRSq);

        this.currentPositions[idx] += dragVector.x * falloff;
        this.currentPositions[idx + 1] += dragVector.y * falloff;
        this.currentPositions[idx + 2] += dragVector.z * falloff;

        this.velocities[idx] += dragVector.x * falloff * 4.0;
        this.velocities[idx + 1] += dragVector.y * falloff * 4.0;
        this.velocities[idx + 2] += dragVector.z * falloff * 4.0;
      }
    }

    this.deformed = true;
    this.posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  /**
   * Spring-damper relaxation step to return vertices to their original spherical shape
   */
  public updateSprings(dt: number): void {
    if (!this.deformed) return;

    // Clamp dt for simulation stability
    const clampedDt = Math.min(0.033, dt);
    let maxDisplacementSq = 0;

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;

      const px = this.currentPositions[idx];
      const py = this.currentPositions[idx + 1];
      const pz = this.currentPositions[idx + 2];

      const ox = this.originalPositions[idx];
      const oy = this.originalPositions[idx + 1];
      const oz = this.originalPositions[idx + 2];

      const dispX = px - ox;
      const dispY = py - oy;
      const dispZ = pz - oz;
      const dispSq = dispX * dispX + dispY * dispY + dispZ * dispZ;
      if (dispSq > maxDisplacementSq) {
        maxDisplacementSq = dispSq;
      }

      const vx = this.velocities[idx];
      const vy = this.velocities[idx + 1];
      const vz = this.velocities[idx + 2];

      // Hooke's law with damping: F = -k * disp - c * v
      const fx = -this.springK * dispX - this.damping * vx;
      const fy = -this.springK * dispY - this.damping * vy;
      const fz = -this.springK * dispZ - this.damping * vz;

      this.velocities[idx] += fx * clampedDt;
      this.velocities[idx + 1] += fy * clampedDt;
      this.velocities[idx + 2] += fz * clampedDt;

      this.currentPositions[idx] += this.velocities[idx] * clampedDt;
      this.currentPositions[idx + 1] += this.velocities[idx + 1] * clampedDt;
      this.currentPositions[idx + 2] += this.velocities[idx + 2] * clampedDt;
    }

    this.posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // If all vertices are very close to equilibrium and velocities are tiny, mark settled
    if (maxDisplacementSq < 0.00005) {
      this.deformed = false;
      // Snap to original
      for (let i = 0; i < this.originalPositions.length; i++) {
        this.currentPositions[i] = this.originalPositions[i];
        this.velocities[i] = 0;
      }
      this.posAttr.needsUpdate = true;
      this.geometry.computeVertexNormals();
    }
  }

  /**
   * Find nearest vertex position to a given local point
   */
  public getNearestVertexPosition(point: THREE.Vector3): THREE.Vector3 {
    let nearestIdx = 0;
    let minDistSq = Infinity;

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const dx = this.currentPositions[idx] - point.x;
      const dy = this.currentPositions[idx + 1] - point.y;
      const dz = this.currentPositions[idx + 2] - point.z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearestIdx = idx;
      }
    }

    return new THREE.Vector3(
      this.currentPositions[nearestIdx],
      this.currentPositions[nearestIdx + 1],
      this.currentPositions[nearestIdx + 2]
    );
  }

  /**
   * Set new base geometry (e.g. when ball radius changes)
   */
  public setBaseRadius(radius: number): void {
    const newGeo = new THREE.SphereGeometry(radius, 40, 40);
    this.geometry.dispose();
    this.geometry = newGeo;
    this.posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    this.vertexCount = this.posAttr.count;

    this.originalPositions = new Float32Array(this.posAttr.array);
    this.currentPositions = this.posAttr.array as Float32Array;
    this.velocities = new Float32Array(this.vertexCount * 3);
    this.mesh.geometry = this.geometry;
    this.deformed = false;
  }

  public reset(): void {
    for (let i = 0; i < this.originalPositions.length; i++) {
      this.currentPositions[i] = this.originalPositions[i];
      this.velocities[i] = 0;
    }
    this.deformed = false;
    this.posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
