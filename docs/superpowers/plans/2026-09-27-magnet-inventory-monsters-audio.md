# Magnet, Inventory Storage, Moving Monsters & Audio Fix Plan

## Goal
Implement user requests:
1. Fix BGM and SFX audio not playing on mobile/WebView.
2. Add passive micro-magnetism for smooth absorption, enhance Super Magnet, and add Repulsion Blast Item (`RepulsionBlastItem`).
3. Allow saving completed Wafu Balls to personal Inventory on Stage Clear, and loading them in Studio to smash and play anytime (with play charge limits and future unlimited IAP hook).
4. Introduce escalating stage hazards: Moving Cacti, Street Chaser Monsters (absorbable when huge!), and Patrolling Traps.

## Tasks

### Task 1: Fix BGM & SFX Audio Engine and Autoplay Unlock
- **Files**: `android/app/src/main/java/com/yanus/wafuball/MainActivity.java`, `src/audio/AsmrAudioEngine.ts`, `src/main.ts`, `src/game.ts`
- **Steps**:
  1. In `MainActivity.java`: Add `settings.setMediaPlaybackRequiresUserGesture(false);`.
  2. In `AsmrAudioEngine.ts`: Ensure `startBgm()` automatically resumes suspended context, resets scheduling timers safely, and all SFX trigger context resume.
  3. In `main.ts`: Add global `window` touch/pointer/click capture to unlock audio immediately on first interaction.
- **Verification**: Tests checking that `unlock()` resumes context and `startBgm()` starts playback.

### Task 2: Passive Micro-Magnetism, Super Magnet & Repulsion Blast Item
- **Files**: `src/world/CityGadgets.ts`, `src/world/CityWorld.ts`, `src/ui/UIManager.ts`
- **Steps**:
  1. In `CityWorld.ts`: Implement passive micro-magnetism pulling absorbable items within radius * 1.5 + 2.5m towards ball.
  2. In `CityGadgets.ts`: Create `RepulsionBlastItem` that creates a shockwave pushing away unabsorbable objects and hazards within 18m.
  3. Add visual rings and HUD alert for Super Magnet and Repulsion Blast.
- **Verification**: Unit tests verifying items are drawn toward ball and repulsion pushes items/hazards back.

### Task 3: Inventory Storage on Stage Clear & Studio Smash Play
- **Files**: `src/customizer/CollectionManager.ts`, `src/ui/UIManager.ts`, `src/game.ts`, `src/style.css`
- **Steps**:
  1. In `CollectionManager.ts`: Add `playsRemaining` and `unlimitedPlays` fields to `SavedWafuBall`.
  2. In `UIManager.ts`: In Victory Modal, add "📦 내 인벤토리에 와뿌볼 보관하기 (소장)" button.
  3. In Studio mode: Add "📦 내 와뿌볼 보관함" button & modal allowing player to pick any saved Wafu Ball, load its size/texture, and smash it.
- **Verification**: Unit tests testing saving balls with stage metadata and loading them into Studio.

### Task 4: Moving Cacti, Monsters & Patrolling Traps
- **Files**: `src/world/Hazards.ts`, `src/world/CityWorld.ts`, `src/world/StageManager.ts`
- **Steps**:
  1. In `Hazards.ts`: Create `MovingCactusHazard`, `StreetMonsterHazard` (chases player, absorbable if ball is big!), and `PatrollingSawbladeHazard`.
  2. In `CityWorld.ts`: Spawn moving hazards according to stage difficulty (Stage 2 & 3).
- **Verification**: Tests verifying monster movement, collision, and absorption when ball is large.

### Task 5: Testing, Android Build & Release
- **Files**: `tests/`, `package.json`, `android/app/build.gradle`
- **Steps**:
  1. Run Vitest suite.
  2. Bump version to 1.3.4.
  3. Build APK, tag v1.3.4, create GitHub Release, and deliver download link.
