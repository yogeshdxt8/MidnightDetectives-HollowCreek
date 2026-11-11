import * as THREE from 'three';

export interface HollowCreekDressing {
  root: THREE.Group;
  dispose(): void;
}

/**
 * Reusable, low-poly environment dressing for the Hollow Creek town square.
 * Shared geometry/materials keep this asset pass lightweight for mobile GPUs.
 * Props are deliberately placed outside the central player/car route.
 */
export function createHollowCreekDressing(): HollowCreekDressing {
  const root = new THREE.Group();
  root.name = 'Hollow_Creek_Stylized_Dressing';
  const materials = {
    wood: new THREE.MeshStandardMaterial({ color: '#49372f', roughness: 0.96 }),
    woodLight: new THREE.MeshStandardMaterial({ color: '#765542', roughness: 0.9 }),
    woodEdge: new THREE.MeshStandardMaterial({ color: '#302a2a', roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: '#343d49', metalness: 0.68, roughness: 0.55 }),
    ironEdge: new THREE.MeshStandardMaterial({ color: '#68717d', metalness: 0.72, roughness: 0.42 }),
    rust: new THREE.MeshStandardMaterial({ color: '#684538', metalness: 0.28, roughness: 0.88 }),
    stone: new THREE.MeshStandardMaterial({ color: '#4a515d', roughness: 0.98 }),
    stoneLight: new THREE.MeshStandardMaterial({ color: '#737783', roughness: 0.92 }),
    glass: new THREE.MeshStandardMaterial({ color: '#d49a55', emissive: '#9b5725', emissiveIntensity: 1.1, roughness: 0.35 }),
    puddle: new THREE.MeshStandardMaterial({ color: '#43566a', roughness: 0.2, metalness: 0.18, transparent: true, opacity: 0.55, depthWrite: false }),
    leaf: new THREE.MeshStandardMaterial({ color: '#65513c', roughness: 1, side: THREE.DoubleSide }),
  };
  const geometries: THREE.BufferGeometry[] = [];
  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
    position: THREE.Vector3, rotation?: THREE.Euler): THREE.Mesh => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    if (rotation) mesh.rotation.copy(rotation);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (parent: THREE.Object3D, size: THREE.Vector3, material: THREE.Material,
    x: number, y: number, z: number, rz = 0) =>
    add(parent, new THREE.BoxGeometry(size.x, size.y, size.z), material,
      new THREE.Vector3(x, y, z), new THREE.Euler(0, 0, rz));
  const crate = (x: number, z: number, scale = 1, tipped = false) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (tipped) group.rotation.z = -0.12;
    root.add(group);
    const w = 0.92 * scale, h = 0.82 * scale, d = 0.82 * scale, t = 0.095 * scale;
    box(group, new THREE.Vector3(w, h, d), materials.wood, 0, h / 2, 0);
    box(group, new THREE.Vector3(w + 0.025, t, d + 0.025), materials.woodLight, 0, h - t / 2, 0);
    box(group, new THREE.Vector3(w + 0.025, t, d + 0.025), materials.woodEdge, 0, t / 2, 0);
    for (const side of [-1, 1]) {
      box(group, new THREE.Vector3(t, h - t, d + 0.03), materials.woodLight, side * (w / 2 - t / 2), h / 2, 0);
      box(group, new THREE.Vector3(w - t, h - t, t), materials.woodLight, 0, h / 2, side * (d / 2 - t / 2));
    }
    for (let i = -1; i <= 1; i++) {
      box(group, new THREE.Vector3(0.045 * scale, h * 0.72, 0.035 * scale), materials.woodEdge,
        i * w * 0.29, h * 0.52, d / 2 + 0.022 * scale);
    }
    return group;
  };
  const barrel = (x: number, z: number, height = 0.9) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    root.add(group);
    const radius = height * 0.39;
    const bodyGeo = new THREE.CylinderGeometry(radius * 0.94, radius, height, 10, 1);
    add(group, bodyGeo, materials.iron, new THREE.Vector3(0, height / 2, 0));
    for (const y of [height * 0.22, height * 0.78]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.99, 0.035, 5, 10), materials.ironEdge);
      hoop.position.y = y;
      hoop.rotation.x = Math.PI / 2;
      hoop.castShadow = false;
      group.add(hoop);
      geometries.push(hoop.geometry);
    }
    const lid = add(group, new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.035, 10),
      materials.ironEdge, new THREE.Vector3(0, height + 0.018, 0));
    lid.userData['propDetail'] = 'barrel-lid';
    return group;
  };
  const fence = (x: number, z: number, length: number, lean = 0) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = lean;
    root.add(group);
    box(group, new THREE.Vector3(length, 0.11, 0.12), materials.iron, 0, 0.72, 0);
    box(group, new THREE.Vector3(length, 0.11, 0.12), materials.iron, 0, 1.22, 0);
    const count = Math.max(3, Math.floor(length / 0.38));
    for (let i = 0; i <= count; i++) {
      const px = -length / 2 + length * i / count;
      box(group, new THREE.Vector3(0.075, 1.42, 0.09), materials.ironEdge, px, 0.82, 0);
      const tip = add(group, new THREE.ConeGeometry(0.065, 0.18, 4), materials.ironEdge,
        new THREE.Vector3(px, 1.62, 0));
      tip.rotation.z = Math.PI;
    }
    return group;
  };
  const lantern = (x: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    root.add(group);
    const post = add(group, new THREE.CylinderGeometry(0.045, 0.075, 2.15, 7), materials.iron,
      new THREE.Vector3(0, 1.075, 0));
    post.userData['propDetail'] = 'lantern-post';
    box(group, new THREE.Vector3(0.42, 0.08, 0.42), materials.iron, 0, 2.13, 0);
    box(group, new THREE.Vector3(0.3, 0.38, 0.3), materials.glass, 0, 2.37, 0);
    const cap = add(group, new THREE.ConeGeometry(0.25, 0.2, 4), materials.ironEdge,
      new THREE.Vector3(0, 2.66, 0));
    cap.rotation.y = Math.PI / 4;
    const glow = new THREE.PointLight('#d69a58', 0.52, 4.2, 2);
    glow.position.set(0, 2.38, 0);
    group.add(glow);
    return group;
  };
  const debris = (x: number, z: number, seed: number) => {
    for (let i = 0; i < 7; i++) {
      const angle = seed * 0.7 + i * 2.17;
      const radius = 0.22 + (i % 3) * 0.16;
      const leaf = add(root, new THREE.PlaneGeometry(0.12 + (i % 2) * 0.07, 0.055),
        materials.leaf, new THREE.Vector3(x + Math.cos(angle) * radius, 0.012 + i * 0.0005,
          z + Math.sin(angle) * radius));
      leaf.rotation.x = -Math.PI / 2;
      leaf.rotation.z = angle;
    }
  };

  // Left and right edges of the square: dense silhouettes, clear central traversal.
  crate(-5.05, -4.1, 1.0, true);
  crate(-4.45, -4.45, 0.78);
  barrel(-5.05, -6.0, 0.95);
  barrel(-4.55, -7.0, 0.78);
  fence(-5.25, -8.55, 2.4, -0.04);
  lantern(-5.1, -2.25);

  crate(5.0, -4.25, 0.9);
  barrel(5.0, -6.0, 1.0);
  barrel(4.55, -7.0, 0.82);
  fence(5.2, -8.65, 2.35, 0.06);
  lantern(5.15, -2.35);

  // A few low props and wet patches add foreground texture without filling the play lane.
  const puddleA = add(root, new THREE.CircleGeometry(0.62, 9), materials.puddle,
    new THREE.Vector3(-4.25, 0.009, -9.7));
  puddleA.rotation.x = -Math.PI / 2;
  puddleA.scale.set(1.45, 0.62, 1);
  const puddleB = add(root, new THREE.CircleGeometry(0.48, 8), materials.puddle,
    new THREE.Vector3(4.1, 0.01, -10.2));
  puddleB.rotation.x = -Math.PI / 2;
  puddleB.scale.set(1.5, 0.7, 1);
  debris(-4.0, -3.25, 2);
  debris(4.0, -3.55, 5);
  debris(-3.8, -10.6, 8);
  debris(3.8, -10.5, 11);

  root.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.frustumCulled = true;
      object.userData['assetRole'] = 'hollow-creek-environment-dressing';
    }
  });
  return {
    root,
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      Object.values(materials).forEach(material => material.dispose());
    },
  };
}
