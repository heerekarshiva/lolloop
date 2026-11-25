import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateScore, ScoreValidator } from '../../lib/engine/anti-cheat';

describe('validateScore', () => {
  it('score 0 is always valid', () => {
    expect(validateScore('jump-rush', 0, 10_000).valid).toBe(true);
  });

  it('negative score is invalid', () => {
    expect(validateScore('jump-rush', -1, 10_000).valid).toBe(false);
  });

  it('score above absoluteMax is invalid', () => {
    // jump-rush maxScore = 5000
    const result = validateScore('jump-rush', 999_999, 60_000);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('absolute max');
  });

  it('session too short is invalid', () => {
    const result = validateScore('jump-rush', 100, 1_000); // < 5000ms
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('session too short');
  });

  it('normal valid score passes', () => {
    const result = validateScore('jump-rush', 500, 30_000);
    expect(result.valid).toBe(true);
  });

  it('score rate exceeded is invalid', () => {
    // 5000 pts in 6 seconds — well above max rate
    const result = validateScore('jump-rush', 5000, 6_000);
    expect(result.valid).toBe(false);
  });
});

describe('ScoreValidator', () => {
  it('validates score within session', () => {
    // Mock performance.now to control time
    let fakeNow = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow);

    fakeNow = 0;
    const v = new ScoreValidator('jump-rush');

    fakeNow = 10_000; // 10 seconds in
    const result = v.validate(100);
    expect(result.valid).toBe(true);

    vi.restoreAllMocks();
  });

  it('reset restarts the session timer', () => {
    let fakeNow = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow);

    fakeNow = 0;
    const v = new ScoreValidator('jump-rush');
    fakeNow = 100; // only 100ms — too short
    expect(v.validate(100).valid).toBe(false);

    // Reset
    fakeNow = 0;
    v.reset();
    fakeNow = 10_000;
    expect(v.validate(100).valid).toBe(true);

    vi.restoreAllMocks();
  });
});
