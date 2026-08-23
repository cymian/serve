# @cymian/serve -- todo

The only notes file this project keeps: pending work, rewritten in place. The
library is small enough that the commit messages carry the reasoning and the git
history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **finish the jsr package settings** -- under Post-publish. Four fields, one
  visit, and every one of them a score item
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
follows it because one change closes two items.

## Post-publish

0.1.0 went to jsr on 2026-08-22. What the publish left open.

- **finish the package settings** at <https://jsr.io/@cymian/serve>. Four
  fields, all of them jsr score items:
  - **description** -- not a `deno.jsonc` field. jsr reads it from the settings
    tab and nowhere else; Deno's config schema has no such property
  - **runtime compat** -- Deno alone, honestly. See the portability item below
  - **Readme Source -> "Readme"** -- otherwise the Overview tab shows
    [](../src/mod.ts)'s module doc in place of [](../README.md), which says a
    fraction of what the README does
  - **link the GitHub repo** -- also what enables OIDC publishing from Actions
- **start `CHANGELOG.md`** -- the one notes-grade file a published package is
  expected to carry, and what consumers read on an upgrade
- **publish from GitHub Actions, for provenance.** jsr scores a package that
  publishes from a verifiable CI workflow with a public transparency log entry.
  Needs the repo linked first, and it can't apply retroactively: 0.1.0 stays
  without it and 0.1.1 earns it
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
- **at the next version bump, remember the dependency-age floor.** Deno 2.9
  refuses a dependency published in the last 24 hours, so a same-day publish is
  unreachable without `--min-dep-age 0`. The three sibling consumers carry
  `"minimumDependencyAge": { "exclude": ["jsr:@cymian/*"] }` for it
- **`pre-commit` runs bare `deno fmt`**, which reaches `notes/*.md` -- ruled off
  limits for the formatter everywhere else. The fix is
  `"fmt": { "exclude": ["notes/"] }` in [](../deno.jsonc)
- **file the remaining source `@todos` as issues once the repo is public.** The
  top-level navigation allowance in [](../src/requestGuard.ts), and everything
  under The guard's edges

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
  `ians-mbp.local:3000` is refused; only the printed IP URLs work. Either admit
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
