import * as THREE from 'three';

export type ShellType = 'silicone' | 'tape' | 'clay' | 'bubble';
export type FillingType = 'orbeez' | 'floam' | 'slime' | 'glitter' | 'sugar';

export interface ShellInfo {
  id: ShellType;
  name: string;
  emoji: string;
  description: string;
  hasBrittleCrust: boolean;
}

export interface FillingInfo {
  id: FillingType;
  name: string;
  emoji: string;
  description: string;
  soundType: 'orbeez' | 'floam' | 'slime' | 'glitter' | 'sugar';
}

export class WafuMaker {
  private selectedShell: ShellType = 'silicone';
  private selectedFillings: Set<FillingType> = new Set(['orbeez']);

  public static readonly SHELLS: Record<ShellType, ShellInfo> = {
    silicone: {
      id: 'silicone',
      name: '투명 실리콘 (Silicone)',
      emoji: '🫧',
      description: '부드럽고 쫀쫀한 프리미엄 스퀴시 외피',
      hasBrittleCrust: false,
    },
    tape: {
      id: 'tape',
      name: '무지개 테이프볼 (Tape Wrap)',
      emoji: '🌈',
      description: '겹겹이 감긴 바삭한 테이프 층',
      hasBrittleCrust: false,
    },
    clay: {
      id: 'clay',
      name: '바삭 구운 점토 (Clay Shell)',
      emoji: '🥚',
      description: '달걀 껍질처럼 단단하게 바삭 부서지는 외피',
      hasBrittleCrust: true,
    },
    bubble: {
      id: 'bubble',
      name: '도트 엠보싱 (Bubble Squishy)',
      emoji: '🔮',
      description: '표면에 올록볼록 돌기가 돋은 지압 감촉',
      hasBrittleCrust: false,
    },
  };

  public static readonly FILLINGS: Record<FillingType, FillingInfo> = {
    orbeez: {
      id: 'orbeez',
      name: '워터비즈 / 개구리알 (Orbeez)',
      emoji: '🤹',
      description: '누를 때마다 톡톡 터지는 알갱이 쾌감',
      soundType: 'orbeez',
    },
    floam: {
      id: 'floam',
      name: '스티로폼 폼폼이 (Floam)',
      emoji: '🍿',
      description: '지글지글 자글자글 바삭한 크런치 ASMR',
      soundType: 'floam',
    },
    slime: {
      id: 'slime',
      name: '쫀득 찹쌀 슬라임 (Slime)',
      emoji: '🍯',
      description: '꾸덕하고 찰진 물방울 쫍쫍 사운드',
      soundType: 'slime',
    },
    glitter: {
      id: 'glitter',
      name: '오로라 글리터 & 스팽글',
      emoji: '✨',
      description: '빛을 받아 영롱하게 반짝이는 비주얼',
      soundType: 'glitter',
    },
    sugar: {
      id: 'sugar',
      name: '키네틱 슈가 샌드 (Sugar Sand)',
      emoji: '🧁',
      description: '서걱서걱 씹히는 모래 점토 사운드',
      soundType: 'sugar',
    },
  };

  public getSelectedShell(): ShellType {
    return this.selectedShell;
  }

  public setShell(shell: ShellType): void {
    this.selectedShell = shell;
  }

  public getShellInfo(shell?: ShellType): ShellInfo {
    return WafuMaker.SHELLS[shell ?? this.selectedShell];
  }

  public getSelectedFillings(): FillingType[] {
    return Array.from(this.selectedFillings);
  }

  public toggleFilling(filling: FillingType): void {
    if (this.selectedFillings.has(filling)) {
      if (this.selectedFillings.size > 1) {
        this.selectedFillings.delete(filling);
      }
    } else {
      this.selectedFillings.add(filling);
    }
  }

  public hasFilling(filling: FillingType): boolean {
    return this.selectedFillings.has(filling);
  }

  /**
   * Determine primary sound when poking/touching based on fillings
   */
  public getPrimaryTouchSound(): string {
    if (this.selectedShell === 'clay') return 'clay';
    if (this.selectedFillings.has('floam')) return 'floam';
    if (this.selectedFillings.has('orbeez')) return 'orbeez';
    if (this.selectedFillings.has('sugar')) return 'sugar';
    return 'squish';
  }

  /**
   * Generate 3D internal meshes representing fillings inside the ball
   */
  public createFillingGroup(radius: number): THREE.Group {
    const group = new THREE.Group();

    // 1. Orbeez Beads (colorful semi-translucent spheres)
    if (this.selectedFillings.has('orbeez')) {
      const orbeezGeo = new THREE.SphereGeometry(radius * 0.12, 12, 12);
      const orbeezColors = [0xff4d6d, 0x00e5ff, 0xffdd00, 0x06d6a0, 0x9d4edd];

      for (let i = 0; i < 35; i++) {
        const color = orbeezColors[i % orbeezColors.length];
        const mat = new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.1,
          transmission: 0.75,
          transparent: true,
          opacity: 0.85,
        });
        const bead = new THREE.Mesh(orbeezGeo, mat);

        const r = radius * 0.7 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        bead.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
        group.add(bead);
      }
    }

    // 2. Floam (tiny white micro-beads)
    if (this.selectedFillings.has('floam')) {
      const floamGeo = new THREE.DodecahedronGeometry(radius * 0.045);
      const floamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

      for (let i = 0; i < 60; i++) {
        const mesh = new THREE.Mesh(floamGeo, floamMat);
        const r = radius * 0.8 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        mesh.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
        group.add(mesh);
      }
    }

    // 3. Glitter Stars
    if (this.selectedFillings.has('glitter')) {
      const starGeo = new THREE.OctahedronGeometry(radius * 0.05);
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.1,
      });

      for (let i = 0; i < 40; i++) {
        const star = new THREE.Mesh(starGeo, starMat);
        const r = radius * 0.75 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        star.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
        star.rotation.set(Math.random(), Math.random(), Math.random());
        group.add(star);
      }
    }

    return group;
  }
}
