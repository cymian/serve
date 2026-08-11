/**
 @fileoverview
 A static dev server with the defaults a dev server should have:
 - loopback-only
 - no-cache
 - no dir listing
 - no dotfiles
 - no CORS
 - no cross-site requests

 @std/http's serveDir does the serving; this module pins how it's configured.

 Run it:
   deno run -R=. -N=127.0.0.1:3080 jsr:@cymian/serve -p 3080 -r src/

 Or drive it from code:
   import Serve from "jsr:@cymian/serve";
   const server = Serve.start({ port: 3080, root: "src/" });
*/

import { serveDir } from "@std/http/file-server";

/*
 @notes
 - serveDir's ETag is size + mtime, so a build that preserves mtime revalidates
   to 304 with changed content -- normal editing moves mtime
*/

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
   - @sideEffect binds an address and port, and prints the URLs it's reachable at
   - loopback unless isLanAllowed, so the default accepts connections from this
      machine only
  */
  start(options?: ServeOptions): Deno.HttpServer<Deno.NetAddr>;

  /**
   Returns this machine's IPv4 addresses on the local network.
   - empty when the networkInterfaces permission is absent, so a caller that
      only wants the URL for display doesn't have to hold it
  */
  getLanAddresses(): string[];

  /**
   Returns true if the request is one a browser page is allowed to make.
   - a cross-site subresource request is refused, which covers <script src>
      and <img> embeds; those send no Origin, so the absent CORS header does
      not stop a page reading what they load
   - a cross-site top-level GET navigation is still allowed, e.g. an OAuth
      redirect back to localhost
   - true when the browser sends no Sec-Fetch-Site at all, since only a
      browser can be held to this and only a browser sets the header
  */
  isRequestAllowed(request: Request): boolean;

  /**
   Returns the options named by a command line.
   - unknown flags are ignored; a flag missing its value, or a port that
      isn't a number, throws
  */
  parseArgs(args: string[]): ServeOptions;
}

//
//@data

const _DEFAULT_PORT = 8000;

const _NO_CACHE_HEADERS = [
  "cache-control: no-cache",
];
// - without it browsers heuristically cache off Last-Modified and serve
//   stale files after a rebuild

const _ALLOWED_FETCH_SITES = ["same-origin", "same-site", "none"];
// - "none" is a user-initiated load: a typed URL, a bookmark

//
//@namespace

const Serve: ServeApi = {
  //
  //## Run

  start(options: ServeOptions = {}): Deno.HttpServer<Deno.NetAddr> {
    const port = options.port ?? _DEFAULT_PORT;
    const root = options.root ?? ".";
    const hostname = options.isLanAllowed ? "0.0.0.0" : "127.0.0.1";

    // Announce where it can be reached, once listening

    const onListen = (addr: Deno.NetAddr) => {
      console.log(`  Local:   http://127.0.0.1:${addr.port}/`);

      for (
        const address of options.isLanAllowed ? Serve.getLanAddresses() : []
      ) {
        console.log(`  Network: http://${address}:${addr.port}/`);
      }
    };

    // Serve the root, refusing what a cross-site page asked for

    return Deno.serve(
      { port, hostname, onListen },
      (request) =>
        Serve.isRequestAllowed(request)
          ? serveDir(request, {
            fsRoot: root,
            quiet: true,
            showDirListing: options.isDirListingShown ?? false,
            headers: _NO_CACHE_HEADERS,
          })
          : new Response("cross-site request refused\n", { status: 403 }),
    );
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

  isRequestAllowed(request: Request): boolean {
    const site = request.headers.get("sec-fetch-site");

    // If the header is absent or names a trusted relationship, allow

    if (site === null || _ALLOWED_FETCH_SITES.includes(site)) return true;

    // Allow a cross-site load into its own tab, but not into an embed

    const destination = request.headers.get("sec-fetch-dest");

    return request.headers.get("sec-fetch-mode") === "navigate" &&
      request.method === "GET" &&
      destination !== "object" && destination !== "embed";
  },

  parseArgs(args: string[]): ServeOptions {
    const options: ServeOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Flags taking a value consume and validate the arg after them

      if (arg === "--port" || arg === "-p") {
        const next: string | undefined = args[++i];
        if (next === undefined) throw new Error(`${arg} needs a value`);
        const port = Number(next);
        if (!Number.isInteger(port)) {
          throw new Error(`${arg} needs a port number, got "${next}"`);
        }
        options.port = port;
      } else if (arg === "--root" || arg === "-r") {
        const next: string | undefined = args[++i];
        if (next === undefined) throw new Error(`${arg} needs a value`);
        options.root = next;
      } // Bare flags
      else if (arg === "--lan") options.isLanAllowed = true;
      else if (arg === "--dir-listing") options.isDirListingShown = true;
    }

    return options;
  },
};

//
//@main

if (import.meta.main) {
  try {
    Serve.start(Serve.parseArgs(Deno.args));
  } catch (error) {
    // - a flag mistake gets the message, not a stack trace
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}

//
//@export

export default Serve;
