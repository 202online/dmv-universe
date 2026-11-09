# DMV Universe

Browser-based city and arcade game. Touch gestures on mobile and mouse drags on
desktop use the same controls. Progress saves in this browser on this device.

## Sports and lounge levels

Basketball, driving, football, soccer, tennis, golf, boxing, pool, air hockey and
chess have endless numbered levels. Win a level to unlock the next; select a cleared
level to practice. The panel above each game shows its clear goal and reward.
Tennis retains automatic movement, serving and hitting, with optional swipe aiming.

- First clears pay **3, 5, 7, 9 and 12 stars** at levels 1–5, then **12 stars**
  at every later level, once per level per game.
- Cleared levels are **practice only**: replay wins pay **0 stars**.
  There is no daily reward cap or reset to track.
- Losses and chess draws pay **0 stars**. Retrying is free.
- Levels and first clears save alongside existing purchases.
  Saves from before campaigns start at level 1; existing campaign saves keep
  their clears and unlock the next level, including level 6 after five clears.

The first five levels pay 36 stars per game (360 across all ten games). Existing
shirts cost 6–8 stars, scooters/e-bikes 60/180, and the Impala/pickup 720/1440. Replaying easy
levels therefore cannot fund purchases. Other city activities are unchanged.
Existing balances and owned vehicles are preserved; the new prices apply only
to new purchases. Starting from zero, buying the Impala using just one game's
first clears takes 62 wins, and the pickup takes 122 (without other spending).
Across all ten games, clearing their first five levels still leaves 360/1080
stars to earn toward those vehicles. These are win counts, not guaranteed hours.

The level picker shows a small moving window rather than an ever-growing list.
Use Previous to revisit older levels or Latest unlocked to return to progression.
There is no gameplay level cap. Levels after five use diminishing difficulty
growth toward safe playability limits, rather than endlessly increasing raw
speeds, targets or damage. Goals stay achievable: soccer never requires more than
five of six goals, pool keeps at least eight shots, and tennis flight times stay
positive. Later chess levels reduce evaluation errors without unbounded AI search.

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
