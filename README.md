# 🌸 WAFU BALL (와뿌볼)
> **데굴데굴 괴혼(Katamari Damacy) 스타일 3D 롤링 성장 & 말랑 ASMR 스퀴시 샌드박스**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.180-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/ASMR-Web%20Audio%20Procedural-ff4d88.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## 🎮 게임 소개

**WAFU BALL (와뿌볼)**은 도시를 데굴데굴 굴러다니며 사탕, 오리 인형, 자판기, 자동차, 건물까지 삼켜 성장시키는 **괴혼(Katamari Damacy)**식 롤링 메카닉과, 커진 공을 나만의 **와뿌볼(스퀴시/테이프볼/크런치볼)**로 주무르고, 색칠하고, 깨뜨리며 힐링하는 **실시간 ASMR 촉감 스튜디오**가 결합된 3D 웹 게임입니다.

---

## 🌟 핵심 특징 (Key Features)

### 1. 🏙️ 데굴데굴 괴혼 모드 (City Rolling Phase)
- **정밀한 3D 구체 물리 & 관성 회전**: 이동 속도에 비례하는 현실감 넘치는 롤링 모멘텀과 탄성 바운스.
- **단계별 흡수 시스템 (Tiered Absorption)**:
  - **Tier 1 (Tiny: 0.1m ~ 0.35m)**: 롤리팝 사탕, 딸기, 러버덕, 황금 주사위
  - **Tier 2 (Small: 0.4m ~ 1.0m)**: 안전 콘, 음료수 캔, 택배 상자, 고양이
  - **Tier 3 (Medium: 1.2m ~ 2.5m)**: 공원 벤치, 자전거, 음료 자판기, 미니 자동차
  - **Tier 4 (Large: 3.0m ~ 6.0m)**: 벚꽃 나무, 기념 동상
  - **Tier 5 (Huge: > 7.0m)**: 도시 타워 빌딩
- **동적 카메라 줌**: 공이 거대해질수록 카메라가 자연스럽게 줌아웃되어 스케일감과 속도감 극대화.

### 2. 🧪 와뿌볼 촉감 스튜디오 & 절차적 ASMR (Tactile ASMR Studio)
- **100% 절차적 Web Audio ASMR 신디사이저**:
  - 외부 음원 파일 로딩 없이 브라우저 Web Audio API로 실시간 음향 합성 (무한한 피치/질감 변화).
  - 💧 **말랑 젤리 스퀴시 (Squish)**: 저역 공명 스퀠치 + 쫀득한 물방울 방출음
  - 💥 **단단한 외피 스냅 (Crack)**: 바삭하게 부서지는 껍질 파열음
  - 🍬 **슈가 크런치 (Crunch)**: 고주파 미세 파쇄음
  - 🗡️ **매끄러운 슬라이스 (Slice)**: 칼로 표면을 벨 때의 서걱거리는 쾌감 사운드
  - 🎈 **버블 팝 (Pop)**: 풍선 터짐 주파수 급락 + 서브 베이스 타격음
  - 🚜 **지면 롤링 럼블 (Roll Rumble)**: 굴러가는 속도에 실시간 반응하는 저음 진동음
- **정점 스프링-감퍼 물리 젤리 변형 (Deformable Spring Mesh)**:
  - 찌르기(Poke), 쭉 늘리기(Stretch), 칼로 긋기(Slice), 껍질 깨기(Crack), 팡 터뜨리기(Pop) 지원.
  - 속에 흡수된 아이템들이 투명 젤리 내부에 부유하는 디테일한 비주얼.

### 3. 🎨 커스터마이징 & 셰이더 (Customizer & Shaders)
- **6가지 촉감 셰이더 프리셋**:
  1. **실리콘 스퀴시 (Silicone)**: 부드럽고 매끄러운 파스텔 소프트터치
  2. **투명 젤리 (Clear Jelly)**: 굴절/투과율을 살려 내부 흡수물이 비치는 영롱한 투명 질감
  3. **슈가 크런치 (Sugar Crunch)**: 설탕 결정 범프 텍스처
  4. **무지개 테이프볼 (Tape Ball)**: 겹겹이 말아 올린 무지개 줄무늬
  5. **글리터 스파클 (Glitter)**: 빛을 받아 반짝이는 펄 메탈릭 질감
  6. **사이버 네온 (Cyber Neon)**: 발광하는 일렉트릭 펄스
- **10색 팔레트 & 나만의 와뿌볼 도감(Collection) 저장**:
  - 생성한 와뿌볼을 이름, 최대 직경, 흡수 아이템 수와 함께 로컬 저장소에 저장 및 즉시 교체.

### 4. 🔄 커스텀 공으로 도시 재출격 루프
- 스튜디오에서 꾸민 공의 색상, 셰이더 재질, 크기를 그대로 간직한 채 다시 도시에 출격하여 더 큰 물체를 삼키러 나아갈 수 있습니다!

---

## 🕹️ 조작법 (Controls)

| 모드 | 조작키 | 설명 |
|---|---|---|
| **도시 롤링** | `W`, `A`, `S`, `D` 또는 `방향키` | 와뿌볼 굴리기 및 이동 |
| **도시 롤링 (모바일)** | 화면 터치 & 드래그 | 가상 아날로그 조이스틱 조작 |
| **스튜디오 모드** | 마우스 클릭 / 터치 | 선택된 도구(찌르기, 늘리기, 쪼개기 등)로 와뿌볼 가지고 놀기 |
| **모드 전환** | 우측 상단 버튼 | 도시 롤링 ↔ 와뿌볼 스튜디오 자유 전환 |

---

## 💻 설치 및 로컬 실행 (Quick Start)

```bash
# 저장소 복제
git clone https://github.com/Perfect-Yanus/wafu.git
cd wafu

# 의존성 패키지 설치
npm install

# 로컬 개발 서버 실행
npm run dev

# 단위 테스트 실행
npm test

# 프로덕션 빌드
npm run build
```

---

## 📁 프로젝트 구조 (Architecture)

```
wafu/
├── index.html                   # 메인 HTML 및 뷰포트
├── package.json                 # 프로젝트 스크립트 및 의존성
├── tsconfig.json                # TypeScript 엄격 설정
├── vite.config.ts               # Vite & Vitest 설정
├── src/
│   ├── main.ts                  # 메인 엔트리포인트
│   ├── game.ts                  # 마스터 게임 씬 & 렌더링 루프
│   ├── style.css                # 글래스모피즘 UI 스타일
│   ├── audio/
│   │   └── AsmrAudioEngine.ts   # 100% 절차적 Web Audio ASMR 신디사이저
│   ├── physics/
│   │   ├── RollingBall.ts       # 괴혼 롤링 물리 & 동적 부착 성장
│   │   └── AbsorbableItem.ts    # 흡수 가능한 도시 물체 정의
│   ├── world/
│   │   ├── CityWorld.ts         # 도시 환경, 조명, 도로망, 충돌 감지
│   │   └── ItemCatalog.ts       # 5개 티어 15종의 절차적 3D 소품 생성기
│   ├── studio/
│   │   ├── SquishyBallStudio.ts # ASMR 와뿌볼 샌드박스 턴테이블 스튜디오
│   │   └── DeformableMesh.ts    # 스프링-감퍼 정점 젤리 변형 물리
│   ├── customizer/
│   │   ├── Materials.ts         # 젤리/글리터/테이프볼 등 셰이더 프리셋
│   │   ├── CollectionManager.ts # 와뿌볼 도감 로컬스토리지 보관함
│   │   └── BallCustomizer.ts    # 색상/재질/도감 조정 코디네이터
│   ├── state/
│   │   └── GameState.ts         # 도시 <-> 스튜디오 상태 머신
│   └── ui/
│       ├── UIManager.ts         # 글래스모피즘 HUD 및 도구 패널 UI
│       └── TouchJoystick.ts     # 모바일용 가상 아날로그 스틱
└── tests/                       # Vitest 단위/통합 테스트 스위트 (24개 테스트)
```

---

## 📄 라이선스
MIT License
