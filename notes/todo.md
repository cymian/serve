# serve -- todo

The only notes file this project keeps: pending work, rewritten in place. No
someday, shipped, roadmap, or dev log -- the library is small enough that the
commit messages carry the reasoning and the git history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **publish 0.1.0 to jsr** -- under Release. The pre-release audit is closed:
  `same-site` is out of the allowlist, symlink containment is deferred and
  documented, and what it found besides is either fixed or listed below
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
  after the two above, and so is everything under The guard's edges.

## The served root

- **Symlink containment is deferred for 0.1.0** (ruled 2026-08-22), documented
  rather than fixed. The dotfile rule matches on the URL and `Deno.stat` follows
  links, so a link named `plain.txt` serves the `.env` it points at, or any file
  outside the root. Verified: four such reads returned 200 under `-R` scoped to
  the served root, because Deno checks the permission against the path as
  written, not the resolved one.
  - so "no dotfiles" holds by name, not by target, and `-R` is not containment.
    Both now say so in [](../README.md)
  - the fix is resolving with `Deno.realPath` and requiring the result under
    `fsRoot`. What deferred it: that duplicates std's path handling, which is
    the part most likely to go subtly wrong, and `deno vendor`, pnpm's store,
    and monorepo package links all put intentional symlinks in a served tree
  - revisit if the package ever serves a root it didn't build -- that is the
    case the current wording can't cover

## The guard's edges

Turned up by the pre-release audit. Each is a request the guard refuses that
arguably shouldn't be, or a shape it doesn't cover. None blocks 0.1.0 -- a dev
server on a loopback port meets none of them -- and each is a candidate issue
once the repo is public.

- **`Sec-Fetch-Site` is what the cross-site check reads, and not everything
  sends it.** Chrome 76+, Firefox 90+, and Safari 16.4+ do; earlier Safari
  (every iOS before 16.4) sends nothing, and an absent header is admitted by
  design. Browser extensions with host permissions are also not subject to
  CORS. Worth a README sentence naming the floor.
- **A WebSocket upgrade passes the guard.** The handshake is a GET, so the
  mutation check skips it, and WS is exempt from CORS -- a cross-site page that
  gets past check 2 has a bidirectional channel. `clientHeader` can never cover
  a WS route either, since the browser WebSocket API cannot set headers. Only
  reaches guard consumers; the static server has no WS route. An HMR server is
  the likeliest consumer, so this one matters.
- **A link from another local dev server is now a 403.** Dropping `same-site`
  refuses same-site navigations along with same-site fetches, so an index page
  on `:8000` linking to an app on `:3000` lands on a refusal. The `@todos` item
  in [](../src/requestGuard.ts) is the fix for both this and the OAuth callback:
  admit `Sec-Fetch-Dest: document`, which is the tab itself.
- **A default port drops out of `Host`.** Browsers omit `:80` and `:443`, and
  [](../src/requestGuard.ts)'s allowlist is `name:port` throughout, so a server
  on either port would refuse every browser request. The fix is admitting a
  bare `Host` when the port is the scheme's default.
- **`--lan` admits addresses, not names.** A phone reaching the machine as
  `ians-mbp.local:3000` is refused; only the printed IP URLs work. Either admit
  `.local` names or say in the README that they won't.
- **The guard assumes `http://`.** `allowedOrigins` is built with the scheme
  hardcoded, so a consumer terminating TLS locally has its own mutations
  refused.
- **Test helpers don't take the `_` the source gives non-exported entities.**
  `_PORT` and `_IPV4_PATTERN` carry it; `ownRequest`, `crossSiteRequest`, and
  the guard consts beside them don't. Either rule works -- one is that a test
  module exports nothing, so the marker distinguishes nothing -- but pick one.

## Polish

- **A root that doesn't exist serves 404s in silence.** `-r srcc/` starts
  normally and answers everything with a 404, so a typo reads as a broken app
  rather than a bad flag. A `Deno.stat` at startup could say so beside the
  `Local:` line, which is where `--lan` already reports what it couldn't find.
- **`isFetchSiteAllowed` is public API.** It is exported from the `./guard`
  entry, so 0.1.0 fixes it in the semver contract. Worth confirming that is
  intended rather than incidental -- the alternative is narrowing the subpath to
  `createRequestGuard` and the two types.
- **No `--version`.** Low value while `deno run jsr:@cymian/serve@0.1.0` pins it
  at the call site, but it is what a published CLI is expected to answer.
