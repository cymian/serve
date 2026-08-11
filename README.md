# @cymian/serve

A static dev server with the defaults a dev server should have.

The serving is `@std/http`'s `serveDir`. What this package adds is the opinion
about how it's configured, so a task line is short instead of a flag string
pasted into every project.

- **loopback by default** -- `--lan` opts out. `Deno.serve`, `http-server`,
  esbuild, and `file-server` all bind `0.0.0.0` unless told otherwise, which
  puts the directory being served on the local network.
- **no-cache**, so a rebuild shows up without a hard refresh
- **index fallback**, directory listing off unless asked for

## Use

As a task:

```jsonc
"start": "deno run -R=. -N=127.0.0.1:3080 jsr:@cymian/serve -p 3080 -r src/",
"start:lan": "deno run -R=. -N jsr:@cymian/serve -p 3080 -r src/ --lan"
```

From code:

```ts
import Serve from "jsr:@cymian/serve";

const server = Serve.start({ port: 3080, root: "src/" });
await server.shutdown();
```

## Flags

- `-p`, `--port` -- default 8000
- `-r`, `--root` -- default `.`
- `--lan` -- bind every interface, and print the LAN URL
- `--dir-listing` -- list a directory that has no index.html

## Permissions

`-R` to read what it serves, `-N` to bind. Scope both: `-R=. -N=127.0.0.1:3080`
grants exactly the project directory and the one port.

`--lan` prints the machine's LAN address, which reads `Deno.networkInterfaces()`
and needs `--allow-sys=networkInterfaces`. Without it the server still binds --
it just doesn't print the second URL.
