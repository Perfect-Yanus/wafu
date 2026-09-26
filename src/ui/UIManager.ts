import { GameState, GameStats } from '../state/GameState';
import { AsmrAudioEngine } from '../audio/AsmrAudioEngine';
import { SquishyBallStudio, StudioTool } from '../studio/SquishyBallStudio';
import { BallCustomizer } from '../customizer/BallCustomizer';
import { MaterialPresetId } from '../customizer/Materials';
import { FillingType, ShellType, WafuMaker } from '../studio/WafuMaker';

export class UIManager {
  private container: HTMLElement;
  private state: GameState;
  private audio: AsmrAudioEngine;
  private studio: SquishyBallStudio;
  private customizer: BallCustomizer;

  private onCityResetCb: (() => void) | null = null;
  private onJumpCb: (() => void) | null = null;
  private onBoostCb: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    state: GameState,
    audio: AsmrAudioEngine,
    studio: SquishyBallStudio,
    customizer: BallCustomizer
  ) {
    this.container = container;
    this.state = state;
    this.audio = audio;
    this.studio = studio;
    this.customizer = customizer;

    this.render();
    this.setupListeners();
  }

  public setOnCityReset(cb: () => void): void {
    this.onCityResetCb = cb;
  }

  public setOnJump(cb: () => void): void {
    this.onJumpCb = cb;
  }

  public setOnBoost(cb: () => void): void {
    this.onBoostCb = cb;
  }

  public updateSpeed(speed: number, isBoosting: boolean): void {
    const spdEl = document.getElementById('hud-speed');
    if (spdEl) {
      const kmh = (speed * 3.6).toFixed(0);
      spdEl.textContent = `${kmh} km/h`;
      if (isBoosting) {
        spdEl.classList.add('boost-active');
      } else {
        spdEl.classList.remove('boost-active');
      }
    }
  }

  private render(): void {
    const mode = this.state.getMode();
    const stats = this.state.getStats();

    this.container.innerHTML = `
      <!-- TOP HUD -->
      <header class="top-hud">
        <div class="hud-group-left">
          <div class="glass-panel hud-badge">
            <span class="badge-icon">🌸</span>
            <span>와뿌볼:</span>
            <span class="diameter-value" id="hud-diameter">${stats.currentDiameterCm.toFixed(1)} cm</span>
          </div>
          <div class="glass-panel hud-badge">
            <span class="badge-icon">🧲</span>
            <span>흡수:</span>
            <span class="highlight" id="hud-absorbed">${stats.absorbedCount}</span>
            <span style="color:var(--text-muted); font-size:12px;">개</span>
          </div>
          ${
            mode === 'CITY'
              ? `
            <div class="glass-panel hud-badge">
              <span class="badge-icon">⚡</span>
              <span id="hud-speed" class="speed-value">0 km/h</span>
            </div>
          `
              : ''
          }
        </div>

        <div class="hud-group-right">
          <div class="glass-panel sound-toggle-wrap">
            <button id="btn-sound-mute" class="btn-secondary" title="사운드 음소거/켜기">
              ${this.audio.isMuted() ? '🔇' : '🔊'}
            </button>
            <input type="range" id="slider-volume" class="volume-slider" min="0" max="1" step="0.05" value="${this.audio.getMasterVolume()}" title="ASMR 볼륨">
          </div>

          ${
            mode === 'CITY'
              ? `<button id="btn-switch-mode" class="btn-primary">🧪 와뿌볼 스튜디오로 이동</button>`
              : `<button id="btn-switch-mode" class="btn-primary">🏙️ 도시로 출격 (굴리기)</button>`
          }
        </div>
      </header>

      ${mode === 'CITY' ? this.renderCityOverlay() : this.renderStudioOverlay()}
    `;

    this.bindEvents();
  }

  private renderCityOverlay(): string {
    return `
      <!-- Mobile / Screen Action Buttons -->
      <div class="city-action-buttons">
        <button id="btn-city-jump" class="btn-action btn-jump" title="점프 (Space)">
          <span>🦘</span>
          <span class="btn-subtext">점프 (Space)</span>
        </button>
        <button id="btn-city-boost" class="btn-action btn-boost" title="대시 부스트 (Shift)">
          <span>🚀</span>
          <span class="btn-subtext">부스트 (Shift)</span>
        </button>
      </div>

      <footer class="glass-panel city-bottom-bar">
        <span>🎮 조작: <span class="controls-tag">WASD/방향키</span> 이동 · <span class="controls-tag">Shift</span> 부스트 · <span class="controls-tag">Space</span> 점프 · 가젯: <span style="color:#00e5ff; font-weight:700;">가속패드</span>, <span style="color:#3a86ff; font-weight:700;">트램펄린</span>, <span style="color:#ffd700; font-weight:700;">자석</span>, <span style="color:#a06535; font-weight:700;">파괴울타리</span></span>
        <button id="btn-city-reset" class="btn-secondary" style="font-size:12px;">🔄 도시 재생성</button>
      </footer>
    `;
  }

  private renderStudioOverlay(): string {
    const customState = this.customizer.getState();
    const activeTool = this.studio.getTool();
    const savedBalls = this.customizer.collection.getAll();
    const activeBall = this.customizer.collection.getActiveBall();
    const wafuMaker = this.studio.wafuMaker;

    const tools: { id: StudioTool; icon: string; label: string; group: 'tactile' | 'smash' }[] = [
      { id: 'poke', icon: '👆', label: '찌르기', group: 'tactile' },
      { id: 'stretch', icon: '🤲', label: '늘리기', group: 'tactile' },
      { id: 'crack', icon: '⚡', label: '크런치', group: 'tactile' },
      { id: 'slice', icon: '🗡️', label: '슬라이스', group: 'tactile' },
      { id: 'hammer', icon: '🔨', label: '해머 스매시', group: 'smash' },
      { id: 'hydraulic', icon: '⚡', label: '유압 프레스', group: 'smash' },
      { id: 'wire_cutter', icon: '🧇', label: '와이어 절단', group: 'smash' },
      { id: 'pop', icon: '💥', label: '메가 팝!', group: 'smash' },
    ];

    const presets = this.customizer.registry.getAvailablePresets();

    return `
      <!-- LEFT TOOLBAR: ASMR TACTILE & SMASH TOOLS -->
      <nav class="glass-panel studio-tools-bar">
        <div class="tool-section-label">촉감 ASMR</div>
        ${tools
          .filter((t) => t.group === 'tactile')
          .map(
            (t) => `
          <button class="tool-btn ${activeTool === t.id ? 'active' : ''}" data-tool="${t.id}" title="${t.label}">
            <span>${t.icon}</span>
            <span class="tool-label">${t.label}</span>
          </button>
        `
          )
          .join('')}

        <div class="tool-section-label" style="color: #ff3366; margin-top: 6px;">뿌시기 💥</div>
        ${tools
          .filter((t) => t.group === 'smash')
          .map(
            (t) => `
          <button class="tool-btn smash-btn ${activeTool === t.id ? 'active' : ''}" data-tool="${t.id}" title="${t.label}">
            <span>${t.icon}</span>
            <span class="tool-label">${t.label}</span>
          </button>
        `
          )
          .join('')}
      </nav>

      <!-- RIGHT PANEL: DIY WAFU MAKER & CUSTOMIZER -->
      <aside class="glass-panel studio-custom-panel">
        <div>
          <div class="panel-section-title">✨ 볼 이름</div>
          <input type="text" id="input-ball-name" class="btn-secondary" style="width: 100%; text-align: left; padding: 10px;" value="${customState.ballName}">
        </div>

        <!-- 🧪 WAFU MAKER DIY SECTION -->
        <div class="diy-section">
          <div class="panel-section-title">🧪 와뿌볼 만들기 (속재료 & 외피)</div>
          
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">속재료 채우기 (터치 사운드/촉감 변화)</div>
          <div class="fillings-grid">
            ${(Object.keys(WafuMaker.FILLINGS) as FillingType[])
              .map((fId) => {
                const f = WafuMaker.FILLINGS[fId];
                const active = wafuMaker.hasFilling(fId);
                return `
                <div class="filling-card ${active ? 'active' : ''}" data-filling="${fId}">
                  <span>${f.emoji}</span>
                  <span class="filling-title">${f.name.split(' ')[0]}</span>
                </div>
              `;
              })
              .join('')}
          </div>

          <div style="font-size: 11px; color: var(--text-muted); margin: 8px 0 6px;">외피 선택</div>
          <div class="shells-grid">
            ${(Object.keys(WafuMaker.SHELLS) as ShellType[])
              .map((sId) => {
                const s = WafuMaker.SHELLS[sId];
                const active = wafuMaker.getSelectedShell() === sId;
                return `
                <div class="shell-card ${active ? 'active' : ''}" data-shell="${sId}">
                  <span>${s.emoji}</span>
                  <span>${s.name.split(' ')[0]}</span>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <div>
          <div class="panel-section-title">🔮 촉감 재질 셰이더</div>
          <div class="material-presets-grid">
            ${presets
              .map((p) => {
                const info = this.customizer.registry.getPresetInfo(p);
                return `
                <div class="preset-card ${customState.currentPreset === p ? 'active' : ''}" data-preset="${p}">
                  <span>${info.name.split(' ')[0]}</span>
                  <span style="font-size: 10px; color: var(--text-muted);">${info.description}</span>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <div>
          <div class="panel-section-title">🎨 색상 팔레트</div>
          <div class="swatches-grid">
            ${BallCustomizer.SWATCHES.map(
              (hex) => `
              <div class="color-swatch ${customState.currentColor.toLowerCase() === hex.toLowerCase() ? 'active' : ''}" data-color="${hex}" style="background-color: ${hex};"></div>
            `
            ).join('')}
          </div>
        </div>

        <div>
          <div class="panel-section-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>📚 와뿌볼 보관함</span>
            <button id="btn-save-ball" class="btn-secondary" style="font-size: 11px; padding: 4px 8px;">💾 현재 볼 저장</button>
          </div>
          <div class="collection-list">
            ${savedBalls
              .map(
                (b) => `
              <div class="collection-item ${b.id === activeBall.id ? 'active' : ''}" data-ball-id="${b.id}">
                <div class="item-left">
                  <span class="color-dot" style="background-color: ${b.color};"></span>
                  <div>
                    <div class="item-title">${b.name}</div>
                    <div class="item-meta">Ø ${b.maxDiameterCm.toFixed(1)}cm · ${b.itemsAbsorbedCount}개 수집</div>
                  </div>
                </div>
                <button class="btn-delete-ball" data-delete-id="${b.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px;" title="삭제">✕</button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </aside>
    `;
  }

  private setupListeners(): void {
    this.state.onModeChange(() => {
      this.render();
    });

    this.state.onStatsChange((stats: GameStats) => {
      const diamEl = document.getElementById('hud-diameter');
      const absEl = document.getElementById('hud-absorbed');
      if (diamEl) diamEl.textContent = `${stats.currentDiameterCm.toFixed(1)} cm`;
      if (absEl) absEl.textContent = stats.absorbedCount.toString();
    });
  }

  private bindEvents(): void {
    // Mode toggle button
    const modeBtn = document.getElementById('btn-switch-mode');
    if (modeBtn) {
      modeBtn.addEventListener('click', () => {
        const next = this.state.getMode() === 'CITY' ? 'STUDIO' : 'CITY';
        this.state.setMode(next);
      });
    }

    // Sound Mute
    const muteBtn = document.getElementById('btn-sound-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', async () => {
        await this.audio.unlock();
        this.audio.setMuted(!this.audio.isMuted());
        muteBtn.textContent = this.audio.isMuted() ? '🔇' : '🔊';
      });
    }

    // Volume Slider
    const volumeSlider = document.getElementById('slider-volume') as HTMLInputElement;
    if (volumeSlider) {
      volumeSlider.addEventListener('input', async (e) => {
        await this.audio.unlock();
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.audio.setMasterVolume(val);
      });
    }

    // City Buttons: Jump & Boost & Reset
    const jumpBtn = document.getElementById('btn-city-jump');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        this.onJumpCb?.();
      });
    }

    const boostBtn = document.getElementById('btn-city-boost');
    if (boostBtn) {
      boostBtn.addEventListener('click', () => {
        this.onBoostCb?.();
      });
    }

    const resetBtn = document.getElementById('btn-city-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.onCityResetCb?.();
      });
    }

    // Studio Tools (Tactile & Destruction)
    const toolBtns = this.container.querySelectorAll('.tool-btn');
    toolBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        await this.audio.unlock();
        const tool = (e.currentTarget as HTMLElement).getAttribute('data-tool') as StudioTool;
        if (tool) {
          this.studio.setTool(tool);
          toolBtns.forEach((b) => b.classList.remove('active'));
          (e.currentTarget as HTMLElement).classList.add('active');
        }
      });
    });

    // DIY Fillings selection
    const fillingCards = this.container.querySelectorAll('.filling-card');
    fillingCards.forEach((card) => {
      card.addEventListener('click', async (e) => {
        await this.audio.unlock();
        const f = (e.currentTarget as HTMLElement).getAttribute('data-filling') as FillingType;
        if (f) {
          this.studio.wafuMaker.toggleFilling(f);
          this.studio.refreshFillings();

          // Play preview ASMR
          if (f === 'orbeez') this.audio.playWaterBeads();
          else if (f === 'floam') this.audio.playFloamCrunch();
          else if (f === 'slime') this.audio.playSquish(0.9);
          else this.audio.playCrunch(0.8);

          this.render();
        }
      });
    });

    // DIY Shells selection
    const shellCards = this.container.querySelectorAll('.shell-card');
    shellCards.forEach((card) => {
      card.addEventListener('click', async (e) => {
        await this.audio.unlock();
        const s = (e.currentTarget as HTMLElement).getAttribute('data-shell') as ShellType;
        if (s) {
          this.studio.wafuMaker.setShell(s);
          if (s === 'clay') this.audio.playClayCrack();
          else this.audio.playSquish(0.7);
          this.render();
        }
      });
    });

    // Material Presets
    const presetCards = this.container.querySelectorAll('.preset-card');
    presetCards.forEach((card) => {
      card.addEventListener('click', async (e) => {
        await this.audio.unlock();
        const preset = (e.currentTarget as HTMLElement).getAttribute('data-preset') as MaterialPresetId;
        if (preset) {
          const mat = this.customizer.setMaterialPreset(preset);
          this.studio.deformableBall.mesh.material = mat;
          this.audio.playSquish(0.6);
          this.render();
        }
      });
    });

    // Color Swatches
    const swatches = this.container.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      swatch.addEventListener('click', async (e) => {
        await this.audio.unlock();
        const color = (e.currentTarget as HTMLElement).getAttribute('data-color');
        if (color) {
          const mat = this.customizer.setColor(color);
          this.studio.deformableBall.mesh.material = mat;
          this.audio.playSquish(0.5);
          this.render();
        }
      });
    });

    // Ball Name
    const nameInput = document.getElementById('input-ball-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this.customizer.setBallName((e.target as HTMLInputElement).value);
      });
    }

    // Save Ball to Collection
    const saveBtn = document.getElementById('btn-save-ball');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        await this.audio.unlock();
        const stats = this.state.getStats();
        this.customizer.saveCurrentBall(stats.currentDiameterCm, stats.absorbedCount);
        this.audio.playAbsorb(4);
        this.render();
      });
    }

    // Load from Collection
    const collectionItems = this.container.querySelectorAll('.collection-item');
    collectionItems.forEach((item) => {
      item.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('btn-delete-ball')) return;

        await this.audio.unlock();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-ball-id');
        if (id) {
          const loaded = this.customizer.loadFromCollection(id);
          if (loaded) {
            const mat = this.customizer.getMaterial();
            this.studio.deformableBall.mesh.material = mat;
            this.audio.playAbsorb(2);
            this.render();
          }
        }
      });
    });

    // Delete from Collection
    const deleteBtns = this.container.querySelectorAll('.btn-delete-ball');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-delete-id');
        if (id) {
          this.customizer.collection.deleteBall(id);
          this.render();
        }
      });
    });
  }
}
