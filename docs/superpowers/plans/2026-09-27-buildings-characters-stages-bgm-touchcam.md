# Implementation Plan: Wafu Ball v1.3.0 (Buildings, Living Characters, Katamari Surface Attachment, Touch Camera Orbit, Upbeat BGM, 3 Stages with Portal Escape & Planet Sphere, Post-Stage Mega Smash Arena)

**Goal**: Transform Wafu Ball into a rich, hilarious, vibrant Katamari Damacy arcade experience on mobile touchscreen with real buildings and walking characters, authentic surface-snapped Katamari rolling physics, touch screen camera rotation, procedural upbeat BGM, 3 distinct stages with mission briefings (Town & Cats, Time Portal Escape, Super Planet Sphere), and a spectacular post-stage Wafu ball destruction climax.

---

### Key Components

#### 1. Katamari Surface Attachment & Growth Scaling (`src/physics/RollingBall.ts`)
- Snap absorbed items flush to the sphere surface along the collision contact normal vector.
- Orient item meshes radially outward from the ball center.
- Dynamically update attached items' radial distance as `this.radius` expands so items never get buried inside the sphere.
- Add bumpy Katamari rolling micro-offsets.

#### 2. Buildings & Cute Living Animated Characters (`src/world/ItemCatalog.ts`, `src/world/Characters.ts`)
- Rich 3D buildings:
  - `convenience_store`: 24h shop with bright signs and awning.
  - `brick_house`: Residential home with chimney and gabled roof.
  - `apartment_block`: Multi-story apartment with balconies and lit windows.
  - `skyscraper`: High-rise glass tower with antenna/helipad.
- Cute living characters with wandering behavior:
  - `pedestrian`: Cute low-poly walking citizen that wanders and runs away.
  - `cat`: Wandering cat that jumps and meows.
  - `dog`: Bouncy puppy that runs in circles.
  - `cyclist`: Citizen riding a bicycle.
  - `car`: Compact city car cruising on roads.
- Funny reaction sounds when absorbed (`"와아아~!"`, `"야옹!"`, `"빵빵!"`).

#### 3. Mobile Touchscreen Camera Orbit & Camera-Relative Movement (`src/game.ts`)
- Orbit controls on right-hand screen drag (azimuth & elevation angle).
- Ball input calculation relative to camera forward/right vectors.
- HUD hint badge explaining camera rotation.

#### 4. Procedural Upbeat Katamari BGM & Reaction Audio (`src/audio/AsmrAudioEngine.ts`)
- Catchy procedural BGM synthesizer (funky synth bass, bouncy piano chords, cheerful lead arpeggios).
- Sound effects: character meow, citizen squeak, car horn, portal hum, mega hammer impact.

#### 5. Multi-Stage System & Mission Briefing (`src/world/StageManager.ts`, `src/state/GameState.ts`, `src/ui/UIManager.ts`)
- **Stage 1 (와뿌 마을 & 캣 파크)**: Growth goal 100cm.
- **Stage 2 (시간 제한 네온 시티 탈출 - Portal Escape)**: Growth goal 180cm + locate glowing dimensional portal exit before time runs out!
- **Stage 3 (슈퍼 플래닛 구체 월드 - Sphere Planet)**: Rolling across a giant spherical planet world with rolling boulder traps!
- Pre-stage stylish mission briefing modal before starting.

#### 6. Post-Stage Wafu Smash Arena Climax (`src/studio/SquishyBallStudio.ts`, `src/ui/UIManager.ts`)
- Direct transition from stage victory into the Smash Arena.
- Upgraded tools: Golden Sledgehammer (screen shake, shockwaves), 1000-Ton Hydraulic Crusher, Laser Grid Slicer, Fireworks Mega Pop, Magic Restore.

#### 7. Verification & Release
- Vitest unit tests for attachment, stage manager, characters, and camera calculations.
- Android APK v1.3.0 compile and GitHub Release.
