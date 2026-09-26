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
}

export type ModeChangeListener = (mode: GameMode) => void;
export type StatsChangeListener = (stats: GameStats) => void;

export class GameState {
  private mode: GameMode = 'CITY';
  private stats: GameStats = {
    currentDiameterCm: 120.0,
    absorbedCount: 0,
    score: 0,
    totalCityItems: 180,
    currentTier: 1,
    challengeMode: true,
    timeRemaining: 150.0, // 2m 30s challenge
    targetDiameterCm: 250.0, // Target diameter: 250cm
    isGameOver: false,
    isVictory: false,
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
    this.notifyStats();
  }

  public tickTimer(dt: number): void {
    if (!this.stats.challengeMode || this.mode !== 'CITY') return;
    if (this.stats.isGameOver || this.stats.isVictory) return;

    // Check Victory condition
    if (this.stats.currentDiameterCm >= this.stats.targetDiameterCm) {
      this.stats.isVictory = true;
      this.notifyStats();
      return;
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
