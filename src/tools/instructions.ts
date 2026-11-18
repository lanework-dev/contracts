// How an agent uses the board tools: the `instructions` both Lanework MCP
// servers answer `initialize` with, the cloud one (mcp.lanework.dev) and the
// desktop's offline one, word for word.
//
// One source, so the rules ship with the tools: a server update is a rules
// update, in every harness and every repo, and a project's AGENTS.md needs
// only a pointer (`AGENT_NOTES`). Both servers' parity checks compare their
// `initialize` answer with these strings.
//
// ⚠️ Constants only, never built per request: they head the model's context,
// and text that changed per call would break the client's prompt cache.

const INTRO =
  "lanework is a Kanban board for AI-driven development. A card is a " +
  "review checklist: decisions to approve, then verify steps to prove. ";

/** Finding the board, as far as a session with only `list_boards` can. */
const FIND_BOARD =
  "Every tool needs a board_id and there is no default. A conversation " +
  "the Lanework app started is told its board_id when it starts: use that " +
  "one. Otherwise run `git remote get-url origin` and call " +
  "list_boards({ repo }) with the output as is. Exactly one board: use it. ";

/** What a full session does when the repo has no board, or several. */
const NO_BOARD =
  "None: list_boards without repo and ask which board this repo belongs to, " +
  "offering also a new one (suggest `owner/name` from the remote); then " +
  "link_repo their pick, or create_board only if they asked. Linking a board " +
  "that has another repo MOVES the link. Several, or no remote: ask. Never " +
  "pick a board by its name. ";
("git remote: ask the user. Never pick a board by its name. ");

/** Creating a card: what every create_review must carry. */
const NEW_CARD =
  "Before create_review, read board_summary and reuse its categories and " +
  "tags (the category mints the task id; never invent one). Every " +
  "create_review passes category, 1-3 tags and priority (high: blockers, " +
  "release prerequisites; medium: planned work; low: polish). Body: context, " +
  "out of scope, files touched. Checklist: decisions the user approves, " +
  "verify steps that prove the work; a pick-ONE choice is boxes sharing a " +
  "`group`, the recommendation marked. ";
("here. ");

/** The gate between a card's plan and its implementation. */
const REVIEW_GATE =
  "Behavior-changing work starts only once every decision is ticked; " +
  "read-only requests, obvious one-file fixes and work whose exact shape the " +
  "user gave need no card. toggle_item ticks boxes and notes (a verify tick " +
  "sends evidence: the command and whether it passed), update_review edits " +
  "metadata, set_status moves lanes. ";
("sends evidence (the command and whether it passed). ");

const CHECKPOINT_FLOW =
  "While working a card, call checkpoint after each item you finish and " +
  "before you stop. To resume: get_review and read its checkpoint; if " +
  "checkpoint.git.wipRef is set and this is not the checkout it came from " +
  "(another host, a fresh clone, a sandbox), check out checkpoint.git.head " +
  "and `git fetch origin <wipRef> && git cherry-pick --no-commit FETCH_HEAD " +
  "&& git reset`. Re-run every check it claims passed, then continue from " +
  "nextStep. ";
("continue from nextStep (or the summary). ");

const STALE =
  "A card with `stale` set was left mid-task: resume it from its checkpoint " +
  "rather than opening a duplicate. ";
("its checkpoint. ");

const HAND_OFF =
  "Finished, verified work goes to the review-role lane via set_status; only " +
  "a human moves it to done. A card sent back carries changesRequested.reason " +
  "in get_review: read it first. When set_status returns retro, propose at " +
  "most 3 lessons and ask before writing any. ";
("user before writing any. ");

/** Leading a card's streams (BE-19); also the `work` prompt's text. */
export const STREAMS_FLOW =
  "A card with streams comes back from get_review with `dispatch: { waves, " +
  "briefs }`, and you are its lead. Run it wave by wave: spawn every stream " +
  "of a wave at once, one sub-agent per stream, each in its own git worktree " +
  "from the current HEAD (in the shared checkout when its isolation is " +
  "shared), and hand each one `dispatch.briefs[key]` verbatim. No " +
  "sub-agents? Run the streams yourself, one by one, in wave order. " +
  "Sub-agents never call Lanework and never commit. After each wave, merge " +
  "each worktree into the main checkout, revert anything outside the " +
  "stream's `owns`, re-run the stream's checks, tick its verify items, and " +
  "call checkpoint once for the wave. After the last wave, run the untagged " +
  "verify items. On resume, re-dispatch only the streams whose verify items " +
  "are not all ticked. A card without streams (dispatch: null) works as " +
  "before: one agent, end to end.";

/** Splitting a new card into streams, when writing it. */
const WRITE_STREAMS =
  "Split a card into streams only when it touches two or more independent " +
  "write areas: each has a key (W0…), goal, role, exact `owns` paths no " +
  "other stream in its wave owns, and a verify item tagged with its key; " +
  "shared types go in a W0 the others depend on; at most 4 per wave. ";
("on, at most 4 streams per wave. ");

/** Reviewing a card with the user (BE-14); also the `review` prompt's text. */
export const REVIEW_FLOW =
  "To review a card with the user in the CLI: get_review it, then ask the " +
  "user with your option picker (AskUserQuestion) if you have one. Each " +
  "pick-ONE group (boxes sharing a `group`) is one single-select question, " +
  "its options the group's boxes, the one marked (Recommended) first. Gather " +
  "the ungrouped decisions into multi-select questions of up to 4 boxes " +
  "each. At most 4 questions per turn — ask again for the rest. A group with " +
  "more than 4 options cannot fit: say so and send the user to the app for " +
  "that group. Then call review_card ONCE with exactly what the user picked: " +
  "a picked box checked: true, an offered but unpicked ungrouped box " +
  "checked: false, and anything they typed under Other as that box's note. " +
  "Never tick a decision the user did not pick; only a plain instruction in " +
  "chat (e.g. 'tick the recommended ones') stands in for the picker. " +
  "review_card does not move the card, and work starts only once it answers " +
  "ready: true.";

/**
 * The streams and review flows, short, for the instructions. The full texts
 * (STREAMS_FLOW, REVIEW_FLOW) stay the `work` and `review` prompts'.
 *
 * ⚠️ The instructions stay under 4,000 characters: Claude Code cuts a
 * server's instructions at 4,096 (`… [truncated]`), and what falls past it
 * is lost. `bun run check:size` in CI holds them to it.
 */
const RUN_STREAMS =
  "A card with streams comes back from get_review with dispatch { waves, " +
  "briefs }: you are its lead. Per wave, spawn one sub-agent per stream at " +
  "once (own worktree unless shared) with its brief verbatim; sub-agents " +
  "never call Lanework or commit. After the wave, merge, revert anything " +
  "outside each stream's owns, re-run its checks, tick its verify items, " +
  "checkpoint once. Then the untagged verify items. ";

const REVIEW_SHORT =
  "To review a card with the user: get_review it and ask with your option " +
  "picker, one single-select question per pick-ONE group (recommended " +
  "first) and the other decisions as multi-select, at most 4 questions a " +
  "turn; then call review_card ONCE with exactly what they picked (unpicked " +
  "offered boxes false, Other text as the note). Never tick a decision they " +
  "did not pick. Work starts only once it answers ready: true.";

/** Every board tool's rules: the full toolset's `initialize` instructions. */
export const BOARD_INSTRUCTIONS =
  INTRO +
  FIND_BOARD +
  NO_BOARD +
  NEW_CARD +
  REVIEW_GATE +
  CHECKPOINT_FLOW +
  STALE +
  HAND_OFF +
  WRITE_STREAMS +
  RUN_STREAMS +
  REVIEW_SHORT;

/**
 * The worker toolset's instructions (BE-24): only what a session working
 * ONE existing card needs. Sentences about tools it does not have would
 * cost tokens every turn and invite calls to tools that are not there.
 */
export const BOARD_WORKER_INSTRUCTIONS =
  INTRO +
  "This connection serves only the tools for working an existing card; " +
  "creating, linking or reviewing cards needs the full lanework server. " +
  FIND_BOARD +
  "None, several, or no git remote: ask the user. Never pick a board by " +
  "its name. Do not start a card still in todo with decisions unticked. " +
  CHECKPOINT_FLOW +
  HAND_OFF +
  RUN_STREAMS.trimEnd();
