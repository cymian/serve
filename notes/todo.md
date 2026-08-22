# serve -- todo

The only notes file this project keeps: pending work, rewritten in place. No
someday, shipped, roadmap, or dev log -- the library is small enough that the
commit messages carry the reasoning and the git history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **name the guard's fetch-site check for what it checks** -- under Code health
- **drop one of getLanAddresses' two exports** -- under Code health
- **publish 0.1.0 to jsr**, and the two steps that only work afterward -- under
  Release
- **repoint the sibling-path consumers** -- under Release
- **the rest of Code health** -- internal, so any time
- @aitodo:
  - should we specify default names after @module tags
  - deno convention pass -- camel case file anems and functoins and variables?
    - anything else?

*direction*: no roadmap; the whole file is the run-up to a first public release.
Anything that changes an exported name goes before the publish -- after it the
same change is a breaking version, and the two at the top of the queue are both
exported surface. Everything else can follow at leisure.

## Release

- **publish 0.1.0 to jsr.** `deno task publish:dry` is clean.
  - **then set Readme Source to "Readme"** in the package's Settings tab. jsr
    shows the `.` entrypoint's module doc on the Overview tab *instead of* the
    README unless you do, and [](../src/mod.ts)'s module doc is a fraction of
    what [](../README.md) says
  - **then start `CHANGELOG.md`** -- the one notes-grade file a published
    package is expected to carry, and what consumers read on an upgrade
- **repoint the sibling-path consumers at `jsr:@cymian/serve`.** create-deno's
  `addWebTasks`, todo_app, mouse-training, and audio all reach it by
  `../serve/src/mod.ts`.
  - the `@todos` block in [](../src/mod.ts) says the same thing; delete it once
    this is done
  - the `@notes` bullet below it about running rather than importing goes at the
    same time -- it only holds while the package is unpublished
- **file the remaining source `@todos` as issues once the repo is public.** The
  cross-site navigation allowance in [](../src/requestGuard.ts) is the one left
  after the two above.

## Code health

Found in the comment pass of 2026-08-22. Nothing here is urgent, but the first
two are exported surface and so are cheaper before 0.1.0 than after.

- **`isRequestAllowed` overpromises.** A public export that checks only
  Sec-Fetch-Site, while `createRequestGuard` runs four checks --
  `isFetchSiteAllowed` says what it is. [](../src/requestGuard.ts)
- **`getLanAddresses` is exported twice**, named and default. jsr discourages
  default exports; pick one. [](../src/getLanAddresses.ts)
- **`helpers.ts` holds one function** since getLanAddresses split out of it, so
  the filename no longer describes the contents.
- **`parseArgs` wants a `switch`.** The else-if chain is what made `deno fmt`
  strand a process comment on a closing brace, which is why that comment is gone
  rather than fixed. [](../src/helpers.ts)
- **the test files head their tests with `//@main`** where `@tests` exists in
  the code-tree tag list.
- **`IPV4_PATTERN` isn't `_`-prefixed** in [](../src/getLanAddresses.test.ts),
  unlike `_PORT` in [](../src/requestGuard.test.ts).
- **the README uses `--` where PROSE asks for a real em dash** in user-facing
  text, and a jsr package page is about as user-facing as it gets. A call to
  make, not a sweep to run.
