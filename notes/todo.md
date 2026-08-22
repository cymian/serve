# serve -- todo

The only notes file this project keeps: pending work, rewritten in place. No
someday, shipped, roadmap, or dev log -- the library is small enough that the
commit messages carry the reasoning and the git history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **publish 0.1.0 to jsr** -- under Release. Everything that would be a breaking
  version afterward is now settled
- **repoint the sibling-path consumers** -- under Release, and only possible
  once the publish lands

_direction_: no roadmap; the whole file is the run-up to a first public release,
and the run-up is finished. The export subpath, the exported API, the README,
and the LICENSE are all as they should ship, so nothing left on the list has to
happen in any particular order relative to the publish. Do the publish, then the
two steps it unblocks.

## Release

- **publish 0.1.0 to jsr.** `deno task publish:dry` is clean -- seven files, no
  tests, no repo tooling, no lockfile.
  - the `@cymian` scope has to exist on jsr.io first, and `deno publish`
    device-auths through a browser, so this one is Ian's to run
  - **then set Readme Source to "Readme"** in the package's Settings tab. jsr
    shows the `.` entrypoint's module doc on the Overview tab _instead of_ the
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
