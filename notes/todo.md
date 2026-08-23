# @cymian/serve -- todo

The only notes file this project keeps: pending work, rewritten in place. The
library is small enough that the commit messages carry the reasoning and the git
history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **finish the jsr package settings** -- under Post-publish. Four fields, one
  visit, and every one of them a score item
- **make the repo public** -- under Post-publish. Three items below do not exist
  until it is
- **a WebSocket upgrade passes the guard** -- under The guard's edges. The one
  edge a real consumer meets, an HMR server being the likeliest
- **admit `Sec-Fetch-Dest: document`** -- under The guard's edges, and the
  `@todos` item in [](../src/requestGuard.ts). Closes the same-site 403 and the
  OAuth callback together
- **symlink containment** -- under The served root. Deferred for 0.1.0 and
  documented rather than fixed

_direction_: no roadmap. 0.1.0 is published and its surface is frozen, so
everything left is additive -- edges the guard refuses that arguably shouldn't
be, one shape it doesn't cover, and a printing nit. The WebSocket case leads
because it is the only one a consumer meets, and the `Sec-Fetch-Dest` fix
follows it because one change closes two items. Making the repo public sits with
them because it is what unblocks the issue-filing work.

## Post-publish

0.1.0 went to jsr on 2026-08-22. What the publish left open.

- **publish from GitHub Actions, for provenance.** jsr scores a package that
  publishes from a verifiable CI workflow with a public transparency log entry.
  Needs the repo linked first, and it can't apply retroactively: 0.1.0 stays
  without it and 0.1.1 earns it
  - trigger it on `v*` tags rather than a push to main. The tag is the release
    act, so unreleased commits on main stay unreleased without a branch to hold
    them
- **is `./guard` portable?** [](../src/requestGuard.ts) holds no runtime
  `Deno.*` reference at all -- it is `Request`, `Response`, `Headers`, and `URL`
  throughout, and `getLanAddresses()` is called only when `isLanAllowed`. So the
  subpath may already run on Node and Bun unchanged; a skeleton project settles
  it in an afternoon.
  - the one thing that would break it is `Deno.errors.NotCapable` in
    [](../src/getLanAddresses.ts)'s catch clause, which a `node:os` fallback
    covers
  - it does not settle the two-runtime score item either way: jsr's compat flag
    is package-level, and `.` is bound to `Deno.serve`, `Deno.statSync`,
    `Deno.args`, and `@std/http`. Claiming Node while `import "@cymian/serve"`
    throws there earns a bug report. Splitting the guard into its own package is
    what would make the claim true
- **a `node:` rewrite of the static server is the other route, and it is the
  wrong one.** Writing `.` against `node:http`, `node:fs`, and `node:os` would
  run on Deno, Node, and Bun -- but not Workers, which has no listening sockets.
  Two findings from checking it (2026-08-22):
  - **Deno's permissions gate `node:` APIs identically**, so the `-R`/`-N`/`-S`
    story survives the rewrite. `node:http` listen raises `NotCapable` without
    `-N`, `node:fs` read without `-R`, `node:os` `networkInterfaces()` without
    `-S`. This was the objection that turned out not to hold
  - **`@std/http` declares `node: false`**, so `serveDir` cannot come along. The
    rewrite means owning MIME types, ETag and 304, ranges, `index.html`
    resolution, dotfile filtering, and traversal safety.
  - it would also break the guard's interface: `node:http` hands over
    `IncomingMessage`/`ServerResponse`, not `Request`/`Response`, so the one
    genuinely portable piece would be rewritten to serve the unportable one. The
    shape that avoids this is a `(Request) => Response` handler with a
    per-runtime listen adapter, which still needs the `serveDir` replacement
  - the argument against, in one line: `@std/http` is Deno-only and scores 88.
    Deno's own team took this trade for their file server
- **at the next version bump**: add the [](../CHANGELOG.md) entry and move the
  `[Unreleased]` compare link
- **file the remaining source `@todos` as issues once the repo is public.** The
  top-level navigation allowance in [](../src/requestGuard.ts), and everything
  under The guard's edges
- **issue and PR templates in `.github/`.** [](../README.md)'s Contributing
  section asks a contributor to disclose AI use and write the description
  themselves, and almost nobody about to file an issue reads a README's last
  section. A template is shown in the compose box at the moment someone writes,
  which is where the ask lands. Three lines each; only useful once the repo is
  public

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
- **`--lan` admits addresses, not names.** A phone reaching the machine as
  `laptop.local:3000` is refused; only the printed IP URLs work. Either admit
  `.local` names or say in the README that they won't.
- **The guard assumes `http://`.** `allowedOrigins` is built with the scheme
  hardcoded, so a consumer terminating TLS locally has its own mutations
  refused.

## Polish

- **[](../src/getLanAddresses.ts) keeps every non-loopback IPv4 interface.** A
  machine running Docker, a VM, or a VPN gets those addresses printed as
  `Network:` URLs and admitted into the guard's `Host` allowlist. Admitting them
  is harmless -- they are still this machine -- but printing them is noise, and
  the first URL listed may be the one that doesn't work.
  - nothing in `Deno.networkInterfaces()` tells a Docker bridge from the real
    LAN address, which is what leaves this one open. The link-local
    `169.254.x.x` case was separable and is gone
