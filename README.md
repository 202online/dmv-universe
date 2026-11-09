# DMV Universe

Browser-based city and arcade game. Touch gestures on mobile and mouse drags on
desktop use the same controls. Progress saves in this browser on this device.

## Sports and lounge levels

Basketball, driving, football, soccer, tennis, golf, boxing, pool, air hockey and
chess each have five levels. Win a level to unlock the next; select a cleared
level to practice. The panel above each game shows its clear goal and reward.
Tennis retains automatic movement, serving and hitting, with optional swipe aiming.

- First clears pay **3, 5, 7, 9 and 12 stars**, once per level per game.
- Replay wins pay **1 star**, capped at **3 replay stars per UTC day across all
  ten games**, not per game. First-clear rewards do not use that allowance.
- Losses and chess draws pay **0 stars**. Retrying is free.
- Levels, first clears and replay allowance save alongside existing purchases.
  Older saves keep their balance and purchases and start each campaign at level 1.

Each campaign has 36 first-clear stars (360 across all ten games). Existing
shirts cost 6–8 stars, scooters/e-bikes 15–30, and cars 60–90. Replaying easy
levels therefore cannot quickly fund a car. Other city activities are unchanged.

Higher levels increase basketball targets and hoop movement; football defenders;
soccer goals, wall size and keeper reactions; tennis and air hockey opponent
pressure; driving speed and boss strength; boxing stamina and punch speed; and
chess accuracy/lookahead. Pool has fewer shots; golf requires fewer strokes,
softer cup entry and faster windmill timing.

This is a local, client-side economy, not a tamper-proof online wallet. Clearing
browser storage resets progress; editing saves or the device clock cannot be
securely prevented without server-side accounts and reward validation.

## Local development

Serve this directory with `python3 -m http.server 8766 --bind 127.0.0.1`.
Run regressions with `node --test *.test.js`.
