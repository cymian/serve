/**
 The network-interface lookup the guard and the static server share. Its own
 module so that taking either entry point doesn't drag the other in.

 @module
*/

//
//@fns

/**
 Returns this machine's IPv4 addresses on the local network.
 - empty rather than throwing when the networkInterfaces permission is absent,
    so e.g. `--lan` without `-S` degrades to a printed hint rather than a crash
 - a link-local `169.254.x.x` is left out: it is what a failed DHCP lease
    leaves behind, and nothing on the network reaches the machine by it
*/
function getLanAddresses(): string[] {
  try {
    return Deno.networkInterfaces()
      .filter((iface) =>
        iface.family === "IPv4" &&
        !iface.address.startsWith("127.") &&
        !iface.address.startsWith("169.254.")
      )
      .map((iface) => iface.address);
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return [];
    throw error;
  }
  // - only the permission failure is answered with an empty list; anything
  //   else swallowed here would misreport a real failure as a missing LAN
}

//
//@export

export default getLanAddresses;
