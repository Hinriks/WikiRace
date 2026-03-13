# WikiRace — Feature Ideas & Roadmap

A running list of potential features and improvements. Add your own ideas here.

---

## Quick wins (low effort, high value)

- **Streak counter** — track how many days in a row the player has completed the puzzle. Show it on the home and results screens. Stored in localStorage. Proven retention mechanic.
- **Personal stats** — show the player their all-time history: games played, average clicks, best time, win rate. Stored in localStorage.
- **Keyboard shortcut** — press `Backspace` to go back (instead of clicking the button)
- **Prefetch start article** — load the start article in the background while the home screen is showing, so the game feels instant on Start
- **Animated click counter** — subtle bump animation on the click count each time it increments

---

## Medium effort

- **Custom challenge links** — generate a URL like `wikirace.io/?from=Pizza&to=Samurai` so players can challenge friends to beat their score on a custom puzzle
- **Hard mode** — toggle that disables the back button, or adds a click limit / time limit
- **Hints system** — reveal one step in a known solution path at the cost of +3 click penalty
- **Puzzle archive** — browse and replay past daily puzzles (after they've passed)
- **"How close were you?"** — on give up, reveal the shortest known path (sourced manually or via BFS)

---

## Bigger features (if there's traction)

- **Head-to-head multiplayer** — two players race the same puzzle in real time. Use Supabase Realtime for live click counts.
- **Weekly leaderboard** — show top results for the week (optional, careful not to add friction for casual players)
- **Community puzzles** — let players suggest start/end article pairs via a form, you approve them in Supabase
- **Puzzle difficulty rating** — label puzzles Easy / Medium / Hard based on known path lengths
- **Mobile app** — wrap in Capacitor or React Native for App Store / Play Store distribution

---

## Monetisation ideas

- **Ko-fi / Buy Me a Coffee** — "Support WikiRace" link in the footer
- **Carbon Ads or EthicalAds** — minimal, text-only ads on the home or results screen only (never in the game)
- **Sponsored puzzles** — a brand pays for a themed puzzle once a week
- **WikiRace Pro** — paid tier with: unlimited replays, full stats history, custom challenge links, no ads

---

## Design / UX improvements

- Improve mobile article readability (font size, line height tweaks for small screens)
- Add a subtle "pulse" to the target name in the game bar as a reminder
- Show a progress indicator or "you're close!" message based on heuristics
- Dark mode support

---

## Your ideas

<!-- Add your own ideas below -->

