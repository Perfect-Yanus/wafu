import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { DeformableMesh } from '../src/studio/DeformableMesh';

describe('DeformableMesh Squishy Physics', () => {
  let deformable: DeformableMesh;

  beforeEach(() => {
    const geo = new THREE.SphereGeometry(1.0, 24, 24);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff6b8b });
    deformable = new DeformableMesh(geo, mat);
  });

  it('should initialize with original vertex positions and zero velocities', () => {
    expect(deformable.getVertexCount()).toBeGreaterThan(100);
    expect(deformable.isDeformed()).toBe(false);
  });

  it('should deform vertices inward on poke and set deformed state', () => {
    const hitPoint = new THREE.Vector3(0, 0, 1.0);
    deformable.poke(hitPoint, 0.4, 0.5);

    expect(deformable.isDeformed()).toBe(true);

    // Vertex near hit point should have moved inwards towards center (z < 1.0)
    const nearestZ = deformable.getNearestVertexPosition(hitPoint).z;
    expect(nearestZ).toBeLessThan(1.0);
  });

  it('should stretch vertices outward on pull', () => {
    const hitPoint = new THREE.Vector3(0, 0, 1.0);
    const dragVec = new THREE.Vector3(0, 0, 0.5);
    deformable.pinchAndPull(hitPoint, dragVec, 0.5);

    expect(deformable.isDeformed()).toBe(true);
    const nearestZ = deformable.getNearestVertexPosition(hitPoint).z;
    expect(nearestZ).toBeGreaterThan(1.0);
  });

  it('should relax back towards original shape over time via spring-damper', () => {
    const hitPoint = new THREE.Vector3(0, 0, 1.0);
    deformable.poke(hitPoint, 0.5, 0.5);

    const deformedZ = deformable.getNearestVertexPosition(hitPoint).z;

    // Simulate 2 seconds of spring relaxation
    for (let i = 0; i < 120; i++) {
      deformable.updateSprings(0.016);
    }

    const relaxedZ = deformable.getNearestVertexPosition(hitPoint).z;
    // Should be significantly closer to 1.0 than immediately after poke
    expect(Math.abs(relaxedZ - 1.0)).toBeLessThan(Math.abs(deformedZ - 1.0));
  });

  it('should flatten and bulge vertices on squashPancake', () => {
    deformable.squashPancake(0.7);
    expect(deformable.isDeformed()).toBe(true);

    const topVertex = deformable.getNearestVertexPosition(new THREE.Vector3(0, 1.0, 0));
    expect(topVertex.y).toBeLessThan(0.8);
  });

  it('should create deep impact dent on hammerSmashDeform', () => {
    deformable.hammerSmashDeform(new THREE.Vector3(0, 1.0, 0), 0.85);
    expect(deformable.isDeformed()).toBe(true);

    const topVertex = deformable.getNearestVertexPosition(new THREE.Vector3(0, 1.0, 0));
    expect(topVertex.y).toBeLessThan(0.5);
  });
});
