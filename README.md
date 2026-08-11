# @cymian/serve

A static dev server with the defaults a dev server should have.

`@std/http`'s `serveDir` does the serving; this package pins how it's
configured. Static file servers ship defaults inverted from what a dev
server wants — the `@std/http` file-server CLI:

- binds `0.0.0.0`, putting the served directory on the local network
  (`http-server`, esbuild, and `Deno.serve` bind it too)
- lists any directory that has no `index.html`
- serves dotfiles — `.env`, `.git/`
- sends `Access-Control-Allow-Origin: *`, so any website open in the browser
  can read the served files; binding loopback does not protect against this
- sets `Last-Modified` with no `cache-control`, so browsers serve stale files
  after a rebuild without making a request

Undoing that is five flags in every task line:

```sh
--host 127.0.0.1 --no-dir-listing --no-dotfiles --no-cors -H 'cache-control: no-cache, no-store, must-revalidate'
```

Here it's the default: loopback, no listing, no dotfiles, no CORS, no-cache.
`--lan` and `--dir-listing` opt back in per run.

## Use

As a task:

```jsonc
"start": "deno run -R=. -N=127.0.0.1:3080 jsr:@cymian/serve -p 3080 -r src/",
"start:lan": "deno run -R=. -N=0.0.0.0:3080 -S=networkInterfaces jsr:@cymian/serve -p 3080 -r src/ --lan"
```

From code:

```ts
import Serve from "jsr:@cymian/serve";

const server = Serve.start({ port: 3080, root: "src/" });
await server.shutdown();
```

## Flags

- `-p`, `--port` — default 8000
- `-r`, `--root` — default `.`
- `--lan` — bind every interface, and print the LAN URL
- `--dir-listing` — list a directory that has no `index.html`

## Permissions

`-R` to read what it serves, `-N` to bind. Scope both: `-R=. -N=127.0.0.1:3080`
grants exactly the project directory and the one port.

Printing the LAN URL under `--lan` reads `Deno.networkInterfaces()`, which
needs `-S=networkInterfaces`. Without it the server still binds — Deno just
prompts for the sys permission before the second URL prints.
