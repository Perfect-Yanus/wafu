import { MaterialPresetId } from './Materials';

export interface SavedWafuBall {
  id: string;
  name: string;
  color: string;
  materialPreset: MaterialPresetId;
  maxDiameterCm: number;
  itemsAbsorbedCount: number;
  createdAt: number;
}

export class CollectionManager {
  private static STORAGE_KEY = 'wafu_ball_collection_v1';
  private static ACTIVE_KEY = 'wafu_active_ball_id';
  private balls: SavedWafuBall[] = [];
  private activeBallId: string = '';

  constructor() {
    this.load();
    if (this.balls.length === 0) {
      this.populateDefaultCollection();
    }
  }

  private load(): void {
    try {
      const data = localStorage.getItem(CollectionManager.STORAGE_KEY);
      if (data) {
        this.balls = JSON.parse(data);
      }
      this.activeBallId = localStorage.getItem(CollectionManager.ACTIVE_KEY) || (this.balls[0]?.id ?? '');
    } catch {
      this.balls = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(CollectionManager.STORAGE_KEY, JSON.stringify(this.balls));
      localStorage.setItem(CollectionManager.ACTIVE_KEY, this.activeBallId);
    } catch {
      // Ignore quota errors
    }
  }

  private populateDefaultCollection(): void {
    const defaultBalls: SavedWafuBall[] = [
      {
        id: 'ball-default-pink',
        name: '핑크 베리 스퀴시',
        color: '#ff6b8b',
        materialPreset: 'silicone',
        maxDiameterCm: 120.0,
        itemsAbsorbedCount: 15,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'ball-default-jelly',
        name: '아쿠아 크리스탈 젤리',
        color: '#00e5ff',
        materialPreset: 'clear-jelly',
        maxDiameterCm: 250.0,
        itemsAbsorbedCount: 42,
        createdAt: Date.now() - 43200000,
      },
      {
        id: 'ball-default-tape',
        name: '무지개 크런치 테이프볼',
        color: '#ffdd00',
        materialPreset: 'tape-ball',
        maxDiameterCm: 320.0,
        itemsAbsorbedCount: 68,
        createdAt: Date.now(),
      },
    ];

    this.balls = defaultBalls;
    this.activeBallId = defaultBalls[0].id;
    this.save();
  }

  public getAll(): SavedWafuBall[] {
    return [...this.balls];
  }

  public getById(id: string): SavedWafuBall | undefined {
    return this.balls.find((b) => b.id === id);
  }

  public getActiveBall(): SavedWafuBall {
    const found = this.getById(this.activeBallId);
    return found ?? this.balls[0];
  }

  public setActiveBall(id: string): boolean {
    const exists = this.balls.some((b) => b.id === id);
    if (exists) {
      this.activeBallId = id;
      this.save();
      return true;
    }
    return false;
  }

  public saveBall(data: Omit<SavedWafuBall, 'id' | 'createdAt'> & { id?: string }): SavedWafuBall {
    const id = data.id || `ball-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newBall: SavedWafuBall = {
      ...data,
      id,
      createdAt: Date.now(),
    };

    const existingIdx = this.balls.findIndex((b) => b.id === id);
    if (existingIdx >= 0) {
      this.balls[existingIdx] = newBall;
    } else {
      this.balls.unshift(newBall);
    }

    this.activeBallId = id;
    this.save();
    return newBall;
  }

  public deleteBall(id: string): boolean {
    const idx = this.balls.findIndex((b) => b.id === id);
    if (idx >= 0) {
      this.balls.splice(idx, 1);
      if (this.activeBallId === id) {
        this.activeBallId = this.balls[0]?.id ?? '';
      }
      this.save();
      return true;
    }
    return false;
  }
}
