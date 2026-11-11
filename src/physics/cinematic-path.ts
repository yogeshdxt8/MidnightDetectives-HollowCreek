export interface CinematicPathPoint { x: number; z: number; }
export interface CinematicPathSample extends CinematicPathPoint { tangentX: number; tangentZ: number; }

/** Cubic Bezier trajectory sampled by normalized cinematic time. */
export function sampleCinematicPath(
  start: CinematicPathPoint,
  control1: CinematicPathPoint,
  control2: CinematicPathPoint,
  end: CinematicPathPoint,
  progress: number
): CinematicPathSample {
  const t = Math.max(0, Math.min(1, progress));
  const u = 1 - t;
  const x = u*u*u*start.x + 3*u*u*t*control1.x + 3*u*t*t*control2.x + t*t*t*end.x;
  const z = u*u*u*start.z + 3*u*u*t*control1.z + 3*u*t*t*control2.z + t*t*t*end.z;
  const tangentX = 3*u*u*(control1.x-start.x) + 6*u*t*(control2.x-control1.x) + 3*t*t*(end.x-control2.x);
  const tangentZ = 3*u*u*(control1.z-start.z) + 6*u*t*(control2.z-control1.z) + 3*t*t*(end.z-control2.z);
  return { x, z, tangentX, tangentZ };
}
