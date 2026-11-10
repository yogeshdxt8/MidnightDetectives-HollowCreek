import { describe, expect, it } from 'vitest';
import { VehicleRouteNavigator } from '../src/navigation/vehicle-route-navigator';

const pose = (x: number, z: number, speed = 0) => ({ x, z, yaw: 0, speed });

describe('vehicle route navigator', () => {
  it('projects the vehicle onto the active segment and reports signed cross-track error', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('straight', { x: 0, z: 0 }, [{ x: 10, z: 0, speed: 2 }]);

    const result = navigator.update(pose(3, 1), 1 / 60);

    expect(result.waypointIndex).toBe(0);
    expect(result.crossTrackError).toBeCloseTo(1);
    expect(result.alongTrackDistance).toBeCloseTo(3);
    expect(result.lookAheadPoint.x).toBeGreaterThan(3);
    expect(result.lookAheadPoint.z).toBeCloseTo(0);
    expect(result.mode).toBe('tracking');
  });

  it('advances a passed waypoint only inside its bounded segment corridor', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('corner', { x: 0, z: 0 }, [
      { x: 5, z: 0, speed: 2 },
      { x: 5, z: 5, speed: 1 }
    ]);

    const passed = navigator.update(pose(5.5, 0.1), 1 / 60);
    expect(passed.waypointIndex).toBe(1);

    const outsideCornerCorridor = navigator.update(pose(7, 2.5), 1 / 60);
    expect(outsideCornerCorridor.waypointIndex).toBe(1);
    expect(outsideCornerCorridor.mode).toBe('recovering');
  });

  it('constrains look-ahead before a sharp upcoming corner', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('tight-corner', { x: 0, z: 0 }, [
      { x: 0, z: 3, speed: 1.5 },
      { x: 3, z: 3, speed: 1 }
    ]);

    const result = navigator.update(pose(0, 1.8, 2.5), 1 / 60);

    expect(result.waypointIndex).toBe(0);
    expect(result.lookAheadDistance).toBeLessThan(1.8);
    expect(result.lookAheadPoint.x).toBeGreaterThanOrEqual(0);
    expect(result.lookAheadPoint.x).toBeLessThan(0.3);
    expect(result.lookAheadPoint.z).toBeGreaterThan(1.8);
    expect(result.lookAheadPoint.z).toBeLessThanOrEqual(3.3);
  });

  it('keeps the failed arrival pose in bounded recovery instead of aiming through a later corner', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('dropoff', { x: 3.25, z: 5.5 }, [
      { x: 4.05, z: 4.4, speed: 2.8 },
      { x: 4.55, z: 2.4, speed: 2.7 },
      { x: 4.35, z: 0.2, speed: 2.5 },
      { x: 3.75, z: -1.7, speed: 2.2 },
      { x: 4, z: -4.3, speed: 1.5 }
    ]);

    const failedPose = { x: 7.29, z: 2.43, yaw: 1.1847, speed: 0.666 };
    const result = navigator.update(failedPose, 1 / 60);

    expect(result.waypointIndex).toBe(0);
    expect(result.mode).toBe('recovering');
    expect(result.lookAheadDistance).toBeLessThanOrEqual(2.25);
    expect(result.lookAheadPoint).toEqual(expect.objectContaining({
      x: expect.any(Number),
      z: expect.any(Number)
    }));
  });

  it('does not skip a corner when the vehicle is laterally displaced', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('right-angle', { x: 0, z: 0 }, [
      { x: 0, z: 4, speed: 1.5 },
      { x: 4, z: 4, speed: 1 }
    ]);

    const result = navigator.update(pose(2, 5), 1 / 60);

    expect(result.waypointIndex).toBe(0);
    expect(Math.abs(result.crossTrackError)).toBeCloseTo(2);
    expect(result.mode).toBe('recovering');
  });

  it('returns to tracking when cross-track error returns inside the recovery band', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('recover', { x: 0, z: 0 }, [{ x: 10, z: 0, speed: 2 }]);

    expect(navigator.update(pose(2, 1.5), 0.1).mode).toBe('recovering');
    const recovered = navigator.update(pose(3, 0.4), 0.1);

    expect(recovered.mode).toBe('tracking');
    expect(recovered.recoveryElapsed).toBe(0);
    expect(recovered.replanRequested).toBe(false);
  });

  it('requests replanning when bounded recovery time is exceeded', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('timeout-recovery', { x: 0, z: 0 }, [{ x: 10, z: 0, speed: 2 }]);

    let result = navigator.update(pose(2, 2), 0.1);
    for (let i = 0; i < 26 && !result.replanRequested; i += 1) {
      result = navigator.update(pose(2, 2), 0.1);
    }

    expect(result.mode).toBe('replan-required');
    expect(result.replanRequested).toBe(true);
    expect(result.recoveryElapsed).toBeGreaterThan(2.5);
  });

  it('requests replanning immediately when the vehicle exceeds the recovery distance', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('hard-deviation', { x: 0, z: 0 }, [{ x: 10, z: 0, speed: 2 }]);

    const result = navigator.update(pose(2, 4), 1 / 60);

    expect(result.mode).toBe('replan-required');
    expect(result.replanRequested).toBe(true);
  });

  it('completes only when the final waypoint is physically reached or passed in corridor', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('terminal', { x: 0, z: 0 }, [{ x: 5, z: 0, speed: 0.5 }]);

    const approaching = navigator.update(pose(4.5, 0.5), 1 / 60);
    expect(approaching.routeComplete).toBe(true);
    expect(approaching.mode).toBe('complete');
  });

  it('rejects invalid route definitions instead of silently creating unusable navigation state', () => {
    const navigator = new VehicleRouteNavigator();

    expect(() => navigator.setRoute('', { x: 0, z: 0 }, [{ x: 1, z: 0, speed: 1 }])).toThrow();
    expect(() => navigator.setRoute('empty', { x: 0, z: 0 }, [])).toThrow();
    expect(() => navigator.setRoute('bad-speed', { x: 0, z: 0 }, [{ x: 1, z: 0, speed: -1 }])).toThrow();
  });
});
