import * as THREE from 'three';

export interface FourGatesEnvironment {
  root: THREE.Group;
  dispose(): void;
}

/** Low-draw-call cinematic town entrance, authored entirely from local Three.js geometry. */
export function createFourGatesEnvironment(): FourGatesEnvironment {
  const root = new THREE.Group();
  const materials = {
    asphalt: new THREE.MeshStandardMaterial({ color: '#252d38', roughness: .96 }),
    wetAsphalt: new THREE.MeshStandardMaterial({ color: '#303b48', roughness: .48, metalness: .08 }),
    stone: new THREE.MeshStandardMaterial({ color: '#737b8a', roughness: .9 }),
    stoneLight: new THREE.MeshStandardMaterial({ color: '#c0b69f', roughness: .78 }),
    gateTrim: new THREE.MeshStandardMaterial({ color: '#b99b65', emissive: '#6d4d22', emissiveIntensity: .42, metalness: .48, roughness: .48 }),
    mortar: new THREE.MeshStandardMaterial({ color: '#343744', roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: '#8793a2', metalness: .82, roughness: .34 }),
    timber: new THREE.MeshStandardMaterial({ color: '#3d3434', roughness: .88 }),
    roof: new THREE.MeshStandardMaterial({ color: '#292d3a', roughness: .9 }),
    plasterA: new THREE.MeshStandardMaterial({ color: '#55545a', roughness: .96 }),
    plasterB: new THREE.MeshStandardMaterial({ color: '#484c56', roughness: .96 }),
    glass: new THREE.MeshStandardMaterial({ color: '#172333', emissive: '#d18a49', emissiveIntensity: .42, roughness: .3 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#f4c982', emissive: '#e39a4a', emissiveIntensity: 1.7, roughness: .35 }),
    sign: new THREE.MeshStandardMaterial({ color: '#272a32', roughness: .72 }),
    signText: new THREE.MeshStandardMaterial({ color: '#d8c49a', emissive: '#8d7046', emissiveIntensity: .25, roughness: .7 }),
    puddle: new THREE.MeshStandardMaterial({ color: '#566474', roughness: .2, metalness: .18, transparent: true, opacity: .48 })
  };
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const addBox = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
    const geometry = new THREE.BoxGeometry(w, h, d); geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = false; mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  const addCylinder = (radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, x: number, y: number, z: number, sides = 8) => {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides); geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };
  const addPlane = (w: number, h: number, material: THREE.Material, x: number, y: number, z: number, rotation = -Math.PI / 2) => {
    const geometry = new THREE.PlaneGeometry(w, h); geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = rotation; mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };

  // Road corridor and broken wet patches.
  addPlane(12, 42, materials.asphalt, 0, -.025, -8);
  addPlane(2.1, 42, materials.mortar, -7.05, -.015, -8);
  addPlane(2.1, 42, materials.mortar, 7.05, -.015, -8);
  for (let i = 0; i < 9; i++) {
    const z = 8 - i * 4.2;
    addBox(.035, .012, 2.5 + (i % 3) * .8, materials.stoneLight, (i % 2 ? -.9 : .8), -.008, z);
  }
  addPlane(1.15, .02, materials.puddle, -2.1, .002, -4.2);
  addPlane(1.6, .02, materials.puddle, 2.25, .003, -10.8);
  addPlane(.8, .02, materials.wetAsphalt, -.35, .004, -15.2);

  // Four Gates: four separate, camera-readable portals across the road.
  // Shared piers create four unmistakable openings without adding remote assets.
  const gateZ = -13.6;
  const pierXs = [-5.2, -2.6, 0, 2.6, 5.2];
  for (let i = 0; i < pierXs.length; i++) {
    const x = pierXs[i]!;
    addBox(.52, 4.85, 1.05, materials.stone, x, 2.425, gateZ);
    addBox(.7, .24, 1.22, materials.stoneLight, x, 4.92, gateZ);
    addBox(.58, .12, 1.08, materials.mortar, x, .48, gateZ);
    for (let y = 1.05; y < 4.55; y += .7) {
      addBox(.55, .045, 1.1, materials.mortar, x, y, gateZ);
    }
    addBox(.28, .38, .3, materials.stoneLight, x, 5.2, gateZ);
    const cap = addCylinder(.2, .27, .34, materials.stoneLight, x, 5.48, gateZ, 6);
    cap.rotation.y = Math.PI / 6;
  }

  // Four separate portal bays. Deep shadowed reveals sit behind the iron, while
  // bright stone jambs, capitals and thresholds give each opening its own frame.
  const gateCenters = [-3.9, -1.3, 1.3, 3.9];
  gateCenters.forEach((x, index) => {
    // Recessed portal interior: near-black stone makes the iron silhouette legible.
    addBox(2.12, 3.82, .2, materials.sign, x, 2.88, gateZ + .36);
    // Individually framed jambs with projecting bases and capitals.
    for (const side of [-1, 1]) {
      const jambX = x + side * 1.13;
      addBox(.22, 3.95, .42, materials.stoneLight, jambX, 2.78, gateZ - .72);
      addBox(.34, .24, .52, materials.gateTrim, jambX, .82, gateZ - .78);
      addBox(.34, .22, .52, materials.stoneLight, jambX, 4.72, gateZ - .78);
      addBox(.075, 3.48, .1, materials.gateTrim, x + side * 1.0, 2.82, gateZ - .98);
    }
    addBox(2.58, .48, .58, materials.stoneLight, x, 5.0, gateZ - .7);
    addBox(.42, .58, .24, materials.gateTrim, x, 5.04, gateZ - 1.02);
    // Iron cross rails and vertical bars, clearly separated from the dark recess.
    addBox(2.12, .095, .14, materials.iron, x, 1.12, gateZ - 1.02);
    addBox(2.12, .095, .14, materials.iron, x, 2.34, gateZ - 1.02);
    for (let bar = 0; bar < 9; bar++) {
      const bx = x - .96 + bar * .24;
      addBox(.065, 1.18, .085, materials.iron, bx, 1.73, gateZ - 1.04);
      addBox(.13, .13, .11, materials.gateTrim, bx, 2.4, gateZ - 1.06);
    }
    // Oversized, high-contrast Roman numeral on a dedicated illuminated plaque.
    const numeral = ['I', 'II', 'III', 'IV'][index]!;
    // Raised gold frame and solid 3D Roman numerals avoid texture/back-face
    // ambiguity on mobile GPUs and remain legible at the gameplay camera distance.
    addBox(1.02, .8, .18, materials.gateTrim, x, 3.35, gateZ - 1.12);
    const plaque = addBox(.9, .68, .2, materials.sign, x, 3.35, gateZ - 1.16);
    plaque.userData['gateIndex'] = index + 1;
    plaque.userData['gateNumeral'] = numeral;
    const numeralZ = gateZ - .91;
    const numeralBar = (offsetX: number, height: number, angle = 0) => {
      const mark = addBox(.105, height, .075, materials.gateTrim, x + offsetX, 3.35, numeralZ);
      mark.rotation.z = angle;
      mark.userData['gateNumeral'] = numeral;
      mark.userData['gateIndex'] = index + 1;
    };
    if (numeral === 'I') numeralBar(0, .48);
    if (numeral === 'II') { numeralBar(-.13, .48); numeralBar(.13, .48); }
    if (numeral === 'III') { numeralBar(-.25, .48); numeralBar(0, .48); numeralBar(.25, .48); }
    if (numeral === 'IV') { numeralBar(-.23, .48); numeralBar(.04, .48, -.42); numeralBar(.29, .48, .42); }
    // A warm crown lamp marks each entrance without washing out the ironwork.
    const crown = addBox(.16, .16, .16, materials.lamp, x, 4.02, gateZ - 1.14);
    crown.userData['gatePortal'] = index + 1;
    const gateGlow = new THREE.PointLight('#d6b77e', .82, 5.2, 2);
    gateGlow.position.set(x, 3.55, gateZ - 1.15);
    root.add(gateGlow);
  });

  // The town-name sign is a separate header above the complete row of four gates.
  addBox(10.8, .3, .72, materials.stoneLight, 0, 6.48, gateZ);
  addBox(8.55, .84, .24, materials.sign, 0, 6.12, gateZ - .48);
  const signCanvas = document.createElement('canvas'); signCanvas.width = 1024; signCanvas.height = 192;
  const ctx = signCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#151d29'; ctx.fillRect(0, 0, 1024, 192);
    ctx.strokeStyle = '#d0b27b'; ctx.lineWidth = 7; ctx.strokeRect(10, 10, 1004, 172);
    ctx.fillStyle = '#f0d9a5'; ctx.font = 'bold 88px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('HOLLOW CREEK  ·  FOUR GATES', 512, 98);
  }
  const signTexture = new THREE.CanvasTexture(signCanvas); signTexture.colorSpace = THREE.SRGBColorSpace; textures.push(signTexture);
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(8.28, .7), new THREE.MeshBasicMaterial({ map: signTexture }));
  geometries.push(signFace.geometry as THREE.BufferGeometry); signFace.position.set(0, 6.12, gateZ - .28); root.add(signFace);

  // Older town facades, varied rooflines, recessed windows and restrained warm interiors.
  const buildings = [
    { x: -8.1, z: -7.8, w: 5.3, h: 6.1, d: 4.2, mat: materials.plasterA },
    { x: 8.15, z: -8.9, w: 5.0, h: 5.4, d: 4.5, mat: materials.plasterB },
    { x: -8.4, z: -17.5, w: 5.5, h: 5.6, d: 4.5, mat: materials.plasterB },
    { x: 8.25, z: -18.2, w: 5.8, h: 6.6, d: 4.4, mat: materials.plasterA }
  ];
  for (const b of buildings) {
    addBox(b.w, b.h, b.d, b.mat, b.x, b.h / 2, b.z);
    addBox(b.w + .35, .24, b.d + .35, materials.roof, b.x, b.h + .12, b.z);
    addBox(b.w + .12, .18, .18, materials.stoneLight, b.x, .25, b.z + b.d / 2 + .1);
    const front = b.z + b.d / 2 + .105;
    const floors = b.h > 6 ? [2.1, 4.5] : [2.2];
    for (const y of floors) for (const offset of [-1, 1]) {
      addBox(.88, 1.25, .09, materials.mortar, b.x + offset * b.w * .23, y, front);
      addBox(.66, 1.02, .035, materials.glass, b.x + offset * b.w * .23, y, front + .055);
      addBox(.94, .09, .14, materials.stoneLight, b.x + offset * b.w * .23, y + .68, front + .04);
      addBox(.08, 1.12, .12, materials.timber, b.x + offset * b.w * .23, y, front + .08);
    }
    addBox(1.05, 1.9, .14, materials.timber, b.x, 1, front + .02);
  }

  // Street lamps: emissive practicals and only two local lights.
  for (const x of [-4.6, 4.6]) {
    const z = x < 0 ? -2.2 : -9.6;
    addCylinder(.055, .085, 3.6, materials.iron, x, 1.8, z, 7);
    addBox(.62, .07, .07, materials.iron, x, 3.38, z);
    addBox(.34, .38, .34, materials.lamp, x, 3.12, z);
    addBox(.5, .08, .5, materials.iron, x, 3.36, z);
    const light = new THREE.PointLight('#e6ad69', 1.15, 7, 2); light.position.set(x, 3.05, z); root.add(light);
  }

  // Bare winter trees and low boundary stones give scale without particle-heavy foliage.
  for (const x of [-10.2, 10.1]) {
    addCylinder(.12, .22, 2.8, materials.timber, x, 1.4, -5.5, 6);
    for (let branch = 0; branch < 3; branch++) {
      const limb = addCylinder(.025, .075, 1.45, materials.timber, x + (branch - 1) * .35, 2.45 + branch * .24, -5.5, 5);
      limb.rotation.z = (branch - 1) * .48;
    }
    for (let n = 0; n < 4; n++) addBox(.72, .34, .55, materials.stone, x + (n % 2) * .22, .17, -3.5 - n * 1.7);
  }

  // Low-key entrance markers and a pair of ground-level guide lights.
  for (const x of [-5.25, 5.25]) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(.12, .32, .12), materials.lamp);
    marker.position.set(x, .72, -12.88); root.add(marker);
  }

  root.traverse(o => { if (o instanceof THREE.Mesh) { o.frustumCulled = true; o.castShadow = false; } });
  return {
    root,
    dispose() {
      root.traverse(o => { if (o instanceof THREE.PointLight) return; });
      geometries.forEach(g => g.dispose());
      textures.forEach(t => t.dispose());
      Object.values(materials).forEach(m => m.dispose());
    }
  };
}
