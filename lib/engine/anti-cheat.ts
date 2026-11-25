import { GAMES } from '@/lib/games';

export interface ScoreRule {
  absoluteMax: number;
  maxPerSecond: number;
  minSessionMs: number;
}

// Build rules from GAMES registry — keyed by slug
const RULES: Record<string, ScoreRule> = Object.fromEntries(
  GAMES.map((g) => [
    g.slug,
    {
      absoluteMax: g.maxScore,
      maxPerSecond: g.maxScore / 300, // 5 min max session
      minSessionMs: 5_000,
    },
  ])
);

export function getRule(slug: string): ScoreRule {
  return RULES[slug] ?? { absoluteMax: 1_000_000, maxPerSecond: 3333, minSessionMs: 5_000 };
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateScore(slug: string, score: number, sessionMs: number): ValidationResult {
  if (score < 0) return { valid: false, reason: 'negative score' };
  if (score === 0) return { valid: true };

  const rule = getRule(slug);

  if (sessionMs < rule.minSessionMs) {
    return { valid: false, reason: `session too short (${sessionMs}ms < ${rule.minSessionMs}ms)` };
  }

  if (score > rule.absoluteMax) {
    return { valid: false, reason: `score ${score} exceeds absolute max ${rule.absoluteMax}` };
  }

  const sessionSec = sessionMs / 1000;
  const rateLimit = rule.maxPerSecond * sessionSec;
  if (score > rateLimit) {
    return { valid: false, reason: `score rate exceeded (${score} > ${rateLimit.toFixed(0)})` };
  }

  return { valid: true };
}

/** Stateful per-session validator */
export class ScoreValidator {
  private startMs: number;
  private slug: string;

  constructor(slug: string) {
    this.slug = slug;
    this.startMs = performance.now();
  }

  validate(score: number): ValidationResult {
    const sessionMs = performance.now() - this.startMs;
    return validateScore(this.slug, score, sessionMs);
  }

  reset() {
    this.startMs = performance.now();
  }
}
