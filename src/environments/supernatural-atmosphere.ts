import * as THREE from 'three';

export interface SupernaturalAtmosphere {
  update(deltaSeconds: number, elapsedSeconds: number): void;
  dispose(): void;
}

/** One batched rain draw call plus restrained spectral motes and low-cost practical lights. */
export function createSupernaturalAtmosphere(scene: THREE.Scene): SupernaturalAtmosphere {
  const rainCount = 132;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainVelocity = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i++) {
    const x = (Math.random() - 0.5) * 17;
    const y = 1 + Math.random() * 8;
    const z = -14 + Math.random() * 25;
    const offset = i * 6;
    rainPositions[offset] = x;
    rainPositions[offset + 1] = y;
    rainPositions[offset + 2] = z;
    rainPositions[offset + 3] = x - 0.055;
    rainPositions[offset + 4] = y - 0.34;
    rainPositions[offset + 5] = z - 0.025;
    rainVelocity[i] = 5.5 + Math.random() * 3.5;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.LineBasicMaterial({
    color: '#a8c4df', transparent: true, opacity: 0.25, depthWrite: false,
  });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  scene.add(rain);

  const moteCount = 44;
  const motePositions = new Float32Array(moteCount * 3);
  const moteDrift = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * 13;
    motePositions[i * 3 + 1] = 0.18 + Math.random() * 1.2;
    motePositions[i * 3 + 2] = -13 + Math.random() * 22;
    moteDrift[i * 3] = (Math.random() - 0.5) * 0.12;
    moteDrift[i * 3 + 1] = 0.025 + Math.random() * 0.045;
    moteDrift[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMaterial = new THREE.PointsMaterial({
    color: '#a9c9df', size: 0.055, transparent: true, opacity: 0.34,
    sizeAttenuation: true, depthWrite: false,
  });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.frustumCulled = false;
  scene.add(motes);

  const spectralLight = new THREE.PointLight('#7899c6', 0.42, 10, 2);
  spectralLight.position.set(-3.4, 1.1, -5.1);
  scene.add(spectralLight);
  const gateLight = new THREE.PointLight('#91a8d0', 0.38, 9, 2);
  gateLight.position.set(0, 2.2, -13.1);
  scene.add(gateLight);

  return {
    update(deltaSeconds, elapsedSeconds) {
      const dt = Math.min(deltaSeconds, 0.05);
      for (let i = 0; i < rainCount; i++) {
        const offset = i * 6;
        const fall = rainVelocity[i]! * dt;
        rainPositions[offset + 1] = rainPositions[offset + 1]! - fall;
        rainPositions[offset + 4] = rainPositions[offset + 4]! - fall;
        rainPositions[offset] = rainPositions[offset]! - fall * 0.14;
        rainPositions[offset + 3] = rainPositions[offset + 3]! - fall * 0.14;
        if (rainPositions[offset + 1] < 0.25) {
          const x = (Math.random() - 0.5) * 17;
          const z = -14 + Math.random() * 25;
          const y = 7 + Math.random() * 3;
          rainPositions[offset] = x;
          rainPositions[offset + 1] = y;
          rainPositions[offset + 2] = z;
          rainPositions[offset + 3] = x - 0.055;
          rainPositions[offset + 4] = y - 0.34;
          rainPositions[offset + 5] = z - 0.025;
        }
      }
      (rainGeometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;
      for (let i = 0; i < moteCount; i++) {
        const offset = i * 3;
        motePositions[offset] = motePositions[offset]! + moteDrift[offset]! * dt;
        motePositions[offset + 1] = motePositions[offset + 1]! + moteDrift[offset + 1]! * dt;
        motePositions[offset + 2] = motePositions[offset + 2]! + moteDrift[offset + 2]! * dt;
        if (motePositions[offset + 1] > 1.55) motePositions[offset + 1] = 0.16;
        if (Math.abs(motePositions[offset]!) > 7) moteDrift[offset] = moteDrift[offset]! * -1;
      }
      (moteGeometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;
      spectralLight.intensity = 0.34 + Math.sin(elapsedSeconds * 1.7) * 0.07 + Math.sin(elapsedSeconds * 4.1) * 0.025;
      gateLight.intensity = 0.32 + Math.sin(elapsedSeconds * 0.8) * 0.06;
    },
    dispose() {
      scene.remove(rain, motes, spectralLight, gateLight);
      rainGeometry.dispose();
      rainMaterial.dispose();
      moteGeometry.dispose();
      moteMaterial.dispose();
    },
  };
}
