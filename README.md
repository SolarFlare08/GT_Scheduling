# Georgia Tech Resilient Scheduler

Private local development application. Requires Node.js 24 or later; no third-party runtime dependencies.

Run `node server.mjs` and open http://127.0.0.1:3000. Run checks with `node --test`. The server binds only to loopback. No deployment or registration automation is configured. First import requires internet access; subsequent requests use ignored local JSON caches in `data/`. Refresh is limited to once per minute per term, concurrent requests are coalesced, and failures fall back to cached data with an error message.

## Implemented

Real crawler-v2 course imports, semester search, required/preferred/optional/backup labels, section locks and exclusions, credit bounds, earliest/latest classes, unavailable time blocks, date-aware meeting conflicts, five ranked alternatives, section failure simulation, multi-failure recovery, local saved plans, portable JSON configurations, weekly calendar, and recurring ICS exports. Instructors, rooms, campuses, descriptions and raw prerequisite trees come from the feed. No course data is fabricated.

The exact enumerator uses lexicographic priorities: required courses omitted, original sections changed, preferred courses included, then weekly gaps. Locked sections cannot be removed, even in a failure scenario. It retains five best solutions and reports whether the 250,000-node search limit prevented proof of optimality. This is a small-instance suitable constraint solver, not CP-SAT. At most ten selected courses are accepted. Required omissions are reported rather than silently declared satisfied.

## Remaining requirements

This is an initial functional implementation, not the completed six-phase product. Backup labels currently behave as optional courses; substitution groups, enforced prerequisites/grades, restriction eligibility, verified linked lecture/lab combinations, full professor quality objectives, preferred credit targets, weekday preferences, time-change penalties, resilience scoring across every section failure, monitoring and notifications are not implemented. Zero-credit components and unknown-time sections are excluded; do not use its schedules as proof of registration eligibility. Linked courses require manual verification. Professor metrics and enrollment counts remain explicitly unavailable. No tests claim coverage of unimplemented linked registration or substitution behavior.

Next.js/React, Tailwind, FastAPI, OR-Tools, SQLite/PostgreSQL and private hosted authentication remain future architecture work. This dependency-free Node implementation delivers the available end-to-end path on the installed runtime. Before hosting, add authentication and replace local-only assumptions, validate all request shapes with a schema library, and move CPU-heavy optimization to a bounded worker/CP-SAT service.

See [source investigation](docs/SOURCES.md) and [architecture](docs/ARCHITECTURE.md).
