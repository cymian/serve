# @cymian/serve

A static dev server with secure and convenient defaults:

- listens on `127.0.0.1` (connections from this machine only) instead of
  `0.0.0.0` (connections from any machine on the local network)
- does not serve directory listings when there's no `index.html`
- does not serve dotfiles (e.g. `.env`, `.git/`)
- does not send an `Access-Control-Allow-Origin: *` header, so other sites open
  in your browser can't read what it serves
  - they can still send the requests -- blocking those is up to the browser
    (Chrome's Local Network Access; Firefox and Safari have no equivalent)
- sends `cache-control: no-cache` header, to prevent stale page loads

It uses `@std/http`'s `serveDir` to serve files. Normally the above behavior
takes five flags:

```sh
--host 127.0.0.1 --no-dir-listing --no-dotfiles --no-cors -H 'cache-control: no-cache'
```

You can use flags like `--lan` and `--dir-listing` to opt back in to certain
behaviors.

## Use

As a task:

```jsonc
"start": "deno run -R=. -N=127.0.0.1:3000 jsr:@cymian/serve -p 3000 -r src/",
"start:lan": "deno run -R=. -N=0.0.0.0:3000 -S=networkInterfaces jsr:@cymian/serve -p 3000 -r src/ --lan"
```

From code:

```ts
import Serve from "jsr:@cymian/serve";

const server = Serve.start({ port: 3000, root: "src/" });
await server.shutdown();
```

### Permissions

It needs `-R` (`--allow-read`) to read the content it serves, and `-N`
(`--allow-network`) to serve it. Scope both to limit exposure, e.g.
`-R=. -N=127.0.0.1:3000` grants exactly the project directory and the one port.

`--lan` also prints the machine's LAN URL, which reads
`Deno.networkInterfaces()`. This requires `-S` (`--allow-sys`) and is best scoped
to `-S=networkInterfaces`. Without it, the server still binds and serves, you
just lose the `Network:` line; in a terminal, Deno prompts for the permission
first.

## Flags

- `-p`, `--port` — default 8000
- `-r`, `--root` — the directory served, default `.`
- `--lan` — bind to 0.0.0.0, and print the LAN URL
- `--dir-listing` — serve listings for directories that have no `index.html`
