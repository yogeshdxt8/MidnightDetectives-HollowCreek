import { describe, expect, it } from 'vitest';
import { VehicleRouteNavigator, type NavigationPoint } from '../src/navigation/vehicle-route-navigator';
import { stepVehicle, sedanTuning, type VehicleState, type VehicleInput } from '../src/physics/vehicle-dynamics';
import { computeParkingControl, defaultParkingControllerConfig, type ParkingPose } from '../src/physics/vehicle-parking-controller';

const dt = 1 / 60;
const parkingPose: ParkingPose = { x: 4, z: -4.3, yaw: Math.atan2(2.6, 0.25) };
const routes: Record<'approach' | 'dropoff' | 'departure', NavigationPoint[]> = {
  approach: [{ x: 3.25, z: 5.5, speed: 3.8 }],
  dropoff: [
    { x: 4.05, z: 4.4, speed: 2.8 },
    { x: 4.55, z: 2.4, speed: 2.7 },
    { x: 4.35, z: 0.2, speed: 2.5 },
    { x: 3.75, z: -1.7, speed: 2.2 },
    { x: 4, z: -4.3, speed: 1.5 }
  ],
  departure: [
    { x: 4.45, z: -3.7, speed: 1.8 },
    { x: 4.8, z: -1, speed: 2 },
    { x: 4.65, z: 2, speed: 2.5 },
    { x: 3.2, z: 5.2, speed: 3 },
    { x: 3.2, z: 12.5, speed: 4.2 }
  ]
};

const buildingBounds = [
  { minX: -10.75, maxX: -5.45, minZ: -9.9, maxZ: -5.7 },
  { minX: 5.65, maxX: 10.65, minZ: -11.15, maxZ: -6.65 },
  { minX: -11.15, maxX: -5.65, minZ: -19.75, maxZ: -15.25 },
  { minX: 5.35, maxX: 11.15, minZ: -20.4, maxZ: -16 }
];

function footprintClear(state: VehicleState): boolean {
  const c = Math.cos(state.yaw);
  const s = Math.sin(state.yaw);
  for (const lx of [-1.94, 1.94]) {
    for (const lz of [-0.88, 0.88]) {
      const x = state.x + lx * c + lz * s;
      const z = state.z - lx * s + lz * c;
      if (buildingBounds.some(b => x > b.minX - 0.04 && x < b.maxX + 0.04 && z > b.minZ - 0.04 && z < b.maxZ + 0.04)) return false;

    }
  }
  const dx = -state.x;
  const dz = -2.8 - state.z;
  const localX = dx * c - dz * s;
  const localZ = dx * s + dz * c;
  const nearestX = Math.max(-1.94, Math.min(1.94, localX));
  const nearestZ = Math.max(-0.88, Math.min(0.88, localZ));
  if (Math.hypot(localX - nearestX, localZ - nearestZ) < 1.72) return false;
  return true;
}

function routeInput(state: VehicleState, nav: ReturnType<VehicleRouteNavigator['update']>, waypoint: NavigationPoint, maxSpeed: number): VehicleInput {
  const dx = nav.lookAheadPoint.x - state.x;
  const dz = nav.lookAheadPoint.z - state.z;
  const c = Math.cos(state.yaw);
  const s = Math.sin(state.yaw);
  const localX = dx * c - dz * s;
  const localZ = dx * s + dz * c;
  const lookAhead = Math.max(0.8, Math.hypot(dx, dz));
  const alpha = Math.atan2(localZ, localX);
  const curvature = 2 * Math.sin(alpha) / Math.max(lookAhead, 0.35);
  const steering = Math.max(-1, Math.min(1, -Math.atan(sedanTuning.wheelbase * curvature) / sedanTuning.maxSteeringAngle));
  const cornerFactor = Math.max(0.42, Math.min(1, 1 - Math.abs(steering) * 0.48));
  const stoppingSpeed = Math.sqrt(2 * 3.2 * Math.max(0, nav.distanceToWaypoint - 0.5));
  const targetSpeed = Math.min(maxSpeed, waypoint.speed, stoppingSpeed) * cornerFactor;
  const throttle = nav.distanceToWaypoint > 0.28 && state.speed < targetSpeed - 0.12 ? 1 : 0;
  const brake = state.speed > targetSpeed + 0.08 || nav.distanceToWaypoint <= 0.28
    ? Math.max(0.18, Math.min(1, (state.speed - targetSpeed) * 0.65))
    : 0;
  return { throttle, brake, steering };
}

function simulateRoute(
  initial: VehicleState,
  route: NavigationPoint[],
  maxFrames: number,
  parkingTarget?: ParkingPose
): { state: VehicleState; completed: boolean; frames: number; parkingSettled: boolean; maxCrossTrack: number } {
  const navigator = new VehicleRouteNavigator();
  navigator.setRoute('simulation', { x: initial.x, z: initial.z }, route);
  let state = { ...initial };
  let attempts = 0;
  let waypointOffset = 0;
  let maxCrossTrack = 0;
  let parkingSettled = false;

  for (let frame = 0; frame < maxFrames; frame += 1) {
    let nav = navigator.update(state, dt);
    maxCrossTrack = Math.max(maxCrossTrack, Math.abs(nav.crossTrackError));
    if (nav.replanRequested && attempts < 2) {
      const remaining = route.slice(nav.waypointIndex);
      if (remaining.length) {
        attempts += 1;
        waypointOffset += nav.waypointIndex;
        navigator.setRoute('simulation', { x: state.x, z: state.z }, remaining);
        nav = navigator.update(state, dt);
      }
    }

    const terminalActive = parkingTarget &&
      Math.hypot(parkingTarget.x - state.x, parkingTarget.z - state.z) <= 2.5;
    const waypoint = route[Math.min(waypointOffset + nav.waypointIndex, route.length - 1)]!;
    const approachDistance = parkingTarget
      ? Math.hypot(parkingTarget.x - state.x, parkingTarget.z - state.z)
      : Number.POSITIVE_INFINITY;
    const phaseSpeedLimit = parkingTarget
      ? Math.min(1.35, Math.sqrt(2 * 1.4 * Math.max(0, approachDistance - 1)))
      : waypoint.speed;
    const input = terminalActive
      ? computeParkingControl(state, parkingTarget, sedanTuning, {
          centerX: parkingTarget.x,
          centerZ: parkingTarget.z,
          yaw: parkingTarget.yaw,
          halfLength: defaultParkingControllerConfig.envelopeHalfLength,
          halfWidth: defaultParkingControllerConfig.envelopeHalfWidth
        }).input
      : routeInput(state, nav, waypoint, phaseSpeedLimit);

    const result = stepVehicle(state, input, dt, sedanTuning);
    if (!footprintClear(result.state)) {
      throw new Error(`Vehicle footprint collision at frame ${frame}: ${JSON.stringify(result.state)}`);
    }
    state = result.state;

    if (parkingTarget) {
      const parking = computeParkingControl(state, parkingTarget, sedanTuning, {
        centerX: parkingTarget.x,
        centerZ: parkingTarget.z,
        yaw: parkingTarget.yaw,
        halfLength: defaultParkingControllerConfig.envelopeHalfLength,
        halfWidth: defaultParkingControllerConfig.envelopeHalfWidth
      });
      if (parking.settled) {
        parkingSettled = true;
        state.speed = 0;
        return { state, completed: true, frames: frame + 1, parkingSettled, maxCrossTrack };
      }
    } else if (nav.routeComplete && Math.abs(state.speed) < 0.1) {
      return { state, completed: true, frames: frame + 1, parkingSettled, maxCrossTrack };
    }
  }
  return { state, completed: false, frames: maxFrames, parkingSettled, maxCrossTrack };
}

describe('deterministic sedan arrival simulation', () => {
  it('drives the authored approach, corners into the parking pose, and completes departure', () => {
    const initial: VehicleState = { x: -3.8, z: 5.5, yaw: 0, speed: 0, steering: 0 };
    const approach = simulateRoute(initial, routes.approach, 1800);
    expect(approach.completed).toBe(true);

    const dropoff = simulateRoute(approach.state, routes.dropoff, 6000, parkingPose);
    expect(dropoff.completed).toBe(true);
    expect(dropoff.parkingSettled).toBe(true);
    expect(Math.hypot(dropoff.state.x - parkingPose.x, dropoff.state.z - parkingPose.z)).toBeLessThanOrEqual(0.28);
    expect(Math.abs(Math.atan2(Math.sin(dropoff.state.yaw - parkingPose.yaw), Math.cos(dropoff.state.yaw - parkingPose.yaw))).toBeLessThanOrEqual(0.12);

    const departure = simulateRoute(dropoff.state, routes.departure, 9000);
    expect(departure.completed).toBe(true);
    expect(departure.state.z).toBeGreaterThan(11.5);
  });

  it('reproduces the previously failed pose as a bounded recovery diagnostic case', () => {
    const navigator = new VehicleRouteNavigator();
    navigator.setRoute('failed-dropoff', { x: 3.25, z: 5.5 }, routes.dropoff);
    const failedPose: VehicleState = { x: 7.29, z: 2.43, yaw: 1.1847, speed: 0.666, steering: 0.48 };
    const snapshot = navigator.update(failedPose, dt);
    expect(snapshot.mode).toBe('recovering');
    expect(snapshot.waypointIndex).toBe(0);
    expect(snapshot.crossTrackError).toBeCloseTo(1.46, 1);
    expect(snapshot.lookAheadDistance).toBeLessThanOrEqual(2.25);
  });
});
