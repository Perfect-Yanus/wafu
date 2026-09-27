import * as THREE from 'three';
import { MaterialRegistry, MaterialPresetId } from './Materials';
import { CollectionManager, SavedWafuBall } from './CollectionManager';

export interface CustomizerState {
  currentColor: string;
  currentPreset: MaterialPresetId;
  ballName: string;
}

export class BallCustomizer {
  public readonly registry: MaterialRegistry;
  public readonly collection: CollectionManager;

  private state: CustomizerState;
  private currentMaterial: THREE.Material;

  // Preset color swatches
  public static readonly SWATCHES = [
    '#ff4d6d', // Berry Pink
    '#ff758f', // Bubblegum
    '#00e5ff', // Neon Aqua
    '#4361ee', // Electric Blue
    '#06d6a0', // Mint Green
    '#ffd166', // Sunny Lemon
    '#ff9f1c', // Tangy Orange
    '#9d4edd', // Vivid Violet
    '#ffffff', // Pure Pearl
    '#222222', // Obsidian Black
  ];

  constructor() {
    this.registry = new MaterialRegistry();
    this.collection = new CollectionManager();

    const active = this.collection.getActiveBall();
    this.state = {
      currentColor: active.color,
      currentPreset: active.materialPreset,
      ballName: active.name,
    };

    this.currentMaterial = this.registry.createMaterial(this.state.currentPreset, this.state.currentColor);
  }

  public getState(): CustomizerState {
    return { ...this.state };
  }

  public getMaterial(): THREE.Material {
    return this.currentMaterial;
  }

  public setColor(hex: string): THREE.Material {
    this.state.currentColor = hex;
    this.currentMaterial = this.registry.createMaterial(this.state.currentPreset, this.state.currentColor);
    return this.currentMaterial;
  }

  public setMaterialPreset(presetId: MaterialPresetId): THREE.Material {
    this.state.currentPreset = presetId;
    this.currentMaterial = this.registry.createMaterial(this.state.currentPreset, this.state.currentColor);
    return this.currentMaterial;
  }

  public setBallName(name: string): void {
    this.state.ballName = name;
  }

  public saveCurrentBall(maxDiameterCm: number, itemsCount: number, stageName?: string): SavedWafuBall {
    return this.collection.saveBall({
      name: this.state.ballName || '나만의 와뿌볼',
      color: this.state.currentColor,
      materialPreset: this.state.currentPreset,
      maxDiameterCm,
      itemsAbsorbedCount: itemsCount,
      stageName: stageName ?? '자유 모드',
    });
  }

  public loadFromCollection(id: string): SavedWafuBall | null {
    const ball = this.collection.getById(id);
    if (!ball) return null;

    this.state = {
      currentColor: ball.color,
      currentPreset: ball.materialPreset,
      ballName: ball.name,
    };
    this.collection.setActiveBall(id);
    this.currentMaterial = this.registry.createMaterial(this.state.currentPreset, this.state.currentColor);
    return ball;
  }
}
