# Advanced scheduler implementation status

This update implements the mandatory component foundation and part of the JSON and preference phases. It does **not** complete the full advanced specification.

## Component bundles

Use **Edit selected course components** in Data management & components. Confirm the lecture and any required lab/recitation, specifying companion course codes when they are separate catalog entries. Remove companion courses from the independent selected-course list. Settings are stored in the existing saved-plan format; existing selections, locks and exclusions are preserved.

Section group is the uppercase alphabetic prefix before digits: A, A01 and A02 share A; AB and AB01 share AB. Explicit `groupLetter` must agree with that prefix. Every required component must share the lecture group. If present, `linkedCrns` is an additional allow-list restricting companions. A bundle contains exactly one of each declared required component, checks internal meeting conflicts, honors component exclusions and availability, and has the sum of component credits. Zero-credit labs and recitations are retained. Unknown meeting times remain excluded.

Missing declarations for a course with nonlecture sections or corequisites produce a course-specific error. An apparent lecture-only course defaults to lecture only; the feed cannot prove that no separately listed requirement exists. Users must confirm institutional requirements. Corequisites can include unrelated courses, so confirmation is deliberately required rather than guessing.

Recovery removes failed component CRNs, rebuilds complete bundles, and may change lecture groups and other courses. Original CRNs lost are counted individually. The existing single-CRN lock works within a bundle; imported `locks` can lock multiple CRNs and `lockCourse` locks inclusion. Failed exact locks make recovery infeasible. Required courses remain a highest-priority retention objective, with omissions reported. Walking-time estimation remains the existing soft double-buffer preference, not a new hard exclusion.

## JSON v1.0

Use Import JSON file, inspect the preview, choose Merge or Replace and checked categories, then Confirm import. Full export includes the loaded catalog, current plan, advanced settings and the currently loaded result page. Legacy Import configuration and Export configuration remain available. Local keys are `gt-plan` and `gt-advanced-state`.

Supported catalog format uses existing normalized fields: `id`, `title`, `sections`; section `code`, string `crn`, numeric `credits`, `component` (lecture/lab/recitation), `meetings`; meeting `days` (MTWRFSU), numeric `start`/`end` in minutes after midnight, optional ISO `from`/`to`, `room`, `instructors`, and `location: {lat,long}`. Optional course `requiredComponents`, `componentSources`, `corequisites`; optional section `groupLetter`, `linkedCrns`, `status`. Unknown-time records can be retained with `unknownTime: true` but are excluded from scheduling. Catalogs can have A lectures and B labs stored separately; the engine must never combine them.

Duplicate course IDs and CRNs, invalid component/time/credit fields, conflicting group identifiers and out-of-range rating values are rejected. Merge is by record `id`, `name` or `course`; incoming catalog courses replace the complete record with the same ID. Imports validate a new copy before committing storage. Imported catalogs are sent to the backend and validated there as well. Catalogs with a `semester` are used only for that term. JSON imports of preferences use `preferences.plan` for the existing course-selection configuration.

Categories for professors, course ratings, events, profiles, registration, history and degree plans can be preserved in the state envelope, but do **not** imply functioning modules for all those categories. Only `registration.availability[crn].status` (full/closed/unavailable/waitlisted/open/unknown) currently affects availability, and advanced `preferences.events` supports fixed weekly event constraints in the engine. These are not comprehensive validation schemas for the later phases. Do not rely on this as a complete round-trip implementation of all requested modules. Import preview counts records but does not yet classify individual conflicts/updates, and full restore is not transactional across browser UI and localStorage failures.

## Scheduling preferences

The advanced panel provides daily minimum/maximum counts, earliest start/latest end with disabled/preferred/required modes, active-day versus all-day minimums, class-component versus unique-course counts, instruction-hours versus class-count distribution, a balanced/packed slider, distribution importance, lunch windows and gap penalty bands. Save advanced preferences, then generate schedules. Existing global earliest/latest controls remain hard constraints. Daily preferred settings do not override those global bounds; widen global bounds if needed.

Balanced minimizes weekday variance; packed minimizes active weekdays; slider interpolates these costs. Preferred count violations use their magnitude; time/lunch violations use hours. Required settings reject a candidate. Walking penalties precede advanced preference costs in the existing lexicographic objective. No general priority-tier editor is implemented. Weekday distribution is Monday–Friday; daily rules can include weekends. Date-specific semester calendar segmentation is not yet handled in distribution/lunch calculations.

## Validation and unfinished phases

18 automated tests cover bundle inclusion, group mismatches, all-three components, missing/conflicting components, full components, lecture changes requiring other-course changes, locks, official allow-lists, manual companion mapping, walking regression, JSON round-trip/merge/replace/selective import, invalid import rollback at the model layer, daily hard/soft rules, lunch and fixed event constraints. Syntax checks pass. Browser interaction workflows have not yet been verified.

Still required: complete versioned JSON Schema and legacy migrations, granular import conflict preview and full transactional restoration; movable/date-specific events, event editor and ICS integration; manual professor/course editors and objective scoring; workload balancing; configurable weighted/lexicographic/hybrid priorities; substitution groups; full registration workflow; per-component resilience/sensitivity scoring; comparison, profiles and revision history; degree planning. The bounded backtracking search now precomputes valid bundles, orders courses by fewest options and uses sorted result insertion, but remains an enumerative solver rather than CP-SAT. It reports unknown versus infeasible correctly when capped. Search limits remain 500,000 nodes / 15 seconds / 5,000 retained ranked schedules.

No finals/exam conflict detection, automatic registration, GT credential collection, or hosted deployment was added.
