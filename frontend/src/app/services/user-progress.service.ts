import { Injectable } from '@angular/core';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface DifficultySettings {
  timerSeconds: number;
  minWordLength: number;
  xpMultiplier: number;
  aiResponseMs: number;
  label: string;
  description: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultySettings> = {
  easy:   { timerSeconds: 30, minWordLength: 3, xpMultiplier: 0.75, aiResponseMs: 2500, label: 'Easy',   description: '30s • 3+ letters • 0.75× XP' },
  normal: { timerSeconds: 15, minWordLength: 3, xpMultiplier: 1.0,  aiResponseMs: 1000, label: 'Normal', description: '15s • 3+ letters • 1× XP' },
  hard:   { timerSeconds: 10, minWordLength: 4, xpMultiplier: 1.5,  aiResponseMs: 500,  label: 'Hard',   description: '10s • 4+ letters • 1.5× XP' },
  expert: { timerSeconds: 7,  minWordLength: 5, xpMultiplier: 2.0,  aiResponseMs: 250,  label: 'Expert', description: '7s • 5+ letters • 2× XP' },
};

export interface LevelTier {
  level: number;
  title: string;
  xpRequired: number;
  color: string;
  icon: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, title: 'Novice',        xpRequired: 0,    color: '#86868b', icon: '📝' },
  { level: 2, title: 'Apprentice',    xpRequired: 200,  color: '#34c759', icon: '📖' },
  { level: 3, title: 'Scholar',       xpRequired: 600,  color: '#0071e3', icon: '🎓' },
  { level: 4, title: 'Wordsmith',     xpRequired: 1400, color: '#bf5af2', icon: '⚡' },
  { level: 5, title: 'Lexicon Master',xpRequired: 3000, color: '#ff9f0a', icon: '👑' },
];

export interface UserProgress {
  xp: number;
  level: number;
  title: string;
  icon: string;
  color: string;
  xpToNext: number | null;   // null at max level
  xpInCurrentLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
}

export interface XpAwardResult {
  xpGained: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  newTitle: string;
  newIcon: string;
}

@Injectable({ providedIn: 'root' })
export class UserProgressService {
  private readonly STORAGE_KEY = 'wordgame_progress';

  private getRawProgress(): { xp: number } {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { xp: 0 };
  }

  private saveXp(xp: number): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ xp }));
  }

  private getLevelForXp(xp: number): LevelTier {
    let current = LEVEL_TIERS[0];
    for (const tier of LEVEL_TIERS) {
      if (xp >= tier.xpRequired) current = tier;
    }
    return current;
  }

  getProgress(): UserProgress {
    const { xp } = this.getRawProgress();
    const tier = this.getLevelForXp(xp);
    const nextTier = LEVEL_TIERS.find(t => t.level === tier.level + 1) || null;

    const xpInCurrentLevel = xp - tier.xpRequired;
    const xpNeededForLevel = nextTier ? nextTier.xpRequired - tier.xpRequired : 1;
    const progressPercent = nextTier
      ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100))
      : 100;

    return {
      xp,
      level: tier.level,
      title: tier.title,
      icon: tier.icon,
      color: tier.color,
      xpToNext: nextTier ? nextTier.xpRequired - xp : null,
      xpInCurrentLevel,
      xpNeededForLevel,
      progressPercent,
    };
  }

  /**
   * Calculate XP earned for a set of words at a given difficulty, plus win bonus.
   */
  calculateXp(words: string[], difficulty: Difficulty, didWin: boolean): number {
    const mult = DIFFICULTY_CONFIG[difficulty].xpMultiplier;
    let total = 0;
    for (const word of words) {
      let base = 10;
      const extra = Math.max(0, word.length - 3) * 5;
      const bonus = word.length >= 7 ? 25 : 0;
      total += base + extra + bonus;
    }
    if (didWin) total += 50;
    return Math.round(total * mult);
  }

  /**
   * Award XP and return the result (including whether the player leveled up).
   */
  addXp(xpGained: number): XpAwardResult {
    const { xp: oldXp } = this.getRawProgress();
    const oldTier = this.getLevelForXp(oldXp);
    const newXp = oldXp + xpGained;
    const newTier = this.getLevelForXp(newXp);
    this.saveXp(newXp);

    return {
      xpGained,
      newXp,
      newLevel: newTier.level,
      leveledUp: newTier.level > oldTier.level,
      newTitle: newTier.title,
      newIcon: newTier.icon,
    };
  }
}
