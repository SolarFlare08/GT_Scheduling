# Georgia Tech Resilient Scheduler

Private local development application. Requires Node.js 24 or later. CP-SAT is the default search engine and uses Python with OR-Tools in a project-local `.venv`; the previous dependency-free Node solver remains available under Preferences → Search engine.

For a fresh Windows checkout, run `npm run setup:solver` once (requires an installed Python 3.11/3.12 or the bundled Codex Python). Alternatively run `powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-solver.ps1 -Python "C:\path\to\python.exe"`. On macOS/Linux, create `.venv` with `python3 -m venv .venv`, then install `requirements-solver.txt` using that environment's pip. `GT_SOLVER_PYTHON` can select a different Python containing OR-Tools. Missing CP-SAT installations fall back to Backtracking with an explicit warning.

The standalone Schedule priorities section lets you set priority numbers (smaller wins first) and weights for factors sharing a priority. Save preferences before solving. All-selected-course retention and minimum-change recovery are always protected ahead of these configurable preferences; hard constraints remain mandatory.

Run `node server.mjs` and open http://127.0.0.1:3000. On Windows, `.start.ps1` detects Node and launches the server in a separate window, then opens the app. Keep the Node window open. If the browser reports a timeout, run `.start.ps1` again. Run checks with `node --test`. The server binds only to loopback. No deployment or registration automation is configured. First import requires internet access; subsequent requests use ignored local JSON caches in `data/`. Refresh is limited to once per minute per term, concurrent requests are coalesced, and failures fall back to cached data with an error message.

## Implemented

Real crawler-v2 course imports, semester search, required/preferred/optional/backup labels, section locks and exclusions, credit bounds, earliest/latest classes, unavailable time blocks, date-aware meeting conflicts, paginated ranked alternatives, section failure simulation, multi-failure recovery, local saved plans, portable JSON configurations, weekly calendar, and recurring ICS exports. Instructors, rooms, campuses, descriptions and raw prerequisite trees come from the feed. No course data is fabricated.

CP-SAT models complete lecture/component bundle choices, conflicts, credit limits and schedule preferences, then optimizes priorities in stages. It uses a 15-second search budget and keeps up to 5,000 unique alternatives. A proven best schedule does not mean every displayed alternative is globally optimal; the UI distinguishes these cases and reports unknown total counts. Backtracking retains its 500,000-node / 15-second limits. Locked sections cannot be removed, even in recovery. At most ten selected courses are accepted. Required omissions are reported rather than silently declared satisfied.

## Remaining requirements

Update: results now have 50-item pages through the first 5,000 ranked schedules, with explored combination counts and search-limit disclosure. Walking estimates use crawler coordinates, straight-line distance multiplied by 1.3, and 80 meters/minute. Ranking penalizes the summed shortfall below twice walking time before minimizing gaps. Missing locations remain unknown. These are estimates, not pedestrian routes, and do not include accessibility or indoor travel. Travel is evaluated between consecutive displayed meetings; complex partially overlapping term calendars need further handling.

Course comparison can load Course Critique historical GPA rows through its verified production endpoint. The view shows instructor identity, term, GPA and size group separately; it does not compute a student-weighted GPA or automatically associate names with current instructors. Cached rows expire after 24 hours, with stale fallback on upstream error. RMP lookup links are available; automated rating/difficulty retrieval remains unavailable pending a permitted data source. Restart the Node server and refresh the browser after changes.

This is an initial functional implementation, not the completed six-phase product. Backup labels currently behave as optional courses; substitution groups, enforced prerequisites/grades, restriction eligibility, verified linked lecture/lab combinations, full professor quality objectives, preferred credit targets, weekday preferences, time-change penalties, resilience scoring across every section failure, monitoring and notifications are not implemented. Zero-credit components and unknown-time sections are excluded; do not use its schedules as proof of registration eligibility. Linked courses require manual verification. Professor metrics and enrollment counts remain explicitly unavailable. No tests claim coverage of unimplemented linked registration or substitution behavior.

Next.js/React, Tailwind, FastAPI, SQLite/PostgreSQL and private hosted authentication remain future architecture work. This local Node application now includes a Python OR-Tools backend in a background worker. Before hosting, add authentication, replace local-only assumptions, and validate all request shapes with a schema library.

See [source investigation](docs/SOURCES.md) and [architecture](docs/ARCHITECTURE.md).
