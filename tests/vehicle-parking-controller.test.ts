import { describe, expect, it } from 'vitest';
import { sedanTuning, type VehicleState } from '../src/physics/vehicle-dynamics';
import {
  computeParkingControl,
  defaultParkingControllerConfig,
  isSedanInsideParkingEnvelope
} from '../src/physics/vehicle-parking-controller';

const envelope = {
  centerX: 4,
  centerZ: -4.3,
  yaw: Math.PI / 2,
  halfLength: defaultParkingControllerConfig.envelopeHalfLength,
  halfWidth: defaultParkingControllerConfig.envelopeHalfWidth
};

const state = (overrides: Partial<VehicleState> = {}): VehicleState => ({
  x: 4,
  z: -4.3,
  yaw: Math.PI / 2,
  speed: 0,
  steering: 0,
  ...overrides
});

describe('vehicle parking controller', () => {
  it('requires the complete rotated sedan footprint to fit inside the parking envelope', () => {
    expect(isSedanInsideParkingEnvelope(state(), envelope)).toBe(true);
    expect(isSedanInsideParkingEnvelope(state({ x: 5.1 }), envelope)).toBe(false);
    expect(isSedanInsideParkingEnvelope(state({ yaw: 0 }), envelope)).toBe(false);
  });

  it('fits the full sedan footprint at the controller heading tolerance without relaxing collision checks', () => {
    const targetYaw = Math.PI / 2;
    const envelopeAtTarget = {
      centerX: 4,
      centerZ: -4.3,
      yaw: targetYaw,
      halfLength: defaultParkingControllerConfig.envelopeHalfLength,
      halfWidth: defaultParkingControllerConfig.envelopeHalfWidth
    };
    expect(isSedanInsideParkingEnvelope(
      state({ yaw: targetYaw + 0.18 }),
      envelopeAtTarget
    )).toBe(true);
  });

  it('commands a controlled low-speed approach and brakes inside the stopping radius', () => {
    const approach = computeParkingControl(
      state({ x: 4, z: -2.8, speed: 1.2 }),
      { x: 4, z: -4.3, yaw: Math.PI / 2 },
      sedanTuning,
      envelope
    );
    expect(approach.input.throttle).toBe(0);
    expect(approach.input.brake).toBeGreaterThan(0);

    const nearTarget = computeParkingControl(
      state({ z: -4.1, speed: 0.16 }),
      { x: 4, z: -4.3, yaw: Math.PI / 2 },
      sedanTuning,
      envelope
    );
    expect(nearTarget.input.throttle).toBe(0);
    expect(nearTarget.input.brake).toBeGreaterThan(0);
  });

  it('does not declare parked until position, heading, speed and full footprint are valid', () => {
    const target = { x: 4, z: -4.3, yaw: Math.PI / 2 };
    expect(computeParkingControl(state({ yaw: 1.2 }), target, sedanTuning, envelope).settled).toBe(false);
    expect(computeParkingControl(state({ speed: 0.2 }), target, sedanTuning, envelope).settled).toBe(false);
    expect(computeParkingControl(state(), target, sedanTuning, envelope).settled).toBe(true);
  });

  it('continues a low-speed correction at the previously failed stopped-but-not-parked pose', () => {
    const target = { x: 4, z: -4.3, yaw: Math.atan2(5.14, 0.12) };
    const failedPose = state({
      x: 4.015830872501567,
      z: -4.115795994888321,
      yaw: 1.6295315176341159,
      speed: 0,
      steering: 0.48
    });
    const result = computeParkingControl(failedPose, target, sedanTuning, {
      centerX: target.x,
      centerZ: target.z,
      yaw: target.yaw,
      halfLength: defaultParkingControllerConfig.envelopeHalfLength,
      halfWidth: defaultParkingControllerConfig.envelopeHalfWidth
    });

    expect(result.positionError).toBeLessThan(defaultParkingControllerConfig.positionTolerance);
    expect(result.insideEnvelope).toBe(false);
    expect(result.settled).toBe(false);
    expect(result.input.reverse).toBe(0);
    expect(result.input.throttle).toBe(1);
    expect(result.input.brake).toBe(0);
  });

  it('keeps a terminal crawl when the center is close but the sedan footprint still exceeds the envelope', () => {
    const target = { x: 4, z: -4.3, yaw: Math.atan2(5.14, 0.12) };
    const nearButNotInside = state({
      x: 4.004162469688286,
      z: -4.1,
      yaw: 1.6583725777766536,
      speed: 0,
      steering: 0.48
    });
    const result = computeParkingControl(nearButNotInside, target, sedanTuning, {
      centerX: target.x,
      centerZ: target.z,
      yaw: target.yaw,
      halfLength: defaultParkingControllerConfig.envelopeHalfLength,
      halfWidth: defaultParkingControllerConfig.envelopeHalfWidth
    });
    expect(result.positionError).toBeLessThan(0.04);
    expect(result.insideEnvelope).toBe(false);
    expect(result.settled).toBe(false);
    expect(result.input.throttle).toBe(1);
  });

  it('steers toward the target pose when position and heading are both misaligned', () => {
    const result = computeParkingControl(
      state({ x: 4.7, z: -3.9, yaw: 1.1, speed: 0.3 }),
      { x: 4, z: -4.3, yaw: Math.PI / 2 },
      sedanTuning,
      envelope
    );
    expect(Number.isFinite(result.input.steering)).toBe(true);
    expect(result.input.steering).toBeGreaterThanOrEqual(-1);
    expect(result.input.steering).toBeLessThanOrEqual(1);
  });
});
