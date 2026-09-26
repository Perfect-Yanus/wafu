# Implementation Plan: Wafu Ball v1.2.0 (Speed 10x, Hazards & Shrink, Timer Challenge, Multi-touch Fix)

**Goal**: Upgrade Wafu Ball into an ultra-fast, thrilling Katamari arcade experience with ~10x speed, hazards that shrink the ball (cactus, spikes, sawblades), time attack challenge mode, responsive simultaneous multi-touch joystick + action buttons, and release Android APK v1.2.0.

---

### Proposed Changes

#### 1. Audio Engine (`src/audio/AsmrAudioEngine.ts`)
- Add `playPuncture()`: sharp prick sound + high-pressure air hiss + rubber deflation ASMR.
- Add `playTimeBonus()`: pleasant magical chime chime ASMR for picking up bonus hourglasses/clocks.
- Add `playTimeWarning()`: urgent tick-tock heartbeat ASMR when time is running low (< 15s).

#### 2. Physics & Ball (`src/physics/RollingBall.ts`)
- Boost base movement parameters:
  - `maxSpeed = 180.0` (with logarithmic radius scaling up to 260+).
  - Boost max speed up to `330.0`.
  - `moveForce = 950.0` (high responsiveness and snappy turns).
  - `jumpStrength = 18.0`, `gravity = -36.0`.
- Add ball shrinkage and damage methods:
  - `shrink(fraction: number = 0.2)`: reduces `targetRadius` by fraction (down to minimum `0.5m`), sheds 1-3 absorbed items back into the world, triggers `playPuncture()`.
  - Add `invulnerableTimer: number`: 1.2s invulnerability after being punctured with visual blinking.
  - Add `isInvulnerable(): boolean`, `getInvulnerableTimer(): number`.

#### 3. Hazards System (`src/world/Hazards.ts`)
- Procedural 3D Hazard classes:
  - `CactusHazard`: 3D desert saguaro cactus with prickly needle spikes.
  - `SpikeTrapHazard`: Metallic ground spike plate with pulsing/sharp spikes.
  - `SawbladeHazard`: Circular spinning sawblade with rotating teeth.
  - `TimeBonusItem`: Floating rotating golden hourglass / clock (+15s time bonus).
- Collision detection against `RollingBall` in `CityWorld.ts`.

#### 4. Game State & Time Limit System (`src/state/GameState.ts`)
- Add challenge mode state:
  - `challengeMode: boolean` (toggleable between Time Attack and Free Roll).
  - `timeRemaining: number` (starts at 120s or 150s).
  - `targetDiameterCm: number` (e.g. 250cm or 300cm).
  - `isGameOver: boolean`, `isVictory: boolean`.
- Methods to tick timer, add bonus time, start/restart challenge, toggle challenge mode.

#### 5. Multi-touch Controls Fix (`src/ui/UIManager.ts`, `src/ui/TouchJoystick.ts`, `src/style.css`)
- Bind `#btn-city-jump` and `#btn-city-boost` to `touchstart` events with `e.preventDefault()` and `e.stopPropagation()` in addition to `click`.
- Ensure buttons have `touch-action: none; user-select: none;` in CSS.
- Ensure `TouchJoystick` cleanly tracks only its assigned `touchId` without conflicting with multi-finger button taps.

#### 6. HUD & Modals (`src/ui/UIManager.ts`, `src/style.css`)
- Display Timer countdown badge with warning pulsation when < 20s.
- Display Challenge Target badge (e.g. `🎯 목표: 250cm`).
- Mode toggle button in HUD (`[⏱️ 도전 모드]` / `[♾️ 자유 모드]`).
- Game Over & Victory popups with Restart / Free Roll buttons.
- Hazard damage floating toast / particle effect on puncture.

#### 7. Game Camera & Dynamic FOV (`src/game.ts`)
- Dynamic camera FOV scaling from 50° up to 68° based on ball speed for high-speed velocity feedback.
- Hazard collision & time bonus pickup check in the update loop.

---

### Verification Plan
1. **Vitest Unit Tests**:
   - `tests/hazards.test.ts`: test hazard instantiation, collision detection, ball shrinkage, invulnerability timer.
   - `tests/timer.test.ts`: test challenge timer countdown, bonus time addition, victory/game over conditions.
   - `tests/rollingBall.test.ts`: update/add tests for speed parameters and `shrink()` method.
2. **Build**:
   - `npm run build`: ensure Vite TypeScript bundle succeeds without errors.
3. **Android APK**:
   - Run `npx cap sync android`.
   - Compile `./gradlew assembleDebug` in `android/`.
   - Verify APK file size and architecture.
   - Upload to GitHub Releases `v1.2.0` and output the direct download link.
