import * as THREE from 'three';

export type MaterialPresetId = 'silicone' | 'clear-jelly' | 'crunch-sugar' | 'tape-ball' | 'glitter' | 'neon';

export interface MaterialPresetInfo {
  id: MaterialPresetId;
  name: string;
  description: string;
}

export class MaterialRegistry {
  private textures: Map<string, THREE.CanvasTexture> = new Map();

  public getAvailablePresets(): MaterialPresetId[] {
    return ['silicone', 'clear-jelly', 'crunch-sugar', 'tape-ball', 'glitter', 'neon'];
  }

  public getPresetInfo(id: MaterialPresetId): MaterialPresetInfo {
    switch (id) {
      case 'silicone':
        return { id, name: '실리콘 스퀴시 (Silicone)', description: '부드럽고 매끄러운 파스텔 촉감' };
      case 'clear-jelly':
        return { id, name: '투명 젤리 (Clear Jelly)', description: '속에 갇힌 아이템이 비쳐 보이는 영롱한 투명감' };
      case 'crunch-sugar':
        return { id, name: '슈가 크런치 (Sugar Crunch)', description: '바삭바삭 설탕 결정이 씹히는 크런치 질감' };
      case 'tape-ball':
        return { id, name: '무지개 테이프볼 (Tape Ball)', description: '돌돌 말아 만든 겹겹의 테이프 층' };
      case 'glitter':
        return { id, name: '글리터 스파클 (Glitter)', description: '빛을 받으면 영롱하게 반짝이는 펄 질감' };
      case 'neon':
        return { id, name: '사이버 네온 (Cyber Neon)', description: '자체 발광하는 일렉트릭 펄스' };
    }
  }

  public createMaterial(presetId: MaterialPresetId, colorHex: string | number = '#ff6b8b'): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
    const color = new THREE.Color(colorHex);

    switch (presetId) {
      case 'clear-jelly': {
        const mat = new THREE.MeshPhysicalMaterial({
          color: color,
          roughness: 0.12,
          metalness: 0.05,
          transmission: 0.88,
          ior: 1.45,
          transparent: true,
          opacity: 0.9,
          thickness: 1.2,
          attenuationColor: color,
          attenuationDistance: 1.5,
        });
        return mat;
      }

      case 'crunch-sugar': {
        const bumpTex = this.getOrCreateNoiseTexture('sugar');
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.75,
          metalness: 0.2,
          bumpMap: bumpTex,
          bumpScale: 0.08,
        });
        return mat;
      }

      case 'tape-ball': {
        const tapeTex = this.getOrCreateTapeTexture();
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          map: tapeTex,
          roughness: 0.35,
          metalness: 0.1,
        });
        return mat;
      }

      case 'glitter': {
        const glitterTex = this.getOrCreateGlitterTexture();
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.2,
          metalness: 0.8,
          roughnessMap: glitterTex,
        });
        return mat;
      }

      case 'neon': {
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.65,
          roughness: 0.2,
          metalness: 0.1,
        });
        return mat;
      }

      case 'silicone':
      default: {
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.38,
          metalness: 0.05,
        });
        return mat;
      }
    }
  }

  /**
   * Procedural canvas textures
   */
  private getOrCreateNoiseTexture(id: string): THREE.CanvasTexture {
    if (this.textures.has(id)) return this.textures.get(id)!;

    if (typeof document === 'undefined') {
      // In headless test environments
      return new THREE.CanvasTexture({} as HTMLCanvasElement);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const imgData = ctx.createImageData(256, 256);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 255;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    this.textures.set(id, tex);
    return tex;
  }

  private getOrCreateTapeTexture(): THREE.CanvasTexture {
    if (this.textures.has('tape')) return this.textures.get('tape')!;

    if (typeof document === 'undefined') {
      return new THREE.CanvasTexture({} as HTMLCanvasElement);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Multi-color rainbow stripes
    const colors = ['#ff4d6d', '#ff758f', '#ffb3c1', '#7209b7', '#4361ee', '#4cc9f0', '#06d6a0', '#ffd166'];
    const stripeHeight = canvas.height / colors.length;

    for (let i = 0; i < colors.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(0, i * stripeHeight, canvas.width, stripeHeight);

      // Add slight tape seam lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, i * stripeHeight, canvas.width, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    this.textures.set('tape', tex);
    return tex;
  }

  private getOrCreateGlitterTexture(): THREE.CanvasTexture {
    if (this.textures.has('glitter')) return this.textures.get('glitter')!;

    if (typeof document === 'undefined') {
      return new THREE.CanvasTexture({} as HTMLCanvasElement);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 2 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#ffd700';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    this.textures.set('glitter', tex);
    return tex;
  }
}
