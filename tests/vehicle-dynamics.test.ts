import { describe, expect, it } from 'vitest';
import { sedanTuning, stepVehicle, type VehicleState } from '../src/physics/vehicle-dynamics';

const stopped: VehicleState = { x: 0, z: -18, yaw: -Math.PI / 2, speed: 0, steering: 0 };

describe('cinematic sedan dynamics', () => {
  it('accelerates forward along the road rather than sliding sideways', () => {
    const result = stepVehicle(stopped, { throttle: 1, brake: 0, steering: 0 }, 1 / 60);
    expect(result.state.z).toBeGreaterThan(stopped.z);
    expect(Math.abs(result.state.x)).toBeLessThan(0.001);
    expect(result.state.speed).toBeGreaterThan(0);
  });

  it('brakes without reversing through the stop point', () => {
    let state = { ...stopped, z: -8, speed: 4 };
    for (let i = 0; i < 180; i++) {
      state = stepVehicle(state, { throttle: 0, brake: 1, steering: 0 }, 1 / 60).state;
    }
    expect(state.speed).toBe(0);
    expect(state.z).toBeGreaterThan(-8);
  });

  it('cannot cross a closed gate with the front bumper', () => {
    let state = { ...stopped, z: -16, speed: 3 };
    let blocked = false;
    for (let i = 0; i < 120; i++) {
      const result = stepVehicle(state, { throttle: 1, brake: 0, steering: 0 }, 1 / 60, sedanTuning, -13.6);
      state = result.state;
      blocked ||= result.blockedByGate;
    }
    expect(blocked).toBe(true);
    expect(state.z).toBeLessThan(-13.6);
    expect(state.speed).toBe(0);
  });

  it('turns proportionally to speed and steering input', () => {
    const result = stepVehicle({ ...stopped, speed: 3 }, { throttle: 0, brake: 0, steering: 1 }, 0.1);
    expect(result.state.yaw).not.toBe(stopped.yaw);
    expect(result.state.x).not.toBe(0);
  });

  it('clamps speed to the cinematic road limit', () => {
    let state = { ...stopped, speed: 7.4 };
    for (let i = 0; i < 120; i++) {
      state = stepVehicle(state, { throttle: 1, brake: 0, steering: 0 }, 1 / 60).state;
    }
    expect(state.speed).toBeLessThanOrEqual(sedanTuning.maxSpeed);
  });
});
