# Wall Collision, Object Distinction, and Slowdown Feedback Plan

## Overview
Address user complaints:
1. "벽인데 통과 가능한곳도 있고": Maze walls, barricades, and fountain were meshes without collision. Ball passed through like a ghost.
2. "공이 갑자기 느려지기도 하는데 설명이없으니 모르겠어": Bumping into unabsorbable objects silently multiplied velocity by -0.25 every frame without explanation, sound, or visual cue.
3. "객체도 흡수되는게있곺안되는게있고 장애물인거도있고 한데 구분이 어려워": No visual distinction between absorbable items, unabsorbable items, and shrinking hazards.

## Tasks

### Task 1: Static Obstacle Collision System for Maze Walls, Barricades & Fountain
- **Files**: `src/world/CityWorld.ts`, `src/world/CityGadgets.ts`
- **Steps**:
  1. Define `ObstacleCollider` (AABB boxes and cylinders) in `CityWorld.ts`.
  2. Register all hedge maze walls, alley barricades, fountain, and perimeter walls as static colliders.
  3. Implement circle-box and circle-cylinder collision resolution with normal push-out and bounce.
  4. Fix `DestructibleWall` 2D box collision so lateral impacts don't clip through.
  5. Add sound effect `asmrAudio.playWallBump()`.
- **Verification**: Tests checking that the ball cannot pass through hedge maze walls and barricades.

### Task 2: Elastic Bounce & Explanatory Feedback on Unabsorbable Objects
- **Files**: `src/world/CityWorld.ts`, `src/audio/AsmrAudioEngine.ts`, `src/ui/UIManager.ts`, `src/game.ts`
- **Steps**:
  1. Add `playBounceHeavy()` and `playWallBump()` in `AsmrAudioEngine.ts`.
  2. In `CityWorld.ts:checkCollisions()`, replace silent velocity siphoning (`vel *= -0.25`) with elastic bounce and callback `onObjectBlocked(itemName, reqCm, curCm)`.
  3. In `UIManager.ts`, show floating feedback toast `"🧱 [아이템명]은 너무 무거워요! (현재: Xcm / 필요: Ycm)"` with throttle.
- **Verification**: Tests ensuring unabsorbable items bounce ball back and trigger `onObjectBlocked`.

### Task 3: Visual Distinction System for Absorbable, Too-Big, and Hazard Objects
- **Files**: `src/world/Hazards.ts`, `src/world/CityWorld.ts`, `src/ui/UIManager.ts`, `src/style.css`
- **Steps**:
  1. In `Hazards.ts`, add prominent pulsating danger beacon rings and floating `⚠️ DANGER` overhead signs.
  2. In `CityWorld.ts`, create a Proximity Indicator Manager that renders a soft green ring around nearby absorbable items and an amber locked ring around unabsorbable items.
  3. In `UIManager.ts`, add a HUD legend bar: `🟢 흡수가능 ｜ 🟠 너무큼 (튕김) ｜ ⚠️ 위험함 (크기축소)`.
  4. Add screen damage flash vignette when hitting hazards.
- **Verification**: Visual checks and unit tests for hazard danger markers and proximity indicator updates.

### Task 4: Unit Tests & Build & Release
- **Files**: `tests/cityWorldCollisions.test.ts`, `package.json`, `android/app/build.gradle`
- **Steps**:
  1. Write and run tests with Vitest.
  2. Build Android APK v1.3.3.
  3. Tag and publish GitHub Release v1.3.3 with APK asset.
