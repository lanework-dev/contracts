// What a project's agent notes say about the Lanework board.
//
// One source for two readers: the desktop app writes it into a project's
// AGENTS.md / CLAUDE.md, and the docs site shows it as the snippet to paste.
// Both import it from here, so the two cannot drift apart.

export const MCP_URL = "https://mcp.lanework.dev/v1";

/**
 * The same server with only the tools for working a card (BE-24):
 * list_boards, get_review, set_status, toggle_item, checkpoint.
 *
 * NOTE: Same resource, same token. The server reads `toolset` past its auth
 * gate; the protected-resource metadata and every token's audience stay the
 * bare {@link MCP_URL}. A client must take the OAuth `resource` from that
 * metadata, not from this URL (OpenCode 2.2 sends the URL itself, query and
 * all, and the authorization server refuses it with `invalid_target`).
 */
export const MCP_WORKER_URL = "https://mcp.lanework.dev/v1?toolset=worker";

/** The MCP host alone, which any lanework config or note contains. */
export const MCP_HOST = "mcp.lanework.dev";

/**
 * The board section of a project's AGENTS.md: a pointer, not the rules.
 *
 * The rules ship with the tools, as the MCP server's `instructions`
 * (`BOARD_INSTRUCTIONS`), so every harness gets them on connect and a server
 * update updates them everywhere. This only names the server and what to do
 * without it.
 */
export const AGENT_NOTES = `## Lanework board

Cards for this repo live on Lanework, through the \`lanework\` MCP server.
Follow its instructions for finding the board, writing cards and working
them. If the server is not connected, say so and stop rather than tracking
the work another way.`;

/**
 * Board sections the app wrote before, verbatim, newest first. A project
 * whose AGENTS.md still holds one of them is offered the current
 * {@link AGENT_NOTES} in its place; anything a person reworded is theirs and
 * is never replaced.
 */
export const AGENT_NOTES_PREVIOUS: readonly string[] = [
  `## Lanework board

Cards for this repo live on Lanework, through the \`lanework\` MCP server.

- Find the board with \`git remote get-url origin\`, then
  \`list_boards({ repo })\`. Never pick a board by its name. If no board is
  linked, ask me which one it is — or whether to make a new one — then call
  \`link_repo\` or \`create_board\`.
- Before creating a card, read \`board_summary\` and reuse the board's
  categories and tags.
- Every \`create_review\` sets \`category\`, \`tags\` and \`priority\`.
- Put decisions in the card's checklist, and start the work only after I
  have ticked them.
- Move cards with \`set_status\`; tick verify steps with \`toggle_item\`.
- A card that touches two or more separate areas gets \`streams\`: one
  sub-agent each, with exact \`owns\` paths and a verify step tagged with
  its key. Shared types go in a \`W0\` the others depend on; at most 4
  streams per wave.
- Handed a card with \`streams\`, you are the lead: run \`dispatch\` wave
  by wave, one sub-agent per stream in its own worktree, each given its
  brief as is. Sub-agents write only in \`owns\`, never commit and never
  call Lanework. After each wave, merge, re-run each stream's checks, tick
  its verify steps and \`checkpoint\` once.`,
];
