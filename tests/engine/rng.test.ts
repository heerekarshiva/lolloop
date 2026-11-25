import { describe, it, expect } from 'vitest';
import { mulberry32, createRNG, dailySeed } from '../../lib/engine/rng';

describe('mulberry32', () => {
  it('is deterministic — same seed produces same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('createRNG', () => {
  it('randomInt stays within [min, max]', () => {
    const rng = createRNG(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.randomInt(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('randomFloat stays within [min, max]', () => {
    const rng = createRNG(456);
    for (let i = 0; i < 100; i++) {
      const v = rng.randomFloat(-5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });

  it('shuffle produces a permutation', () => {
    const rng = createRNG(789);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(arr);
    expect(shuffled).toHaveLength(arr.length);
    expect(shuffled.sort()).toEqual([...arr].sort());
  });

  it('shuffle does not mutate the original', () => {
    const rng = createRNG(111);
    const arr = [1, 2, 3];
    rng.shuffle(arr);
    expect(arr).toEqual([1, 2, 3]);
  });

  it('pick returns an element from the array', () => {
    const rng = createRNG(222);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('seed is accessible', () => {
    const rng = createRNG(555);
    expect(rng.seed).toBe(555);
  });

  it('dailySeed returns a number', () => {
    expect(typeof dailySeed()).toBe('number');
  });
});
