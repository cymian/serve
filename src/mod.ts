/**
 @fileoverview
 A static dev server with the defaults a dev server should have: loopback,
 no-cache, index fallback. Serving itself is @std/http's serveDir -- what this
 package adds is the opinion about how it's configured.

 Run it:
   deno run -R=. -N jsr:@cymian/serve --port 3080 --root src/

 Or drive it from code:
   import Serve from "jsr:@cymian/serve";
   const server = Serve.start({ port: 3080, root: "src/" });
*/

import { serveDir } from "@std/http/file-server";

//
//@types

/** How a served instance is configured. Every field has a default. */
export interface ServeOptions {
  /** Port to listen on. */
  port?: number;
  /** Directory served as the site root, relative to the cwd. */
  root?: string;
  /** Reachable from the local network rather than this machine only. */
  isLanAllowed?: boolean;
  /** Directory contents listed when a directory has no index.html. */
  isDirListingShown?: boolean;
}

/**
 The package's surface.
 - stated as an interface because jsr's no-slow-types rejects an inferred one
*/
export interface ServeApi {
  /**
   Starts a static file server and returns it, already listening.
   - @sideEffect binds a port, and prints the URLs it's reachable at
   - loopback unless isLanAllowed, so the default serves this machine only
  */
  start(options?: ServeOptions): Deno.HttpServer;

  /**
   Returns this machine's IPv4 addresses on the local network.
   - empty when the networkInterfaces permission is absent, so a caller that
      only wants the URL for display doesn't have to hold it
  */
  getLanAddresses(): string[];

  /** Returns the options named by a command line, with unknown flags ignored. */
  parseArgs(args: string[]): ServeOptions;
}

//
//@data

const _DEFAULT_PORT = 8000;

const _NO_CACHE_HEADERS = [
  "cache-control: no-cache, no-store, must-revalidate",
];
// - a dev server exists to show the last edit; serving a cached bundle is the
//   one thing it must never do

//
//@namespace

const Serve: ServeApi = {
  //
  //## Run

  start(options: ServeOptions = {}): Deno.HttpServer {
    const port = options.port ?? _DEFAULT_PORT;
    const root = options.root ?? ".";
    const hostname = options.isLanAllowed ? "0.0.0.0" : "127.0.0.1";

    // Serve the root, with directory listing off unless asked for

    const server = Deno.serve(
      { port, hostname, onListen: () => {} },
      (request) =>
        serveDir(request, {
          fsRoot: root,
          quiet: true,
          showDirListing: options.isDirListingShown ?? false,
          headers: _NO_CACHE_HEADERS,
        }),
    );

    // Announce where it can be reached

    const boundPort = (server.addr as Deno.NetAddr).port;

    console.log(`  Local:   http://127.0.0.1:${boundPort}/`);

    for (const address of options.isLanAllowed ? Serve.getLanAddresses() : []) {
      console.log(`  Network: http://${address}:${boundPort}/`);
    }

    return server;
  },

  //
  //## Helpers

  getLanAddresses(): string[] {
    try {
      return Deno.networkInterfaces()
        .filter((iface) =>
          iface.family === "IPv4" && !iface.address.startsWith("127.")
        )
        .map((iface) => iface.address);
    } catch {
      return [];
    }
  },

  parseArgs(args: string[]): ServeOptions {
    const options: ServeOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const next = args[i + 1];

      // Flags taking a value consume the arg after them

      if (arg === "--port" || arg === "-p") {
        if (next !== undefined) options.port = Number(next);
        i++;
      } else if (arg === "--root" || arg === "-r") {
        if (next !== undefined) options.root = next;
        i++;
      } // Bare flags

      else if (arg === "--lan") options.isLanAllowed = true;
      else if (arg === "--dir-listing") options.isDirListingShown = true;
    }

    return options;
  },
};

//
//@main

if (import.meta.main) Serve.start(Serve.parseArgs(Deno.args));

//
//@export

export default Serve;
