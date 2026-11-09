import * as THREE from 'three';

export interface DetectiveCharacterRig {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
}

export interface DetectiveCharacterOptions {
  coatColor?: THREE.ColorRepresentation;
  trouserColor?: THREE.ColorRepresentation;
  skinColor?: THREE.ColorRepresentation;
  hairColor?: THREE.ColorRepresentation;
}

/**
 * Lightweight procedural third-person detective.
 * This is a real Three.js mesh assembly, not a concept image or a rigged GLB.
 * Pivot groups are exposed for the existing locomotion animation.
 */
export function createDetectiveCharacter(options: DetectiveCharacterOptions = {}): DetectiveCharacterRig {
  const root = new THREE.Group();
  root.name = 'Detective_Player_Procedural';
  const mat = (color: THREE.ColorRepresentation, roughness = 0.82, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const coat = mat(options.coatColor ?? '#252d39');
  const coatEdge = mat('#171e29');
  const shirt = mat('#b9b8ae');
  const trousers = mat(options.trouserColor ?? '#202631');
  const skin = mat(options.skinColor ?? '#bd8d70', 0.9);
  const hair = mat(options.hairColor ?? '#292522');
  const leather = mat('#28221e', 0.55);
  const brass = mat('#9b7847', 0.48, 0.55);

  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
    position: THREE.Vector3, scale?: THREE.Vector3) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    if (scale) mesh.scale.copy(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const capsule = (parent: THREE.Object3D, radius: number, length: number, material: THREE.Material,
    position: THREE.Vector3, radial = 10) =>
    add(parent, new THREE.CapsuleGeometry(radius, length, 4, radial), material, position);

  // Torso: layered shirt, tailored coat shell, lapels and waist seam.
  const torso = new THREE.Group();
  torso.position.y = 1.02;
  root.add(torso);
  capsule(torso, 0.255, 0.55, shirt, new THREE.Vector3(0, 0.02, 0), 12);
  const coatBody = add(torso, new THREE.CylinderGeometry(0.29, 0.34, 0.86, 12, 1, false),
    coat, new THREE.Vector3(0, -0.02, 0));
  coatBody.scale.z = 0.72;
  const lapelGeometry = new THREE.BufferGeometry();
  const lapelPositions = new Float32Array([
    -0.19,0.39,0.205, -0.025,0.31,0.235, -0.09,0.02,0.24,
    0.19,0.39,0.205, 0.025,0.31,0.235, 0.09,0.02,0.24
  ]);
  lapelGeometry.setAttribute('position', new THREE.BufferAttribute(lapelPositions, 3));
  lapelGeometry.setIndex([0,1,2,3,5,4]);
  lapelGeometry.computeVertexNormals();
  const lapels = new THREE.Mesh(lapelGeometry, coatEdge);
  lapels.material.side = THREE.DoubleSide;
  lapels.castShadow = true;
  torso.add(lapels);
  capsule(torso, 0.025, 0.48, brass, new THREE.Vector3(0.02, -0.02, 0.235), 6);
  for (let i = 0; i < 3; i++) {
    add(torso, new THREE.SphereGeometry(0.018, 6, 5), brass, new THREE.Vector3(0.075, 0.13 - i * 0.14, 0.244));
  }

  // Neck and head with readable facial landmarks at third-person camera distance.
  capsule(root, 0.075, 0.12, skin, new THREE.Vector3(0, 1.49, 0), 8);
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.015);
  root.add(head);
  add(head, new THREE.SphereGeometry(0.205, 16, 14), skin, new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.88, 1.12, 0.88));
  add(head, new THREE.SphereGeometry(0.105, 12, 10), skin, new THREE.Vector3(0, -0.13, 0.09),
    new THREE.Vector3(1.0, 0.62, 0.72)); // jaw
  const hairCap = add(head, new THREE.SphereGeometry(0.211, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hair, new THREE.Vector3(0, 0.055, -0.005));
  hairCap.scale.set(0.94, 0.82, 0.94);
  for (const side of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.027, 8, 6), skin, new THREE.Vector3(side * 0.184, -0.015, 0.005));
    add(head, new THREE.SphereGeometry(0.018, 8, 6), coatEdge, new THREE.Vector3(side * 0.078, 0.015, 0.178));
    add(head, new THREE.SphereGeometry(0.009, 6, 5), mat('#e5ded2'), new THREE.Vector3(side * 0.078, 0.015, 0.185));
  }
  add(head, new THREE.ConeGeometry(0.026, 0.075, 7), skin, new THREE.Vector3(0, -0.045, 0.19),
    new THREE.Vector3(0.65, 1, 0.7));
  capsule(head, 0.018, 0.055, hair, new THREE.Vector3(0, -0.105, 0.15), 6);

  // Tailored trousers and articulated lower-body pivots.
  const legMaterial = trousers;
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.135, 0.66, 0);
  root.add(leftLeg);
  capsule(leftLeg, 0.092, 0.43, legMaterial, new THREE.Vector3(0, -0.25, 0), 9);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.135, 0.66, 0);
  root.add(rightLeg);
  capsule(rightLeg, 0.092, 0.43, legMaterial, new THREE.Vector3(0, -0.25, 0), 9);
  for (const leg of [leftLeg, rightLeg]) {
    add(leg, new THREE.BoxGeometry(0.17, 0.105, 0.31), leather, new THREE.Vector3(0, -0.52, 0.065));
    add(leg, new THREE.BoxGeometry(0.105, 0.025, 0.018), coatEdge, new THREE.Vector3(0, -0.185, 0.09));
  }

  // Shoulder pivots and sleeves; hands are separate so animation can be extended.
  const makeArm = (side: number) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.32, 1.31, 0);
    root.add(arm);
    capsule(arm, 0.095, 0.34, coat, new THREE.Vector3(0, -0.22, 0), 9);
    capsule(arm, 0.068, 0.19, coatEdge, new THREE.Vector3(0, -0.47, 0), 8);
    capsule(arm, 0.065, 0.08, skin, new THREE.Vector3(0, -0.59, 0.015), 8);
    add(arm, new THREE.BoxGeometry(0.19, 0.045, 0.19), coatEdge, new THREE.Vector3(0, -0.055, 0));
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Small shoulder strap and utility pouch add a distinctive investigator silhouette.
  const strap = add(root, new THREE.BoxGeometry(0.075, 0.78, 0.055), leather,
    new THREE.Vector3(-0.205, 1.06, 0.17));
  strap.rotation.z = -0.19;
  add(root, new THREE.BoxGeometry(0.19, 0.2, 0.11), leather, new THREE.Vector3(0.245, 0.79, 0.17));
  add(root, new THREE.BoxGeometry(0.13, 0.025, 0.02), brass, new THREE.Vector3(0.245, 0.79, 0.23));

  root.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.frustumCulled = true;
      object.userData['assetRole'] = 'detective-character';
    }
  });
  return { root, leftLeg, rightLeg, leftArm, rightArm };
}
