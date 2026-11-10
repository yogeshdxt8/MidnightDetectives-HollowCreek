# YouTube Playables Stealth-Escape Gameplay Specification

**Status:** Approved gameplay direction; detailed tuning remains subject to playtesting.
**Product:** Midnight Detectives: Hollow Creek
**Target:** YouTube Playables, mobile-first, third-person 3D

## 1. Core player promise

Enter a dangerous supernatural location, locate the key required to escape, read the entity's behaviour, choose a safe moment or create a distraction, collect the key, unlock the exit, and get out.

The mandatory key-and-exit objective is central to the stealth-escape loop. It is not an optional collectible and must never be replaced by a generic survive-for-time objective.

## 2. Core encounter loop

1. **Orient:** The player immediately sees the exit or receives a clear environmental indication of its location. The exit visibly requires a key.
2. **Locate:** The player identifies the key's location through environmental composition, a short objective cue, or a readable clue.
3. **Observe:** The player reads the entity's patrol, facing direction, attention state, and proximity using animation, posture, sound, and restrained UI.
4. **Choose:** The player can wait for a naturally safe opening, or actively create an opening with an environmental distraction.
5. **Move:** The player navigates to the key using simple touch controls and readable cover.
6. **Collect:** A clear interaction confirms the key has been collected. The objective updates immediately.
7. **Return and unlock:** The player reaches the exit and performs a clear, reliable unlock interaction.
8. **Escape:** A brief, satisfying escape beat completes the challenge and leads into the next encounter.

The first prototype should contain one mandatory key, one entity, one compact location, one exit, one hiding/cover interaction, and at least one deliberate distraction opportunity.

## 3. Two valid key-acquisition strategies

### A. Patient observation

- The player watches the entity's patrol and waits for it to move away, turn its back, or investigate another point of interest.
- The safe window must be legible and long enough for a reasonable touch-control movement.
- Waiting is an active strategic choice, not an idle timer or forced delay.
- The player must be able to make progress by observing and timing movement without having to discover a hidden trick.

### B. Player-created distraction

- The player uses a clearly indicated environmental object or action to attract the entity's attention.
- The distraction has predictable feedback: the object makes a sound or other readable signal, and the entity visibly reacts and moves to investigate.
- The distraction creates a temporary opportunity; it must not permanently disable the threat.
- The player chooses when and where to trigger it, creating meaningful risk/reward.
- The first prototype should teach one distraction verb only. Avoid a complex inventory of throwable objects or multi-step crafting.

Both approaches must be viable. Neither should be mandatory if the other is the intended solution for that encounter.

## 4. Entity behaviour and fairness

The entity should expose a small, understandable set of states:

- **Patrolling:** Following a readable route or searching a defined area.
- **Investigating:** Moving toward a sound or distraction.
- **Suspicious:** Reacting to a nearby disturbance or partial sighting.
- **Searching:** Checking the last known player position after losing sight.
- **Chasing:** Pursuing the player after confirmed detection.

Transitions must be telegraphed through animation, movement, sound, and consistent feedback. Do not make the entity teleport, instantly detect through solid cover, change patrol rules without cues, or catch the player with no reasonable response window.

Detection should be based on understandable line-of-sight and proximity rules. Cover must visibly block the entity's view where the game communicates that it should. A chase should offer a readable escape response, such as reaching cover or breaking line of sight.

## 5. Touch-first controls

- Keep movement on a familiar, responsive virtual joystick or equivalent one-thumb control.
- Keep interaction to one prominent contextual action button.
- The contextual action changes predictably: collect key, trigger distraction, unlock exit, or enter hiding spot.
- Do not require precise multi-finger gestures, small targets, or long button combinations.
- Keep the detective visible in third-person play.
- Support mouse/keyboard input without making it the primary design assumption.

## 6. Objective and UI clarity

The player should always be able to answer:
- What am I trying to do?
- Where is the key or how do I locate it?
- Where is the exit?
- What is the entity doing?
- Am I hidden, suspected, detected, or being chased?
- What action can I perform now?

Use a compact objective line, contextual interaction prompt, and restrained threat feedback. Avoid a large journal, evidence board, multi-screen inventory, or lengthy dialogue during an escape encounter.

The key and exit must be visually distinguishable. Use shape, iconography, text, animation, and sound together; never rely on colour alone.

## 7. Hint system — mandatory quality requirement

Hints must be contextual, actionable, and progressively clearer. They should help the player understand the next useful action without immediately solving every challenge.

### Always-on guidance
- At encounter start, state the objective plainly: **Find the key and unlock the exit.**
- If the key is not immediately visible, give a short, specific directional or landmark clue.
- When the player approaches a relevant hiding place, distraction object, key, or exit, show the appropriate contextual interaction.
- When the entity changes state, provide a readable cue through its behaviour and, where useful, a concise UI label or sound cue.

### Progressive hints
1. **Soft hint:** After a meaningful period without progress, point attention toward the relevant landmark, cover, patrol pattern, or distraction opportunity.
2. **Action hint:** If the player remains stuck or repeats an unsuccessful approach, state a concrete next action, such as waiting until the entity investigates the noise or using the nearby object to draw it away.
3. **Explicit hint:** After repeated failures or continued inability to progress, explain the key route and the safest available opportunity in plain language.

Hints should respond to the player's actual state. Do not tell the player to use a distraction if no usable distraction is available, or to wait if the entity is not going to create a safe opening. Never give contradictory instructions.

Hints must not appear so aggressively that they interrupt skilled play. They must be available without requiring the player to discover a hidden menu. Repeated failure must make the next attempt clearer, not more punishing.

## 8. Failure, retry, and progress

- Failure restarts the current encounter quickly.
- Preserve campaign progress and any previously completed stages.
- Reset only the current encounter's temporary entity, distraction, and key state, unless the encounter design explicitly says otherwise.
- Do not make the player repeat a long cinematic or solved content after failure.
- Provide a short retry transition and immediately restore control.
- Track failure points and hint usage to identify unfair patrol timing, unclear key placement, or confusing feedback.

## 9. Replayability

Replayability should come from mastering timing, discovering alternate safe windows, choosing whether to wait or distract, improving completion time, and collecting optional story details.

Do not make the mandatory key randomly move between attempts in the initial prototype. Keep the core route learnable and fair. Later stages may introduce authored variations, additional distraction choices, or different patrol patterns after the basic loop is proven fun.

Optional rewards must not be required to unlock the exit. Avoid daily streaks, forced waits, punitive grind, or manipulative engagement systems.

## 10. First vertical-slice acceptance criteria

The first Abandoned Residence prototype is acceptable only when:

- The player understands the key-and-exit objective within the opening moments.
- The key's location is discoverable without random searching.
- The exit clearly communicates that it is locked and requires the key.
- The entity's patrol and attention states are readable.
- The player can succeed by waiting for a safe opportunity.
- The player can also succeed by using the authored distraction opportunity.
- Cover and line-of-sight behave consistently.
- The key pickup and exit unlock provide immediate, unmistakable feedback.
- Hints escalate from subtle guidance to explicit actionable help.
- Failure and retry are quick and do not erase completed campaign progress.
- The encounter is short enough to replay and offers room for mastery.
- Touch targets, camera framing, readability, performance, pause/resume, and save behaviour are validated on representative mobile devices and against current Playables requirements.

## 11. Scope boundaries

This specification does not authorize changing established character or entity canon, inventing supernatural origins or weaknesses, deleting existing project systems, or discarding the autonomous sedan opening.

The autonomous sedan arrival remains the cinematic opening spectacle. The stealth-escape loop begins after the opening sequence and must not turn the driving system into the main repeated gameplay activity.

The first prototype is deliberately narrow. Do not expand into a large connected world, complex squad AI, broad inventory crafting, or elaborate evidence/deduction interfaces before this loop has passed fun and usability testing.
