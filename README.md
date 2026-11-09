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

## Betting Practice Lab

Open an arena’s **Betting Practice Lab** to learn with a separate 1,000-credit
practice balance. No real money, deposits, prizes or conversion to city stars.
Matchups and prices are fixed examples; scores are simulated, not live data.

The mobile-friendly Practice screen walks through matchup, market and bet slip.
Moneyline, spread, totals and player props explain what needs to happen. The
slip separates stake, net profit, total return, full loss risk and price-implied
probability. Select one pick per game; two games make a parlay, while independent
singles can be placed separately. Stakes remain entered when switching screens.

**Learn basics** includes a guided example (no automatic spending), odds and
settlement lessons, real-app rule differences and short knowledge checks.
**Tickets** shows pending stakes, simulated scores and numerical explanations of
wins, losses and pushes. Existing simulator balances and tickets are retained.
Resetting practice data does not affect city progress. Practice results are not
betting advice or evidence of real-money profitability.

## Home computer, investing and the SE library

The **Personal Computer** in The Crib / apartment menu opens an **Investing
Practice Lab**, separate from city stars and betting credits. The new **SE Public
Library** also has public computers accessing that same saved portfolio. Both
locations include a Back to computer route; neither requires a purchase.

Start with 10,000 practice dollars. Explore two fictional stocks, a broad-market
ETF, a balanced mutual fund, a fixed-coupon bond and fully paid calls/puts.
Review each order's cost, quantity and risks before placing it. Stocks, ETFs,
bonds and options fill at displayed synthetic quotes. Mutual fund orders wait for
the next closing NAV and explicitly reject buys if cash is then insufficient;
they reserve no cash and can be canceled before filling. Units are whole numbers.
No short selling, margin or uncovered options are available.

Advance one simulated day manually to move prices and process orders. The model
includes fund expenses accrued inside NAV, quarterly cash distributions with
matching price reductions, a 360-day bond with semiannual coupons and principal
repayment, and 30-day options with a 100-share contract multiplier. Options
cash-settle intrinsic value at expiry; fresh contracts then become available.
This intentionally differs from physical exercise in many real equity options.
The portfolio shows cash, marked holdings, cost basis, realized/unrealized results,
income, weights and the latest 60 daily closing snapshots. Lessons and quizzes
explain diversification, compounding, expenses, rates, option risk and real-app
differences. Synthetic prices, option time value and market news are teaching
examples, not live data or valuation advice. Taxes, inflation, trading spreads,
liquidity and issuer default are not modeled.

The library's **Short Reads** offers six original standalone fiction stories,
each 400–800 words (roughly 2–4 minutes at 200 words/minute). Three are featured
each week; the shelf moves forward every Monday at 00:00 UTC and repeats after
six weeks. All six remain browsable. This rotates a bundled catalog rather than
claiming to generate new writing automatically. Reading and practice trading
never award stars. Old saves initialize the investing lab without altering
existing balances, purchases or minigame clears.

## Local development

Serve this directory with `python3 -m http.server 8766 --bind 127.0.0.1`.
Run regressions with `node --test *.test.js`.
