import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

describe('Sanity Check', () => {
  it('should initialize Three.js vector and geometry properly', () => {
    const v = new THREE.Vector3(1, 2, 3);
    expect(v.length()).toBeCloseTo(Math.sqrt(14));

    const sphere = new THREE.SphereGeometry(1, 16, 16);
    expect(sphere.parameters.radius).toBe(1);
  });
});
