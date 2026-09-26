export type GameMode = 'CITY' | 'STUDIO';

export interface GameStats {
  currentDiameterCm: number;
  absorbedCount: number;
  score: number;
  totalCityItems: number;
  currentTier: number;
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
}
