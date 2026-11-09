# Midnight Detectives: Hollow Creek — Game Design Bible

**Document status:** Living design source of truth  
**Version:** 0.2.2  
**Last updated:** 2026-11-10  
**Repository:** `yogeshdxt8/MidnightDetectives-HollowCreek`  
**Audience:** Game design, narrative, engineering, art, audio, QA, and production  
**Product direction:** Cinematic supernatural mystery adventure for a general audience aged 13+  
**Approval rule:** Only items explicitly marked **Approved / Locked** are binding. Items marked **Proposal** or **Open** must not silently become canon or production requirements.

---

## 1. Purpose and document governance

This is the continuously maintained Game Design Bible for *Midnight Detectives: Hollow Creek*. It records the approved player experience, narrative constraints, gameplay rules, character and entity canon, level structure, interaction standards, and production principles.

The repository is the single source of truth for approved game design decisions. Conversation decisions must be transferred here so that design, engineering, art, and QA work from the same specification.

### 1.1 Status vocabulary

| Status | Meaning |
|---|---|
| **Approved / Locked** | Explicitly approved by the creator. Treat as a binding design constraint. |
| **Working direction** | Agreed high-level direction, but implementation details may still change. |
| **Proposal** | A suggested design awaiting explicit approval. Do not treat as canon. |
| **Open** | Not yet decided. Do not invent an answer. |
| **Superseded** | Replaced by a later approved decision. Retain history where useful. |

### 1.2 Change-control rules

1. Preserve all approved decisions unless the creator explicitly changes them.
2. Never convert a proposal into approved canon by repetition or implementation.
3. When a decision changes, update this Bible and record the change in the revision history.
4. Keep unresolved identities, histories, entity origins, powers, weaknesses, and unregistered lore unresolved.
5. Keep detailed implementation specifications in focused documents under `docs/design/` or `docs/architecture/`; link them here.
6. Before a major feature is implemented, check it against this Bible and the current YouTube Playables requirements.
7. If a conversation introduces a new approved rule, update this document in the next relevant repository change rather than relying on chat history.

### 1.3 Related design authority

- [13+ Creative and Product Design Standard](./13-plus-creative-product-design-standard.md) — approved audience positioning, tone, visual direction, canon integrity, accessibility, and content standards.
- Canonical character, supporting-cast, pet, location, and visual reference materials supplied in the project archive remain authoritative for details not reproduced here.
- Technical platform integration and certification requirements belong in the project's technical documentation and must be checked against current official Google documentation.

---

## 2. Product vision

**A compact, third-person, level-based supernatural escape adventure in which the player explores Hollow Creek, searches for missing teammates, uncovers connected evidence, solves physical mechanisms, survives supernatural encounters, and ultimately tries to get the team out safely.**

The player should feel like an investigator exploring a connected, mysterious place—not someone selecting disconnected stages from a menu.

### 2.1 Core player promise

- Explore memorable, interconnected locations.
- Notice environmental details and discover meaningful evidence.
- Find useful objects and use them in logical places, including rooms visited earlier or later.
- Solve mechanisms through observation and reasoning.
- Wonder what happened to the missing detectives.
- Reunite the team and experience meaningful cooperation.
- Encounter supernatural threats through suspense, anticipation, and fair survival gameplay.
- Reach new locations through physical, cinematic transitions.

### 2.2 Experience pillars

1. **Exploration and discovery** — the primary activity.
2. **Curiosity and narrative progression** — each discovery answers a question or creates a meaningful new one.
3. **Logical problem-solving** — dependencies are clue-supported and fair.
4. **Teamwork and reunion** — missing teammates are central to the emotional and gameplay journey.
5. **Supernatural suspense** — tension is paced, readable, and recoverable.
6. **A connected world** — rooms and levels feel physically and narratively connected.
7. **Player respect** — no punitive repetition, arbitrary difficulty, or manipulative engagement systems.

A provisional activity balance discussed during design is approximately 70% exploration/discovery, 20% puzzles/problem-solving, and 10% survival tension. Treat these as tuning targets, not rigid quotas; validate through playtesting.

---

## 3. Player perspective and camera

<badge>Approved / Locked</badge>

- The game is third-person throughout normal gameplay.
- The selected detective remains visible to the player while moving through rooms and corridors.
- The camera follows from behind or over the shoulder.
- There is no first-person gameplay mode and no player-facing camera-mode switch.
- Indoor spaces must be designed around character visibility, camera collision, camera distance, lighting, and readable navigation.
- Cinematics may temporarily control the camera, but gameplay must return to the established third-person view.

**Design consequence:** Room dimensions, doorway widths, corridor turns, ceilings, furniture placement, and camera collision must be tested together. Do not build narrow spaces that routinely hide the player character.

---

## 4. Playable protagonists and team

<badge>Approved / Locked</badge>

The four equal playable leads are:

- Ethan Parker
- Noah Brooks
- Lily Carter
- Maya Williams

All four are canonically 12 years old. This is internal character-bible information and must never be disclosed to the player through in-game dialogue, UI, narration, collectibles, marketing copy, or other player-facing content. Do not state or imply an exact age in the game. Their age does not need to match the game's intended audience age: the game is designed for a general audience aged 13+. Preserve their names, identities, established personalities, relationships, and canonical visual designs.

### 4.1 Character selection

- The player selects one of the four detectives before starting the campaign.
- The selected detective is the player-controlled character.
- The other three are AI-controlled characters during the opening and when appropriate later in the campaign.
- The main story and campaign progression remain the same regardless of the selected protagonist.
- All four detectives eventually reunite and participate in the finale.
- All four appear in the opening cinematic.

### 4.2 Character canon and abilities

Do not invent or lock specialist abilities based on personality assumptions. Proposed abilities such as observation, mechanism expertise, research, or distraction remain **Proposals** until checked against canonical character references and explicitly approved.

### 4.3 Companions

- Teammates must be physically present and meaningfully assist when the story calls for them; remote-only participation is insufficient for key reunion moments.
- Keep companion AI economical and reliable for mobile performance.
- A simple companion state flow may be used: called/assigned → spawn at a safe entry → navigate → assist → acknowledge completion → exit or follow.
- Do not require complex squad tactics or expensive general-purpose pathfinding.
- Coin-funded optional companion calls have been discussed but are **Open** and must not become mandatory progression.

---

## 5. Opening sequence — “Four Gates”

<badge>Approved / Locked story direction</badge>

The opening establishes the team, the supernatural danger, the separation, and the player's immediate survival objective.

1. The four detectives arrive at Hollow Creek to investigate unusual reports.
2. They exit their vehicle and briefly talk.
3. They notice four separate gates.
4. The Hollow Man and the Shadow Walker appear.
5. The detectives become frightened and run.
6. The player takes control of the selected detective and must run; the other three run ahead as AI characters.
7. Each of the three AI detectives enters a different gate.
8. Each gate visibly slams shut and locks behind its detective. Show each separation clearly; do not simply make the characters vanish.
9. The player cannot follow through those three locked gates.
10. The fourth gate remains open. The player must enter it to survive.
11. If the player hesitates and is caught, restart only the opening chase.
12. After three failed attempts, show a mandatory contextual hint.
13. The player enters the fourth gate; it closes behind them.
14. The player is alone inside Hollow Creek. The search for the missing teammates begins.

### Opening fairness requirements

- Clearly communicate the run control and the safe route.
- Give a fair reaction window and readable threat cues.
- Do not make the first failure feel random.
- Do not allow waiting to reopen a locked gate or entering another detective's gate.
- A catch during this opening chase restarts the opening chase only.

---

## 6. World structure and campaign

<badge>Working direction</badge>

- The campaign is one continuous adventure spanning ten compact levels.
- It is not an open world. Each level is a deliberately scoped environment with connected rooms, corridors, exterior pockets, and mechanisms.
- The player should experience a coherent journey through Hollow Creek rather than ten unrelated stages.
- Load only the current level/area and the necessary transition destination to control memory and performance.
- A typical level may contain approximately four to six meaningful rooms or spaces; this is a production guideline, not a locked count.
- Reuse modular environment systems where appropriate, without making locations feel interchangeable.

### 6.1 Proposed campaign map — not final story canon

The following is a working structure for planning. Specific story events, evidence counts, enemy appearances, and room dependencies still require detailed design and approval.

| Level | Working location / purpose | Current status |
|---|---|---|
| 1 | Four Gates / Town Entrance — opening chase, separation, first exploration | Opening sequence approved; remaining level content open |
| 2 | Abandoned Residence — exploration, first major evidence trail | Proposal |
| 3 | Underground Passage — first teammate reunion concept | Proposal |
| 4 | Abandoned School — second teammate reunion concept | Proposal |
| 5 | Forest Boundary — third teammate reunion and team reassembly concept | Proposal |
| 6 | Forgotten Archive — historical records and investigation | Proposal |
| 7 | Clock Tower — one of the Twelve Mechanisms | Clock Tower's membership in the Twelve Mechanisms is established; level design proposal |
| 8 | Hidden Chamber — connect evidence and locations | Proposal |
| 9 | Sealed Boundary — prepare the escape | Proposal |
| 10 | Final Escape — all four detectives cooperate | Overall finale direction; exact resolution open |

The proposed reunion sequence is: first teammate in Level 3, second in Level 4, third in Level 5. By the end of Level 5, all four detectives would be reunited. This sequence is a **Proposal**, not locked until explicitly approved.

### 6.2 Unresolved narrative elements

- The identity and story of the “forgotten person” remain unresolved.
- The Twelve Mechanisms form a collective system; the Clock Tower is one of them. The other eleven mechanisms are not defined here.
- The cause and complete history of Hollow Creek's supernatural events are not yet established.
- Do not invent the origin, motive, powers, weaknesses, or backstory of either supernatural entity.
- Prototype-only names, characters, locations, and explanations must not become canon without approval.

---

## 7. Physical room and level transitions

<badge>Approved / Locked</badge>

**Every ordinary room exit and every level-to-level transition must be experienced as physical travel through the world.**

The player physically reaches and passes through a believable connection: a door, gate, corridor, tunnel, stairway, hatch, passage, or other environment-appropriate route.

### 7.1 Non-negotiable rules

- Do not use an ordinary level-complete screen as a substitute for travelling to the next location.
- Do not abruptly teleport the player to an unrelated spawn point.
- Do not change location without a believable in-world connection or an explicitly authored story event.
- Keep the detective visible during normal transition movement and cinematic reveals.
- Use a camera reveal to create anticipation, then return control to the player.
- Preserve inventory, evidence, solved puzzle state, unlocked routes, rescued teammates, and campaign progress.
- The transition must not erase or replay already completed progress.

### 7.2 Transition experience

A typical transition should follow this sequence:

1. **Completion feedback:** The player completes the room's objective or opens the route. Communicate the world-state change.
2. **Approach:** The player moves toward the physical exit; the third-person camera remains readable.
3. **Threshold interaction:** The player opens, activates, climbs through, or otherwise traverses the connection.
4. **Anticipation:** Sound, lighting, partial visibility, environmental clues, or a glimpse beyond the threshold build curiosity.
5. **Reveal:** The next space or landmark is revealed through authored camera framing while keeping the detective visible whenever practical.
6. **Arrival:** The detective physically emerges into the next area.
7. **Control handoff:** Normal third-person movement and exploration resume without unnecessary delay.

### 7.3 Transitions must carry story value

A transition should do at least one of the following:

- Reveal a new landmark or environment.
- Suggest danger or an unseen presence.
- Show a trace left by a missing teammate.
- Answer a question raised in the previous room.
- Introduce a new question or objective.
- Establish a change in atmosphere, scale, weather, sound, or lighting.

Examples such as footprints leading toward a forest, a distant tower becoming visible, or a teammate's notebook near an exit are **illustrative proposals**, not approved story events.

### 7.4 Seamless loading and technical behavior

- Hide unavoidable loading behind a believable traversal moment where possible.
- Never sacrifice control responsiveness or player orientation for a cinematic.
- Use a safe transition state to prevent duplicate input, falling through geometry, or activating both old and new areas.
- On transition failure, restore a safe state without losing progress.
- Keep transitions short enough that the player feels anticipation rather than waiting.
- Cinematic camera control must always hand back to the normal third-person camera cleanly.
- The transition system must support both room-to-room and level-to-level travel.

**Player promise:** Hollow Creek should feel like one connected mysterious world, even when the game streams or loads separate level assets behind the scenes.

---

## 8. Exploration, inventory, and dependency-based gameplay

<badge>Approved / Locked core system</badge>

The game uses a data-driven, dependency-based exploration and puzzle system. The player may discover an item in one room and use it in another room, including a room visited earlier or later. Objects may be prepared, repaired, powered, or activated in one location and affect mechanisms elsewhere.

### 8.1 Dependency graph

Represent progression as a graph of item, object, clue, mechanism, and world-state dependencies—not as a hardcoded linear room sequence.

A dependency definition should capture:

- Stable identity for the item, object, mechanism, or state.
- Where it can be discovered.
- Valid use or interaction locations.
- Required items, clues, states, or combinations.
- The action performed.
- The resulting state change.
- Which routes, interactions, or story events become available.
- Player-facing feedback and supporting clue(s).

### 8.2 Illustrative dependency example

This is an example of the system, not fixed Level 2 canon:

1. Fuel is discovered in Room 2.
2. A lighter is discovered in Room 3.
3. The generator is located in Room 4.
4. Fuel and the lighter are used appropriately to start the generator.
5. Electricity restores an electronic cabinet in Room 5.
6. A physical key discovered in Room 1 opens a physical lock at the exit in Room 6.

The player should be able to explore in a sensible non-linear order. Do not require a single exact room order unless the story or physical world genuinely requires it.

### 8.3 Item and interaction distinctions

Keep these concepts distinct:

- **Keys:** Open corresponding physical locks.
- **Useful items:** Fuel, fuses, batteries, tools, and similar objects that operate or repair mechanisms.
- **Tools:** Enable a specific physical action.
- **Evidence:** Reveals story information or investigative connections.
- **Puzzle clues:** Help infer a mechanism's solution.
- **Puzzles:** Require the player to reason about and operate a mechanism.
- **Optional rewards:** Separate from mandatory investigation progression.

Do not make every level a hunt for three keys. Vary the interactions and mechanisms. Do not consume a key or critical item on an invalid attempt when the required mechanism state is not ready.

### 8.4 Dependency clarity

- Every mandatory dependency must be logical and supported by discoverable clues.
- Never require an item without giving the player a fair clue that it matters.
- Never hide a mandatory item in an unrelated, unmarked location.
- Avoid obscure combinations that have no demonstrated logic.
- Avoid unnecessary wandering and backtracking.
- Allow players to collect an item before they know its eventual use, but provide enough context to make later recognition satisfying.
- Do not expose the entire dependency graph on every interaction; show only relevant contextual information.

---

## 9. Contextual interaction and feedback

<badge>Approved / Locked</badge>

Every interactable object must communicate, in concise and natural language:

1. What the object is.
2. Its current state.
3. What is missing, if anything.
4. What the player can do now.
5. What changed after a successful interaction.

Example generator feedback:

- Before fuel: “The generator is out of fuel. It cannot start.”
- Fuel installed: “Fuel detected. Start the generator?”
- After activation: “Generator started! Electricity is now available throughout the residence. The electronic cabinet in the study may now be accessible.”

If the player tries an exit before restoring power, explain the immediate reason the exit cannot operate and provide a subtle environmental clue. After repeated failures, provide a clearer hint.

Interaction prompts must be legible and have clear touch targets. Do not use vague messages such as “Something is missing” when the detective can reasonably identify the actual problem.

---

## 10. Evidence and investigation

<badge>Approved / Locked distinction</badge>

Evidence is a story-investigation system, not a key or generic collectible score.

Evidence should help the player understand:

- What happened in Hollow Creek.
- Where the detectives went.
- Why locations or events may be connected.
- What the supernatural mystery might involve.
- Which questions remain unanswered.

### 10.1 Evidence categories

- **Required evidence:** Advances the main investigation, reveals a required connection, or unlocks a story-critical route/mechanism.
- **Optional evidence:** Adds deeper lore or context but is not required to complete the main campaign.
- **Puzzle clues:** Information specifically needed to reason about a mechanism. A clue may also be evidence if it has a genuine narrative role, but the game should communicate its primary purpose.

### 10.2 Evidence discovery moment

When meaningful evidence is discovered:

1. Show a brief pickup or inspection moment.
2. Use a close-up or readable framing where appropriate.
3. Let the detective make a concise observation when suitable.
4. Add it to the case journal or investigation record.
5. Reveal a connection, answer, contradiction, or new question.

Do not turn evidence into points with no narrative consequence. Keep mandatory evidence discoverable and fair; optional evidence can reward deeper exploration.

---

## 11. Supernatural entities

The established entities are:

### ANT-001 — The Hollow Man

- Weathered hat.
- Pale mask.
- Tattered charcoal coat.
- Silent and watchful.
- Psychological, unsettling presence.

### ANT-002 — The Shadow Walker

- Faceless hood.
- Violet eyes or energy.
- Torn shadow-like fabric.
- Elongated claws.
- Silent supernatural threat.

Preserve the approved visual references in the repository's entity reference materials. Their origins, motives, powers, weaknesses, voices, and detailed gameplay behaviors are **Open** unless explicitly approved. Do not invent those details as canon.

Encounters should be distinct in presentation and fair in gameplay. Do not rely on constant chasing or arbitrary jump scares. Use anticipation, environmental cues, readable danger, and relief.

---

## 12. Encounter failure, checkpoints, and hints

<badge>Approved / Locked</badge>

- A failed encounter restarts only that encounter from its designated checkpoint, not the entire level.
- Preserve collected evidence, collected items, solved puzzles, unlocked doors/routes, rescued teammates, and campaign progress.
- Reset only encounter-specific temporary state, such as enemy position, hazard timing, and encounter trigger state.
- Do not force the player to repeat long sections or redo solved puzzles.

### 12.1 Hint policy

- After three failures at the same encounter or obstacle, provide a mandatory contextual hint.
- Further failures may provide progressively clearer guidance.
- If the player is clearly struggling, an earlier optional hint may be offered.
- Hints should guide the player toward understanding; they do not always need to reveal the complete solution.
- Never punish or shame the player for using a hint.

---

## 13. Difficulty, pacing, and player enjoyment

<badge>Approved / Locked principles</badge>

The experience must be challenging enough to be satisfying but never so opaque or punishing that players abandon it out of frustration.

A provisional difficulty curve:

| Level | Target difficulty |
|---|---|
| 1 | Very easy |
| 2 | Easy |
| 3 | Easy–medium |
| 4 | Medium |
| 5 | Medium |
| 6 | Medium |
| 7 | Medium–hard |
| 8 | Hard |
| 9 | Hard |
| 10 | Challenging finale |

This is a tuning proposal, not a requirement that every level be harder than the previous one. Include breathing-room sections.

### 13.1 Suspense rhythm

Prefer a rhythm of:

**Safety → Suspicion → Threat → Survival → Relief**

Do not maintain maximum tension continuously. Exploration and discovery are the primary activities; survival encounters are used deliberately.

### 13.2 Respectful engagement

Do not use:

- Artificial daily login streaks.
- Forced waiting timers.
- Repetitive grind.
- Punitive failure loops.
- Manipulative monetization or engagement mechanics.

A first-playthrough duration of roughly 2.5–4 hours has been discussed as an initial target, but is **not a locked requirement**. Validate with real playtesting. Longer playtime alone is not a measure of quality.

### 13.3 Playtest signals

Measure and interpret:

- Level completion and abandonment.
- Time spent stuck at each dependency or puzzle.
- Encounter failure counts.
- Hint usage.
- Optional exploration.
- Whether players continue to the next level.
- Whether players choose to return.

Use these signals to improve clarity and enjoyment, not to pressure players into longer sessions.

---

## 14. Team reunions and companion gameplay

The missing teammates are a central curiosity hook. Each reunion should provide more than a character appearing in a room: it should change the player's understanding, available interactions, or emotional connection.

### 14.1 Working reunion progression

The following is a **Proposal** requiring final approval:

- Level 3: reunite the first missing detective.
- Level 4: reunite the second missing detective.
- Level 5: use the first two companions' help to reach and rescue the third missing detective.
- By the end of Level 5, all four detectives are together.

The player is always one of the four. Do not describe the player's own selected character as a missing teammate.

### 14.2 Companion call concept

Optional companion calls at selected safe locations have been discussed. Costs, availability, and exact behavior remain **Open**. Story-required teammate participation and reunions must never depend on optional currency.

Keep the AI simple, predictable, and mobile-friendly. Companions should help with a defined task rather than becoming a complex squad simulation.

---

## 15. Audio, visual, and presentation direction

Follow the [13+ Creative and Product Design Standard](./13-plus-creative-product-design-standard.md).

Summary:

- Cinematic atmospheric stylized realism.
- Believable, layered locations with readable landmarks and purposeful environmental storytelling.
- Controlled lighting, fog, shadow, and warm/cool contrast.
- Young protagonists with agency and believable reactions.
- Mystery, uncertainty, secrets, supernatural unease, and emotional stakes.
- Restrained environmental audio and meaningful interaction cues.
- Important clues and mechanics must remain understandable without audio and must not rely on color alone.
- Avoid toy-like, preschool, or mascot-like presentation.
- Avoid graphic violence and gore; use atmosphere and implication.

---

## 16. Mobile-first and YouTube Playables constraints

This game is being developed for YouTube Playables. Technical implementation and release decisions must be validated against the current official platform requirements; this Bible is not proof of certification.

Design and implementation must account for:

- Touch-first controls and responsive layouts across aspect ratios.
- Mouse support where applicable.
- Readable UI and appropriately sized touch targets.
- Performance and memory budgets appropriate to mobile devices.
- Pause/resume and audio-enabled lifecycle behavior through the platform SDK.
- Progress persistence and safe restoration.
- No reliance on unsupported external navigation or platform behavior.
- Privacy-conscious design and no unnecessary personal data.
- Official Google Playables test suite and physical-device validation before release.

Do not claim certification or physical-device validation until those checks have actually been completed and recorded.

---

## 17. Production and implementation principles

- Prefer data-driven level, item, dependency, interaction, and encounter definitions.
- Keep narrative content separate from low-level engine behavior where practical.
- Build reusable systems for interaction prompts, inventory, evidence, dependency evaluation, checkpoints, encounter reset, companion tasks, and physical transitions.
- Keep each level compact and load only the active area plus what is needed for a transition.
- Make all progress-preservation rules explicit and testable.
- Provide deterministic state transitions for puzzle and encounter logic.
- Add automated tests for dependency graphs, save/restore, checkpoint resets, and transitions.
- Validate camera and character visibility on representative mobile aspect ratios and device performance tiers.
- Do not expand content at the expense of the Playables SDK integration, stability, and certification gate.

---

## 18. Open decisions register

These topics are intentionally not finalized. They require design work and/or explicit creator approval.

| Topic | Current status | Guardrail |
|---|---|---|
| Detailed story and room-by-room content for Levels 1–10 | Open / Proposal | Preserve approved opening and core rules; do not invent unresolved lore |
| Exact reunion levels and rescue scenarios | Proposal | Proposed L3/L4/L5 sequence is not locked |
| Specialist abilities for the four detectives | Open | Check canonical personalities and obtain approval |
| Companion-call currency and costs | Open | Never gate required story progress |
| Exact inventory UI and journal presentation | Open | Preserve item/evidence/clue distinctions |
| Exact enemy AI and encounter mechanics | Open | Do not invent entity powers or weaknesses |
| Identity and history of the forgotten person | Open | Must remain unresolved until approved |
| Other eleven of the Twelve Mechanisms | Open | Only Clock Tower's membership is established |
| Exact ending and sequel hook | Open | Do not prematurely establish hidden canon |
| Level-specific evidence counts and dependency graphs | Open | Design and test each level individually |
| Target playtime and final difficulty tuning | Open | Validate through playtests |

---

## 19. Approval checklist for new design

Before a design decision or feature is marked approved, confirm:

- [ ] It supports the approved general 13+ audience and product positioning.
- [ ] It preserves protagonist, supporting-cast, pet, and entity canon.
- [ ] It strengthens exploration, curiosity, investigation, teamwork, or meaningful suspense.
- [ ] Its mandatory objectives and dependencies are clue-supported and fair.
- [ ] Its interactions are understandable and usable on mobile touch screens.
- [ ] It preserves the third-person player-visible camera rule.
- [ ] Its room and level transitions preserve physical continuity.
- [ ] Its failure and checkpoint behavior preserves completed progress.
- [ ] It fits performance, memory, accessibility, privacy, and Playables requirements.
- [ ] The creator has explicitly approved any new canon or major design commitment.

---

## 20. Revision history

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-11-10 | Initial living Game Design Bible. Consolidates approved core vision, third-person rule, Four Gates opening, dependency-based gameplay, evidence distinctions, contextual interactions, encounter checkpoints and hints, difficulty principles, 13+ direction, and physical room/level transition rule. Clearly marks campaign details and unresolved lore as proposals/open. |
| 0.2.0 | 2026-11-10 | Temporary age-14 update, superseded by creator decision in v0.2.1. |
| 0.2.1 | 2026-11-10 | Creator reverted the protagonists' ages to 12. Age 12 is current canon; the game's general-audience 13+ positioning remains unchanged. |
| 0.2.2 | 2026-11-10 | Creator approved a player-facing confidentiality rule: never disclose the protagonists' exact ages anywhere in the game. Age 12 remains internal canon only. |

---

**Maintainer's rule:** Update this Bible whenever the creator approves a meaningful game-design decision. Keep it accurate, concise enough to use, and explicit about what is approved versus what remains a proposal.
