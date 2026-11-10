import * as THREE from 'three';
import {
  collectEscapeKey,
  completeEscape,
  getEscapeHint,
  initialEscapeEncounterState,
  unlockEscapeExit,
  type EscapeEncounterState,
} from '../domain/escape-encounter';

export interface StealthEscapeEncounter {
  update(deltaSeconds: number, elapsedSeconds: number): void;
  dispose(): void;
}

/**
 * First compact, deterministic stealth-escape encounter.
 * Geometry and AI are deliberately local and lightweight for the Playables vertical slice.
 */
export function createStealthEscapeEncounter(
  scene: THREE.Scene,
  player: THREE.Object3D,
  onNotify: (message: string) => void,
  introDurationSeconds = 0,
): StealthEscapeEncounter {
  let state: EscapeEncounterState = initialEscapeEncounterState;
  let disposed = false;
  let hidden = false;
  let noiseActiveUntil = 0;
  let distractionUsed = false;
  let projectileActive = false;
  let projectileProgress = 0;
  const projectileStart = new THREE.Vector3();
  const projectileEnd = new THREE.Vector3();
  let suspicionSeconds = 0;
  let stalledSeconds = 0;
  let lastPlayerPosition = player.position.clone();
  let encounterStarted = false;
  let hintElapsed = 0;
  let lastHintId = '';
  let exitProgress = 0;
  let currentElapsedSeconds = 0;

  const ui = {
    objective: document.querySelector<HTMLElement>('#escape-objective'),
    action: document.querySelector<HTMLButtonElement>('#escape-action'),
    hint: document.querySelector<HTMLElement>('#hint'),
    status: document.querySelector<HTMLElement>('#status'),
    overlay: document.querySelector<HTMLElement>('.overlay'),
    journal: document.querySelector<HTMLElement>('.journal'),
    footer: document.querySelector<HTMLElement>('footer'),
  };

  document.querySelector<HTMLElement>('#app')?.classList.add('stealth-mode');
  if (ui.objective) ui.objective.textContent = 'Find the key. The exit is locked.';
  if (ui.hint) ui.hint.textContent = 'Find the key. The exit is locked.';
  if (ui.status) ui.status.textContent = 'KEY NOT FOUND';

  // Hide the prototype investigation UI without deleting its systems or saved data.
  for (const selector of [
    '#relic-interact', '#location-interact', '#keeper-interact', '#yard-interact',
    '#regulator-interact', '#vale-interact', '#pump-interact', '#board-open',
    '#case-toggle', '#records-interact', '#waterworks-interact', '#evidence-detail',
    '#deduction-panel', '#puzzle-panel', '#lead-panel', '#location-panel',
    '#service-puzzle-panel', '#keeper-panel', '#vale-panel', '#waterworks-panel',
    '#records-panel', '#board-panel',
  ]) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.hidden = true;
  }
  ui.journal?.setAttribute('aria-hidden', 'true');

  // Remove investigation clue markers from this prototype encounter only.
  scene.traverse(object => {
    if (object instanceof THREE.Mesh && typeof object.userData['clueId'] === 'string') {
      object.visible = false;
    }
  });

  const mats = {
    coat: new THREE.MeshStandardMaterial({ color: '#292a31', roughness: .96 }),
    coatDark: new THREE.MeshStandardMaterial({ color: '#171a21', roughness: 1 }),
    mask: new THREE.MeshStandardMaterial({ color: '#d9d6ca', roughness: .88 }),
    hat: new THREE.MeshStandardMaterial({ color: '#28252a', roughness: .9 }),
    metal: new THREE.MeshStandardMaterial({ color: '#b68d4f', metalness: .72, roughness: .28, emissive: '#65431d', emissiveIntensity: .35 }),
    wood: new THREE.MeshStandardMaterial({ color: '#514034', roughness: .96 }),
    woodLight: new THREE.MeshStandardMaterial({ color: '#806447', roughness: .9 }),
    keyGlow: new THREE.MeshStandardMaterial({ color: '#f0cf80', emissive: '#b98232', emissiveIntensity: 1.6, metalness: .65, roughness: .25 }),
    bell: new THREE.MeshStandardMaterial({ color: '#8c6b42', emissive: '#533819', emissiveIntensity: .4, metalness: .6, roughness: .42 }),
    door: new THREE.MeshStandardMaterial({ color: '#292c35', roughness: .9 }),
    doorTrim: new THREE.MeshStandardMaterial({ color: '#8b795d', metalness: .55, roughness: .52 }),
  };

  const geometry: THREE.BufferGeometry[] = [];
  const addMesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    geometry.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Landmark cabinet and a small hiding pocket behind it.
  const cabinet = new THREE.Group();
  cabinet.position.set(4.15, 0, 3.75);
  cabinet.rotation.z = Math.PI / 2; // visibly toppled onto its side
  scene.add(cabinet);
  addMesh(cabinet, new THREE.BoxGeometry(1.2, .92, .72), mats.wood, 0, .46, 0);
  addMesh(cabinet, new THREE.BoxGeometry(1.28, .12, .8), mats.woodLight, 0, .94, 0);
  for (const y of [.28, .61]) {
    addMesh(cabinet, new THREE.BoxGeometry(.94, .025, .025), mats.doorTrim, 0, y, .372);
    const knob = addMesh(cabinet, new THREE.SphereGeometry(.035, 8, 6), mats.metal, .22, y, .4);
    knob.scale.set(.7, 1, .55);
  }

  // Mandatory brass key, deliberately visible beside the overturned cabinet.
  const key = new THREE.Group();
  key.position.set(3.25, .18, 3.35);
  scene.add(key);
  addMesh(key, new THREE.TorusGeometry(.13, .035, 7, 14), mats.keyGlow, 0, .12, 0);
  addMesh(key, new THREE.BoxGeometry(.055, .34, .055), mats.keyGlow, .14, -.02, 0);
  addMesh(key, new THREE.BoxGeometry(.16, .045, .055), mats.keyGlow, .22, -.14, 0);
  addMesh(key, new THREE.BoxGeometry(.11, .045, .055), mats.keyGlow, .19, -.06, 0);
  const keyLight = new THREE.PointLight('#e7bd70', 1.0, 2.5, 2);
  keyLight.position.set(0, .45, 0);
  key.add(keyLight);

  // One authored distraction: a loose brass service bell on the opposite side of the square.
  const bell = new THREE.Group();
  bell.position.set(-3.55, 0, 3.2);
  scene.add(bell);
  addMesh(bell, new THREE.CylinderGeometry(.22, .28, .22, 12), mats.bell, 0, .16, 0);
  addMesh(bell, new THREE.SphereGeometry(.055, 8, 6), mats.metal, 0, .31, 0);
  addMesh(bell, new THREE.BoxGeometry(.34, .07, .34), mats.wood, 0, .035, 0);
  const thrownStone = addMesh(scene, new THREE.SphereGeometry(.075, 8, 6), mats.woodLight, 0, 0, 0);
  thrownStone.visible = false;

  // A visible locked exit placed inside the existing walkable town-square bounds.
  const exit = new THREE.Group();
  exit.position.set(0, 0, -7.85);
  scene.add(exit);
  addMesh(exit, new THREE.BoxGeometry(2.5, 2.95, .2), mats.doorTrim, 0, 1.48, -.05);
  const leftDoor = addMesh(exit, new THREE.BoxGeometry(1.12, 2.72, .12), mats.door, -.57, 1.37, .08);
  const rightDoor = addMesh(exit, new THREE.BoxGeometry(1.12, 2.72, .12), mats.door, .57, 1.37, .08);
  addMesh(exit, new THREE.BoxGeometry(.08, 2.95, .25), mats.doorTrim, -1.25, 1.48, .08);
  addMesh(exit, new THREE.BoxGeometry(.08, 2.95, .25), mats.doorTrim, 1.25, 1.48, .08);
  addMesh(exit, new THREE.BoxGeometry(2.58, .14, .28), mats.doorTrim, 0, 2.96, .08);
  const lock = addMesh(exit, new THREE.BoxGeometry(.18, .28, .08), mats.metal, 0, 1.25, .18);
  const exitGlow = new THREE.PointLight('#d5ad6a', .6, 3, 2);
  exitGlow.position.set(0, 2.1, .5);
  exit.add(exitGlow);

  // Hollow Man silhouette: weathered hat, pale mask and long charcoal coat.
  const entity = new THREE.Group();
  scene.add(entity);
  const coat = addMesh(entity, new THREE.CapsuleGeometry(.34, .9, 4, 8), mats.coat, 0, .83, 0);
  coat.scale.set(1, 1.08, .78);
  addMesh(entity, new THREE.BoxGeometry(.82, .18, .42), mats.hat, 0, 1.78, 0);
  addMesh(entity, new THREE.CylinderGeometry(.25, .3, .13, 10), mats.hat, 0, 1.86, 0);
  addMesh(entity, new THREE.SphereGeometry(.22, 12, 10), mats.mask, 0, 1.52, .035);
  addMesh(entity, new THREE.BoxGeometry(.065, .34, .065), mats.coatDark, -.43, .92, 0);
  addMesh(entity, new THREE.BoxGeometry(.065, .34, .065), mats.coatDark, .43, .92, 0);
  entity.position.set(-3.4, 0, -1.5);
  entity.rotation.y = Math.PI / 2;

  const patrol: THREE.Vector3[] = [
    new THREE.Vector3(-3.55, 0, -1.25),
    new THREE.Vector3(-2.7, 0, -5.5),
    new THREE.Vector3(2.25, 0, -5.75),
    new THREE.Vector3(3.55, 0, -1.15),
    new THREE.Vector3(2.2, 0, 1.05),
    new THREE.Vector3(-2.3, 0, 1.0),
  ];
  let patrolIndex = 1;
  let threat: 'patrolling' | 'investigating' | 'approaching' | 'searching' | 'chasing' = 'patrolling';
  let threatTarget = patrol[patrolIndex]!.clone();
  let threatTimer = 0;
  let lastKnownPlayer = player.position.clone();

  const distance2D = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
  const segmentHitsCircle = (a: THREE.Vector3, b: THREE.Vector3, cx: number, cz: number, radius: number) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq < .0001) return Math.hypot(a.x - cx, a.z - cz) < radius;
    const t = THREE.MathUtils.clamp(((cx - a.x) * dx + (cz - a.z) * dz) / lengthSq, 0, 1);
    return Math.hypot(a.x + dx * t - cx, a.z + dz * t - cz) < radius;
  };
  const hasLineOfSight = (target: THREE.Vector3) => {
    const from = entity.position;
    if (segmentHitsCircle(from, target, 0, -2.8, 1.75)) return false; // fountain blocks sight
    // Cabinet blocks the view when the player uses the authored hiding pocket.
    if (segmentHitsCircle(from, target, cabinet.position.x, cabinet.position.z, .66) && distance2D(target, cabinet.position) < 1.65) return false;
    return true;
  };
  const isNearCabinet = () => distance2D(player.position, cabinet.position) < 1.25;
  const isNearKey = () => state.hasKey === false && distance2D(player.position, key.position) < 1.05;
  const isNearBell = () => distance2D(player.position, bell.position) < 1.25;
  const canUseDistraction = () => !state.hasKey && !distractionUsed && distance2D(player.position, bell.position) < 10.5;
  const isNearExit = () => distance2D(player.position, exit.position) < 1.55;

  const showHint = (force = false) => {
    const next = getEscapeHint({
      ...state,
      playerNearKey: isNearKey(),
      playerNearExit: isNearExit(),
      playerStalledNearKey: stalledSeconds > 5 && distance2D(player.position, key.position) < 2.8,
      entityThreat: threat === 'approaching' || threat === 'chasing' ? 'approaching' : threat,
      distractionAvailable: canUseDistraction(),
      showKeyLocationHint: hintElapsed > 13,
    }, { keyLocationHint: 'Look near the overturned cabinet.' });
    if (ui.hint && (force || next.id !== lastHintId || ui.hint.textContent !== next.message)) {
      ui.hint.textContent = next.message;
      lastHintId = next.id;
    }
    if (ui.objective) {
      ui.objective.textContent = state.hasKey
        ? (state.exitUnlocked ? 'Exit unlocked. Get out!' : 'The exit is unlocked with the key. Get there!')
        : 'Find the key. The exit is locked.';
    }
  };

  const setActionLabel = (label: string, enabled: boolean) => {
    if (!ui.action) return;
    ui.action.textContent = label;
    ui.action.hidden = !enabled;
    ui.action.disabled = !enabled;
  };

  const interact = () => {
    if (disposed || state.escaped) return;
    if (hidden) {
      hidden = false;
      player.position.x = cabinet.position.x - 1.0;
      onNotify('You leave cover.');
      return;
    }
    if (isNearExit()) {
      if (state.hasKey && !state.exitUnlocked) {
        state = unlockEscapeExit({ ...state, playerNearExit: true });
        if (state.exitUnlocked) {
          lock.visible = false;
          exitProgress = 0;
          onNotify('The key turns. The exit is unlocked.');
          showHint(true);
        }
      } else if (!state.hasKey) {
        onNotify('The exit is locked. Find the brass key.');
      }
      return;
    }
    if ((isNearBell() || stalledSeconds > 5 || threat === 'approaching' || threat === 'chasing') && canUseDistraction()) {
      distractionUsed = true;
      noiseActiveUntil = currentElapsedSeconds + 8;
      threat = 'investigating';
      threatTarget.copy(bell.position);
      threatTimer = 8;
      projectileStart.copy(player.position).add(new THREE.Vector3(0, .9, 0));
      projectileEnd.copy(bell.position).add(new THREE.Vector3(0, .25, 0));
      projectileProgress = 0;
      projectileActive = true;
      thrownStone.visible = true;
      onNotify('You throw a stone. The bell rings, drawing the creature away.');
      return;
    }
    if (isNearKey()) {
      state = collectEscapeKey({ ...state, playerNearKey: true });
      key.visible = false;
      keyLight.intensity = 0;
      onNotify('Key collected. Return to the exit.');
      showHint(true);
      return;
    }
    if (isNearBell() && !state.hasKey) {
      onNotify('The bell is ready. Tap to throw a stone and ring it.');
      return;
    }
    if (isNearCabinet()) {
      hidden = true;
      player.position.x = cabinet.position.x + 1.05;
      player.position.z = cabinet.position.z + .45;
      onNotify('You hide behind the overturned cabinet.');
      return;
    }
    onNotify('Move closer to the key, bell, cabinet or exit.');
  };

  ui.action?.addEventListener('click', interact);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || (event.key.toLowerCase() !== 'e' && event.key !== ' ')) return;
    event.preventDefault();
    interact();
  };
  document.addEventListener('keydown', onKeyDown);

  const update = (deltaSeconds: number, elapsedSeconds: number) => {
    if (disposed) return;
    if (state.escaped) {
      if (ui.hint) ui.hint.textContent = 'ESCAPED · CHALLENGE COMPLETE';
      if (ui.objective) ui.objective.textContent = 'Escape complete.';
      if (ui.status) ui.status.textContent = 'ESCAPE COMPLETE';
      setActionLabel('', false);
      return;
    }
    currentElapsedSeconds = elapsedSeconds;
    const dt = Math.min(deltaSeconds, .05);
    const encounterVisible = elapsedSeconds >= introDurationSeconds;
    cabinet.visible = encounterVisible;
    key.visible = encounterVisible && !state.hasKey;
    bell.visible = encounterVisible && !state.hasKey;
    exit.visible = encounterVisible;
    entity.visible = encounterVisible;
    if (!encounterVisible) return;
    if (!encounterStarted) {
      encounterStarted = true;
      lastPlayerPosition.copy(player.position);
    }
    hintElapsed += dt;
    const moved = distance2D(player.position, lastPlayerPosition);
    if (moved > .035) {
      stalledSeconds = 0;
      lastPlayerPosition.copy(player.position);
      if (hidden) hidden = false;
    } else {
      stalledSeconds += dt;
    }

    const playerDistance = distance2D(entity.position, player.position);
    const playerFacing = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), entity.rotation.y);
    const toPlayer = new THREE.Vector3(player.position.x - entity.position.x, 0, player.position.z - entity.position.z).normalize();
    const inView = playerFacing.dot(toPlayer) > .25 && playerDistance < 5.7 && hasLineOfSight(player.position);
    const distracted = elapsedSeconds < noiseActiveUntil;

    if (distracted) {
      threat = 'investigating';
      threatTarget.copy(bell.position);
      threatTimer = Math.max(0, noiseActiveUntil - elapsedSeconds);
    } else if (!hidden && inView) {
      suspicionSeconds += dt;
      lastKnownPlayer.copy(player.position);
      threat = suspicionSeconds > .85 ? 'chasing' : 'approaching';
      threatTarget.copy(player.position);
      threatTimer = 2.2;
    } else {
      suspicionSeconds = Math.max(0, suspicionSeconds - dt * .65);
      if (threat === 'chasing' && threatTimer > 0) {
        threatTimer -= dt;
        threatTarget.copy(lastKnownPlayer);
        if (threatTimer <= 0) {
          threat = 'searching';
          threatTimer = 2.4;
        }
      } else if (threat === 'searching') {
        threatTimer -= dt;
        if (threatTimer <= 0) threat = 'patrolling';
      } else if (threat === 'investigating') {
        threatTimer -= dt;
        if (threatTimer <= 0) threat = 'patrolling';
      } else if (threat === 'approaching') {
        threat = 'searching';
        threatTimer = 1.8;
        threatTarget.copy(lastKnownPlayer);
      } else {
        threat = 'patrolling';
      }
    }

    if (threat === 'patrolling') {
      if (distance2D(entity.position, threatTarget) < .25) {
        patrolIndex = (patrolIndex + 1) % patrol.length;
        threatTarget.copy(patrol[patrolIndex]!);
      }
    } else if (threat === 'searching' && distance2D(entity.position, threatTarget) < .3) {
      threatTarget.copy(entity.position);
    }

    if (threat !== 'searching') {
      const dx = threatTarget.x - entity.position.x, dz = threatTarget.z - entity.position.z;
      const d = Math.hypot(dx, dz);
      if (d > .12) {
        const speed = threat === 'chasing' ? 2.65 : threat === 'investigating' ? 1.85 : threat === 'approaching' ? 1.5 : 1.18;
        const step = Math.min(d, speed * dt);
        entity.position.x += dx / d * step;
        entity.position.z += dz / d * step;
        entity.rotation.y = Math.atan2(dx, dz);
      }
    }

    // A close, confirmed detection resets the encounter rather than silently allowing a pass-through.
    if (!hidden && threat === 'chasing' && playerDistance < .82) {
      suspicionSeconds = 0;
      threat = 'searching';
      threatTimer = 1.8;
      // A brief knock-back gives the player a readable recovery window without resetting a short Playables run.
      const awayX = player.position.x - entity.position.x;
      const awayZ = player.position.z - entity.position.z;
      const awayLength = Math.max(.001, Math.hypot(awayX, awayZ));
      player.position.x = THREE.MathUtils.clamp(player.position.x + awayX / awayLength * 1.1, -5.2, 5.2);
      player.position.z = THREE.MathUtils.clamp(player.position.z + awayZ / awayLength * 1.1, -9.8, 6.2);
      lastPlayerPosition.copy(player.position);
      entity.position.set(-3.4, 0, -1.5);
      onNotify('The creature caught your trail. Hide or distract it, then keep moving.');
    }

    if (projectileActive) {
      projectileProgress = Math.min(1, projectileProgress + dt / .65);
      thrownStone.position.lerpVectors(projectileStart, projectileEnd, projectileProgress);
      thrownStone.position.y += Math.sin(projectileProgress * Math.PI) * 1.25;
      if (projectileProgress >= 1) {
        projectileActive = false;
        thrownStone.visible = false;
        bell.rotation.z = -.22;
      }
    }

    if (state.exitUnlocked && isNearExit()) {
      exitProgress += dt;
      const open = Math.min(1, exitProgress * 2.4);
      leftDoor.rotation.y = -open * 1.15;
      rightDoor.rotation.y = open * 1.15;
    }

    // Escape only after crossing the threshold beyond the open door.
    if (state.exitUnlocked && player.position.z < -9.1 && Math.abs(player.position.x) < 1.45) {
      state = completeEscape(state, true);
      onNotify('You escaped Hollow Creek.');
      if (ui.hint) ui.hint.textContent = 'ESCAPED · CHALLENGE COMPLETE';
      if (ui.objective) ui.objective.textContent = 'Escape complete.';
      if (ui.status) ui.status.textContent = 'ESCAPE COMPLETE';
      const completedRoot = document.querySelector<HTMLElement>('#scene-root');
      if (completedRoot) {
        completedRoot.dataset['escapeHasKey'] = 'true';
        completedRoot.dataset['escapeExitUnlocked'] = 'true';
        completedRoot.dataset['escapeComplete'] = 'true';
      }
      setActionLabel('', false);
      return;
    }

    if (state.hasKey && !state.exitUnlocked) {
      // State is intentionally unchanged here; the door only unlocks via explicit interaction.
    }

    const sceneRoot = document.querySelector<HTMLElement>('#scene-root');
    if (sceneRoot) {
      sceneRoot.dataset['escapeHasKey'] = String(state.hasKey);
      sceneRoot.dataset['escapeExitUnlocked'] = String(state.exitUnlocked);
      sceneRoot.dataset['escapeComplete'] = String(state.escaped);
      sceneRoot.dataset['entityThreat'] = threat;
      sceneRoot.dataset['playerHidden'] = String(hidden);
    }
    if (ui.status && !state.escaped) {
      ui.status.textContent = state.hasKey ? (state.exitUnlocked ? 'EXIT OPEN' : 'KEY FOUND · RETURN') : threat.toUpperCase();
    }

    const actionContext =
      hidden ? ['LEAVE COVER', true] as const :
      isNearExit() ? (state.exitUnlocked ? ['GO THROUGH', false] as const : state.hasKey ? ['UNLOCK EXIT', true] as const : ['LOCKED · FIND KEY', true] as const) :
      (threat === 'approaching' || threat === 'chasing') && isNearCabinet() ? ['HIDE', true] as const :
      canUseDistraction() && (isNearBell() || (stalledSeconds > 5 && distance2D(player.position, key.position) < 2.8) || threat === 'approaching' || threat === 'chasing') ? ['MAKE NOISE', true] as const :
      isNearKey() ? ['COLLECT KEY', true] as const :
      isNearBell() && !state.hasKey ? ['MAKE NOISE', true] as const :
      isNearCabinet() ? ['HIDE', true] as const : ['', false] as const;
    setActionLabel(actionContext[0], actionContext[1]);

    showHint();
    key.rotation.y = elapsedSeconds * 1.2;
    key.position.y = .18 + Math.sin(elapsedSeconds * 2.2) * .07;
    keyLight.intensity = .7 + Math.sin(elapsedSeconds * 2.2) * .3;
    bell.rotation.y = Math.sin(elapsedSeconds * 1.4) * .08;
    if (threat === 'approaching' || threat === 'chasing') {
      if (ui.hint && lastHintId !== 'hide') showHint(true);
    }
  };

  return {
    update,
    dispose() {
      disposed = true;
      ui.action?.removeEventListener('click', interact);
      document.removeEventListener('keydown', onKeyDown);
      scene.remove(cabinet, key, bell, thrownStone, exit, entity);
      for (const item of geometry) item.dispose();
      for (const material of Object.values(mats)) material.dispose();
      if (ui.action) ui.action.hidden = true;
      document.querySelector<HTMLElement>('#app')?.classList.remove('stealth-mode');
    },
  };
}
