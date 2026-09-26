export type GameMode = 'CITY' | 'STUDIO';

export interface GameStats {
  currentDiameterCm: number;
  absorbedCount: number;
  score: number;
  totalCityItems: number;
  currentTier: number;
  challengeMode: boolean;
  timeRemaining: number;
  targetDiameterCm: number;
  isGameOver: boolean;
  isVictory: boolean;
  stageIndex: number;
  stageBriefingActive: boolean;
  portalUnlocked: boolean;
}

export type ModeChangeListener = (mode: GameMode) => void;
export type StatsChangeListener = (stats: GameStats) => void;

export class GameState {
  private mode: GameMode = 'CITY';
  private stats: GameStats = {
    currentDiameterCm: 25.0,
    absorbedCount: 0,
    score: 0,
    totalCityItems: 650,
    currentTier: 1,
    challengeMode: true,
    timeRemaining: 130.0,
    targetDiameterCm: 120.0,
    isGameOver: false,
    isVictory: false,
    stageIndex: 0,
    stageBriefingActive: true,
    portalUnlocked: false,
  };

  private modeListeners: Set<ModeChangeListener> = new Set();
  private statsListeners: Set<StatsChangeListener> = new Set();

  public getMode(): GameMode {
    return this.mode;
  }

  public setMode(newMode: GameMode): void {
    if (this.mode !== newMode) {
      this.mode = newMode;
      for (const listener of this.modeListeners) {
        listener(this.mode);
      }
    }
  }

  public getStats(): Readonly<GameStats> {
    return this.stats;
  }

  public updateStats(partial: Partial<GameStats>): void {
    Object.assign(this.stats, partial);
    this.notifyStats();
  }

  private notifyStats(): void {
    for (const listener of this.statsListeners) {
      listener(this.stats);
    }
  }

  public onModeChange(listener: ModeChangeListener): () => void {
    this.modeListeners.add(listener);
    return () => this.modeListeners.delete(listener);
  }

  public onStatsChange(listener: StatsChangeListener): () => void {
    this.statsListeners.add(listener);
    return () => this.statsListeners.delete(listener);
  }

  public setChallengeMode(enabled: boolean): void {
    this.stats.challengeMode = enabled;
    this.notifyStats();
  }

  public addBonusTime(seconds: number): void {
    if (!this.stats.challengeMode || this.stats.isGameOver || this.stats.isVictory) return;
    this.stats.timeRemaining += seconds;
    this.notifyStats();
  }

  public resetChallenge(targetCm: number = 250.0, timeSec: number = 150.0): void {
    this.stats.targetDiameterCm = targetCm;
    this.stats.timeRemaining = timeSec;
    this.stats.isGameOver = false;
    this.stats.isVictory = false;
    this.stats.stageBriefingActive = false;
    this.notifyStats();
  }

  public setStage(stageIndex: number, targetCm: number, timeSec: number, initialCm: number = 25.0): void {
    this.stats.stageIndex = stageIndex;
    this.stats.currentDiameterCm = initialCm;
    this.stats.targetDiameterCm = targetCm;
    this.stats.timeRemaining = timeSec;
    this.stats.stageBriefingActive = true;
    this.stats.isGameOver = false;
    this.stats.isVictory = false;
    this.stats.portalUnlocked = false;
    this.stats.absorbedCount = 0;
    this.notifyStats();
  }

  public closeBriefing(): void {
    this.stats.stageBriefingActive = false;
    this.notifyStats();
  }

  public openBriefing(): void {
    this.stats.stageBriefingActive = true;
    this.notifyStats();
  }

  public triggerVictory(): void {
    this.stats.isVictory = true;
    this.notifyStats();
  }

  public tickTimer(dt: number, requirePortal: boolean = false): void {
    if (!this.stats.challengeMode || this.mode !== 'CITY' || this.stats.stageBriefingActive) return;
    if (this.stats.isGameOver || this.stats.isVictory) return;

    // Check size goal
    if (this.stats.currentDiameterCm >= this.stats.targetDiameterCm) {
      this.stats.portalUnlocked = true;
      if (!requirePortal) {
        this.stats.isVictory = true;
        this.notifyStats();
        return;
      }
    }

    // Countdown time
    this.stats.timeRemaining = Math.max(0, this.stats.timeRemaining - dt);

    // Check Game Over condition
    if (this.stats.timeRemaining <= 0) {
      this.stats.timeRemaining = 0;
      this.stats.isGameOver = true;
    }

    this.notifyStats();
  }
}
