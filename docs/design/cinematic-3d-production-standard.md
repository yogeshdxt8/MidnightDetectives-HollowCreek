# Cinematic 3D Production Standard — Midnight Detectives: Hollow Creek

**Status:** Approved visual direction  
**Target:** YouTube Playables (mobile browser runtime)  
**Renderer:** Three.js / WebGL 2  
**Asset format:** GLB/glTF for authored models; procedural Three.js geometry where practical

## 1. Visual direction

The approved direction is **cinematic realism**: believable human proportions, grounded materials, restrained color, motivated lighting, atmospheric depth, and film-like composition. The game should feel like entering a live-action supernatural mystery, not a cartoon or glossy arcade world.

Realism is achieved through coherent art direction, silhouette, material response, lighting, animation timing, camera composition, and environmental storytelling. Polygon count alone is not a quality target.

## 2. Canon and continuity

The Game Design Bible and approved character references remain authoritative. Do not invent or silently change detective identities, ages, relationships, supernatural entity designs, or story facts.

- Preserve Ethan Parker, Noah Brooks, Lily Carter, and Maya Williams as the four established detectives.
- The selected detective is the player-controlled lead; the other three remain story/AI companions.
- The Hollow Man and Shadow Walker retain their approved canonical visual identities.
- Character variants must share a common scale, rig conventions, material response, and animation timing.
- Every new character/environment asset requires a stable asset ID and a reference/approval record before it becomes canon.

## 3. Asset production pipeline

1. **Reference definition:** record silhouette, proportions, costume layers, palette, material references, and scale.
2. **Blockout:** create a low-cost Three.js or GLB prototype and verify camera readability.
3. **Model:** use clean topology and mobile-appropriate geometry; avoid hidden detail that cannot be seen at gameplay camera distance.
4. **Materials:** use physically based glTF materials with restrained roughness/metalness. Prefer texture atlases and shared materials.
5. **Rig/animation:** use a consistent humanoid skeleton, named bones, root-motion policy, and reusable idle/walk/run/interact clips. Validate deformation at shoulders, elbows, hips, and knees.
6. **Export:** GLB/glTF, embedded or locally packaged resources, correct scale/orientation, no external runtime dependencies.
7. **Optimization:** mesh/texture compression only after testing decoder availability and startup cost; use LODs for larger scenes; bake static lighting where appropriate.
8. **Integration:** load through a central asset manager, cache shared resources, handle errors, and dispose unused GPU resources.
9. **Validation:** inspect on narrow mobile viewport, touch input, representative low/mid-range hardware, and Playables Test Suite build.

## 4. Playables runtime constraints

- Runtime assets must be included in the submitted game bundle. No remote model/texture download dependency during gameplay.
- Initial bundle target: under 15 MiB; never exceed the current official hard limit.
- Keep the full package, individual files, cloud save, and heap within the current Google limits. Recheck the platform standard and official requirements before release.
- Use WebGL 2-compatible materials and features. Do not rely on desktop-only graphics APIs.
- Avoid expensive real-time global illumination, high-resolution shadow maps, excessive transparent particles, and full-screen post effects.
- Use a capped device pixel ratio, adaptive render scale, frustum culling, instancing, and shared materials.
- Keep touch controls and readable UI visible over the 3D scene.
- The loading frame and firstFrameReady/gameReady lifecycle must remain correct while assets load.

## 5. Initial art budgets (project targets, not Google certification limits)

| Asset | Initial target |
|---|---:|
| Main detective | 8k–18k triangles |
| Companion character | 6k–14k triangles |
| Common prop | 100–2k triangles |
| Hero prop | 2k–8k triangles |
| Character texture set | 1K–2K atlas, only when needed |
| Environment texture | 512–1K for most assets |
| Material count | Prefer 1–3 per character |
| Active real-time shadow casters | Keep to a small, deliberate set |

These are starting targets. Measure actual GPU/CPU frame time and memory on representative devices; reduce or increase only with evidence.

## 6. Lighting and environment

- Establish a small set of motivated light sources (moon, street lamps, practical interior lights, detective flashlight).
- Prefer baked/static lighting and ambient occlusion for static architecture.
- Use fog as a depth/composition tool, not a substitute for geometry or visibility.
- Keep interactive evidence visually distinct without glowing every object.
- Use wetness selectively; roughness variation and restrained specular response should preserve material believability.
- Design spaces around camera visibility, navigation clarity, and touch interaction.

## 7. Character implementation status

src/characters/detective-character.ts contains the first procedural Three.js detective asset. It is real runtime geometry with layered clothing, facial landmarks, shoes, accessories, and articulated pivot groups. It is a production prototype, **not yet a final canonical character model, skinned GLB, or mocap-quality rig**.

The existing locomotion pivots are exposed for integration. Next character milestones:
- approve the specific detective's canonical appearance against source references;
- replace/upgrade the procedural prototype with a skinned GLB when a reliable asset-generation path is available;
- add tested idle, walk, run, turn, interact, and flashlight animations;
- validate silhouette, face readability, cloth/material response, and deformation at gameplay camera distance.

## 8. Environment vertical slice

The first environment target is the Hollow Creek town entrance / Four Gates approach. It must include:
- believable street and ground surface variation;
- readable gate silhouettes and physical route boundaries;
- coherent building facades and rooflines;
- motivated practical lights and moonlit fill;
- restrained atmospheric fog;
- collision/navigation boundaries aligned with visible geometry;
- evidence placement and interaction readability.

Build one representative slice to completion before producing all ten campaign locations.

## 9. Release gate

An asset is accepted only when:
- it is original or properly licensed and its provenance is recorded;
- it respects canon and approved references;
- it renders correctly in the production Three.js build;
- it has no missing external resources;
- it works at mobile viewport sizes and touch input;
- its memory, download, and frame-time costs are measured;
- it does not regress Playables startup, lifecycle, saves, audio, scoring, pause/resume, or accessibility;
- automated build/tests pass and the deployed artifact is checked in the Playables Test Suite.

Passing local tests is not a certification claim. Record actual Test Suite and device evidence separately.

## 10. Ownership and workflow

The creator provides game direction and approves major canon/creative decisions. Production planning, procedural asset implementation, code integration, optimization, automated tests, repository updates, and release evidence are handled as part of the development workflow. Do not ask the creator to install or operate desktop 3D software. If an external capability is genuinely unavailable, state the limitation and use a feasible in-repository procedural or code-generated alternative.
