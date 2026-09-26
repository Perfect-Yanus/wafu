import * as THREE from 'three';
import { AbsorbableItem } from '../physics/AbsorbableItem';

export type ItemType =
  | 'candy'
  | 'strawberry'
  | 'duck'
  | 'dice'
  | 'donut'
  | 'bowling'
  | 'coin'
  | 'cone'
  | 'can'
  | 'box'
  | 'cat'
  | 'burger'
  | 'pizza'
  | 'skateboard'
  | 'hydrant'
  | 'bench'
  | 'bicycle'
  | 'vending'
  | 'car'
  | 'arcade'
  | 'motorcycle'
  | 'speaker'
  | 'laptop'
  | 'tree'
  | 'statue'
  | 'policecar'
  | 'busstop'
  | 'windmill'
  | 'building'
  | 'ferriswheel';

interface ItemTemplate {
  type: ItemType;
  name: string;
  tier: number;
  radius: number;
  mass: number;
  builder: (color?: number) => THREE.Object3D;
}

export class ItemCatalog {
  private templates: Map<ItemType, ItemTemplate> = new Map();
  private idCounter: number = 0;

  constructor() {
    this.registerTemplates();
  }

  private registerTemplates(): void {
    // ---------------- TIER 1: TINY (0.1m ~ 0.35m) ----------------
    this.templates.set('candy', {
      type: 'candy',
      name: '롤리팝 사탕 (Candy)',
      tier: 1,
      radius: 0.22,
      mass: 0.15,
      builder: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.2 });
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
        const stickMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), stickMat);
        stick.position.y = -0.15;
        group.add(sphere);
        group.add(stick);
        return group;
      },
    });

    this.templates.set('strawberry', {
      type: 'strawberry',
      name: '새콤 딸기 (Strawberry)',
      tier: 1,
      radius: 0.18,
      mass: 0.1,
      builder: () => {
        const group = new THREE.Group();
        const berryMat = new THREE.MeshStandardMaterial({ color: 0xee1133, roughness: 0.4 });
        const berry = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.25, 12), berryMat);
        berry.rotation.x = Math.PI;
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x22aa33 });
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6), stemMat);
        stem.position.y = 0.13;
        group.add(berry);
        group.add(stem);
        return group;
      },
    });

    this.templates.set('duck', {
      type: 'duck',
      name: '러버덕 (Rubber Duck)',
      tier: 1,
      radius: 0.28,
      mass: 0.2,
      builder: () => {
        const group = new THREE.Group();
        const yellow = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), yellow);
        body.scale.set(1, 0.8, 1.2);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), yellow);
        head.position.set(0, 0.18, 0.1);
        const beak = new THREE.Mesh(
          new THREE.ConeGeometry(0.06, 0.12, 8),
          new THREE.MeshStandardMaterial({ color: 0xff6600 })
        );
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.18, 0.22);
        group.add(body);
        group.add(head);
        group.add(beak);
        return group;
      },
    });

    this.templates.set('dice', {
      type: 'dice',
      name: '황금 주사위 (Lucky Dice)',
      tier: 1,
      radius: 0.2,
      mass: 0.25,
      builder: () => {
        const diceMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.5, roughness: 0.2 });
        return new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), diceMat);
      },
    });

    // ---------------- TIER 2: SMALL (0.4m ~ 1.0m) ----------------
    this.templates.set('cone', {
      type: 'cone',
      name: '안전 콘 (Traffic Cone)',
      tier: 2,
      radius: 0.45,
      mass: 0.8,
      builder: () => {
        const group = new THREE.Group();
        const orange = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.4 });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 14), orange);
        cone.position.y = 0.35;
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), orange);
        base.position.y = 0.025;
        const stripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.17, 0.15, 14),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
        );
        stripe.position.y = 0.32;
        group.add(base);
        group.add(cone);
        group.add(stripe);
        return group;
      },
    });

    this.templates.set('can', {
      type: 'can',
      name: '음료수 캔 (Soda Can)',
      tier: 2,
      radius: 0.38,
      mass: 0.5,
      builder: () => {
        const mat = new THREE.MeshStandardMaterial({ color: 0x0088ff, metalness: 0.7, roughness: 0.3 });
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), mat);
        can.position.y = 0.25;
        return can;
      },
    });

    this.templates.set('box', {
      type: 'box',
      name: '택배 상자 (Delivery Box)',
      tier: 2,
      radius: 0.5,
      mass: 1.2,
      builder: () => {
        const mat = new THREE.MeshStandardMaterial({ color: 0xc89d6c, roughness: 0.8 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), mat);
        box.position.y = 0.25;
        return box;
      },
    });

    this.templates.set('cat', {
      type: 'cat',
      name: '식빵 굽는 고양이 (Cat)',
      tier: 2,
      radius: 0.55,
      mass: 1.5,
      builder: () => {
        const group = new THREE.Group();
        const white = new THREE.MeshStandardMaterial({ color: 0xf5eedb, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), white);
        body.scale.set(1, 0.8, 1.4);
        body.position.y = 0.24;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), white);
        head.position.set(0, 0.4, 0.3);
        group.add(body);
        group.add(head);
        return group;
      },
    });

    // ---------------- TIER 3: MEDIUM (1.2m ~ 2.5m) ----------------
    this.templates.set('bench', {
      type: 'bench',
      name: '공원 벤치 (Park Bench)',
      tier: 3,
      radius: 1.2,
      mass: 5.0,
      builder: () => {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });

        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.6), woodMat);
        seat.position.y = 0.5;
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), woodMat);
        back.position.set(0, 0.8, -0.25);

        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5), metalMat);
        leg1.position.set(0.7, 0.25, 0.2);
        const leg2 = leg1.clone();
        leg2.position.set(-0.7, 0.25, 0.2);
        const leg3 = leg1.clone();
        leg3.position.set(0.7, 0.25, -0.2);
        const leg4 = leg1.clone();
        leg4.position.set(-0.7, 0.25, -0.2);

        group.add(seat, back, leg1, leg2, leg3, leg4);
        return group;
      },
    });

    this.templates.set('bicycle', {
      type: 'bicycle',
      name: '자전거 (Bicycle)',
      tier: 3,
      radius: 1.1,
      mass: 4.0,
      builder: () => {
        const group = new THREE.Group();
        const metal = new THREE.MeshStandardMaterial({ color: 0x00cc88, metalness: 0.6, roughness: 0.3 });
        const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

        const wheel1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 16), black);
        wheel1.position.set(0, 0.35, 0.7);
        const wheel2 = wheel1.clone();
        wheel2.position.set(0, 0.35, -0.7);

        const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4), metal);
        frame.rotation.x = Math.PI / 2;
        frame.position.set(0, 0.55, 0);

        group.add(wheel1, wheel2, frame);
        return group;
      },
    });

    this.templates.set('vending', {
      type: 'vending',
      name: '자판기 (Vending Machine)',
      tier: 3,
      radius: 1.4,
      mass: 8.0,
      builder: () => {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.8), bodyMat);
        body.position.y = 0.9;
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1 });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.05), glassMat);
        glass.position.set(0, 1.1, 0.41);
        group.add(body, glass);
        return group;
      },
    });

    this.templates.set('car', {
      type: 'car',
      name: '미니 자동차 (Compact Car)',
      tier: 3,
      radius: 1.8,
      mass: 12.0,
      builder: () => {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb703, metalness: 0.2, roughness: 0.3 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 2.8), bodyMat);
        body.position.y = 0.65;
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 1.5), bodyMat);
        cabin.position.set(0, 1.25, -0.2);

        const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), wheelMat);
        w1.rotation.z = Math.PI / 2;
        w1.position.set(0.85, 0.28, 0.8);
        const w2 = w1.clone();
        w2.position.set(-0.85, 0.28, 0.8);
        const w3 = w1.clone();
        w3.position.set(0.85, 0.28, -0.8);
        const w4 = w1.clone();
        w4.position.set(-0.85, 0.28, -0.8);

        group.add(body, cabin, w1, w2, w3, w4);
        return group;
      },
    });

    // ---------------- TIER 4: LARGE (3.0m ~ 6.0m) ----------------
    this.templates.set('tree', {
      type: 'tree',
      name: '벚꽃 나무 (Cherry Tree)',
      tier: 4,
      radius: 3.2,
      mass: 25.0,
      builder: () => {
        const group = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.2, 8), trunkMat);
        trunk.position.y = 1.6;

        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffa8ba, roughness: 0.6 });
        const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12), pinkMat);
        foliage1.position.y = 3.6;
        foliage1.scale.set(1.2, 0.9, 1.2);
        group.add(trunk, foliage1);
        return group;
      },
    });

    this.templates.set('statue', {
      type: 'statue',
      name: '도시 기념 동상 (Bronze Statue)',
      tier: 4,
      radius: 3.5,
      mass: 30.0,
      builder: () => {
        const group = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.0), baseMat);
        base.position.y = 0.6;
        const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: 0.8, roughness: 0.3 });
        const figure = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.8, 8), bronzeMat);
        figure.position.y = 2.6;
        group.add(base, figure);
        return group;
      },
    });

    // ---------------- TIER 5: HUGE (>7.0m) ----------------
    this.templates.set('building', {
      type: 'building',
      name: '시티 타워 빌딩 (City Tower)',
      tier: 5,
      radius: 7.5,
      mass: 120.0,
      builder: () => {
        const group = new THREE.Group();
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x6096ba, roughness: 0.4 });
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(6.0, 12.0, 6.0), wallMat);
        bldg.position.y = 6.0;
        group.add(bldg);
        return group;
      },
    });

    // ---------------- NEW TIER 1 ----------------
    this.templates.set('donut', {
      type: 'donut',
      name: '스트로베리 도넛 (Donut)',
      tier: 1,
      radius: 0.22,
      mass: 0.18,
      builder: () => {
        const mat = new THREE.MeshStandardMaterial({ color: 0xff66aa, roughness: 0.3 });
        return new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.08, 12, 24), mat);
      },
    });

    this.templates.set('bowling', {
      type: 'bowling',
      name: '볼링 핀 (Bowling Pin)',
      tier: 1,
      radius: 0.25,
      mass: 0.22,
      builder: () => {
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.45, 12), mat);
        pin.position.y = 0.22;
        return pin;
      },
    });

    this.templates.set('coin', {
      type: 'coin',
      name: '슈퍼 골드 코인 (Gold Coin)',
      tier: 1,
      radius: 0.2,
      mass: 0.25,
      builder: () => {
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), mat);
        coin.rotation.x = Math.PI / 2;
        return coin;
      },
    });

    // ---------------- NEW TIER 2 ----------------
    this.templates.set('burger', {
      type: 'burger',
      name: '빅 치즈버거 (Cheeseburger)',
      tier: 2,
      radius: 0.45,
      mass: 0.8,
      builder: () => {
        const group = new THREE.Group();
        const bunMat = new THREE.MeshStandardMaterial({ color: 0xdf9755, roughness: 0.6 });
        const meatMat = new THREE.MeshStandardMaterial({ color: 0x5a2d0c });
        const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });

        const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bunMat);
        topBun.position.y = 0.22;
        const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 12), meatMat);
        patty.position.y = 0.12;
        const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.45), cheeseMat);
        cheese.position.y = 0.18;
        const btmBun = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 12), bunMat);
        btmBun.position.y = 0.04;

        group.add(topBun, patty, cheese, btmBun);
        return group;
      },
    });

    this.templates.set('pizza', {
      type: 'pizza',
      name: '페퍼로니 피자 (Pizza Slice)',
      tier: 2,
      radius: 0.48,
      mass: 0.7,
      builder: () => {
        const mat = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.5 });
        const slice = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 3), mat);
        slice.rotation.x = Math.PI / 2;
        slice.position.y = 0.1;
        return slice;
      },
    });

    this.templates.set('skateboard', {
      type: 'skateboard',
      name: '스케이트보드 (Skateboard)',
      tier: 2,
      radius: 0.55,
      mass: 1.1,
      builder: () => {
        const group = new THREE.Group();
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x3a86ff, roughness: 0.4 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

        const deck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.8), deckMat);
        deck.position.y = 0.12;
        const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), wheelMat);
        w1.rotation.z = Math.PI / 2;
        w1.position.set(0.12, 0.06, 0.25);
        const w2 = w1.clone();
        w2.position.set(-0.12, 0.06, 0.25);
        const w3 = w1.clone();
        w3.position.set(0.12, 0.06, -0.25);
        const w4 = w1.clone();
        w4.position.set(-0.12, 0.06, -0.25);

        group.add(deck, w1, w2, w3, w4);
        return group;
      },
    });

    this.templates.set('hydrant', {
      type: 'hydrant',
      name: '빨간 소화전 (Fire Hydrant)',
      tier: 2,
      radius: 0.5,
      mass: 1.4,
      builder: () => {
        const mat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.4 });
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.7, 12), mat);
        cyl.position.y = 0.35;
        return cyl;
      },
    });

    // ---------------- NEW TIER 3 ----------------
    this.templates.set('arcade', {
      type: 'arcade',
      name: '레트로 오락기 (Arcade Cabinet)',
      tier: 3,
      radius: 1.3,
      mass: 6.5,
      builder: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x7209b7, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), mat);
        body.position.y = 0.8;
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0x4cc9f0, emissiveIntensity: 0.4 });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), screenMat);
        screen.position.set(0, 1.1, 0.41);
        group.add(body, screen);
        return group;
      },
    });

    this.templates.set('motorcycle', {
      type: 'motorcycle',
      name: '스피드 오토바이 (Motorcycle)',
      tier: 3,
      radius: 1.4,
      mass: 7.0,
      builder: () => {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0055, metalness: 0.7 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.6), bodyMat);
        body.position.y = 0.6;
        const fw = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), wheelMat);
        fw.position.set(0, 0.3, 0.7);
        const rw = fw.clone();
        rw.position.set(0, 0.3, -0.7);
        group.add(body, fw, rw);
        return group;
      },
    });

    this.templates.set('speaker', {
      type: 'speaker',
      name: '파티 스피커 (Sound Speaker)',
      tier: 3,
      radius: 1.1,
      mass: 4.5,
      builder: () => {
        const mat = new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.5 });
        const spk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.6), mat);
        spk.position.y = 0.6;
        return spk;
      },
    });

    this.templates.set('laptop', {
      type: 'laptop',
      name: '게이밍 노트북 (Laptop)',
      tier: 3,
      radius: 1.0,
      mass: 3.5,
      builder: () => {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x4a4e69, metalness: 0.6 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.6), mat);
        base.position.y = 0.025;
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.05), mat);
        screen.position.set(0, 0.28, -0.28);
        screen.rotation.x = 0.2;
        group.add(base, screen);
        return group;
      },
    });

    // ---------------- NEW TIER 4 ----------------
    this.templates.set('policecar', {
      type: 'policecar',
      name: '순찰 경찰차 (Police Car)',
      tier: 4,
      radius: 3.2,
      mass: 22.0,
      builder: () => {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const sirenMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 3.2), bodyMat);
        body.position.y = 0.65;
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 1.6), whiteMat);
        cabin.position.set(0, 1.2, -0.1);
        const siren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.2), sirenMat);
        siren.position.set(0, 1.6, -0.1);

        group.add(body, cabin, siren);
        return group;
      },
    });

    this.templates.set('busstop', {
      type: 'busstop',
      name: '버스 정류장 쉘터 (Bus Stop)',
      tier: 4,
      radius: 3.0,
      mass: 18.0,
      builder: () => {
        const group = new THREE.Group();
        const metal = new THREE.MeshStandardMaterial({ color: 0x2b2d42 });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 1.6), metal);
        roof.position.set(0, 2.4, 0);
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), metal);
        p1.position.set(1.2, 1.2, 0.6);
        const p2 = p1.clone();
        p2.position.set(-1.2, 1.2, 0.6);
        group.add(roof, p1, p2);
        return group;
      },
    });

    this.templates.set('windmill', {
      type: 'windmill',
      name: '바람개비 풍차 (Windmill)',
      tier: 4,
      radius: 3.8,
      mass: 28.0,
      builder: () => {
        const group = new THREE.Group();
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xf4f1de, roughness: 0.7 });
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 4.0, 8), towerMat);
        tower.position.y = 2.0;

        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe07a5f });
        const blade = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 0.05), bladeMat);
        blade.position.set(0, 3.8, 0.65);
        group.add(tower, blade);
        return group;
      },
    });

    // ---------------- NEW TIER 5 ----------------
    this.templates.set('ferriswheel', {
      type: 'ferriswheel',
      name: '거대 대관람차 (Giant Ferris Wheel)',
      tier: 5,
      radius: 8.5,
      mass: 150.0,
      builder: () => {
        const group = new THREE.Group();
        const metal = new THREE.MeshStandardMaterial({ color: 0xff006e, metalness: 0.6 });
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(6.0, 0.25, 8, 32), metal);
        wheel.position.set(0, 7.0, 0);

        const support1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 8.0), metal);
        support1.rotation.z = 0.3;
        support1.position.set(-2.0, 4.0, 0);
        const support2 = support1.clone();
        support2.rotation.z = -0.3;
        support2.position.set(2.0, 4.0, 0);

        group.add(wheel, support1, support2);
        return group;
      },
    });
  }

  public createItem(type: ItemType, tierOverride?: number, position?: THREE.Vector3): AbsorbableItem {
    const tmpl = this.templates.get(type);
    if (!tmpl) {
      throw new Error(`Unknown item type: ${type}`);
    }

    const mesh = tmpl.builder();
    if (position) {
      mesh.position.copy(position);
    }

    // Enable shadows on all child meshes
    mesh.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    this.idCounter++;
    const item = new AbsorbableItem({
      id: `${type}-${this.idCounter}`,
      name: tmpl.name,
      tier: tierOverride ?? tmpl.tier,
      radius: tmpl.radius,
      mass: tmpl.mass,
      mesh,
    });

    return item;
  }

  public getRandomTypeForTier(tier: number): ItemType {
    const matched: ItemType[] = [];
    for (const [t, tmpl] of this.templates) {
      if (tmpl.tier === tier) {
        matched.push(t);
      }
    }
    if (matched.length === 0) return 'candy';
    return matched[Math.floor(Math.random() * matched.length)];
  }
}
