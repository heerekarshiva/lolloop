export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeededRNG {
  random(): number;
  randomInt(min: number, max: number): number;
  randomFloat(min: number, max: number): number;
  shuffle<T>(arr: T[]): T[];
  pick<T>(arr: T[]): T;
  readonly seed: number;
}

export function createRNG(seed?: number): SeededRNG {
  const s = seed ?? Math.floor(Math.random() * 0xffffffff);
  const gen = mulberry32(s);

  return {
    get seed() { return s; },
    random() { return gen(); },
    randomInt(min: number, max: number): number {
      return Math.floor(gen() * (max - min + 1)) + min;
    },
    randomFloat(min: number, max: number): number {
      return gen() * (max - min) + min;
    },
    shuffle<T>(arr: T[]): T[] {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(gen() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(gen() * arr.length)];
    },
  };
}

export const dailySeed = (): number => Math.floor(Date.now() / 86_400_000);
