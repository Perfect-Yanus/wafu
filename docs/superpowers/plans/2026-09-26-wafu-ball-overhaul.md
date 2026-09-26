# WAFU BALL (와뿌볼): 대규모 게임성 개편 및 ASMR 메이커 & 뿌시기 시스템
Implementation Plan

Date: 2026-09-26
Target Repo: `https://github.com/Perfect-Yanus/wafu.git`

## 1. Goal
사용자 피드백을 반영하여 게임의 핵심 재미와 쾌감을 극대화합니다:
1. **공 속도 & 조작감 대폭 개선**:
   - 기본 롤링 속도 2.5배 상향, 즉각적인 가속/핸들링 토크 구현.
   - **스페이스바/버튼 대시(Dash/Boost)** 및 **점프(Jump)** 메카닉 추가.
2. **도시 맵 고도화 & 인터랙티브 가젯 대거 추가**:
   - 경사로(Ramps), 점프대, 고속도로 루프, 광장 계단 지형.
   - **인터랙티브 가젯**: 네온 부스트 패드(Speed Boost Pad), 슈퍼 트램펄린(Trampoline), 부술 수 있는 벽/울타리(Destructible Barriers), 주변 물체 끌어당기는 초자석(Super Magnet).
   - 15종 -> 30종 이상의 다양한 3D 흡수 소품(음식, 장난감, 가전, 탈것, 도시 랜드마크).
3. **와뿌볼 DIY ASMR 만들기 (ASMR Maker Studio)**:
   - 속재료(Filling) DIY 조합 시스템: 개구리알(워터비즈), 스티로폼 폼폼이, 쫀득 슬라임, 바삭 점토 외피, 글리터/스팽글.
   - 속재료에 따라 실시간 햅틱/오디오 음색 및 물리 반응이 완전히 변화하는 하이퍼 ASMR 신디사이저.
4. **와뿌볼 뿌시기 (Smash & Destruction Studio)**:
   - **🔨 슈퍼 해머 (Hammer Smash)**: 화면 흔들림과 함께 껍질을 산산조각 박살 내는 쾌감 ASMR.
   - **⚡ 유압 프레스 (Hydraulic Press)**: 공을 팬케이크처럼 납작하게 짓눌러 젤리/액체를 뿜어내는 압착 ASMR.
   - **🧇 와이어 그릴 커터 (Wire Grid Shredder)**: 깍두기 모양으로 뿜어져 나오는 절단 연출.
   - **💥 메가 폭파 (Mega Pop & Burst)**: 사방으로 알갱이와 슬라임이 터져나간 후 탱글하게 복원.
5. **안드로이드 APK v1.1.0 재빌드 및 GitHub Release 배포**.

---

## 2. Tasks

### Task 1: 공 롤링 물리 대개편 (속도, 가속, 대시 부스트, 점프)
- **Goal**: 공의 기본 속도를 2.5배 높이고, Dash 부스트와 Jump 기능을 구현.
- **Files**:
  - `src/physics/RollingBall.ts`
  - `tests/rollingBall.test.ts`
- **Verification**: `npm test` 통과, 대시/점프 물리 연산 검증.
- **Commit Message**: `feat(physics): overhaul ball rolling with high speed, dash boost and jump mechanics`

---

### Task 2: 도시 맵 확장 & 인터랙티브 가젯 시스템 (부스트 패드, 트램펄린, 파괴 벽, 자석)
- **Goal**: 도시 맵에 다양한 인터랙티브 기믹과 가젯을 배치하고 충돌/상호작용 구현.
- **Files**:
  - `src/world/CityGadgets.ts`
  - `src/world/ItemCatalog.ts`
  - `src/world/CityWorld.ts`
  - `tests/cityGadgets.test.ts`
- **Verification**: 부스트 패드 가속, 트램펄린 점프, 파괴 벽 파괴 테스트.
- **Commit Message**: `feat(world): add interactive city gadgets, ramps, trampolines, destructible walls, and expand prop catalog`

---

### Task 3: ASMR 사운드 신디사이저 확장 (해머 스매시, 유압 프레스, 워터비즈 팝, 슬라임 스퀠치)
- **Goal**: '뿌시기' 및 '와뿌볼 DIY 재료' 전용 고해상도 절차적 ASMR 사운드 추가.
- **Files**:
  - `src/audio/AsmrAudioEngine.ts`
  - `tests/audio.test.ts`
- **Verification**: 신규 ASMR 사운드(망치 타격, 유압 압착, 폼폼이 지글지글, 워터비즈 뽁뽁) 유닛 테스트.
- **Commit Message**: `feat(audio): expand asmr engine with hammer smash, hydraulic crush, and floam crunch synthesis`

---

### Task 4: 와뿌볼 DIY 만들기 & 속재료(Fillings) 시스템 구현
- **Goal**: 워터비즈, 점토 외피, 폼폼이, 슬라임, 글리터를 직접 골라 채워 넣고 질감과 소리가 바뀌는 DIY 메이커 구현.
- **Files**:
  - `src/studio/WafuMaker.ts`
  - `src/customizer/Materials.ts`
  - `tests/wafuMaker.test.ts`
- **Verification**: 속재료 조합 및 셰이더/파티클/사운드 연동 테스트.
- **Commit Message**: `feat(studio): implement wafu ball diy asmr maker with custom fillings and crusts`

---

### Task 5: 와뿌볼 뿌시기 시스템 (해머 스매시, 유압 프레스, 와이어 커터)
- **Goal**: 스튜디오에서 망치로 박살 내거나 유압 프레스로 짓누르는 화려한 파괴 애니메이션과 파티클 연출 구현.
- **Files**:
  - `src/studio/SquishyBallStudio.ts`
  - `src/studio/DeformableMesh.ts`
  - `tests/deformableMesh.test.ts`
- **Verification**: 유압 압착 및 망치 타격 변형 공식 테스트.
- **Commit Message**: `feat(studio): implement destruction tools including heavy hammer smash and hydraulic press`

---

### Task 6: UI/UX 및 모바일 조작 개편 (대시/점프 버튼, 파괴 툴바, DIY 패널)
- **Goal**: 화면에 대시/점프 버튼, 뿌시기 도구 모음, DIY 속재료 패널, 속도 게이지 추가.
- **Files**:
  - `src/ui/UIManager.ts`
  - `src/ui/TouchJoystick.ts`
  - `src/game.ts`
  - `src/style.css`
- **Verification**: UI 렌더링 및 모드별 조작 완결성 검증.
- **Commit Message**: `feat(ui): update glassmorphic ui with boost/jump controls, destruction tools, and diy panel`

---

### Task 7: 통합 검증, Android APK v1.1.0 컴파일 및 GitHub Release 배포
- **Goal**: 전체 테스트 통과 및 APK 빌드 후 깃허브 릴리즈 업로드.
- **Files**:
  - `package.json`
  - `android/app/build.gradle`
  - `release/wafu-ball-v1.1.0.apk`
  - `README.md`
- **Verification**: `npm test` 및 `./gradlew assembleDebug` 성공, 릴리즈 다운로드 URL 생성.
- **Commit Message**: `chore: release wafu ball v1.1.0 android apk`
