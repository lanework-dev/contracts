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
  "None: call list_boards without repo and ask the user which board this " +
  "repo belongs to — the boards you can see, PLUS an option to create a " +
  "new board for this repo (suggest `owner/name` from the remote as its " +
  "name). Then link_repo the one they picked, or create_board if they " +
  "chose a new one; never create a board they did not ask for. A board " +
  "links to ONE repo: linking a board that already has another repo " +
  "MOVES it (replace), it never adds a second. Several: ask the user. No " +
  "git remote: ask the user. Never pick a board by its name. ";

/** Creating a card: what every create_review must carry. */
const NEW_CARD =
  "Before creating a card, read board_summary so its category and tags " +
  "match the vocabulary the board already uses; the category is also what " +
  "mints the card's permanent task id. Every create_review (a successor " +
  "card too) passes category, 1-3 tags and priority explicitly: high for " +
  "blockers and release prerequisites, medium for planned work, low for " +
  "polish. Put context, an out-of-scope section and the files touched in " +
  "the body; decisions the user approves and verify steps that prove the " +
  "work in the checklist, a pick-ONE choice as boxes sharing a `group` " +
  "with the recommendation marked. Never invent a task id: the server " +
  "mints it. After create_review, offer to review the new card right " +
  "here. ";

/** The gate between a card's plan and its implementation. */
const REVIEW_GATE =
  "Behavior-changing work starts only once every decision box is ticked " +
  "(a card in todo with decisions open is a plan, not a go). Read-only " +
  "requests, single-file obvious fixes, or work whose exact shape the user " +
  "gave need no card. Use toggle_item for checklist boxes and notes, " +
  "update_review for metadata, set_status for lanes; ticking a verify item " +
  "sends evidence (the command and whether it passed). ";

const CHECKPOINT_FLOW =
  "While working a card, call checkpoint after each checklist item you " +
  "finish and before you stop mid-task. Asked to resume a card: " +
  "get_review it and read its checkpoint. If checkpoint.git.wipRef is " +
  "set AND you are not in the checkout it came from (checkpoint.host " +
  "is another machine, or this is a fresh clone or a cloud sandbox), " +
  "check out checkpoint.git.head, then `git fetch origin <wipRef> && " +
  "git cherry-pick --no-commit FETCH_HEAD && git reset` to restore the " +
  "uncommitted work; in the same checkout that work is already on " +
  "disk, so skip it. Re-run every check it claims passed, then " +
  "continue from nextStep (or the summary). ";

const STALE =
  "A card with `stale` set was left mid-task by another agent: before " +
  "opening a new card for the same work, get_review it and resume from " +
  "its checkpoint. ";

const HAND_OFF =
  "Finished and verified work goes to the board's review-role lane via " +
  "set_status, not done; only a human moves it to done. A card sent " +
  "back from review carries changesRequested.reason in get_review: " +
  "read it first. " +
  "When set_status returns retro, propose at most 3 lessons and ask the " +
  "user before writing any. ";

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
  "write areas: each stream has a key (W0, W1…), a goal, a role and exact " +
  "`owns` paths no other stream in its wave owns, and at least one verify " +
  "item tagged with its key; shared types go in a W0 the others depend " +
  "on, at most 4 streams per wave. ";

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
  STREAMS_FLOW +
  " " +
  REVIEW_FLOW;

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
  STREAMS_FLOW;
