# Source investigation

Live requests performed October 29, 2026 (America/New_York). Public accessibility does not establish an unrestricted data license or service guarantee. No upstream source code was copied.

| Source | Observed result | Integration decision |
|---|---|---|
| https://github.com/gt-scheduler/website | Repository available; documents historical crawler and Course Critique URLs | Reference for discovery only |
| https://github.com/gt-scheduler/crawler | Repository available, AGPL-3.0 | No code reused |
| https://gt-scheduler.github.io/crawler/index.json | HTTP 200; stops at 202308 | Rejected as current source |
| https://gt-scheduler.github.io/crawler/202308.json | HTTP 200, empty courses, March 2023 timestamp | Demonstrates why HTTP success alone is insufficient |
| https://github.com/gt-scheduler/crawler-v2 | Repository available, AGPL-3.0; inspected src/types.ts | Independently implemented tuple decoder; recheck data redistribution terms before hosting |
| https://gt-scheduler.github.io/crawler-v2/index.json | HTTP 200; terms through 202702 | Active term discovery |
| https://gt-scheduler.github.io/crawler-v2/202702.json | HTTP 200; nonempty v3 tuples; source updated 2026-10-30T00:05:02.943Z | Cached primary course feed; timestamp is source-reported, not proof of accuracy |
| https://oscar.gatech.edu/ | Public landing page HTTP 200 | Official manual verification link; no authenticated access or seat API integrated |
| https://catalog.gatech.edu/coursesaz/ | HTTP 200 public course catalog | Manual reference; descriptions and prerequisites currently imported from crawler |
| https://github.com/kmehan/gt-course-critique | Official historical repository README available; PHP/database/Elasticsearch architecture | Does not establish a working current API |
| https://c4citk6s9k.execute-api.us-east-1.amazonaws.com/test/data/course?courseID=CS1331 | HTTP 500 | Historical candidate probe failed; no GPA integration, no conclusion that every endpoint is unavailable |
| https://www.ratemyprofessors.com/terms-of-use | Terms restrict automated access without prior permission | No scraping or unofficial API integration; metrics unavailable |

The public crawler tuple schema contains CRN, meetings, credits, schedule type, campus, attributes and restrictions. It does not expose enrollment counts, waitlist counts, or authoritative linked section combinations. These values remain null/unknown. Restriction tuples are retained, but eligibility is not evaluated. Automated monitoring is deferred until a permitted availability feed is established. Source code licensing and published-data reuse permissions need separate review before redistribution. The application only downloads public published snapshots to a private local cache.

Follow-up: the current public Course Critique app loads `https://c4citk6s9k.execute-api.us-east-1.amazonaws.com/prod/data`. A live request to `/course?courseID=CS%201331` returned HTTP 200 and historical instructor/term GPA records. The former `/test/data` failure does not apply to this production endpoint. The official repository https://github.com/GT-SGA/Course-Critique documents course/professor parameters, while masking the host. The app now supports course-level on-demand requests, a 24-hour cache, concurrent request coalescing, source URL and retrieval timestamps, and stale fallback. Upstream does not provide a source update timestamp in the verified response. No RMP scraping is implemented; its terms still require prior permission for automated access.
