# Changelog

Notable changes to `@cymian/serve`. The format is
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versioning is
[semver](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-08-22

First release.

### Added

- `serve()`, and the same server as a command line. Files are served by
  `@std/http`'s `serveDir`, pinned to loopback-only, no directory listings, no
  dotfiles, no CORS, and `cache-control: no-cache`.
- Cross-site requests are refused outright, read from `Sec-Fetch-Site`.
  Same-site goes with them, since the browser's sense of "site" ignores the
  port.
- A `Host` naming anything but a loopback address on the bound port is refused —
  the shape DNS rebinding relies on.
- `createRequestGuard()`, at `@cymian/serve/guard`: the same checks for a server
  of your own, importable without `@std/http` or the static server.
- Flags `-p`/`--port`, `-r`/`--root`, `--lan`, `--dir-listing`, `-h`/`--help`,
  and `--version`. Anything else is an error.

[Unreleased]: https://github.com/cymian/serve/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cymian/serve/releases/tag/v0.1.0
