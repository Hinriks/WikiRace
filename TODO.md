# WikiRace — TODO

A prioritized list of things to build next, based on user feedback and planned features.

---

## High priority (user-requested)

- [ ] **Community stats on result screen** — show average clicks and time for today's puzzle alongside personal stats. Data already exists in the Supabase `results` table, just needs to be queried and displayed. _(Feedback: "I don't know if I was good or bad at it")_
- [ ] **Random challenge generator** — a one-click "Surprise me" button that picks two random articles and instantly generates a `?from=X&to=Y` challenge link, no manual input required. Add to the existing `CreateChallengeModal` as a secondary option — keep it tucked inside the modal, not on the home screen, so it serves power users who've already finished today's puzzle without pulling focus from the daily format. The daily puzzle remains the main game (shared, social, streak-building); the random generator is bonus content for engaged players who want more. _(Feedback: "An option to generate a random pair would be fun!")_
- [ ] **Puzzle archive** — browse and replay past daily puzzles after they've passed. _(Feedback: "A homepage with a list of puzzles and high scores")_

---

## Medium priority

- [ ] **Hard mode** — toggle that disables the back button, or adds a click/time limit
- [ ] **Hints system** — reveal one step in a known solution path at +3 click penalty cost
- [ ] **"How close were you?"** — on give up, reveal the shortest known path
- [ ] **Leaderboard / high scores** — show top results per puzzle (ties into puzzle archive)
- [ ] **Dark mode**

---

## Growth / retention

- [ ] **Twitter follow prompt on results screen** — add a small "Follow @WikiRaceDaily for the daily puzzle" line on the results screen, linking to the Twitter account. Turns players into followers, which compounds over time as the account grows.

---

## UX improvements

- [ ] **Make "Create custom challenge" more discoverable** — surface it on the home screen, not just the results screen. Some users don't realise it exists.
- [ ] **Mobile article readability** — font size and line height tweaks for small screens
- [ ] **"You're close!" heuristic** — some kind of progress indicator during gameplay
- [ ] **Pulse animation on target name** — subtle reminder of the target while navigating

---

## Marketing / growth

- [ ] Run Supabase SQL migration for `share_events` table and `source` column
- [ ] Submit Show HN (Tuesday or Wednesday, 9am ET)
- [x] Post to r/wikipedia and r/wordle (1–2 days after r/internetisbeautiful)
- [ ] Finalise and schedule Product Hunt launch
- [ ] Record TikTok/Reel gameplay clip
- [ ] Email 5 puzzle/trivia newsletters
