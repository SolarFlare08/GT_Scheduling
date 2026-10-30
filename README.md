# Georgia Tech Resilient Scheduler

Private local development application. Requires Node.js 24 or later; no third-party runtime dependencies.

Run `node server.mjs` and open http://127.0.0.1:3000. On Windows, `.start.ps1` detects Node and launches the server in a separate window, then opens the app. Keep the Node window open. If the browser reports a timeout, run `.start.ps1` again. Run checks with `node --test`. The server binds only to loopback. No deployment or registration automation is configured. First import requires internet access; subsequent requests use ignored local JSON caches in `data/`. Refresh is limited to once per minute per term, concurrent requests are coalesced, and failures fall back to cached data with an error message.

## Implemented

Real crawler-v2 course imports, semester search, required/preferred/optional/backup labels, section locks and exclusions, credit bounds, earliest/latest classes, unavailable time blocks, date-aware meeting conflicts, five ranked alternatives, section failure simulation, multi-failure recovery, local saved plans, portable JSON configurations, weekly calendar, and recurring ICS exports. Instructors, rooms, campuses, descriptions and raw prerequisite trees come from the feed. No course data is fabricated.

The exact enumerator uses lexicographic priorities: required courses omitted, original sections changed, preferred courses included, then weekly gaps. Locked sections cannot be removed, even in a failure scenario. It reports whether the 500,000-node search limit prevented proof of optimality. This is a small-instance suitable constraint solver, not CP-SAT. At most ten selected courses are accepted. Required omissions are reported rather than silently declared satisfied.

## Remaining requirements

Update: results now have 50-item pages through the first 5,000 ranked schedules, with explored combination counts and search-limit disclosure. Walking estimates use crawler coordinates, straight-line distance multiplied by 1.3, and 80 meters/minute. Ranking penalizes the summed shortfall below twice walking time before minimizing gaps. Missing locations remain unknown. These are estimates, not pedestrian routes, and do not include accessibility or indoor travel. Travel is evaluated between consecutive displayed meetings; complex partially overlapping term calendars need further handling.

Course comparison can load Course Critique historical GPA rows through its verified production endpoint. The view shows instructor identity, term, GPA and size group separately; it does not compute a student-weighted GPA or automatically associate names with current instructors. Cached rows expire after 24 hours, with stale fallback on upstream error. RMP lookup links are available; automated rating/difficulty retrieval remains unavailable pending a permitted data source. Restart the Node server and refresh the browser after changes.

This is an initial functional implementation, not the completed six-phase product. Backup labels currently behave as optional courses; substitution groups, enforced prerequisites/grades, restriction eligibility, verified linked lecture/lab combinations, full professor quality objectives, preferred credit targets, weekday preferences, time-change penalties, resilience scoring across every section failure, monitoring and notifications are not implemented. Zero-credit components and unknown-time sections are excluded; do not use its schedules as proof of registration eligibility. Linked courses require manual verification. Professor metrics and enrollment counts remain explicitly unavailable. No tests claim coverage of unimplemented linked registration or substitution behavior.

Next.js/React, Tailwind, FastAPI, OR-Tools, SQLite/PostgreSQL and private hosted authentication remain future architecture work. This dependency-free Node implementation delivers the available end-to-end path on the installed runtime. Before hosting, add authentication and replace local-only assumptions, validate all request shapes with a schema library, and move CPU-heavy optimization to a bounded worker/CP-SAT service.

See [source investigation](docs/SOURCES.md) and [architecture](docs/ARCHITECTURE.md).
