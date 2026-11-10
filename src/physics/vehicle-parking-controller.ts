import type { VehicleInput, VehicleState, VehicleTuning } from './vehicle-dynamics';

export interface ParkingPose {
  x: number;
  z: number;
  yaw: number;
}

export interface ParkingEnvelope {
  centerX: number;
  centerZ: number;
  yaw: number;
  halfLength: number;
  halfWidth: number;
}

export interface ParkingControllerConfig {
  maximumSpeed: number;
  stoppingRadius: number;
  headingWeight: number;
  positionTolerance: number;
  headingTolerance: number;
  speedTolerance: number;
  envelopeHalfLength: number;
  envelopeHalfWidth: number;
}

export interface ParkingControlResult {
  input: VehicleInput;
  positionError: number;
  headingError: number;
  insideEnvelope: boolean;
  settled: boolean;
}

export const defaultParkingControllerConfig: ParkingControllerConfig = {
  maximumSpeed: 1.05,
  stoppingRadius: 0.22,
  headingWeight: 0.75,
  positionTolerance: 0.28,
  headingTolerance: 0.12,
  speedTolerance: 0.1,
  envelopeHalfLength: 2.18,
  envelopeHalfWidth: 1.08
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const wrapAngle = (angle: number) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));

/** Returns true only when all four sedan footprint corners fit in the parking envelope. */
export function isSedanInsideParkingEnvelope(
  pose: ParkingPose,
  envelope: ParkingEnvelope,
  halfLength = 1.94,
  halfWidth = 0.88
): boolean {
  const c = Math.cos(envelope.yaw);
  const s = Math.sin(envelope.yaw);
  const carC = Math.cos(pose.yaw);
  const carS = Math.sin(pose.yaw);

  for (const localX of [-halfLength, halfLength]) {
    for (const localZ of [-halfWidth, halfWidth]) {
      const worldX = pose.x + localX * carC + localZ * carS;
      const worldZ = pose.z - localX * carS + localZ * carC;
      const dx = worldX - envelope.centerX;
      const dz = worldZ - envelope.centerZ;
      const envelopeX = dx * c - dz * s;
      const envelopeZ = dx * s + dz * c;
      if (Math.abs(envelopeX) > envelope.halfLength || Math.abs(envelopeZ) > envelope.halfWidth) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Low-speed, forward-only terminal pose controller. It computes controls only;
 * vehicle dynamics and collision checks remain authoritative for movement.
 */
export function computeParkingControl(
  state: VehicleState,
  target: ParkingPose,
  tuning: VehicleTuning,
  envelope: ParkingEnvelope,
  config: ParkingControllerConfig = defaultParkingControllerConfig
): ParkingControlResult {
  const dx = target.x - state.x;
  const dz = target.z - state.z;
  const positionError = Math.hypot(dx, dz);
  const headingError = wrapAngle(target.yaw - state.yaw);
  const c = Math.cos(state.yaw);
  const s = Math.sin(state.yaw);
  const localX = dx * c - dz * s;
  const localZ = dx * s + dz * c;
  const distance = Math.max(positionError, 0.2);
  const bearing = Math.atan2(localZ, localX);
  const curvature = 2 * Math.sin(bearing) / distance - config.headingWeight * headingError;
  const steering = clamp(
    -Math.atan(tuning.wheelbase * curvature) / tuning.maxSteeringAngle,
    -1,
    1
  );

  const remaining = Math.max(0, positionError - config.stoppingRadius);
  const speedLimit = Math.sqrt(2 * tuning.serviceBrake * 0.55 * remaining);
  const targetSpeed = positionError <= config.positionTolerance
    ? 0
    : Math.min(config.maximumSpeed, speedLimit);
  const throttle = state.speed < targetSpeed - 0.08 ? 1 : 0;
  const brake = state.speed > targetSpeed + 0.06 || positionError <= config.positionTolerance
    ? clamp((state.speed - targetSpeed) * 0.8, 0.2, 1)
    : 0;

  const insideEnvelope = isSedanInsideParkingEnvelope(
    state,
    {
      ...envelope,
      centerX: target.x,
      centerZ: target.z,
      yaw: target.yaw
    }
  );
  const settled = insideEnvelope &&
    positionError <= config.positionTolerance &&
    Math.abs(headingError) <= config.headingTolerance &&
    Math.abs(state.speed) <= config.speedTolerance;

  return {
    input: { throttle, brake, steering },
    positionError,
    headingError,
    insideEnvelope,
    settled
  };
}
