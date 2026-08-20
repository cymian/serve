/**
 @fileoverview
 Decides whether a request reaching a local server is one this machine is
 entitled to make of it -- the page the server itself sent, or a program
 running here. Everything else is refused before a route sees it.

 Every check below assumes the server is bound to this machine. A server
 reachable from anywhere can't tell its own caller apart from a stranger's,
 and none of this substitutes for authentication if it ever binds past
 loopback.

 A static server needs the first two checks; the rest earn their place once a
 route mutates something.

 Imports nothing but the address lookup, so a consumer taking the guard alone
 doesn't typecheck the static server or resolve its dependencies.
*/

/*
 @todos
 - allow a cross-site top-level navigation again if something needs one, e.g.
   an OAuth callback redirected back to localhost
   - require Sec-Fetch-Dest: document, which is the tab itself; an iframe,
     frame, object, or embed each name themselves instead
*/

import getLanAddresses from "./getLanAddresses.ts";

//
//@types

/** How a guard decides, for one server on one port. */
export interface RequestGuardOptions {
  /**
   Port the server is listening on.
   - the bound port, not the requested one: port 0 gets assigned a real one,
      and a Host naming any other port is not addressing this server
  */
  port: number;
  /** Requests may arrive addressed to this machine's LAN addresses too. */
  isLanAllowed?: boolean;
  /**
   Header a guarded request must carry, e.g. "x-worldview".
   - the value is never read; what protects is that a header outside the small
      set browsers treat as simple can't be sent without a successful
      preflight, and a no-cors request -- the one shape that reaches a local
      server uninvited -- can't send one at all
  */
  clientHeader?: string;
  /**
   Paths `clientHeader` is required on.
   - defaults to everything under `/api/`, leaving page loads and assets to
      the checks above; a navigation can set no headers
  */
  isPathGuarded?: (pathname: string) => boolean;
}

/**
 Returns the refusal a request earns, or null when it may proceed.
 - @returns null for "allowed", so a call site reads
    `const refusal = guard(request); if (refusal) return refusal;`
*/
export type RequestGuard = (request: Request) => Response | null;

//
//@data

/** Names that reach a server without leaving the machine. */
const _LOOPBACK_HOSTNAMES = ["127.0.0.1", "localhost", "[::1]"];

/** Methods that only read, and so can't be made to do anything by being fired. */
const _READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

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
 Returns true if the request is one a browser page is allowed to make.
 - every cross-site request is refused, whatever it asked for; a <script src>
    or <img> embed sends no Origin, so the absent CORS header does not stop the
    page reading what it loaded
 - true when no Sec-Fetch-Site arrives, since there is nothing to check -- a
    non-browser client, or an origin browsers don't set it for
*/
export function isRequestAllowed(request: Request): boolean {
  return _ALLOWED_FETCH_SITES.includes(request.headers.get("sec-fetch-site"));
}

/**
 Builds the guard for a server already listening on `options.port`.
 - the LAN addresses are read once here, so an address the machine gains later
    needs a restart to be addressable
*/
export function createRequestGuard(options: RequestGuardOptions): RequestGuard {
  const hostnames = [
    ..._LOOPBACK_HOSTNAMES,
    ...(options.isLanAllowed ? getLanAddresses() : []),
  ];

  const allowedHosts = new Set(
    hostnames.map((hostname) => `${hostname}:${options.port}`),
  );
  const allowedOrigins = new Set(
    [...allowedHosts].map((host) => `http://${host}`),
  );

  const isPathGuarded = options.isPathGuarded ??
    ((pathname: string) => pathname.startsWith("/api/"));

  return (request) => {
    // Reject a Host this server doesn't answer to, which is the rebinding case

    if (!allowedHosts.has(request.headers.get("host") ?? "")) {
      return _refuse("host not addressed to this server");
    }

    // Reject what a cross-site page asked for

    if (!isRequestAllowed(request)) return _refuse("cross-site request");

    // Beyond here only mutations and guarded paths are left to check

    const isMutation = !_READ_METHODS.has(request.method);
    const origin = request.headers.get("origin");

    if (isMutation && origin !== null && !allowedOrigins.has(origin)) {
      return _refuse("foreign origin");
    }
    // - an absent Origin is allowed through: curl and scripts send none, and a
    //   browser that omits it has already failed the Host check

    if (
      options.clientHeader !== undefined &&
      isPathGuarded(new URL(request.url).pathname) &&
      request.headers.get(options.clientHeader) === null
    ) {
      return _refuse(`missing ${options.clientHeader}`);
    }

    return null;
  };
}

//
//@helpers

/** The refusal itself: a 403 naming the check, which only devtools will read. */
function _refuse(reason: string): Response {
  return new Response(`refused: ${reason}\n`, { status: 403 });
}
