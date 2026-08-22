/**
 A static dev server with the defaults a dev server should have:
 - loopback-only
 - no-cache
 - no dir listing
 - no dotfiles
 - no CORS
 - no cross-site requests
 - no requests addressed to a name this machine doesn't answer to

 The serving itself is @std/http's serveDir; this module pins how it's
 configured, and doubles as the command line that runs it.

 @module
*/

import { serveDir } from "@std/http/file-server";

import getLanAddresses from "./getLanAddresses.ts";
import { parseArgs } from "./helpers.ts";
import { createRequestGuard } from "./requestGuard.ts";

import type { RequestGuard } from "./requestGuard.ts";

/*
 @todos
 - publish to jsr, then point the consumers at jsr:@cymian/serve
   - create-deno's addWebTasks, todo_app, mouse-training, and audio all reach
     it by the sibling path ../serve/src/mod.ts
*/

/*
 @notes
 - serveDir's ETag is size + mtime, so a build that preserves mtime revalidates
   to 304 with changed content -- normal editing moves mtime
 - importing this module needs @std/http in the consumer's import map and
   deno.ns in its lib; until it's on jsr, consumers should run it as a task
   entrypoint rather than import it
*/

//
//@types

/** How a server is configured. Every field has a default. */
export interface ServeOptions {
  /** Port to listen on. */
  port?: number;
  /** Directory served as the site root, relative to the cwd. */
  root?: string;
  /** Reachable from the local network rather than this machine only. */
  isLanAllowed?: boolean;
  /** Directory contents listed when a directory has no `index.html`. */
  isDirListingShown?: boolean;
}

//
//@data

const _DEFAULT_PORT = 8000;

const _NO_CACHE_HEADERS = [
  "cache-control: no-cache",
];
// - without it browsers heuristically cache off Last-Modified and serve
//   stale files after a rebuild

//
//@fns

/**
 Starts a static file server and returns it, already listening.
 - loopback unless `isLanAllowed`, so the default accepts connections from this
    machine only
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
  const hostname = options.isLanAllowed ? "0.0.0.0" : "127.0.0.1";

  let guard: RequestGuard | null = null;

  // Build the guard and announce the URLs

  const onListen = (addr: Deno.NetAddr) => {
    guard = createRequestGuard({
      port: addr.port,
      isLanAllowed: options.isLanAllowed ?? false,
    });
    // - here rather than above, because port 0 doesn't settle until it binds

    console.log(`  Local:   http://127.0.0.1:${addr.port}/`);

    for (const address of options.isLanAllowed ? getLanAddresses() : []) {
      console.log(`  Network: http://${address}:${addr.port}/`);
    }
  };

  // Serve the root to what the guard admits

  return Deno.serve(
    { port, hostname, onListen },
    (request) => {
      const refusal = guard?.(request);
      if (refusal) return refusal;

      return serveDir(request, {
        fsRoot: root,
        quiet: true,
        showDirListing: options.isDirListingShown ?? false,
        headers: _NO_CACHE_HEADERS,
      });
    },
  );
}

//
//@main

if (import.meta.main) {
  try {
    serve(parseArgs(Deno.args));
  } catch (error) {
    // - a flag mistake gets the message, not a stack trace
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
