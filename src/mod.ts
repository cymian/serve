/**
 Exports the `serve()` function and `ServeOptions` interface for a static dev
 server with secure defaults:
 - loopback-only
 - no-cache
 - no directory listings
 - no dotfiles
 - no CORS
 - no cross-site requests
 - no requests addressed to a host this server doesn't answer to

 It delegates file serving to `@std/http`'s `serveDir`, pins its configuration,
 and also provides the command-line entry point.

 @module
*/

import { serveDir } from "@std/http/file-server";

import getLanAddresses from "./getLanAddresses.ts";
import parseArgs from "./parseArgs.ts";
import { createRequestGuard } from "./requestGuard.ts";

import type { RequestGuard } from "./requestGuard.ts";

/*
 @notes
 - `serveDir`'s ETag is size + mtime, so a build that preserves mtime
   revalidates to 304 with changed content -- normal editing moves mtime
*/

//
//@types

/** How a server is configured. Every field has a default. */
export interface ServeOptions {
  /** Port to listen on. */
  port?: number;
  /** Directory served as the site root, relative to the `cwd`. */
  root?: string;
  /** Reachable from the local network rather than this machine only. */
  isLanAllowed?: boolean;
  /** Directory contents listed when a directory has no `index.html`. */
  isDirListingShown?: boolean;
}

//
//@data

const _DEFAULT_PORT = 8000;

/**
 The version this module was run at, e.g. `"0.1.0"`.
 - `"dev"` wherever the URL carries no version: a checkout, a vendored copy, or
    an install under `node_modules`
*/
const _VERSION =
  /\/@cymian\/serve\/(\d+\.\d+\.\d+[^/]*)\//.exec(import.meta.url)?.[1] ??
    "dev";
// - a JSR module's URL carries its version, e.g.
//   https://jsr.io/@cymian/serve/0.1.0/src/mod.ts, so nothing is read and no
//   permission is needed; `deno.jsonc` can't be imported as JSON, and
//   `import.meta.dirname` is undefined for every non-file: module
// - the segment has to be semver-shaped, or
//   `node_modules/@cymian/serve/src/...` would report "src" as the version

const _NO_CACHE_HEADERS = [
  "cache-control: no-cache",
];
// - without it browsers heuristically cache off `Last-Modified` and serve
//   stale files after a rebuild

const _USAGE = `Usage: deno run -R -N jsr:@cymian/serve [options]

  -p, --port <number>  port to listen on (default ${_DEFAULT_PORT})
  -r, --root <dir>     directory served, relative to the cwd (default ".")
      --lan            bind 0.0.0.0, print the LAN URL, and admit LAN hosts
      --dir-listing    list a directory that has no index.html
  -h, --help           print this
  -v, --version        print the version
`;

//
//@fns

/**
 Starts a static file server and returns it, already listening.
 - loopback unless {@linkcode ServeOptions.isLanAllowed | isLanAllowed}, so the
    default accepts connections from this machine only
 - @sideEffect binds an address and port, and prints the URLs it's reachable at

 @example Drive it from code
 ```ts
 import { serve } from "jsr:@cymian/serve";

 const server = serve({ port: 3080, root: "src/" });
 await server.shutdown();
 ```
*/
export function serve(
  options: ServeOptions = {},
): Deno.HttpServer<Deno.NetAddr> {
  const port = options.port ?? _DEFAULT_PORT;
  const root = options.root ?? ".";
  const isLanAllowed = options.isLanAllowed ?? false;
  const hostname = isLanAllowed ? "0.0.0.0" : "127.0.0.1";

  let guard: RequestGuard | null = null;

  // Build the guard and announce the URLs

  const onListen = (listenAddress: Deno.NetAddr) => {
    guard = createRequestGuard({ port: listenAddress.port, isLanAllowed });
    // - here rather than above, because port 0 doesn't settle until it binds

    _printUrls(listenAddress.port, isLanAllowed);
    _printRootWarning(root);
  };

  // Serve the root to what the guard admits

  return Deno.serve(
    { port, hostname, onListen },
    (request) => {
      if (!guard) {
        return new Response("refused: the guard is not built yet\n", {
          status: 503,
        });
      }
      // - `onListen` builds it before the first request, so this is unreachable;
      //   it is here so that a scheduling change breaks the server rather than
      //   unguarding it

      const refusal = guard(request);
      if (refusal) return refusal;

      return serveDir(request, {
        fsRoot: root,
        quiet: true,
        showDirListing: options.isDirListingShown ?? false,
        headers: _NO_CACHE_HEADERS,
        showDotfiles: false,
        enableCors: false,
        // - both are `serveDir`'s own defaults, pinned because they are two of
        //   the defaults this package promises
      });
    },
  );
}

//
//@helpers

/** Prints the reachable URLs, or why no LAN URL is available. */
function _printUrls(port: number, isLanAllowed: boolean): void {
  console.log(`  Local:   http://127.0.0.1:${port}/`);

  if (!isLanAllowed) return;

  const lanAddresses = getLanAddresses();

  if (lanAddresses.length === 0) {
    console.log(
      "  Network: no LAN address found, so LAN requests will be refused — is -S=networkInterfaces granted?",
    );
    return;
  }

  for (const address of lanAddresses) {
    console.log(`  Network: http://${address}:${port}/`);
  }
}

/**
 Prints why a request under the served root will fail, naming which of the
 three cases it is: the path is missing, it names a file, or `-R` doesn't reach
 it. Prints nothing for a root that serves.
 - the root is quoted, so a stray space in it is visible rather than invisible
*/
function _printRootWarning(root: string): void {
  let message: string;

  try {
    if (Deno.statSync(root).isDirectory) return;

    message =
      `"${root}" is a file, not a directory, so it cannot serve requests`;
  } catch (error) {
    message = error instanceof Deno.errors.NotCapable
      ? `-R does not cover "${root}", so requests outside -R will 500`
      : `"${root}" does not exist, so every request will 404`;
    // - anything but the permission reads the same as missing: either way
    //   nothing is there to serve
  }

  console.log(`  Root:    ${message}`);
}

//
//@main

if (import.meta.main) {
  // Answer `--help` rather than serving

  if (Deno.args.includes("-h") || Deno.args.includes("--help")) {
    console.log(_USAGE);
    Deno.exit(0);
  }

  // Answer `--version` rather than serving

  if (Deno.args.includes("-v") || Deno.args.includes("--version")) {
    console.log(`@cymian/serve ${_VERSION}`);
    Deno.exit(0);
  }

  // Serve what the command line names

  try {
    serve(parseArgs(Deno.args));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    // - a flag mistake gets the message, not a stack trace

    Deno.exit(1);
  }
}
