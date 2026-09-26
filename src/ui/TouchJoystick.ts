import * as THREE from 'three';

export class TouchJoystick {
  private container: HTMLElement;
  private baseEl: HTMLElement;
  private stickEl: HTMLElement;

  private active: boolean = false;
  private touchId: number | null = null;
  private originX: number = 0;
  private originY: number = 0;
  private radius: number = 55;

  private direction: THREE.Vector2 = new THREE.Vector2(0, 0);

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'touch-joystick-container';

    this.baseEl = document.createElement('div');
    this.baseEl.className = 'touch-joystick-base';

    this.stickEl = document.createElement('div');
    this.stickEl.className = 'touch-joystick-stick';

    this.baseEl.appendChild(this.stickEl);
    this.container.appendChild(this.baseEl);
    parent.appendChild(this.container);

    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    window.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
  }

  private handleTouchStart(e: TouchEvent): void {
    // Only capture touch if not tapping on an interactive UI button or action area
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, .no-joystick, .city-action-buttons, .btn-action')) return;

    if (this.touchId !== null) return; // Already tracking

    // Loop through changed touches to find one on the left/steering side of screen (<= 65% width)
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX <= window.innerWidth * 0.65) {
        this.touchId = touch.identifier;
        this.originX = touch.clientX;
        this.originY = touch.clientY;
        this.active = true;

        this.baseEl.style.display = 'block';
        this.baseEl.style.left = `${this.originX - this.radius}px`;
        this.baseEl.style.top = `${this.originY - this.radius}px`;
        this.stickEl.style.transform = `translate(0px, 0px)`;
        this.direction.set(0, 0);
        break;
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.active || this.touchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchId) {
        const dx = touch.clientX - this.originX;
        const dy = touch.clientY - this.originY;
        const dist = Math.hypot(dx, dy);

        const clampedDist = Math.min(this.radius, dist);
        const angle = Math.atan2(dy, dx);

        const stickX = Math.cos(angle) * clampedDist;
        const stickY = Math.sin(angle) * clampedDist;
        this.stickEl.style.transform = `translate(${stickX}px, ${stickY}px)`;

        // In 3D space: x is horizontal, y (z-axis in game) is vertical
        // When pulling thumb UP (dy < 0), ball should roll forward (-Z)
        const normDist = clampedDist / this.radius;
        this.direction.set(Math.cos(angle) * normDist, Math.sin(angle) * normDist);
        break;
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.active || this.touchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        this.active = false;
        this.touchId = null;
        this.baseEl.style.display = 'none';
        this.direction.set(0, 0);
        break;
      }
    }
  }

  public getDirection(): THREE.Vector2 {
    return this.direction;
  }

  public setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'block' : 'none';
  }
}
