# @cymian/serve

A static dev server with secure and convenient defaults. The request guard
backing it is separately importable, for a server of your own.

The defaults:

- **loopback-only**: listens on `127.0.0.1` (connections from this machine only)
  instead of `0.0.0.0` (connections from any machine on the local network)
- **no dir listings**: does not serve directory listings when there's no
  `index.html`
- **no dotfiles**: does not serve dotfiles (e.g. `.env`, `.git/`) — by name, so
  a symlink pointing at one still serves it (see [Permissions](#permissions))
- **no cors**: does not send an `Access-Control-Allow-Origin: *` header, so
  other sites open in your browser can't read what it serves
- **no cross-site requests**: refuses them outright, so those sites get nothing
  back — which also covers `<script src>` and `<img>` embeds, since they send no
  `Origin` and so aren't governed by the CORS header
  - same-site is refused too: the browser's sense of "site" ignores the port, so
    admitting it would admit every other dev server on `127.0.0.1`. Only the
    page this server sent, and a URL you typed or bookmarked, get through
  - the check reads `Sec-Fetch-Site`, sent by Chrome 76+, Firefox 90+, and
    Safari 16.4+. A client sending none is admitted, since there is nothing to
    read — every iOS before 16.4, and a browser extension with host permissions
- **no foreign `Host`**: refuses a request addressed to any name but a loopback
  one on the bound port, which is what DNS rebinding relies on — the attacker
  points their own domain at `127.0.0.1`, and every same-origin check then reads
  as satisfied
- **no-cache**: sends a `cache-control: no-cache` header, to prevent stale page
  loads

It uses `@std/http`'s `serveDir` to serve files. Reproducing most of the above
with std's own `file-server` CLI takes five flags, and neither the cross-site
nor the foreign-`Host` refusal is on offer at all:

```sh
deno run -R -N jsr:@std/http/file-server \
  --host 127.0.0.1 --no-dir-listing --no-dotfiles --no-cors \
  -H 'cache-control: no-cache'
```

You can use flags like `--lan` and `--dir-listing` to opt back in to certain
behaviors (see [Flags](#flags) below).

## Use

As a task:

```jsonc
"dev": "deno run -R=src -N=127.0.0.1:3000 jsr:@cymian/serve -p 3000 -r src/",
"dev:lan": "deno run -R=src -N=0.0.0.0:3000 -S=networkInterfaces jsr:@cymian/serve -p 3000 -r src/ --lan"
```

From code:

```ts
import { serve } from "jsr:@cymian/serve";

const server = serve({ port: 3000, root: "src/" });
await server.shutdown();
```

### Permissions

It needs `-R` (`--allow-read`) to read the content it serves, and `-N`
(`--allow-net`) to serve it. Scope both to limit exposure, e.g.
`-R=src -N=127.0.0.1:3000 -r src/` grants only the served directory and the one
port.

Scoping `-R` does not contain a symlink, though. Deno checks the permission
against the path as written, and the dotfile rule matches on the URL, so a link
in the served root reaches what it names — a dotfile, or a file outside the
granted directory — and serves it under whatever name the link carries. Serve a
root whose links you know.

`--lan` reads `Deno.networkInterfaces()` for the machine's LAN addresses, so it
needs `-S` (`--allow-sys`), best scoped to `-S=networkInterfaces`. Those
addresses are both what the `Network:` line prints and what the guard admits a
`Host` from, so without the permission the server binds to `0.0.0.0` and then
refuses everything arriving at a LAN address. In a terminal, Deno prompts for
it.

## Guarding your own server

`serve` is for static files. When you have a server of your own, take just the
guard:

```ts
import { createRequestGuard } from "jsr:@cymian/serve/guard";

const guard = createRequestGuard({ port: 3919, clientHeader: "x-myapp" });

Deno.serve({ port: 3919, hostname: "127.0.0.1" }, (request) => {
  const refusal = guard(request);
  if (refusal) return refusal;

  // ... your routes
});
```

It checks four things, in order:

1. the `Host` names this server
2. the request isn't on another origin's behalf
3. a mutation carries no foreign `Origin`
4. anything under `/api/` carries `clientHeader`

The value is never read, and doesn't need to be: a header outside the small set
browsers treat as simple can't be sent without a successful preflight, and the
shapes that reach a local server uninvited — a `no-cors` send, a simple
cross-origin POST — can send neither. Your page adds the header to its own
`fetch` calls; pass `isPathGuarded` if the paths needing it aren't `/api/`.

This entry point pulls in no dependencies. Importing `@cymian/serve` itself
brings `@std/http` along, which only the static server needs.

## Flags

- `-p`, `--port` — default 8000
- `-r`, `--root` — the directory served, default `.`
- `--lan` — bind to `0.0.0.0`, print the LAN URL, and admit a `Host` naming one
  of this machine's LAN addresses
  - browsers send `Sec-Fetch-*` only to a trustworthy URL, and no `Origin` on a
    read, so a request to a LAN address over plain http arrives with nothing for
    the cross-site check or the mutation check to read. What is left is the
    `Host` check, which every client on the network passes. `--lan` serves the
    network; it does not guard it
- `--dir-listing` — serve listings for directories that have no `index.html`
- `-h`, `--help` — print the flags and exit

Anything else is an error, so a typo can't quietly serve the wrong thing.

## Contributing

Issues and PRs welcome. `deno task setup` points git at the repo's hooks;
`deno task test` runs the suite.

Built with the help of Claude. If you use AI on an issue or PR, please say so
and say where, and write the description in your own words — enough that I can
tell that you understand the issue(s) at hand and what the model produced.
