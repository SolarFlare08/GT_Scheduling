# Advanced scheduler implementation status

## Campus filtering

Preferences → Campuses is a hard allow-list, defaulting to Atlanta when older saved preferences do not contain a campus setting. Check other campuses explicitly to include them. Selection saves immediately, clears stale schedule alternatives, and triggers optional automatic scheduling. It applies to every lecture, lab and recitation during bundle construction, including recovery. No checked campuses means no eligible sections. Unknown campus is a separate opt-in. The list comes from the loaded catalog and the selection is included in complete-state JSON backups under `preferences.campuses`.

Atlanta aliases `Atlanta` and `Georgia Tech-Atlanta *` normalize to `atlanta`; other names are trimmed, stripped of display asterisks and lowercased for exact matching. Exchange, study-abroad, online and video sections are not implicitly considered Atlanta. This is a campus filter, not a registration-eligibility check; major, program and other restrictions still require verification.

## Search shortcuts and automatic scheduling

Space or Enter adds an exact normalized course code. Enter also adds a sole remaining result. Ambiguous partial searches do not select an arbitrary first result, and modifier/IME composition repeats do not add multiple courses. The query stays in place so Enter again can select a remaining companion. A standalone recitation/lab is linked to an already selected lecture only when its catalog code is the lecture code plus R/L and its schedule type confirms the component. Other companion naming conventions require manual mapping. Linked components appear beneath the selected lecture and are removed from search suggestions; they do not become independent courses. Matching-letter bundle checks remain mandatory.

Automatically find schedules after changes is an opt-in browser setting beside Find schedules. Course changes, locks, section preferences, basic restrictions, saved advanced preferences and activities trigger a 1.2-second debounce. Typing a search query alone does not run the solver. Only one request runs at a time per page; one latest pending request is retained, and results from superseded inputs are discarded. Turning the toggle off clears the pending automatic work; a request already on the server is not cancelled. Advanced preference edits still require Save preferences before they affect optimization. The existing per-search budget remains 500,000 nodes / 15 seconds; automatic mode can consume noticeable CPU on large selections. Manual Find schedules remains available.

## Custom activities

The My activities panel beneath selected courses creates, edits and removes weekly recurring activities for the current semester. Each has a name, notes, selected weekdays, start/end time, color, and required/preferred/disabled priority. Required blocks reject overlapping classes; preferred overlaps are penalized by overlapping hours across the shared weekdays. Disabled activities remain stored but do not block or render. These are fixed personal commitments, not academic course credit or movable activities. Settings persist in `gt-advanced-state.events` and complete-state JSON backups.

Activities appear in the weekly calendar before and after generating schedules. Click an activity to edit it. Calendar hours extend to include activities outside the original 07:00–23:00 display. Saving or removing an activity clears generated alternatives and prompts regeneration. ICS export includes weekly activity occurrences, using the loaded semester meeting date range when available; without a loaded date range it begins this week with no recurrence end date. Personal activities do not create walking transfers, course counts or academic credits. Movable/date-specific events remain future work.

## Workspace navigation

The semester selector sits above course search; results appear only after typing. Selected courses occupy a separate panel with a course count and a shared color palette used by calendar entries. The calendar remains above tabbed tools: Course & instructor details, Preferences, and Data & components. Basic and advanced preference controls share the Preferences panel. The primary Find schedules button remains beside selected courses, and the preference panel also provides Save preferences & find schedules. Browser-local plans and all existing control identifiers are preserved.

Data import is presented as Choose file, Review categories/mode, and Confirm. Import stays a preview until confirmation. Plan-only save/load/import/export controls are grouped separately from complete-state JSON backup. Data source notes are collapsed under Data sources & limitations. Restart the server once after this update to make the new workspace module route available, then refresh the browser.

## Current professor comparison and section preferences

After Course Critique loads, section rows use recent GPA colors: below 3.0 red, 3.0–3.19 yellow, 3.2–3.49 light green, 3.5–3.79 green, 3.8–4.0 dark green. Below 2.5 uses a darker red. Unknown values remain white and each row has a numeric/Unknown label. Co-taught sections use the mean of instructor recent GPAs only when every listed instructor has a known metric. Colors are retained during section preference/lock changes for the current page session; they do not alter optimization scores.

Course Critique now groups historical records by exact normalized full name and GT ID, showing only professors attached to sections of the selected course and semester. Comma-ordered names and the primary-instructor suffix are normalized; ambiguous multiple-ID matches have metrics withheld. Names with different middle initials are not guessed. Missing matches show Unknown. All-time GPA is the unweighted average of non-suppressed section GPAs through the selected semester; recent GPA covers the latest three reported terms. Population standard deviation describes variation among section GPAs. Record/term counts and suppressed-record counts indicate evidence, not exact student sample size. These statistics describe grade outcomes, not professor quality, and do not automatically change rankings.

Prefer/Unprefer on a section sets a soft CRN preference in the saved plan. Multiple preferred sections are allowed. They rank after required-course retention, minimum original CRN changes, and preferred-course inclusion, but before walking shortfalls and other preference costs. They never override hard constraints, matching component rules, locks, or failed sections. Config exports/imports retain `preferredCrns` in each selected course.

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
# Maximize weekends

Preferences includes an optional **Maximize weekends** checkbox, saved with advanced preferences and complete state exports. It rewards the continuous class-free interval between the last class of one Monday–Sunday week and the first class of the next. An earlier Friday finish, no Friday classes, a later Monday start, and no Monday classes all improve this score. Weekend classes shorten the interval. All lecture, lab, and recitation meetings count; personal activities do not change this class-only preference.

Whole free days extending across the Sunday/Monday boundary are ranked before the combined soft preference penalty. Thus a full Friday or Monday off beats a later Monday start plus an earlier Friday finish, when higher priorities tie. The remaining weekly span in hours then combines with other soft preferences. Required course retention, recovery changes, explicitly preferred courses/sections, and walking buffers retain their existing priority. This option does not guarantee free days or override hard restrictions. Save advanced preferences and generate schedules to apply it.


## Honors Program filter

Published section attributes are decoded from the crawler. Honors Program sections are excluded by default, including mandatory bundle components. Enable Include Honors Program sections and save advanced preferences to allow them. The filter uses the explicit Honors Program attribute; an Honors course title alone does not identify program membership. Imported catalogs must preserve section attributes for this filter to recognize them. This does not verify registration eligibility.
`nCourse Critique now loads automatically for selected courses and linked component sources. Solve requests await GPA lookup (cached on the server), then award one bonus per selected course bundle containing a dark green section, using the existing recent GPA and exact instructor matching rules. This bonus shares the whole weekend free day score: one course equals one day. Manual preferences and travel buffers retain precedence. Failed lookups produce warnings and do not block scheduling; unknown or ambiguous GPA earns no bonus.
# Selected schedule summary and manual RMP entries

A summary below the workspace follows the selected schedule option. It lists all selected sections (including linked components), CRNs, course titles, instructor names, historical average/recent GPA, meeting times, rooms, campuses, and credits. GPA is unknown when matching records are unavailable.

Each named instructor has manual Rate My Professors rating and difficulty fields, from 1–5 or blank. Save ratings persists the entry in the advanced state's professors category, shared across schedule options by normalized full name and included in complete JSON backups. These values are informational and do not currently affect optimization. No RMP page is scraped. Matching is by name, so users should verify the linked profile before entering values.

