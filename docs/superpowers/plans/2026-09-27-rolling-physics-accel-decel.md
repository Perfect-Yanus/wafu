# Implementation Plan: Rolling Ball Physics (1/3 Speed, Accel/Decel, Game Feel)

## Overview
Re-calibrate the rolling ball physics to ~1/3 of the previous level (base max speed ~11.5 m/s, comfortable arcade rolling velocity), implement analog input-dependent acceleration, natural rolling coasting deceleration, snappy braking upon direction reversal, and calibrate camera FOV and audio rumble for maximum gameplay satisfaction.

## Target Specifications
1. **Speed & Force Calibration**:
   - `maxSpeed`: Base 11.5 m/s (~41 km/h), scale with radius up to ~15.0 m/s for mega ball.
   - Boost: 1.45x multiplier (~16.5 m/s).
   - `gravity`: -22.0 m/s², `jumpStrength`: 8.8 m/s (arcade jump height ~1.75m, ~0.8s hangtime).
2. **Acceleration & Deceleration (Game Feel)**:
   - Analog stick throttle: Gentle tilt (0.1 ~ 0.5) rolls slowly and steadily for tight navigation; full tilt (1.0) accelerates smoothly to top speed over ~0.45s.
   - Coasting deceleration: When input stops, ball smoothly rolls to a stop over ~0.55s rather than halting abruptly or sliding endlessly.
   - Reversal braking: When pulling the stick opposite to velocity, apply 2.5x braking force to bring the ball to a quick halt and roll backwards.
   - Mass scaling: As the ball absorbs items and increases in mass, it exhibits greater momentum and crushing authority.
3. **Camera & Audio Harmonization**:
   - Camera dynamic FOV mapped to 0 ~ 14 m/s.
   - Audio rolling rumble mapped to 0 ~ 12 m/s.
4. **Verification**:
   - Automated tests in `tests/rollingBall.test.ts`.
   - Build verification (`npm run build`).
   - Capacitor sync & Android APK compilation (`./gradlew assembleDebug`).
   - GitHub Release v1.3.2 publishing and direct APK download link.

## File Changes
1. `src/physics/RollingBall.ts` - Physics constants, acceleration/deceleration curves, analog throttle, jump/gravity.
2. `src/game.ts` - Pass analog joystick magnitude, adjust camera FOV & lerp parameters.
3. `src/audio/AsmrAudioEngine.ts` - Map rolling rumble to 12.0 m/s.
4. `tests/rollingBall.test.ts` - Update and add tests for acceleration, deceleration, and speed caps.
5. `package.json` & `android/app/build.gradle` - Bump version to 1.3.2 (versionCode 6).
