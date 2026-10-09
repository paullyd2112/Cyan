# Rule Drift

A small puzzle game whose rules change every time you win. Reach the exit. Then one rule (movement, red tiles, controls, or the goal) swaps to a different value and the next level plays by it.

Fairness comes from a breadth-first solver in `core.js`. Every generated level is solved under the exact current rules before you see it, and rejected if it is unsolvable, trivial or too long. `core.test.js` checks all 36 rule combinations.

```sh
cd game && npm test          # 7 tests
node build.mjs               # writes standalone.html (single file, works from file://)
```
Open `standalone.html` to play, or serve `index.html` over HTTP.
