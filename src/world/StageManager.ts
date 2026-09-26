import * as THREE from 'three';

export interface StageConfig {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  targetDiameterCm: number;
  timeLimitSec: number;
  hasPortalExit: boolean;
  isPlanetSphere: boolean;
  allowedTiers: number[];
  themeColor: string;
  badgeIcon: string;
  hazardsDescription: string;
}

export const STAGES: StageConfig[] = [
  {
    id: 1,
    title: 'Stage 1: 와뿌 마을과 고양이 파크',
    subtitle: '아기자기한 마을과 살아 움직이는 캐릭터 수집',
    description: '공원과 주택가를 굴러다니며 도넛, 장난감, 귀여운 길고양이, 산책하는 강아지, 공원 벤치를 흡수하여 직경 120cm까지 성장시키세요!',
    targetDiameterCm: 120.0,
    timeLimitSec: 120.0,
    hasPortalExit: false,
    isPlanetSphere: false,
    allowedTiers: [1, 2, 3],
    themeColor: '#ff6b8b',
    badgeIcon: '🌸',
    hazardsDescription: '화단에 숨겨진 뾰족한 선인장에 닿지 않도록 주의하세요!',
  },
  {
    id: 2,
    title: 'Stage 2: 네온 시티 & 시간 내 포털 탈출',
    subtitle: '시간 내 출구(빛나는 차원 포털) 찾기 미션',
    description: '미로 같은 네온 시티를 질주하며 자동차, 자전거, 편의점을 흡수해 180cm 이상 성장하고, 시간 내에 도시 끝의 [빛나는 차원 탈출 포털]에 진입하세요!',
    targetDiameterCm: 180.0,
    timeLimitSec: 110.0,
    hasPortalExit: true,
    isPlanetSphere: false,
    allowedTiers: [1, 2, 3, 4],
    themeColor: '#00f5d4',
    badgeIcon: '🌀',
    hazardsDescription: '출구 길목을 지키는 회전 톱날과 가시를 피하고, 황금 시계(+15초)를 모아 시간을 연장하세요!',
  },
  {
    id: 3,
    title: 'Stage 3: 슈퍼 플래닛 구체 월드',
    subtitle: '거대 구체 돔 위에서 메가 빌딩 & 대관람차 흡수',
    description: '우주 속 거대 플래닛 구체 표면 위를 360도 질주하며 고층 아파트, 풍차 타워, 거대 대관람차를 통째로 쓸어 담아 450cm 슈퍼 와뿌볼을 완성하세요!',
    targetDiameterCm: 450.0,
    timeLimitSec: 180.0,
    hasPortalExit: false,
    isPlanetSphere: true,
    allowedTiers: [2, 3, 4, 5],
    themeColor: '#7b2cbf',
    badgeIcon: '🪐',
    hazardsDescription: '행성 궤도를 회전하는 맹렬한 트랩을 피하세요!',
  },
];

export class DimensionPortal {
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly radius: number = 3.5;
  private ring: THREE.Mesh;
  private core: THREE.Mesh;
  private beam: THREE.Mesh;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    // Glowing Neon Torus
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.35, 16, 32), ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 1.0;
    this.mesh.add(this.ring);

    // Swirling Portal Core Vortex
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
    });
    this.core = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.2, 32), coreMat);
    this.core.position.y = 1.0;
    this.mesh.add(this.core);

    // Cosmic Beacon Beam
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.35,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.5, 40.0, 16, 1, true), beamMat);
    this.beam.position.y = 20.0;
    this.mesh.add(this.beam);
  }

  public update(dt: number): void {
    this.ring.rotation.z += dt * 3.0;
    this.core.rotation.y -= dt * 2.5;
    const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.08;
    this.core.scale.set(pulse, 1.0, pulse);
  }

  public checkEntry(ballPos: THREE.Vector3, ballRadius: number): boolean {
    const dx = ballPos.x - this.position.x;
    const dz = ballPos.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    return dist <= this.radius + ballRadius * 0.5 && ballPos.y < 3.5;
  }
}
