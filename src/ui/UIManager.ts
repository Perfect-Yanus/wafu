import { GameState, GameStats } from '../state/GameState';
import { AsmrAudioEngine } from '../audio/AsmrAudioEngine';
import { SquishyBallStudio, StudioTool } from '../studio/SquishyBallStudio';
import { BallCustomizer } from '../customizer/BallCustomizer';
import { MaterialPresetId } from '../customizer/Materials';

export class UIManager {
  private container: HTMLElement;
  private state: GameState;
  private audio: AsmrAudioEngine;
  private studio: SquishyBallStudio;
  private customizer: BallCustomizer;

  private onCityResetCb: (() => void) | null = null;

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

  private render(): void {
    const mode = this.state.getMode();
    const stats = this.state.getStats();

    this.container.innerHTML = `
      <!-- TOP HUD -->
      <header class="top-hud">
        <div class="hud-group-left">
          <div class="glass-panel hud-badge">
            <span class="badge-icon">🌸</span>
            <span>와뿌볼 크기:</span>
            <span class="diameter-value" id="hud-diameter">${stats.currentDiameterCm.toFixed(1)} cm</span>
          </div>
          <div class="glass-panel hud-badge">
            <span class="badge-icon">🧲</span>
            <span>흡수:</span>
            <span class="highlight" id="hud-absorbed">${stats.absorbedCount}</span>
            <span style="color:var(--text-muted); font-size:12px;">개</span>
          </div>
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
      <footer class="glass-panel city-bottom-bar">
        <span>🎮 조작법: <span class="controls-tag">W</span><span class="controls-tag">A</span><span class="controls-tag">S</span><span class="controls-tag">D</span> 또는 <span class="controls-tag">방향키</span> / 모바일은 화면 터치 드래그</span>
        <button id="btn-city-reset" class="btn-secondary" style="font-size:12px;">🔄 도시 재생성</button>
      </footer>
    `;
  }

  private renderStudioOverlay(): string {
    const customState = this.customizer.getState();
    const activeTool = this.studio.getTool();
    const savedBalls = this.customizer.collection.getAll();
    const activeBall = this.customizer.collection.getActiveBall();

    const tools: { id: StudioTool; icon: string; label: string }[] = [
      { id: 'poke', icon: '👆', label: '찌르기' },
      { id: 'stretch', icon: '🤲', label: '늘리기' },
      { id: 'crack', icon: '⚡', label: '크런치' },
      { id: 'slice', icon: '🗡️', label: '슬라이스' },
      { id: 'pop', icon: '💥', label: '팝 터뜨리기' },
    ];

    const presets = this.customizer.registry.getAvailablePresets();

    return `
      <!-- LEFT TOOLBAR: ASMR TACTILE TOOLS -->
      <nav class="glass-panel studio-tools-bar">
        ${tools
          .map(
            (t) => `
          <button class="tool-btn ${activeTool === t.id ? 'active' : ''}" data-tool="${t.id}" title="${t.label} ASMR">
            <span>${t.icon}</span>
            <span class="tool-label">${t.label}</span>
          </button>
        `
          )
          .join('')}
      </nav>

      <!-- RIGHT PANEL: CUSTOMIZER & COLLECTION -->
      <aside class="glass-panel studio-custom-panel">
        <div>
          <div class="panel-section-title">✨ 볼 이름</div>
          <input type="text" id="input-ball-name" class="btn-secondary" style="width: 100%; text-align: left; padding: 10px;" value="${customState.ballName}">
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

    // City Reset
    const resetBtn = document.getElementById('btn-city-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.onCityResetCb?.();
      });
    }

    // Studio Tools
    const toolBtns = this.container.querySelectorAll('.tool-btn');
    toolBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        await this.audio.unlock();
        const tool = (e.currentTarget as HTMLElement).getAttribute('data-tool') as StudioTool;
        if (tool) {
          this.studio.setTool(tool);
          toolBtns.forEach((b) => b.classList.remove('active'));
          (e.currentTarget as HTMLElement).classList.add('active');

          if (tool === 'pop') {
            this.studio.triggerPop();
          }
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
