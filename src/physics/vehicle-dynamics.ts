export interface VehicleState {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  steering: number;
}

export interface VehicleInput {
  throttle: number;
  brake: number;
  steering: number;
}

export interface VehicleTuning {
  mass: number;
  engineAcceleration: number;
  serviceBrake: number;
  rollingResistance: number;
  aerodynamicDrag: number;
  wheelbase: number;
  maxSteeringAngle: number;
  maxSpeed: number;
}

export interface VehicleStepResult {
  state: VehicleState;
  wheelAngularSpeed: number;
  blockedByGate: boolean;
}

export const sedanTuning: VehicleTuning = {
  mass: 1420,
  engineAcceleration: 3.15,
  serviceBrake: 8.5,
  rollingResistance: 0.34,
  aerodynamicDrag: 0.018,
  wheelbase: 2.55,
  maxSteeringAngle: 0.48,
  maxSpeed: 7.5
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Deterministic, low-speed bicycle-model vehicle dynamics for the cinematic sedan.
 * The car's local +X axis is forward; yaw=-PI/2 therefore travels along world +Z.
 * Gate collision is represented by a plane and the vehicle's front bumper extent.
 */
export function stepVehicle(
  current: VehicleState,
  input: VehicleInput,
  dt: number,
  tuning: VehicleTuning = sedanTuning,
  closedGateZ?: number,
  halfLength = 1.92
): VehicleStepResult {
  const h = clamp(dt, 0, 1 / 20);
  if (h === 0) return { state: { ...current }, wheelAngularSpeed: 0, blockedByGate: false };

  const throttle = clamp(input.throttle, 0, 1);
  const brake = clamp(input.brake, 0, 1);
  const steeringInput = clamp(input.steering, -1, 1);
  const targetSteering = steeringInput * tuning.maxSteeringAngle;
  const steering = current.steering + (targetSteering - current.steering) * (1 - Math.exp(-h * 7));

  const driveAcceleration = throttle * tuning.engineAcceleration;
  const brakeAcceleration = brake * tuning.serviceBrake * Math.sign(current.speed || 1);
  const resistance = tuning.rollingResistance * Math.sign(current.speed) +
    tuning.aerodynamicDrag * current.speed * Math.abs(current.speed);
  let acceleration = driveAcceleration - brakeAcceleration - resistance;

  // Never allow the brake to reverse the car; it should settle to a true stop.
  if (brake > 0 && Math.abs(current.speed) < 0.12) acceleration = -current.speed / h;
  let speed = current.speed + acceleration * h;
  speed = clamp(speed, -1.2, tuning.maxSpeed);
  if (Math.abs(speed) < 0.025 && throttle === 0) speed = 0;

  const yawRate = Math.abs(speed) < 0.02
    ? 0
    : (speed / tuning.wheelbase) * Math.tan(steering);
  const yaw = current.yaw + yawRate * h;
  const forwardX = Math.cos(yaw);
  const forwardZ = -Math.sin(yaw);
  let x = current.x + forwardX * speed * h;
  let z = current.z + forwardZ * speed * h;
  let blockedByGate = false;

  if (closedGateZ !== undefined) {
    const frontZ = z + forwardZ * halfLength;
    const crossedClosedGate = current.z + (-Math.sin(current.yaw)) * halfLength < closedGateZ &&
      frontZ >= closedGateZ && forwardZ > 0;
    if (crossedClosedGate) {
      z = closedGateZ - forwardZ * halfLength - 0.035;
      speed = 0;
      blockedByGate = true;
    }
  }

  return {
    state: { x, z, yaw, speed, steering },
    wheelAngularSpeed: speed / 0.39,
    blockedByGate
  };
}
