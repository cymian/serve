/**
 @fileoverview
 What mod.ts assembles a server out of: the command-line parse, the cross-site
 check, and the LAN address lookup.

 Internal to the package -- deno.jsonc names mod.ts as the only entrypoint, so
 nothing here is reachable from outside it.
*/

import type { ServeOptions } from "./mod.ts";

/*
 @todos
 - refuse a request whose Host is neither loopback nor a LAN address of this
   machine, which is the DNS rebinding case
   - the attacker serves a page from attacker.com pointed at 127.0.0.1, so the
     browser calls us that page's own origin and sends Sec-Fetch-Site:
     same-origin -- isRequestAllowed cannot see it
   - os_boss/src/server/serveOsBoss.ts already does this; check Host against
     loopback, never against the request's own Host
 - allow a cross-site top-level navigation again if something needs one, e.g.
   an OAuth callback redirected back to localhost
   - require Sec-Fetch-Dest: document, which is the tab itself; an iframe,
     frame, object, or embed each name themselves instead
*/

//
//@data

const _ALLOWED_FETCH_SITES = [
  "same-origin", // same scheme, host and port
  "same-site", // same scheme and domain, i.e. subdomain and port can differ
  "none", // a user-initiated load: a typed URL, a bookmark
  null, // header absent: not a browser, or not an origin it's sent to
];
// - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
// - browsers set Sec-Fetch-* only for a potentially trustworthy URL, so a LAN
//   address over plain http arrives with none of them

//
//@fns

/**
 Returns this machine's IPv4 addresses on the local network.
 - empty when the networkInterfaces permission is absent, so a caller that only
    wants the URL for display doesn't have to hold it
*/
export function getLanAddresses(): string[] {
  try {
    return Deno.networkInterfaces()
      .filter((iface) =>
        iface.family === "IPv4" && !iface.address.startsWith("127.")
      )
      .map((iface) => iface.address);
  } catch {
    return [];
  }
}

/**
 Returns true if the request is one a browser page is allowed to make.
 - every cross-site request is refused, whatever it asked for; a <script src>
    or <img> embed sends no Origin, so the absent CORS header does not stop the
    page reading what it loaded
 - true when no Sec-Fetch-Site arrives, since there is nothing to check -- a
    non-browser client, or an origin browsers don't set it for
*/
export function isRequestAllowed(request: Request): boolean {
  return _ALLOWED_FETCH_SITES.includes(
    request.headers.get("sec-fetch-site"),
  );
}

/**
 Returns the options named by a command line.
 - unknown flags are ignored; a flag missing its value, or a port that isn't a
    number, throws
*/
export function parseArgs(args: string[]): ServeOptions {
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
}
