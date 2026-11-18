# @lanework/contracts

The contract every part of [Lanework](https://lanework.dev) builds on: the
desktop app, its checkpoint hook, the Lanework API and their MCP servers.

- **HTTP**: request and response types, path builders, shared constants.
- **Tools** (`src/tools/`): the board tools (`board.ts`, with run-time output
  shapes in `outputs.ts` for parity checks), lanework-kit's search tools
  (`kit.ts`) and the conductor/lead control tools (`control.ts`), each with
  its input JSON Schema.

It has no runtime dependencies.

Formerly `@lanework/protocol` (0.1.0, 0.2.0); 0.3.0 is the first release under
this name.

```ts
import { paths, type MachineMeResponse } from "@lanework/contracts";

const res = await fetch(`https://api.lanework.dev${paths.machinesMe()}`, {
  headers: { authorization: `Bearer ${token}` },
});
const me = (await res.json()) as MachineMeResponse;
```

The package ships TypeScript source (`src/index.ts`). Use it from a bundler or
from TypeScript with `"moduleResolution": "bundler"`.

## Releasing

Bump `version` in `package.json`, commit, then push a tag `v<version>`: the
`publish` workflow checks the tag against `package.json` and publishes to npm.
Nothing else publishes.

MIT. See [LICENSE](LICENSE). The name and logo are covered by the
repository's [TRADEMARKS.md](https://github.com/fuongz/lanework/blob/main/TRADEMARKS.md).
