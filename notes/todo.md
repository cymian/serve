# serve -- todo

The only notes file this project keeps: pending work, rewritten in place. No
someday, shipped, roadmap, or dev log -- the library is small enough that the
commit messages carry the reasoning and the git history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **rule on `same-site` and on symlink containment** -- under Decide before the
  version number is fixed. Both are breaking to change after 0.1.0 ships
  - *risk of deferring:* low to publish, high to change later -- a consumer
    pinning 0.1.x gets the looser behavior forever
- **publish 0.1.0 to jsr** -- under Release
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

## Decide before the version number is fixed

Both change what the package promises, so they are cheap now and breaking after
0.1.0 is out. The README describes the current behavior accurately either way,
so neither blocks a publish -- they block calling the behavior settled.

- **Does `same-site` stay in the allowlist?** [](../src/requestGuard.ts)'s
  `_ALLOWED_FETCH_SITES` admits it, and for an IP host same-site means the same
  host on *any port*. So a page from any other dev server on `127.0.0.1` is
  admitted (verified: 200). It can't read the response -- no CORS header -- so
  what it gains is embedding and existence/timing oracles.
  - dropping it makes the guard same-origin-only, which is what its own doc
    claims ("the page that server itself sent")
  - the cost is the cross-port dev setup: a page on `:5173` calling an API on
    `:3000` is same-site, and a guard consumer sending its own CORS headers
    would break. The static server itself loses nothing, since a cross-origin
    read of it already fails
- **Does the served root get symlink containment?** The dotfile rule matches on
  the URL and `Deno.stat` follows links, so a link named `plain.txt` serves the
  `.env` it points at, or any file outside the root. Verified: four such reads
  returned 200 under `-R` scoped to the served root, since Deno checks the
  permission against the path as written.
  - containment means resolving with `Deno.realPath` and requiring the result
    under `fsRoot`, which duplicates std's path handling -- the fragile part
  - against it: `deno vendor`, pnpm's store, and monorepo package links all put
    intentional symlinks in a served tree
  - the README now says the root's links are part of what you publish, which is
    honest but is not the "secure defaults" thesis

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
