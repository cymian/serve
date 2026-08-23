# @cymian/serve -- todo

The only notes file this project keeps: pending work, rewritten in place. The
library is small enough that the commit messages carry the reasoning and the git
history is the record.

Excluded from the published package by `publish.exclude` in [](../deno.jsonc).

## Queue

- **a WebSocket upgrade passes the guard** -- under The guard's edges. The one
  edge a real consumer meets, an HMR server being the likeliest
- **admit `Sec-Fetch-Dest: document`** -- under The guard's edges, and the
  `@todos` item in [](../src/requestGuard.ts). Closes the same-site 403 and the
  OAuth callback together
- **symlink containment** -- under The served root. Deferred for 0.1.0 and
  documented rather than fixed

_direction_: no roadmap. 0.1.0 froze the surface, so everything left is additive
-- edges the guard refuses that arguably shouldn't be, one shape it doesn't
cover, and a printing nit. The WebSocket case leads because it is the only one a
consumer meets, and the `Sec-Fetch-Dest` fix follows it because one change
closes two items.

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
