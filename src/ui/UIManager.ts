import { GameState, GameStats } from '../state/GameState';
import { AsmrAudioEngine } from '../audio/AsmrAudioEngine';
import { SquishyBallStudio, StudioTool } from '../studio/SquishyBallStudio';
import { BallCustomizer } from '../customizer/BallCustomizer';
import { MaterialPresetId } from '../customizer/Materials';
import { FillingType, ShellType, WafuMaker } from '../studio/WafuMaker';
import { STAGES } from '../world/StageManager';
import confetti from 'canvas-confetti';

export class UIManager {
  private container: HTMLElement;
  private state: GameState;
  private audio: AsmrAudioEngine;
  private studio: SquishyBallStudio;
  private customizer: BallCustomizer;

  private onCityResetCb: (() => void) | null = null;
  private onJumpCb: (() => void) | null = null;
  private onBoostCb: (() => void) | null = null;
  private onStageSelectCb: ((stageIndex: number) => void) | null = null;
  private onStartGameCb: (() => void) | null = null;
  private hazardAlertTimeout?: number;
  private currentModalType: 'victory' | 'gameover' | 'none' = 'none';

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

  public setOnStageSelect(cb: (stageIndex: number) => void): void {
    this.onStageSelectCb = cb;
  }

  public setOnStartGame(cb: () => void): void {
    this.onStartGameCb = cb;
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

  public render(): void {
    this.currentModalType = 'none';
    const mode = this.state.getMode();
    const stats = this.state.getStats();
    const currentStage = STAGES[stats.stageIndex] || STAGES[0];

    this.container.innerHTML = `
      <!-- TOP HUD -->
      <header class="top-hud">
        <div class="hud-group-left">
          ${
            mode === 'CITY'
              ? `
            <div class="glass-panel hud-badge stage-badge" id="hud-stage-badge" title="현재 스테이지">
              <span class="badge-icon">${currentStage.badgeIcon}</span>
              <span style="font-weight:800;">${currentStage.title.split(':')[0]}</span>
            </div>
          `
              : ''
          }
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
            ${
              stats.challengeMode
                ? `
              <div class="glass-panel hud-badge hud-timer ${stats.timeRemaining <= 20 ? 'timer-warning' : ''}" id="hud-timer-badge">
                <span class="badge-icon">⏱️</span>
                <span id="hud-timer">${Math.floor(stats.timeRemaining / 60)}:${Math.floor(stats.timeRemaining % 60).toString().padStart(2, '0')}</span>
              </div>
              <div class="glass-panel hud-badge ${stats.portalUnlocked && currentStage.hasPortalExit ? 'portal-active-badge' : ''}" id="hud-goal-badge">
                <span class="badge-icon">${stats.portalUnlocked && currentStage.hasPortalExit ? '🌀' : '🎯'}</span>
                <span>${stats.portalUnlocked && currentStage.hasPortalExit ? '출구 포털 오픈!' : '목표:'}</span>
                <span class="highlight">${stats.portalUnlocked && currentStage.hasPortalExit ? '빛기둥 진입' : stats.targetDiameterCm.toFixed(0) + 'cm'}</span>
              </div>
            `
                : `
              <div class="glass-panel hud-badge">
                <span class="badge-icon">♾️</span>
                <span>자유 모드</span>
              </div>
            `
            }
            <div class="glass-panel hud-badge camera-tip-badge" title="터치 카메라 조작">
              <span class="badge-icon">🎥</span>
              <span style="font-size:11px; color:var(--text-muted);">우측 드래그: 360° 시점 회전</span>
            </div>
          `
              : ''
          }
        </div>

        <div class="hud-group-right">
          ${
            mode === 'CITY'
              ? `
            <button id="btn-open-briefing" class="btn-secondary" style="font-size:12px; padding: 6px 12px;" title="스테이지 미션 정보">
              📋 미션 정보
            </button>
            <button id="btn-toggle-challenge" class="btn-secondary" style="font-size:12px; padding: 6px 12px;" title="모드 전환">
              ${stats.challengeMode ? '⏱️ 도전 모드' : '♾️ 자유 모드'}
            </button>
          `
              : ''
          }
          <button id="btn-toggle-bgm" class="btn-secondary" style="font-size:12px; padding: 6px 10px;" title="배경음악 켜기/끄기">
            ${this.audio.isBgmPlaying() ? '🎵 BGM 끄기' : '🎵 BGM 켜기'}
          </button>
          <div class="glass-panel sound-toggle-wrap">
            <button id="btn-sound-mute" class="btn-secondary" title="사운드 음소거/켜기">
              ${this.audio.isMuted() ? '🔇' : '🔊'}
            </button>
            <input type="range" id="slider-volume" class="volume-slider" min="0" max="1" step="0.05" value="${this.audio.getMasterVolume()}" title="ASMR 볼륨">
          </div>

          ${
            mode === 'CITY'
              ? `<button id="btn-switch-mode" class="btn-primary">🧪 와뿌볼 스튜디오 (뿌시기)</button>`
              : `<button id="btn-switch-mode" class="btn-primary">🏙️ 도시로 출격 (굴리기)</button>`
          }
        </div>
      </header>

      ${mode === 'CITY' ? this.renderCityOverlay() : this.renderStudioOverlay()}
    `;

    this.bindEvents();
  }

  private renderCityOverlay(): string {
    const stats = this.state.getStats();
    const currentStage = STAGES[stats.stageIndex] || STAGES[0];

    return `
      <!-- Hazard Alert Notification Banner & Damage Screen Vignette -->
      <div id="damage-vignette" class="damage-vignette"></div>
      <div id="hazard-alert" class="hazard-alert"></div>

      <!-- Object & Hazard Visual Guide Legend -->
      <div id="hud-legend" class="glass-panel hud-legend">
        <span>🟢 흡수가능</span>
        <span class="legend-divider">|</span>
        <span>🟠 너무큼 (튕김)</span>
        <span class="legend-divider">|</span>
        <span>⚠️ 위험함 (축소)</span>
        <span class="legend-divider">|</span>
        <span>🧱 벽 (충돌반사)</span>
      </div>

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

      <!-- Stage Mission Briefing Modal -->
      <div id="modal-briefing" class="challenge-modal-backdrop modal-briefing-backdrop" style="display: ${stats.stageBriefingActive ? 'flex' : 'none'};">
        <div class="glass-panel briefing-modal-content">
          <div class="stage-tabs-row">
            ${STAGES.map(
              (s, idx) => `
              <button class="stage-tab-btn ${stats.stageIndex === idx ? 'active' : ''}" data-stage-idx="${idx}">
                <span>${s.badgeIcon}</span>
                <span>Stage ${s.id}</span>
              </button>
            `
            ).join('')}
          </div>

          <div class="modal-icon" style="font-size:44px; margin-top:10px;">${currentStage.badgeIcon}</div>
          <h2 style="margin-bottom:4px; font-size:22px;">${currentStage.title}</h2>
          <div class="stage-subtitle" style="color:var(--accent-cyan); font-weight:700; font-size:13px; margin-bottom:14px;">${currentStage.subtitle}</div>

          <p style="font-size:13px; line-height:1.5; color:#cbd5e1; margin-bottom:16px;">
            ${currentStage.description}
          </p>

          <div class="briefing-info-grid">
            <div class="info-card">
              <span class="info-label">🎯 목표 직경</span>
              <span class="info-val" style="color:var(--accent-pink);">${currentStage.targetDiameterCm} cm</span>
            </div>
            <div class="info-card">
              <span class="info-label">⏱️ 제한 시간</span>
              <span class="info-val" style="color:#ffd166;">${currentStage.timeLimitSec} 초</span>
            </div>
            <div class="info-card" style="grid-column: span 2;">
              <span class="info-label">🏁 클리어 조건</span>
              <span class="info-val" style="color:var(--accent-cyan); font-size:12px;">
                ${currentStage.hasPortalExit ? '180cm 달성 후 [빛나는 차원 탈출 포털] 진입!' : `${currentStage.targetDiameterCm}cm 이상 크기 달성!`}
              </span>
            </div>
          </div>

          <div class="hazard-warning-box">
            <span style="font-size:15px;">⚠️</span>
            <span><strong>위험 주의:</strong> ${currentStage.hazardsDescription}</span>
          </div>

          <div class="controls-guide-box">
            <span>📱 <strong>모바일 터치 조작:</strong> 좌측 가상 조이스틱 이동 · 우측 화면 드래그 360° 시점 회전</span>
          </div>

          <button id="btn-start-stage" class="btn-primary btn-start-game" style="font-size:16px; padding:14px; margin-top:8px;">
            🚀 게임 시작 / 출격!
          </button>
        </div>
      </div>

      <!-- Challenge Victory / Game Over Modal -->
      <div id="modal-challenge" class="challenge-modal-backdrop" style="display: ${stats.isVictory || stats.isGameOver ? 'flex' : 'none'};">
        <div class="glass-panel challenge-modal-content">
          <div class="modal-icon" id="modal-icon">${stats.isVictory ? '🎉' : '⏳'}</div>
          <h2 id="modal-title">${stats.isVictory ? '축하합니다! 스테이지 클리어!' : '시간 종료! (Time Over)'}</h2>
          <div id="modal-body">
            ${
              stats.isVictory
                ? `
              <p style="color:#e2e8f0;">와뿌볼이 거대해졌습니다! 도시의 빌딩과 캐릭터들을 완벽히 흡수했습니다.<br><strong style="color:var(--accent-pink);">이제 스튜디오에서 와뿌볼을 다양한 도구로 시원하게 박살내며 놀아보세요!</strong></p>
              <div class="modal-stats">
                <div>도달 스테이지: <strong>${currentStage.title}</strong></div>
                <div>최종 직경: <strong>${stats.currentDiameterCm.toFixed(1)} cm</strong></div>
                <div>흡수한 물체: <strong>${stats.absorbedCount} 개</strong></div>
                <div>남은 시간: <strong>${Math.floor(stats.timeRemaining)} 초</strong></div>
              </div>
            `
                : `
              <p>도전 시간이 모두 흘렀습니다! 선인장과 톱날을 피하고 보너스 시계를 모아보세요.</p>
              <div class="modal-stats">
                <div>도달 직경: <strong>${stats.currentDiameterCm.toFixed(1)} cm</strong> (목표: ${stats.targetDiameterCm} cm)</div>
                <div>흡수한 물체: <strong>${stats.absorbedCount} 개</strong></div>
              </div>
            `
            }
          </div>
          <div class="modal-buttons" id="modal-buttons-container">
            ${
              stats.isVictory
                ? `
              <button id="btn-modal-studio" class="btn-primary btn-smash-highlight" style="font-size:16px; padding:14px;">
                💥 와뿌볼 박살내기! (스튜디오 이동)
              </button>
              <button id="btn-modal-save-inventory" class="btn-secondary" style="font-weight:700; width:100%; border:1px solid var(--accent-cyan); color:#e0f2fe; margin-top:8px;">
                📦 이번 와뿌볼 인벤토리에 보관 (소장하기)
              </button>
              ${
                stats.stageIndex < STAGES.length - 1
                  ? `<button id="btn-modal-next-stage" class="btn-secondary" style="font-weight:700;">➡️ 다음 스테이지 도전 (${STAGES[stats.stageIndex + 1].title.split(':')[0]})</button>`
                  : ''
              }
              <button id="btn-modal-retry" class="btn-secondary">🔄 현재 스테이지 다시 하기</button>
            `
                : `
              <button id="btn-modal-retry" class="btn-primary">🔄 다시 도전하기</button>
              <button id="btn-modal-freeroll" class="btn-secondary">♾️ 무제한 자유 모드로 계속하기</button>
            `
            }
          </div>
        </div>
      </div>

      <footer class="glass-panel city-bottom-bar">
        <span>🎮 조작: <span class="controls-tag">좌측 조이스틱/WASD</span> 이동 · <span class="controls-tag">우측 터치 드래그</span> 시점 회전 · <span class="controls-tag">Shift</span> 부스트 · <span class="controls-tag">Space</span> 점프 · 가젯: <span style="color:#00e5ff; font-weight:700;">가속패드</span>, <span style="color:#3a86ff; font-weight:700;">트램펄린</span>, <span style="color:#ffd700; font-weight:700;">시계(+15초)</span></span>
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
      { id: 'restore', icon: '✨', label: '원상 복원', group: 'smash' },
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
            <span>📦 내 와뿌볼 보관함</span>
            <button id="btn-save-ball" class="btn-secondary" style="font-size: 11px; padding: 4px 8px;">💾 현재 볼 보관</button>
          </div>
          <div class="collection-list">
            ${savedBalls
              .map(
                (b) => `
              <div class="collection-item ${b.id === activeBall.id ? 'active' : ''}" data-ball-id="${b.id}">
                <div class="item-left" style="width:100%;">
                  <span class="color-dot" style="background-color: ${b.color}; align-self: flex-start; margin-top: 4px;"></span>
                  <div style="flex:1; min-width:0;">
                    <div class="item-title" style="display:flex; justify-content:space-between; align-items:center;">
                      <strong>${b.name}</strong>
                      <span class="stage-tag" style="font-size:10px; color:var(--accent-cyan); background:rgba(0,229,255,0.15); padding:1px 6px; border-radius:4px;">${b.stageName ?? '자유 모드'}</span>
                    </div>
                    <div class="item-meta">Ø ${b.maxDiameterCm.toFixed(1)}cm · ${b.itemsAbsorbedCount}개 수집</div>
                    <div class="item-play-status" style="font-size:11px; margin-top:3px; display:flex; align-items:center; gap:6px;">
                      ${
                        b.unlimitedPlays
                          ? `<span style="color:#00ff88; font-weight:700;">💎 무제한 이용권 해금됨</span>`
                          : `<span style="color:${b.playsRemaining > 0 ? '#ffd166' : '#ff4444'}; font-weight:700;">🎮 남은 플레이: ${b.playsRemaining}회</span>`
                      }
                    </div>
                    <div class="item-actions-row" style="margin-top:6px; display:flex; gap:6px; align-items:center;">
                      <button class="btn-play-smash" data-play-id="${b.id}" style="font-size:11px; font-weight:700; padding:4px 8px; background:linear-gradient(135deg, #ff3366, #ff758f); color:#fff; border:none; border-radius:4px; cursor:pointer;" title="스튜디오에서 꺼내어 박살내기">
                        💥 꺼내서 박살내기
                      </button>
                      ${
                        !b.unlimitedPlays
                          ? `<button class="btn-unlock-unlimited" data-unlock-id="${b.id}" style="font-size:10px; padding:4px 6px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.5); border-radius:4px; cursor:pointer;" title="추가 결제 해금">
                              💎 무제한 해금
                            </button>`
                          : ''
                      }
                    </div>
                  </div>
                  <button class="btn-delete-ball" data-delete-id="${b.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; padding:4px; align-self:flex-start;" title="삭제">✕</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </aside>
    `;
  }

  public showHazardAlert(hazardType: string): void {
    const alertEl = document.getElementById('hazard-alert');
    const vignetteEl = document.getElementById('damage-vignette');

    if (vignetteEl && !hazardType.startsWith('portal_locked')) {
      vignetteEl.classList.add('flash');
      window.setTimeout(() => vignetteEl.classList.remove('flash'), 320);
    }

    if (!alertEl) return;
    if (hazardType.startsWith('portal_locked')) {
      const parts = hazardType.split(':');
      const req = parts[1] || '180';
      alertEl.textContent = `🌀 포털 잠김! 크기가 부족합니다 (목표: ${req}cm 필요)`;
      alertEl.className = 'hazard-alert visible';
    } else {
      const messages: Record<string, string> = {
        cactus: '🌵 선인장 바늘에 찔림! 크기 축소 (-16%)',
        spike: '⚠️ 날카로운 가시 트랩 충돌! 크기 축소 (-22%)',
        sawblade: '⚡ 회전 톱날 피해! 크기 대폭 축소 (-26%)',
      };
      alertEl.textContent = messages[hazardType] || '⚠️ 날카로운 장애물 충돌! 크기 축소';
      alertEl.className = 'hazard-alert visible';
    }
    if (this.hazardAlertTimeout) clearTimeout(this.hazardAlertTimeout);
    this.hazardAlertTimeout = window.setTimeout(() => {
      alertEl.classList.remove('visible');
    }, 1600);
  }

  public showBlockedAlert(itemName: string, reqCm: number, curCm: number): void {
    const alertEl = document.getElementById('hazard-alert');
    if (!alertEl) return;
    alertEl.textContent = `🧱 [${itemName}] 너무 커서 튕겼습니다! (현재: ${curCm.toFixed(0)}cm / 필요: ${reqCm.toFixed(0)}cm)`;
    alertEl.className = 'hazard-alert visible blocked';
    if (this.hazardAlertTimeout) clearTimeout(this.hazardAlertTimeout);
    this.hazardAlertTimeout = window.setTimeout(() => {
      alertEl.classList.remove('visible');
      alertEl.classList.remove('blocked');
    }, 1600);
  }

  public showRepulsionAlert(): void {
    const alertEl = document.getElementById('hazard-alert');
    if (!alertEl) return;
    alertEl.textContent = '⚡ 밀어내기 파동 발동! (장애물 방출 & 6초 방어 쉴드)';
    alertEl.className = 'hazard-alert visible alert-repulsion';
    if (this.hazardAlertTimeout) clearTimeout(this.hazardAlertTimeout);
    this.hazardAlertTimeout = window.setTimeout(() => {
      alertEl.classList.remove('visible');
      alertEl.classList.remove('alert-repulsion');
    }, 1800);
  }

  public showMagnetAlert(): void {
    const alertEl = document.getElementById('hazard-alert');
    if (!alertEl) return;
    alertEl.textContent = '🧲 슈퍼 자석 발동! (주변 모든 물체 흡입력 폭발!)';
    alertEl.className = 'hazard-alert visible alert-magnet';
    if (this.hazardAlertTimeout) clearTimeout(this.hazardAlertTimeout);
    this.hazardAlertTimeout = window.setTimeout(() => {
      alertEl.classList.remove('visible');
      alertEl.classList.remove('alert-magnet');
    }, 1800);
  }

  public showMonsterAbsorbedAlert(): void {
    const alertEl = document.getElementById('hazard-alert');
    if (!alertEl) return;
    alertEl.textContent = '👾 스트리트 괴물을 통째로 흡수했습니다! (+45cm 대형 보너스!)';
    alertEl.className = 'hazard-alert visible alert-monster';
    if (this.hazardAlertTimeout) clearTimeout(this.hazardAlertTimeout);
    this.hazardAlertTimeout = window.setTimeout(() => {
      alertEl.classList.remove('visible');
      alertEl.classList.remove('alert-monster');
    }, 2200);
  }

  private bindTouchAndClick(element: HTMLElement | null, action: () => void): void {
    if (!element) return;
    let lastTouch = 0;
    element.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        lastTouch = Date.now();
        action();
      },
      { passive: false }
    );
    element.addEventListener('click', (e) => {
      if (Date.now() - lastTouch < 400) return;
      e.preventDefault();
      action();
    });
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

      // Countdown Timer HUD update
      const timerEl = document.getElementById('hud-timer');
      const timerBadge = document.getElementById('hud-timer-badge');
      if (timerEl && stats.challengeMode) {
        const m = Math.floor(stats.timeRemaining / 60);
        const s = Math.floor(stats.timeRemaining % 60)
          .toString()
          .padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
        if (timerBadge) {
          if (stats.timeRemaining <= 20) {
            timerBadge.classList.add('timer-warning');
          } else {
            timerBadge.classList.remove('timer-warning');
          }
        }
      }

      // Briefing Modal Visibility
      const briefingModal = document.getElementById('modal-briefing');
      if (briefingModal) {
        briefingModal.style.display = stats.stageBriefingActive ? 'flex' : 'none';
      }

      // Victory / Game Over Modal check
      const modal = document.getElementById('modal-challenge');
      if (modal) {
        const targetModalType: 'victory' | 'gameover' | 'none' = stats.isVictory
          ? 'victory'
          : stats.isGameOver
            ? 'gameover'
            : 'none';

        if (targetModalType !== 'none') {
          modal.style.display = 'flex';

          if (this.currentModalType !== targetModalType) {
            this.currentModalType = targetModalType;

            const iconEl = document.getElementById('modal-icon');
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            const btnWrap = document.getElementById('modal-buttons-container');

            if (targetModalType === 'victory') {
              if (iconEl) iconEl.textContent = '🎉';
              if (titleEl) titleEl.textContent = '축하합니다! 스테이지 클리어!';
              if (bodyEl) {
                const currentStage = STAGES[stats.stageIndex] || STAGES[0];
                bodyEl.innerHTML = `
                  <p style="color:#e2e8f0;">와뿌볼이 거대해졌습니다! 도시의 빌딩과 캐릭터들을 완벽히 흡수했습니다.<br><strong style="color:var(--accent-pink);">이제 스튜디오에서 와뿌볼을 다양한 도구로 시원하게 박살내며 놀아보세요!</strong></p>
                  <div class="modal-stats">
                    <div>도달 스테이지: <strong>${currentStage.title}</strong></div>
                    <div>최종 직경: <strong>${stats.currentDiameterCm.toFixed(1)} cm</strong> (목표: ${stats.targetDiameterCm} cm)</div>
                    <div>흡수한 물체: <strong>${stats.absorbedCount} 개</strong></div>
                    <div>남은 시간: <strong>${Math.floor(stats.timeRemaining)} 초</strong></div>
                  </div>
                `;
              }
              if (btnWrap) {
                btnWrap.innerHTML = `
                  <button id="btn-modal-studio" class="btn-primary btn-smash-highlight" style="font-size:16px; padding:14px; width:100%;">
                    💥 와뿌볼 박살내기! (스튜디오 이동)
                  </button>
                  <button id="btn-modal-save-inventory" class="btn-secondary" style="font-weight:700; width:100%; border:1px solid var(--accent-cyan); color:#e0f2fe; margin-top:8px;">
                    📦 이번 와뿌볼 인벤토리에 보관 (소장하기)
                  </button>
                  ${
                    stats.stageIndex < STAGES.length - 1
                      ? `<button id="btn-modal-next-stage" class="btn-secondary" style="font-weight:700; width:100%; margin-top:8px;">➡️ 다음 스테이지 도전 (${STAGES[stats.stageIndex + 1].title.split(':')[0]})</button>`
                      : ''
                  }
                  <button id="btn-modal-retry" class="btn-secondary" style="width:100%; margin-top:8px;">🔄 현재 스테이지 다시 하기</button>
                `;
                this.bindChallengeModalButtons();
              }

              // Celebratory Confetti & ASMR
              try {
                confetti({
                  particleCount: 75,
                  spread: 65,
                  origin: { y: 0.6 },
                });
              } catch {
                // Ignore in tests
              }
              this.audio.playAbsorb(5);
            } else {
              if (iconEl) iconEl.textContent = '⏳';
              if (titleEl) titleEl.textContent = '시간 종료! (Time Over)';
              if (bodyEl) {
                bodyEl.innerHTML = `
                  <p>도전 시간이 모두 흘렀습니다! 선인장과 톱날을 피하고 보너스 시계를 모아보세요.</p>
                  <div class="modal-stats">
                    <div>도달 직경: <strong>${stats.currentDiameterCm.toFixed(1)} cm</strong> (목표: ${stats.targetDiameterCm} cm)</div>
                    <div>흡수한 물체: <strong>${stats.absorbedCount} 개</strong></div>
                  </div>
                `;
              }
              if (btnWrap) {
                btnWrap.innerHTML = `
                  <button id="btn-modal-retry" class="btn-primary" style="width:100%;">🔄 다시 도전하기</button>
                  <button id="btn-modal-freeroll" class="btn-secondary" style="width:100%;">♾️ 무제한 자유 모드로 계속하기</button>
                `;
                this.bindChallengeModalButtons();
              }
            }
          }
        } else {
          this.currentModalType = 'none';
          modal.style.display = 'none';
        }
      }
    });
  }

  private bindEvents(): void {
    // Mode toggle button
    const modeBtn = document.getElementById('btn-switch-mode');
    this.bindTouchAndClick(modeBtn, () => {
      const next = this.state.getMode() === 'CITY' ? 'STUDIO' : 'CITY';
      this.state.setMode(next);
    });

    // Briefing modal start button
    const startStageBtn = document.getElementById('btn-start-stage');
    this.bindTouchAndClick(startStageBtn, () => {
      this.onStartGameCb?.();
    });

    // Briefing modal stage tab buttons
    const stageTabs = this.container.querySelectorAll('.stage-tab-btn');
    stageTabs.forEach((tab) => {
      this.bindTouchAndClick(tab as HTMLElement, async () => {
        await this.audio.unlock();
        const idxStr = (tab as HTMLElement).getAttribute('data-stage-idx');
        if (idxStr !== null) {
          const idx = parseInt(idxStr, 10);
          this.onStageSelectCb?.(idx);
          this.audio.playSquish(0.6);
        }
      });
    });

    // Open briefing button in HUD
    const openBriefingBtn = document.getElementById('btn-open-briefing');
    this.bindTouchAndClick(openBriefingBtn, () => {
      this.state.openBriefing();
    });

    // BGM toggle button
    const bgmBtn = document.getElementById('btn-toggle-bgm');
    if (bgmBtn) {
      this.bindTouchAndClick(bgmBtn, async () => {
        await this.audio.unlock();
        if (this.audio.isBgmPlaying()) {
          this.audio.stopBgm();
        } else {
          this.audio.startBgm();
        }
        bgmBtn.textContent = this.audio.isBgmPlaying() ? '🎵 BGM 끄기' : '🎵 BGM 켜기';
      });
    }

    // Challenge Mode Toggle (도전 / 자유 모드)
    const toggleChallengeBtn = document.getElementById('btn-toggle-challenge');
    this.bindTouchAndClick(toggleChallengeBtn, () => {
      const stats = this.state.getStats();
      this.state.setChallengeMode(!stats.challengeMode);
      this.render();
    });

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

    // Multi-touch city action buttons (Jump, Boost, Reset)
    const jumpBtn = document.getElementById('btn-city-jump');
    this.bindTouchAndClick(jumpBtn, () => {
      this.onJumpCb?.();
    });

    const boostBtn = document.getElementById('btn-city-boost');
    this.bindTouchAndClick(boostBtn, () => {
      this.onBoostCb?.();
    });

    const resetBtn = document.getElementById('btn-city-reset');
    this.bindTouchAndClick(resetBtn, () => {
      this.onCityResetCb?.();
    });

    // Challenge Victory / Game Over Modal Buttons
    this.bindChallengeModalButtons();

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

    // Play / Smash saved ball from inventory
    const playSmashBtns = this.container.querySelectorAll('.btn-play-smash');
    playSmashBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.audio.unlock();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-play-id');
        if (!id) return;

        const result = this.customizer.collection.consumePlay(id);
        const ball = this.customizer.collection.getById(id);
        if (!ball) return;

        if (result.allowed) {
          const loaded = this.customizer.loadFromCollection(id);
          if (loaded) {
            const mat = this.customizer.getMaterial();
            this.studio.loadSavedBall(loaded.maxDiameterCm / 200, mat);
            this.audio.playPop();
            alert(`💥 [${ball.name}]을 꺼냈습니다! 마음껏 두드리고 박살내세요!\n${result.unlimited ? '💎 무제한 플레이 가능' : `🎮 남은 플레이 횟수: ${result.remaining}회`}`);
            this.render();
          }
        } else {
          this.audio.playCrunch(0.5);
          alert(`⚠️ [${ball.name}]의 플레이 횟수를 모두 소진했습니다!\n[💎 무제한 해금] 버튼을 눌러 무제한으로 플레이하세요!`);
        }
      });
    });

    // Unlock unlimited plays for saved ball (IAP simulation)
    const unlockBtns = this.container.querySelectorAll('.btn-unlock-unlimited');
    unlockBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.audio.unlock();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-unlock-id');
        if (!id) return;
        const ball = this.customizer.collection.getById(id);
        if (!ball) return;

        const success = this.customizer.collection.unlockUnlimited(id);
        if (success) {
          this.audio.playAbsorb(5);
          alert(`🎉 [${ball.name}] 무제한 박살내기 이용권이 영구 해금되었습니다!\n이제 횟수 제한 없이 마음껏 플레이할 수 있습니다!`);
          this.render();
        }
      });
    });

    // Load from Collection
    const collectionItems = this.container.querySelectorAll('.collection-item');
    collectionItems.forEach((item) => {
      item.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-delete-ball, .btn-play-smash, .btn-unlock-unlimited')) return;

        await this.audio.unlock();
        const id = (e.currentTarget as HTMLElement).getAttribute('data-ball-id');
        if (id) {
          const loaded = this.customizer.loadFromCollection(id);
          if (loaded) {
            const mat = this.customizer.getMaterial();
            this.studio.loadSavedBall(loaded.maxDiameterCm / 200, mat);
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

    // Ensure challenge modal buttons are wired if modal is present
    this.bindChallengeModalButtons();
  }

  private bindChallengeModalButtons(): void {
    const modalStudioBtn = document.getElementById('btn-modal-studio');
    if (modalStudioBtn) {
      this.bindTouchAndClick(modalStudioBtn, () => {
        const stats = this.state.getStats();
        const mat = this.customizer.getMaterial();
        this.studio.loadSavedBall(stats.currentDiameterCm / 200, mat);
        this.state.setMode('STUDIO');
      });
    }

    const saveInvBtn = document.getElementById('btn-modal-save-inventory');
    if (saveInvBtn) {
      this.bindTouchAndClick(saveInvBtn, async () => {
        await this.audio.unlock();
        const stats = this.state.getStats();
        const currentStage = STAGES[stats.stageIndex] || STAGES[0];
        const saved = this.customizer.saveCurrentBall(
          stats.currentDiameterCm,
          stats.absorbedCount,
          currentStage.title.split(':')[0]
        );
        this.audio.playAbsorb(4);
        saveInvBtn.innerHTML = `✅ [${saved.name}] 인벤토리에 안전하게 소장 완료!`;
        (saveInvBtn as HTMLButtonElement).disabled = true;
        saveInvBtn.style.opacity = '0.85';
      });
    }

    const nextStageBtn = document.getElementById('btn-modal-next-stage');
    if (nextStageBtn) {
      this.bindTouchAndClick(nextStageBtn, () => {
        const stats = this.state.getStats();
        if (stats.stageIndex < STAGES.length - 1) {
          this.onStageSelectCb?.(stats.stageIndex + 1);
        }
      });
    }

    const modalRetryBtn = document.getElementById('btn-modal-retry');
    if (modalRetryBtn) {
      this.bindTouchAndClick(modalRetryBtn, () => {
        const stats = this.state.getStats();
        this.onStageSelectCb?.(stats.stageIndex);
      });
    }

    const modalFreerollBtn = document.getElementById('btn-modal-freeroll');
    if (modalFreerollBtn) {
      this.bindTouchAndClick(modalFreerollBtn, () => {
        this.state.setChallengeMode(false);
        this.render();
      });
    }
  }
}
