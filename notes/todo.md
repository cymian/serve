# serve -- todo

The only notes file this project keeps: pending work, rewritten in place. No
someday, shipped, roadmap, or dev log -- the library is small enough that the
commit messages carry the reasoning and the git history is the record.

The exception is `## Settled` at the bottom, which is reference rather than
pending work. A ruling against doing something produces no diff, so there is no
commit for it to live in; it sits here until the project earns a `reference.md`.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **publish 0.1.0 to jsr** -- under Release. Everything that would be a breaking
  version afterward is now settled
- **repoint the sibling-path consumers** -- under Release, and only possible
  once the publish lands
- **the pre-commit hook doesn't re-stage what it formats** -- under Tooling

_direction_: no roadmap; the whole file is the run-up to a first public release,
and the run-up is finished. The export subpath, the exported API, the README,
and the LICENSE are all as they should ship, so nothing left on the list has to
happen in any particular order relative to the publish. Do the publish, then the
two steps it unblocks.

## Release

- **publish 0.1.0 to jsr.** `deno task publish:dry` is clean -- eight files, no
  tests, no repo tooling.
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

## Tooling

- **the pre-commit hook formats without re-staging.** [](../.hooks/pre-commit)
  runs `deno task pre-commit`, which opens with a rewriting `deno fmt` over the
  whole repo and never `git add`s the result. Anything the formatter touches
  falls out of the commit that caused it and is left dirty in the tree.
  - its reach includes `notes/`, so it reflows this file on every commit
  - the hook is create-deno's template verbatim, so the fix belongs there and
    lands in every project scaffolded from it. Not filed in create-deno's notes,
    which hold only Ian's `inbox.md`

## Settled

Rulings with no diff to carry them, so the commit history can't be the record.
The Deno style guide (<https://docs.deno.com/runtime/contributing/style_guide>)
scopes itself out of this repo -- it covers "internal runtime code in the Deno
runtime, and in the Deno Standard Library" -- so each of these asked whether
serve should read like a std package anyway.

- **the export subpath is `./guard`** (2026-08-22). serve and guard are the two
  things the package does and both are verbs, so the pair reads as one
  vocabulary; a camelCase URL segment also has a casing a consumer can get wrong
  with nothing in the error to say why. `./request-guard` was the alternative.
  The file behind it stays `requestGuard.ts` -- a subpath and its module are
  independent, the way `@std/http/file-server` ships out of `file_server.ts`.
- **no snake_case filenames** (2026-08-22). std's house style, but the workspace
  is camelCase and a consumer never sees a filename -- jsr shows the subpath.
  Spot check behind it: scry 3 snake of 120, mouse-training 0 of 154, luxe 1
  of 52.
- **no `_foo.ts` prefix** for a module only its own directory imports
  (2026-08-22). It restates what `exports` in [](../deno.jsonc) already says,
  and less reliably. The real content of that item was the name `helpers.ts`,
  now `parseArgs.ts`.
- **no `@param` tags** (2026-08-22). Both exported functions take one options
  object whose type documents every field, so the tag would render as "options:
  the options".
- **one default export per single-function module** (2026-08-22).
  `getLanAddresses.ts` and `parseArgs.ts` had two shapes for the same job. Both
  are internal, so the workspace convention decided it.
- **`deno.lock` stays in the published tarball** (2026-08-22). Raised as noise
  and it is, but it is inert either way -- a consumer never resolves through a
  published package's lockfile -- so there is nothing to weigh against leaving
  it.
