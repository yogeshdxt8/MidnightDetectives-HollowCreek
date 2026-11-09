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
    stone: new THREE.MeshStandardMaterial({ color: '#555766', roughness: .94 }),
    stoneLight: new THREE.MeshStandardMaterial({ color: '#777783', roughness: .88 }),
    mortar: new THREE.MeshStandardMaterial({ color: '#343744', roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: '#202832', metalness: .72, roughness: .42 }),
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

  // Four Gates: paired weathered stone piers, lintel, iron sidework and readable entrance sign.
  for (const x of [-5.25, 5.25]) {
    addBox(1.25, 4.15, 1.15, materials.stone, x, 2.075, -13.6);
    addBox(1.42, .22, 1.32, materials.stoneLight, x, 4.2, -13.6);
    addBox(1.08, .18, 1.08, materials.mortar, x, .48, -13.6);
    for (let y = 1.05; y < 3.85; y += .7) addBox(1.29, .045, 1.19, materials.mortar, x, y, -13.6);
    addBox(.28, .34, .28, materials.stoneLight, x, 4.48, -13.6);
    const cap = addCylinder(.18, .23, .35, materials.stoneLight, x, 4.73, -13.6, 6);
    cap.rotation.y = Math.PI / 6;
    // Iron fence wings terminate at the gate piers, leaving a wide central road opening.
    const wingX = x < 0 ? -3.35 : 3.35;
    addBox(2.8, .12, .12, materials.iron, wingX, 1.45, -13.6);
    addBox(2.8, .12, .12, materials.iron, wingX, 3.05, -13.6);
    for (let n = 0; n < 8; n++) addBox(.055, 1.65, .07, materials.iron, wingX + (n - 3.5) * .36, 2.23, -13.6);
  }
  addBox(9.8, .52, .9, materials.stone, 0, 4.18, -13.6);
  addBox(4.5, .74, .16, materials.sign, 0, 3.42, -13.02);
  addBox(4.32, .045, .035, materials.signText, 0, 3.78, -12.92);
  addBox(4.32, .045, .035, materials.signText, 0, 3.06, -12.92);
  // Sign lettering is represented by restrained raised strokes to avoid font textures and external assets.
  for (let i = 0; i < 10; i++) addBox(.09, .24, .035, materials.signText, -1.85 + i * .41, 3.42, -12.91);
  addBox(10.4, .18, 1.25, materials.stoneLight, 0, 4.52, -13.6);

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
      Object.values(materials).forEach(m => m.dispose());
    }
  };
}
