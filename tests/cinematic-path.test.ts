import { describe, expect, it } from 'vitest';
import { sampleCinematicPath } from '../src/physics/cinematic-path';

describe('sampleCinematicPath', () => {
  const start = { x: -3.8, z: 5.5 };
  const c1 = { x: -1.4, z: 5.5 };
  const c2 = { x: 1.2, z: 5.5 };
  const end = { x: 3.25, z: 5.5 };

  it('starts and ends at the authored cinematic positions', () => {
    expect(sampleCinematicPath(start, c1, c2, end, 0)).toMatchObject({ x: start.x, z: start.z });
    expect(sampleCinematicPath(start, c1, c2, end, 1)).toMatchObject({ x: end.x, z: end.z });
  });

  it('is deterministic and clamps progress outside the timeline', () => {
    expect(sampleCinematicPath(start, c1, c2, end, .42)).toEqual(sampleCinematicPath(start, c1, c2, end, .42));
    expect(sampleCinematicPath(start, c1, c2, end, -1)).toEqual(sampleCinematicPath(start, c1, c2, end, 0));
    expect(sampleCinematicPath(start, c1, c2, end, 2)).toEqual(sampleCinematicPath(start, c1, c2, end, 1));
  });

  it('always returns a forward tangent along the approach lane', () => {
    for (let i = 0; i <= 20; i++) {
      const sample = sampleCinematicPath(start, c1, c2, end, i / 20);
      expect(sample.tangentX).toBeGreaterThan(0);
      expect(Math.abs(sample.tangentZ)).toBeLessThan(1e-9);
    }
  });
});
