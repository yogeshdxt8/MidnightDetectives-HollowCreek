export interface NavigationPoint {
  x: number;
  z: number;
  speed: number;
}

export interface NavigationPose {
  x: number;
  z: number;
  yaw: number;
  speed: number;
}

export interface NavigationTarget {
  x: number;
  z: number;
}

export type NavigationMode = 'tracking' | 'recovering' | 'replan-required' | 'complete';

export interface VehicleNavigatorConfig {
  waypointRadius: number;
  passCorridorHalfWidth: number;
  recoveryThreshold: number;
  maximumRecoverySeconds: number;
  maximumRecoveryDistance: number;
  lookAheadBase: number;
  lookAheadSpeedFactor: number;
  maximumLookAhead: number;
}

export interface NavigationSnapshot {
  routeId: string;
  mode: NavigationMode;
  waypointIndex: number;
  crossTrackError: number;
  alongTrackDistance: number;
  distanceToWaypoint: number;
  target: NavigationTarget;
  lookAheadPoint: NavigationTarget;
  lookAheadDistance: number;
  recoveryElapsed: number;
  replanRequested: boolean;
  routeComplete: boolean;
}

export const defaultVehicleNavigatorConfig: VehicleNavigatorConfig = {
  waypointRadius: 0.72,
  passCorridorHalfWidth: 1.1,
  recoveryThreshold: 1.25,
  maximumRecoverySeconds: 2.5,
  maximumRecoveryDistance: 3.5,
  lookAheadBase: 1.8,
  lookAheadSpeedFactor: 0.72,
  maximumLookAhead: 4.2
};

interface Projection {
  x: number;
  z: number;
  fraction: number;
  along: number;
  crossTrack: number;
  distance: number;
}

const distanceBetween = (a: NavigationTarget, b: NavigationTarget): number =>
  Math.hypot(b.x - a.x, b.z - a.z);

const projectOntoSegment = (
  point: NavigationTarget,
  start: NavigationTarget,
  end: NavigationTarget
): Projection => {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const length = Math.sqrt(lengthSquared);

  if (length < 1e-8) {
    return {
      x: start.x,
      z: start.z,
      fraction: 1,
      along: 0,
      crossTrack: 0,
      distance: distanceBetween(point, start)
    };
  }

  const rawFraction = ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared;
  const fraction = Math.max(0, Math.min(1, rawFraction));
  const x = start.x + dx * fraction;
  const z = start.z + dz * fraction;
  const signedCrossTrack = (dx * (point.z - start.z) - dz * (point.x - start.x)) / length;

  return {
    x,
    z,
    fraction: rawFraction,
    along: fraction * length,
    crossTrack: signedCrossTrack,
    distance: Math.hypot(point.x - x, point.z - z)
  };
};

/**
 * Tracks progress along a polyline independently of vehicle dynamics.
 *
 * The navigator owns route progress and recovery decisions only. It never
 * changes vehicle pose, speed, steering, collision state, or workflow events.
 */
export class VehicleRouteNavigator {
  private routeId = '';
  private routeStart: NavigationTarget = { x: 0, z: 0 };
  private waypoints: NavigationPoint[] = [];
  private waypointIndex = 0;
  private recoveryElapsed = 0;
  private mode: NavigationMode = 'complete';
  private lastSnapshot: NavigationSnapshot | null = null;

  constructor(private readonly config: VehicleNavigatorConfig = defaultVehicleNavigatorConfig) {
    this.validateConfig(config);
  }

  setRoute(routeId: string, start: NavigationTarget, waypoints: readonly NavigationPoint[]): void {
    if (!routeId.trim()) throw new Error('A route id is required.');
    if (waypoints.length === 0) throw new Error('A route must contain at least one waypoint.');
    this.assertFinitePoint(start, 'route start');
    for (const [index, point] of waypoints.entries()) {
      this.assertFinitePoint(point, `waypoint ${index}`);
      if (!Number.isFinite(point.speed) || point.speed < 0) {
        throw new Error(`Waypoint ${index} has an invalid speed.`);
      }
    }

    this.routeId = routeId;
    this.routeStart = { x: start.x, z: start.z };
    this.waypoints = waypoints.map(point => ({ ...point }));
    this.waypointIndex = 0;
    this.recoveryElapsed = 0;
    this.mode = 'tracking';
    this.lastSnapshot = null;
  }

  update(pose: NavigationPose, deltaSeconds: number): NavigationSnapshot {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error('Navigation delta time must be a finite non-negative number.');
    }
    this.assertFinitePoint(pose, 'vehicle pose');

    if (this.mode === 'complete' || this.mode === 'replan-required') {
      return this.lastSnapshot ?? this.createTerminalSnapshot(pose);
    }

    const dt = Math.min(deltaSeconds, 0.1);
    let projection = this.projectCurrentSegment(pose);

    // Advance only through the active segment's endpoint corridor. A distant
    // later segment cannot steal progress and cause a corner to be cut.
    while (this.waypointIndex < this.waypoints.length) {
      const finalWaypoint = this.waypointIndex === this.waypoints.length - 1;
      const distanceToEndpoint = distanceBetween(pose, this.waypoints[this.waypointIndex]!);
      const reached = distanceToEndpoint <= this.config.waypointRadius;
      const passedInsideCorridor =
        projection.fraction >= 1 &&
        Math.abs(projection.crossTrack) <= this.config.passCorridorHalfWidth;

      if (!reached && !passedInsideCorridor) break;

      if (finalWaypoint) {
        this.mode = 'complete';
        this.recoveryElapsed = 0;
        break;
      }

      this.waypointIndex += 1;
      projection = this.projectCurrentSegment(pose);
    }

    const target = this.waypoints[this.waypointIndex] ?? this.waypoints[this.waypoints.length - 1]!;
    const desiredLookAhead = Math.max(
      this.config.lookAheadBase,
      Math.min(
        this.config.maximumLookAhead,
        this.config.lookAheadBase + Math.abs(pose.speed) * this.config.lookAheadSpeedFactor
      )
    );
    // Pure-pursuit targets beyond a sharp corner pull the vehicle across the
    // inside of the bend. Shorten the arc-length look-ahead near a corner,
    // allowing only a small blend beyond the active endpoint.
    const currentEnd = this.waypoints[this.waypointIndex]!;
    const remainingToCorner = distanceBetween(projection, currentEnd);
    const next = this.waypoints[this.waypointIndex + 1];
    let cornerLimitedLookAhead = desiredLookAhead;
    if (next) {
      const segmentStart = this.waypointIndex === 0
        ? this.routeStart
        : this.waypoints[this.waypointIndex - 1]!;
      const incomingX = currentEnd.x - segmentStart.x;
      const incomingZ = currentEnd.z - segmentStart.z;
      const outgoingX = next.x - currentEnd.x;
      const outgoingZ = next.z - currentEnd.z;
      const incomingLength = Math.hypot(incomingX, incomingZ);
      const outgoingLength = Math.hypot(outgoingX, outgoingZ);
      if (incomingLength > 1e-8 && outgoingLength > 1e-8) {
        const directionDot = Math.max(-1, Math.min(1,
          (incomingX * outgoingX + incomingZ * outgoingZ) / (incomingLength * outgoingLength)
        ));
        const turnSeverity = (1 - directionDot) * 0.5;
        const cornerBlend = (0.2 + Math.min(0.35, outgoingLength * 0.12)) * turnSeverity;
        cornerLimitedLookAhead = Math.min(desiredLookAhead, remainingToCorner + cornerBlend);
      }
    }
    const lookAheadDistance = Math.max(0.2, cornerLimitedLookAhead);
    const lookAheadPoint = this.pointAheadOnRoute(projection, lookAheadDistance);
    const absoluteCrossTrack = Math.abs(projection.crossTrack);

    if (this.mode !== 'complete') {
      if (absoluteCrossTrack > this.config.maximumRecoveryDistance) {
        this.mode = 'replan-required';
      } else if (absoluteCrossTrack > this.config.recoveryThreshold) {
        this.mode = 'recovering';
        this.recoveryElapsed += dt;
        if (this.recoveryElapsed > this.config.maximumRecoverySeconds) {
          this.mode = 'replan-required';
        }
      } else {
        this.mode = 'tracking';
        this.recoveryElapsed = 0;
      }
    }

    const snapshot: NavigationSnapshot = {
      routeId: this.routeId,
      mode: this.mode,
      waypointIndex: this.waypointIndex,
      crossTrackError: projection.crossTrack,
      alongTrackDistance: projection.along,
      distanceToWaypoint: distanceBetween(pose, target),
      target: { x: target.x, z: target.z },
      lookAheadPoint,
      lookAheadDistance,
      recoveryElapsed: this.recoveryElapsed,
      replanRequested: this.mode === 'replan-required',
      routeComplete: this.mode === 'complete'
    };
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  get currentRouteId(): string {
    return this.routeId;
  }

  get currentWaypointIndex(): number {
    return this.waypointIndex;
  }

  private projectCurrentSegment(pose: NavigationPose): Projection {
    const start = this.waypointIndex === 0
      ? this.routeStart
      : this.waypoints[this.waypointIndex - 1]!;
    const end = this.waypoints[this.waypointIndex]!;
    return projectOntoSegment(pose, start, end);
  }

  private pointAheadOnRoute(current: Projection, distance: number): NavigationTarget {
    let x = current.x;
    let z = current.z;
    let remaining = distance;
    let segmentStart = this.waypointIndex === 0
      ? this.routeStart
      : this.waypoints[this.waypointIndex - 1]!;

    const currentEnd = this.waypoints[this.waypointIndex]!;
    const currentProjectionDistance = distanceBetween(current, currentEnd);
    if (remaining <= currentProjectionDistance) {
      const length = Math.max(currentProjectionDistance, 1e-8);
      return {
        x: x + (currentEnd.x - x) / length * remaining,
        z: z + (currentEnd.z - z) / length * remaining
      };
    }

    remaining -= currentProjectionDistance;
    segmentStart = currentEnd;

    for (let index = this.waypointIndex + 1; index < this.waypoints.length; index += 1) {
      const end = this.waypoints[index]!;
      const length = distanceBetween(segmentStart, end);
      if (length >= remaining && length > 1e-8) {
        return {
          x: segmentStart.x + (end.x - segmentStart.x) / length * remaining,
          z: segmentStart.z + (end.z - segmentStart.z) / length * remaining
        };
      }
      remaining -= length;
      segmentStart = end;
    }

    const final = this.waypoints[this.waypoints.length - 1]!;
    return { x: final.x, z: final.z };
  }

  private createTerminalSnapshot(pose: NavigationPose): NavigationSnapshot {
    const target = this.waypoints[this.waypoints.length - 1] ?? { x: pose.x, z: pose.z, speed: 0 };
    const snapshot: NavigationSnapshot = {
      routeId: this.routeId,
      mode: this.mode,
      waypointIndex: this.waypointIndex,
      crossTrackError: 0,
      alongTrackDistance: 0,
      distanceToWaypoint: distanceBetween(pose, target),
      target: { x: target.x, z: target.z },
      lookAheadPoint: { x: target.x, z: target.z },
      lookAheadDistance: 0,
      recoveryElapsed: this.recoveryElapsed,
      replanRequested: this.mode === 'replan-required',
      routeComplete: this.mode === 'complete'
    };
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  private assertFinitePoint(point: NavigationTarget, label: string): void {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) {
      throw new Error(`${label} must contain finite coordinates.`);
    }
  }

  private validateConfig(config: VehicleNavigatorConfig): void {
    for (const [name, value] of Object.entries(config)) {
      if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid navigator config: ${name}.`);
    }
    if (config.waypointRadius === 0 || config.maximumRecoverySeconds === 0 ||
        config.maximumRecoveryDistance === 0 || config.maximumLookAhead === 0) {
      throw new Error('Navigator radii, recovery limits and look-ahead must be positive.');
    }
  }
}
