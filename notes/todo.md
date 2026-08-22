# serve -- todo

The only notes file this project keeps: pending work, rewritten in place. No
someday, shipped, roadmap, or dev log -- the library is small enough that the
commit messages carry the reasoning and the git history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **settle the `./requestGuard` export subpath** -- published URL, so whatever
  it ends up as, it ends up there before 0.1.0; under Deno style
- **publish 0.1.0 to jsr**, and the two steps that only work afterward -- under
  Release
- **repoint the sibling-path consumers** -- under Release
- **cross-reference the docs with `{@link}`** -- under Deno style
- **the rest of Deno style** -- filenames, its own session
- **decide on the README's `--`** -- under Code health

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

## Deno style

The style guide (<https://docs.deno.com/runtime/contributing/style_guide>) opens
by scoping itself out of this: it covers "internal runtime code in the Deno
runtime, and in the Deno Standard Library... not meant as a general style guide
for users of Deno". So nothing below is a conformance gap. What is actually
enforced -- `deno doc --lint`, `deno publish`'s slow-type check -- already
passes. The question each item asks is whether serve should read like a std
package or like the rest of the workspace.

- **the export subpath has to be settled before 0.1.0** whatever it ends up as,
  because it's a published URL and changing it later is a breaking version. std
  publishes `@std/http/file-server` out of `file_server.ts`, so a consumer's eye
  expects `./request-guard` where [](../deno.jsonc) has `./requestGuard`. The
  file it points at is free either way.
- **use `{@link}` and `{@linkcode}` for cross-references.** Verified: deno doc
  turns both into real anchors between symbol pages, `{@linkcode}` in monospace,
  no unrendered braces. Worth doing wherever a doc names another exported symbol
  -- `serve` naming `ServeOptions`, `createRequestGuard` naming `RequestGuard`.
  This one is a plain win rather than a style call.
- **snake_case filenames** are std's house style. camelCase is the rest of the
  workspace's. Nothing in serve is wrong today.
- **`_foo.ts` for a module only its own directory imports** -- same standing. It
  would cover [](../src/helpers.ts) and [](../src/getLanAddresses.ts), and would
  settle what to call helpers.ts, which has held one function since
  getLanAddresses split out of it.
- **`@param` tags on exported params** -- same standing, and it fights brevity:
  `ServeOptions` and `RequestGuardOptions` are already documented field by
  field.

## Code health

- **the README uses `--` where PROSE asks for a real em dash** in user-facing
  text, and a jsr package page is about as user-facing as it gets. A call to
  make, not a sweep to run.
