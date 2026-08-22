# serve -- todo

The only notes file this project keeps: pending work, rewritten in place. No
someday, shipped, roadmap, or dev log -- the library is small enough that the
commit messages carry the reasoning and the git history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **rename the `./requestGuard` export subpath** -- published URL, so it has to
  precede 0.1.0; under Deno conventions
- **publish 0.1.0 to jsr**, and the two steps that only work afterward -- under
  Release
- **repoint the sibling-path consumers** -- under Release
- **the rest of the deno convention pass** -- filenames, its own session
- **decide on the README's `--`** -- under Code health
- @aitodo
  - use `{@link <ident>}` anywhere?
  - How common or how heavily recommended actually is the snake case convention in Denno? Their own examples don't use it. But then again, they are using the cases package in their examples and extracting camel cases from it.

_direction_: no roadmap; the whole file is the run-up to a first public release.
The dividing line is whether a change is visible from outside the package: the
export subpath and anything in the exported API go before the publish, because
afterward the same change is a breaking version. Filenames, comments, and
internals can follow at leisure.

## Release

- **publish 0.1.0 to jsr.** `deno task publish:dry` is clean.
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

## Deno conventions

Its own session -- the filename half touches every file and every import. Guide:
<https://docs.deno.com/runtime/contributing/style_guide>. Identifiers already
conform (camelCase functions and variables, PascalCase types, UPPER_SNAKE_CASE
top-level constants); what's left is filenames and doc tags.

- **the public export subpath is kebab-case, and is not the filename.** std
  publishes `@std/http/file-server` out of `file_server.ts`. serve's is
  `./requestGuard` in [](../deno.jsonc), which std would write
  `./request-guard`. A published URL, so this one is pre-0.1.0 and separable
  from the rest of the section -- the file it points at can stay put.
- **filenames are snake_case.** `get_lan_addresses.ts`, `request_guard.ts`. The
  guide states it as "underscores, not dashes" with `file_server.ts` as the
  example, and std is snake_case throughout.
- **a module only its own directory should import is named `_foo.ts`.** That
  covers [](../src/helpers.ts) and [](../src/getLanAddresses.ts), neither of
  which deno.jsonc exports. It also settles what to call helpers.ts, which has
  held one function since getLanAddresses split out of it -- renamed once here
  rather than twice.
- **exported params want `@param` tags.** The guide: "All exported function
  parameters require `@param` tags with descriptions." serve has none, and
  `ServeOptions` / `RequestGuardOptions` are already documented field by field,
  so adding them duplicates. A call to make -- `deno doc --lint` passes either
  way.

## Code health

- **the README uses `--` where PROSE asks for a real em dash** in user-facing
  text, and a jsr package page is about as user-facing as it gets. A call to
  make, not a sweep to run.
