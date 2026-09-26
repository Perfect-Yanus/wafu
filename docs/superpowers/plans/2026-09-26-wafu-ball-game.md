# WAFU BALL (와뿌볼): Katamari Damacy Rolling & Squishy ASMR Sandbox Game
Implementation Plan

Date: 2026-09-26
Target Repo: `https://github.com/Perfect-Yanus/wafu.git`

## 1. Goal
Build a high-performance 3D Web game inspired by Katamari Damacy (데굴데굴 괴혼) and Wafu Ball (와뿌볼 / 스퀴시 / 크런치 볼), featuring:
1. **City Rolling Phase (괴혼 모드)**: Roll a squishy ball in a vibrant 3D city to absorb smaller objects, progressively scaling in radius, mass, and absorption tier.
2. **Wafu Ball Tactile & ASMR Mode (와뿌볼 촉감 스튜디오)**: Take the grown ball into a tactile sandbox. Poke, stretch, squish, slice, and pop with real-time procedural Web Audio ASMR sounds (crunchy cracks, squishy jelly, slime sizzle, satisfying pops).
3. **Customization & Coloring (컬러링 및 재질 커스텀)**: Paint custom colors, apply jelly/glitter/matte/holographic shaders, and save creations to the Ball Collection Gallery.
4. **City Loopback (커스텀 공으로 재출격)**: Take the customized Wafu Ball back into the city with all custom visual styles and size bonuses intact.
5. **Git & Deployment Integration**: Linked to `https://github.com/Perfect-Yanus/wafu.git`.

---

## 2. Architecture & Modules
- `src/audio/AsmrAudioEngine.ts`: 100% procedural Web Audio API synthesizer for squish, crunch, crack, pop, roll rumble, slice, and celebrate.
- `src/physics/RollingBall.ts`: Katamari Damacy physics ball, inertia, dynamic radius, stick-to-sphere absorption hierarchy, and mesh attachment.
- `src/world/CityWorld.ts`: Procedural/modular city layout with roads, parks, tiered props (fruits, toys, furniture, vehicles, buildings).
- `src/studio/SquishyBallStudio.ts`: Interactive vertex deformation, spring-damper jiggle, pinch & stretch physics, slice decals, and pop confetti.
- `src/customizer/BallCustomizer.ts`: Color picker, texture paint, shader material switching (Clear Jelly, Glitter Sparkle, Matte Rubber, Bubble Ball), and local storage collection.
- `src/ui/UIManager.ts`: Responsive glassmorphism UI HUD, touch joystick for mobile, mode switches, audio toggles, and collection drawer.
- `src/game.ts`: Master game loop orchestrating City Mode <-> Studio Mode state machines.

---

## 3. Tasks

### Task 1: Project Scaffolding & Build Pipeline
- **Goal**: Initialize Vite + TypeScript + Three.js + Vitest environment with strict TypeScript and ESLint configuration.
- **Files**:
  - `package.json`
  - `tsconfig.json`
  - `vite.config.ts`
  - `index.html`
  - `tests/setup.ts`
  - `tests/sanity.test.ts`
- **Steps**:
  1. Initialize `package.json` with scripts (`dev`, `build`, `test`, `preview`).
  2. Install `three`, `@types/three`, `vitest`, `typescript`, `vite`.
  3. Configure `vite.config.ts` and `tsconfig.json`.
  4. Write initial sanity test and run `npm test`.
- **Verification**: `npm run test` passes, `npm run build` succeeds.
- **Commit Message**: `chore: initialize project scaffolding with vite, three.js and vitest`

---

### Task 2: Procedural Web Audio ASMR Engine
- **Goal**: Create a standalone procedural ASMR sound synthesizer using Web Audio API (zero audio file dependencies, instant load, infinite pitch/timbre variations).
- **Files**:
  - `src/audio/AsmrAudioEngine.ts`
  - `tests/audio.test.ts`
- **Steps**:
  1. Implement AudioContext manager with user-gesture unlock.
  2. Synthesize `playSquish(intensity)`: Low-pass filtered noise + resonant sine drop + fluid envelope.
  3. Synthesize `playCrunch(intensity)`: High-frequency transient burst + micro-crackle clicks.
  4. Synthesize `playCrack()`: Brittle snapping noise with decaying resonance.
  5. Synthesize `playPop()`: Pitch-envelope sweep (frequency drops 400Hz -> 80Hz) + burst pop.
  6. Synthesize `playSlice()`: Crisp slicing white noise sweep.
  7. Synthesize `updateRollRumble(speed, surfaceType)`: Continuous granular rumble loop.
  8. Synthesize `playAbsorb(tier)`: Joyful ascending chime + squelch.
- **Verification**: Unit tests verifying node connection and scheduling; interactive browser check.
- **Commit Message**: `feat(audio): implement procedural web audio asmr sound synthesizer`

---

### Task 3: Katamari Rolling Physics & Object Absorption Engine
- **Goal**: Implement 3D rolling physics for the player's ball and real-time absorption of objects matching Katamari Damacy mechanics.
- **Files**:
  - `src/physics/RollingBall.ts`
  - `src/physics/AbsorbableItem.ts`
  - `tests/rollingBall.test.ts`
- **Steps**:
  1. Create `RollingBall` class with position, velocity, angular velocity, and dynamic radius `R`.
  2. Calculate realistic rolling rotation matching linear velocity (`ω = v / R`).
  3. Implement collision detection against absorbable objects based on size threshold (Ball must be > 1.2x item size).
  4. When absorbed: Play absorb ASMR sound, attach object mesh to Ball's local coordinate space at point of contact, update total mass and radius.
  5. Dynamically adjust camera distance and height smoothly as the ball grows.
- **Verification**: Unit tests for size thresholds, growth calculation, and local position preservation.
- **Commit Message**: `feat(physics): implement katamari damacy rolling physics and stick-absorption system`

---

### Task 4: City World & Tiered Object Generation
- **Goal**: Create an engaging 3D city populated with hundreds of interactive tiered objects.
- **Files**:
  - `src/world/CityWorld.ts`
  - `src/world/ItemCatalog.ts`
  - `tests/cityWorld.test.ts`
- **Steps**:
  1. Build `ItemCatalog` defining tiers:
     - Tier 1 (Tiny: 0.1m - 0.4m): Candies, coins, dice, apples, rubber ducks, pins.
     - Tier 2 (Small: 0.5m - 1.2m): Traffic cones, trash cans, stools, basketballs, cats, cardboard boxes.
     - Tier 3 (Medium: 1.5m - 3.5m): Bicycles, benches, vending machines, streetlamps, small cars.
     - Tier 4 (Large: 4.0m - 10.0m): Vans, food trucks, trees, statues, fountains.
     - Tier 5 (Huge: >10m): Buildings, bridges, monuments.
  2. Build procedural 3D models with Three.js geometries and rich stylized colors.
  3. Construct city grid with ground plane, roads, sidewalks, park zones, and boundary barriers.
  4. Implement spatial grid or quadtree query for fast collision detection.
- **Verification**: Automated test checking correct tier assignment and object population.
- **Commit Message**: `feat(world): create 3d city environment and tiered absorbable prop catalog`

---

### Task 5: Wafu Ball Tactile Studio & Squishy Physics
- **Goal**: Build the interactive Wafu Ball tactile studio where players poke, stretch, squish, slice, and crack their ball with real-time soft-body jiggle and ASMR feedback.
- **Files**:
  - `src/studio/SquishyBallStudio.ts`
  - `src/studio/DeformableMesh.ts`
  - `tests/deformableMesh.test.ts`
- **Steps**:
  1. Create `DeformableMesh` subclass of Three.js `Mesh` with original vertex buffer and dynamic displacement offsets with spring-damper relaxation.
  2. Implement Raycast interaction for mouse/touch:
     - **Poke / Squeeze**: Displace vertices inward at hit point with gaussian falloff; play `squish` ASMR.
     - **Pinch & Pull**: Drag ball surface outward, creating stretchy jelly bulge that snaps back with elastic oscillation.
     - **Crack / Slice Tool**: Click/drag across ball surface to draw crack lines/slashes, releasing particle bursts with sharp `crack` / `slice` ASMR.
     - **Pop Action**: Expand rapidly and burst into colorful jelly fragments/confetti with mega-pop ASMR, followed by satisfying squishy reformation.
- **Verification**: Test vertex displacement and spring relaxation formulas.
- **Commit Message**: `feat(studio): implement interactive squishy deformation and asmr tactile tools`

---

### Task 6: Customization, Shaders, & Ball Collection Gallery
- **Goal**: Provide deep customization (colors, materials, shaders) and persistent collection saving.
- **Files**:
  - `src/customizer/BallCustomizer.ts`
  - `src/customizer/Materials.ts`
  - `src/customizer/CollectionManager.ts`
  - `tests/collection.test.ts`
- **Steps**:
  1. Create stylized shaders / materials:
     - **Classic Squishy**: Pastel matte silicone with soft rim lighting.
     - **Clear Jelly**: Translucent physical material with visible floating internal items.
     - **Crunchy Sugar / Glitter**: Sparkly noise texture with refractive sheen.
     - **Neon Glow**: Pulsing emissive colors.
     - **Tape Ball Layers**: Multi-colored concentric ring textures.
  2. Implement color palette picker and brush painting mode.
  3. Implement `CollectionManager` using `localStorage` to save Wafu Balls with custom names, material presets, colors, max size, and absorbed item counts.
- **Verification**: Test saving, loading, and serializing Wafu Balls.
- **Commit Message**: `feat(customizer): implement ball coloring, custom shaders, and collection gallery`

---

### Task 7: Mode Transition & City Re-Entry Loop
- **Goal**: Seamlessly transition between City Rolling and Wafu Ball Studio, carrying over all collected objects and customized visuals.
- **Files**:
  - `src/game.ts`
  - `src/state/GameState.ts`
- **Steps**:
  1. Implement state machine: `CITY_ROLLING` <-> `WAFU_STUDIO` <-> `COLLECTION_VIEW`.
  2. Transition camera with smooth cinematic lerp from overhead rolling view to close-up studio pedestal.
  3. When returning to City: Retain customized color, material shader, custom texture, and bonus stats.
- **Verification**: End-to-end integration test of state transitions.
- **Commit Message**: `feat(game): integrate seamless mode transitions and city re-entry loop`

---

### Task 8: Glassmorphism UI, Mobile Joystick, Final Polish & Git Push
- **Goal**: Polish responsive glassmorphic UI, add mobile touch controls, verify full build, and push to GitHub remote.
- **Files**:
  - `src/ui/UIManager.ts`
  - `src/ui/TouchJoystick.ts`
  - `src/style.css`
  - `README.md`
- **Steps**:
  1. Implement modern HUD with growth progress bar, diameter display, speed meter, ASMR volume slider, and studio tools.
  2. Implement virtual analog joystick for touch devices.
  3. Write comprehensive documentation in `README.md` with gameplay guide and architecture breakdown.
  4. Run linter, test suite, and production build.
  5. Push commits to `https://github.com/Perfect-Yanus/wafu.git`.
- **Verification**: Clean build, tests pass, remote push verified.
- **Commit Message**: `feat(ui): complete glassmorphic hud, mobile joystick, and documentation`
