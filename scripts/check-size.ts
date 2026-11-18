// The board instructions must reach the agent whole. Claude Code cuts a
// server's `initialize` instructions at 4,096 characters; past that the rules
// are lost, silently. 4,000 leaves room for a future sentence's review.
import { BOARD_INSTRUCTIONS, BOARD_WORKER_INSTRUCTIONS } from "../src";

const LIMIT = 4000;
let failed = false;
for (const [name, text] of [
  ["BOARD_INSTRUCTIONS", BOARD_INSTRUCTIONS],
  ["BOARD_WORKER_INSTRUCTIONS", BOARD_WORKER_INSTRUCTIONS],
] as const) {
  const ok = text.length <= LIMIT;
  console.log(`${ok ? "ok" : "TOO LONG"}  ${name}: ${text.length}/${LIMIT}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
