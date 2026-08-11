# @cymian/serve

A static dev server with the defaults a dev server should have:

- binds to machine (`127.0.0.1`) instead of local network (`0.0.0.0`)
- does not serve directory listings when index.html not present
- does not serve dotfiles (e.g. `.env`, `.git/`)
- does not send a `Access-Control-Allow-Origin: *` header, so that non-local websites in your browser can't read responses to any requests they send to your server
  - note they still can send requests -- that is not preventable (@check: except with Local Network Access?)
- does not cache files, so stale pages are not served

Normally that takes five flags:

```sh
--host 127.0.0.1 --no-dir-listing --no-dotfiles --no-cors -H 'cache-control: no-cache, no-store, must-revalidate'
```

This package uses `@std/http`'s `serveDir` to serve the files, with the defaults mentioned above in place. Use `--lan` and `--dir-listing` to opt back in.

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

### Permissions

Run with `-R` to read what it serves, `-N` to bind. Scope both: `-R=. -N=127.0.0.1:3080` grants exactly the project directory and the one port.

## Flags

- `-p`, `--port` — default 8000
- `-r`, `--root` — default `.`
- `--lan` — bind every interface, and print the LAN URL
- `--dir-listing` — list a directory that has no `index.html`

Printing the LAN URL under `--lan` reads `Deno.networkInterfaces()`, which
needs `-S=networkInterfaces`. Without it the server still binds — Deno just
prompts for the sys permission before the second URL prints.
