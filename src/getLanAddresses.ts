/**
 The network-interface lookup the guard and the static server share. Its own
 module so that taking either entrypoint doesn't drag the other in.

 @module
*/

//
//@fns

/**
 Returns this machine's IPv4 addresses on the local network.
 - empty rather than throwing when the networkInterfaces permission is absent,
    so a caller that only wants a URL to print doesn't need the permission
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

//
//@export

export default getLanAddresses;
