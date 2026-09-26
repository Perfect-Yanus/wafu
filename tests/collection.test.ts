import { describe, it, expect, beforeEach } from 'vitest';
import { CollectionManager } from '../src/customizer/CollectionManager';
import { MaterialRegistry } from '../src/customizer/Materials';

describe('CollectionManager & Materials', () => {
  let collection: CollectionManager;

  beforeEach(() => {
    // Clear localStorage mock
    localStorage.clear();
    collection = new CollectionManager();
  });

  it('should initialize with default collection when empty', () => {
    const list = collection.getAll();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].name).toBeDefined();
  });

  it('should save a new Wafu Ball to the collection', () => {
    const newBall = collection.saveBall({
      name: '내 첫 번째 와뿌볼',
      color: '#ff4499',
      materialPreset: 'clear-jelly',
      maxDiameterCm: 185.4,
      itemsAbsorbedCount: 24,
    });

    expect(newBall.id).toBeDefined();
    expect(collection.getAll().length).toBeGreaterThan(1);

    const found = collection.getById(newBall.id);
    expect(found?.name).toBe('내 첫 번째 와뿌볼');
    expect(found?.color).toBe('#ff4499');
  });

  it('should delete a ball from collection', () => {
    const newBall = collection.saveBall({
      name: '삭제할 볼',
      color: '#00e5ff',
      materialPreset: 'silicone',
      maxDiameterCm: 50.0,
      itemsAbsorbedCount: 5,
    });

    const initialLen = collection.getAll().length;
    const deleted = collection.deleteBall(newBall.id);
    expect(deleted).toBe(true);
    expect(collection.getAll().length).toBe(initialLen - 1);
  });

  it('should create valid materials from MaterialRegistry', () => {
    const registry = new MaterialRegistry();
    const presets = registry.getAvailablePresets();
    expect(presets).toContain('silicone');
    expect(presets).toContain('clear-jelly');
    expect(presets).toContain('tape-ball');
    expect(presets).toContain('glitter');

    const mat = registry.createMaterial('clear-jelly', '#00ffcc');
    expect(mat).toBeDefined();
    expect(mat.transparent).toBe(true);
  });
});
