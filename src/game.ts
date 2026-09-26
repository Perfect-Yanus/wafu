import * as THREE from 'three';
import { GameState, GameMode } from './state/GameState';
import { asmrAudio } from './audio/AsmrAudioEngine';
import { RollingBall } from './physics/RollingBall';
import { CityWorld } from './world/CityWorld';
import { SquishyBallStudio } from './studio/SquishyBallStudio';
import { BallCustomizer } from './customizer/BallCustomizer';
import { UIManager } from './ui/UIManager';
import { TouchJoystick } from './ui/TouchJoystick';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private clock: THREE.Clock;

  private state: GameState;
  private rollingBall: RollingBall;
  private cityWorld: CityWorld;
  private studio: SquishyBallStudio;
  private customizer: BallCustomizer;
  private uiManager: UIManager;
  private joystick: TouchJoystick;

  // Keyboard input state
  private keys: Record<string, boolean> = {};

  // Raycasting for Studio mode
  private raycaster: THREE.Raycaster;
  private mousePos: THREE.Vector2;
  private prevMouse: THREE.Vector2 = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement, uiContainer: HTMLElement) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    // 1. Core Three.js setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ecae6); // Clear sky blue
    this.scene.fog = new THREE.FogExp2(0x8ecae6, 0.008);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Game subsystems
    this.state = new GameState();
    this.customizer = new BallCustomizer();

    // Rolling Katamari ball
    this.rollingBall = new RollingBall({
      initialRadius: 0.6,
      color: this.customizer.getState().currentColor,
    });
    this.rollingBall.setMaterial(this.customizer.getMaterial() as THREE.MeshStandardMaterial);
    this.scene.add(this.rollingBall.group);

    // City environment
    this.cityWorld = new CityWorld(this.scene, { citySize: 120, itemCount: 180 });
    this.cityWorld.onBallShrunk = (hazardType: string) => {
      this.uiManager.showHazardAlert(hazardType);
    };
    this.cityWorld.onTimeBonusCollected = (bonusSec: number) => {
      this.state.addBonusTime(bonusSec);
    };

    // Studio environment
    this.studio = new SquishyBallStudio(this.scene, this.rollingBall.getRadius());
    this.studio.setVisible(false);

    // UI and Joystick
    this.uiManager = new UIManager(uiContainer, this.state, asmrAudio, this.studio, this.customizer);
    this.uiManager.setOnCityReset(() => this.resetCity());
    this.uiManager.setOnJump(() => this.rollingBall.jump());
    this.uiManager.setOnBoost(() => this.rollingBall.triggerBoost(2.0));

    this.joystick = new TouchJoystick(uiContainer);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mousePos = new THREE.Vector2();

    this.setupInputs();
    this.setupStateTransitions();
    this.onWindowResize();

    // Start loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private setupStateTransitions(): void {
    this.state.onModeChange((mode: GameMode) => {
      if (mode === 'STUDIO') {
        // Entering Studio Mode:
        // Hide city, show studio turntable
        this.cityWorld.scene.children.forEach((c) => {
          if (c !== this.studio.studioGroup) {
            c.visible = false;
          }
        });
        this.scene.background = new THREE.Color(0x0e1118);
        this.scene.fog = null;

        this.studio.setVisible(true);
        this.studio.syncFromRollingBall(
          this.rollingBall.getRadius(),
          this.customizer.getMaterial(),
          this.rollingBall.getAbsorbedItems()
        );

        this.joystick.setVisible(false);
      } else {
        // Returning to City Mode:
        // Show city, hide studio
        this.cityWorld.scene.children.forEach((c) => {
          c.visible = true;
        });
        this.scene.background = new THREE.Color(0x8ecae6);
        this.scene.fog = new THREE.FogExp2(0x8ecae6, 0.008);

        this.studio.setVisible(false);

        // Apply customized material to rolling ball
        this.rollingBall.setMaterial(this.customizer.getMaterial() as THREE.MeshStandardMaterial);

        this.joystick.setVisible(true);
      }
    });
  }

  private setupInputs(): void {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.code === 'Space') {
        this.keys['space'] = true;
        this.rollingBall.jump();
        e.preventDefault();
      }
      if (e.key === 'Shift') {
        this.rollingBall.triggerBoost(1.5);
      }
      asmrAudio.unlock();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.code === 'Space') {
        this.keys['space'] = false;
      }
    });

    // Window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Pointer events for Studio interaction
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
  }

  private onPointerDown(e: PointerEvent): void {
    asmrAudio.unlock();
    this.prevMouse.set(e.clientX, e.clientY);

    if (this.state.getMode() === 'STUDIO') {
      this.updateMouseCoords(e);
      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const hits = this.raycaster.intersectObject(this.studio.deformableBall.mesh);
      if (hits.length > 0) {
        this.studio.onPointerDown(hits[0]);
      }
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.state.getMode() === 'STUDIO') {
      this.updateMouseCoords(e);
      const delta = new THREE.Vector2(e.clientX - this.prevMouse.x, e.clientY - this.prevMouse.y);
      this.prevMouse.set(e.clientX, e.clientY);

      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const hits = this.raycaster.intersectObject(this.studio.deformableBall.mesh);
      this.studio.onPointerMove(hits.length > 0 ? hits[0] : null, delta);
    }
  }

  private onPointerUp(): void {
    if (this.state.getMode() === 'STUDIO') {
      this.studio.onPointerUp();
    }
  }

  private updateMouseCoords(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public resetCity(): void {
    this.rollingBall.reset(0.6);
    this.rollingBall.setMaterial(this.customizer.getMaterial() as THREE.MeshStandardMaterial);
    this.cityWorld.reset(180);
    this.state.resetChallenge(250, 150);
    this.state.updateStats({
      currentDiameterCm: this.rollingBall.getRadius() * 200,
      absorbedCount: 0,
    });
  }

  private updateCity(dt: number): void {
    // 0. Update Challenge countdown timer
    this.state.tickTimer(dt);

    // 1. Gather directional input
    const inputDir = new THREE.Vector2(0, 0);

    if (this.keys['w'] || this.keys['arrowup']) inputDir.y -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) inputDir.y += 1;
    if (this.keys['a'] || this.keys['arrowleft']) inputDir.x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) inputDir.x += 1;

    // Add virtual joystick touch input
    const joyDir = this.joystick.getDirection();
    if (joyDir.lengthSq() > 0.01) {
      inputDir.x += joyDir.x;
      inputDir.y += joyDir.y;
    }

    if (inputDir.lengthSq() > 0.0001) {
      inputDir.normalize();
      this.rollingBall.applyInput(inputDir, dt);
    }

    // 2. Update ball physics
    this.rollingBall.update(dt);
    this.cityWorld.clampBallToBounds(this.rollingBall);

    // 3. Collision & Katamari absorption & Gadgets & Hazards
    this.cityWorld.checkCollisions(this.rollingBall, dt);

    // 4. Update HUD stats & speedometer
    const currentSpeed = this.rollingBall.getVelocity().length();
    const diameterCm = this.rollingBall.getRadius() * 200;
    this.state.updateStats({
      currentDiameterCm: diameterCm,
      absorbedCount: this.rollingBall.getAbsorbedCount(),
    });
    this.uiManager.updateSpeed(currentSpeed, this.rollingBall.isBoosting());

    // 5. Dynamic Camera FOV based on speed for extreme velocity sensation
    const baseFov = 50;
    const targetFov = baseFov + Math.min(18, (currentSpeed / 85.0) * 18);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1.0, dt * 5.0));
    this.camera.updateProjectionMatrix();

    // 6. Third-person follow camera
    const ballPos = this.rollingBall.getPosition();
    const r = this.rollingBall.getRadius();
    const speedRatio = Math.min(1.0, currentSpeed / 120.0);
    const camDist = 4.2 + r * 3.8 + speedRatio * 2.8;
    const camHeight = 2.4 + r * 2.2 + speedRatio * 1.2;

    const targetCamPos = new THREE.Vector3(ballPos.x, ballPos.y + camHeight, ballPos.z + camDist);
    this.camera.position.lerp(targetCamPos, Math.min(1.0, dt * 6.0));
    this.camera.lookAt(ballPos.x, ballPos.y + r * 0.4, ballPos.z);
  }

  private updateStudio(dt: number): void {
    this.studio.update(dt);

    // Camera focused on the turntable
    const r = this.studio.deformableBall.mesh.geometry.boundingSphere?.radius ?? 0.8;
    const camTarget = new THREE.Vector3(0, r + 0.1, 0);
    const camPos = new THREE.Vector3(0, r + 0.6, r * 2.8 + 1.2);

    this.camera.position.lerp(camPos, Math.min(1.0, dt * 5.0));
    this.camera.lookAt(camTarget);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.05, this.clock.getDelta());

    if (this.state.getMode() === 'CITY') {
      this.updateCity(dt);
    } else {
      this.updateStudio(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
