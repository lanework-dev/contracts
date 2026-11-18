// The 14 board tools (FE-152): names, descriptions and parameters as the
// cloud MCP (`mcp.lanework.dev`) and the offline one (`electron/mcp-local/`)
// both serve them, and the answer each one returns.
//
// NOTE: The cloud is the reference (BE-27): these texts and schemas are what
// it served before it switched to serving this file, worded so they hold on
// both servers. A feature only the cloud has (`evidence`, `stale`, `retro`)
// is still described here; the offline server accepts its parameters and
// does without the rest. `board_id` is the board's `workspaceId` on both.

import type {
  BoardSummary,
  Card,
  CardDetail,
  ChecklistItem,
  ColumnRole,
  Dispatch,
  TagPolicy,
} from "../boards";
import type { Checkpoint, LatestCheckpoint } from "../checkpoints";
import type { ToolContract, ToolParam } from "./schema";

export type BoardToolName =
  | "list_boards"
  | "create_board"
  | "link_repo"
  | "board_summary"
  | "list_reviews"
  | "get_review"
  | "create_review"
  | "update_review"
  | "toggle_item"
  | "review_card"
  | "set_status"
  | "delete_review"
  | "checkpoint"
  | "lifecycle_status";

// ── Shared parameter shapes ─────────────────────────────────────────────────

const BOARD_ID: ToolParam = {
  type: "string",
  description: "Workspace id of the board, from `list_boards`.",
};
const CARD: ToolParam = {
  type: "string",
  description: "Card id or task id, e.g. BE-07",
};
const REPO: ToolParam = {
  type: "string",
  description:
    "Output of `git remote get-url origin`, unmodified — ssh or https",
};
const PRIORITY: ToolParam = {
  type: "string",
  enum: ["low", "medium", "high"],
};
const ASSIGNEES: ToolParam = {
  type: "object",
  properties: {
    users: { type: "string[]" },
    agents: { type: "string[]" },
  },
};
/** One stream of a card (BE-19); `description` differs between create and update. */
const streams = (description: string): ToolParam => ({
  type: "object[]",
  description,
  properties: {
    key: {
      type: "string",
      description: "W0, W1, … — minted for you if omitted",
    },
    title: { type: "string", description: "One line, e.g. 'MCP tools'" },
    goal: {
      type: "string",
      description:
        "What the sub-agent must deliver, self-contained: it starts with none of your context",
    },
    role: { type: "string", enum: ["research", "implement", "test"] },
    owns: {
      type: "string[]",
      description:
        "Repo-relative paths it alone writes; a directory ends in '/'. No globs. Required unless role is research",
    },
    reads: { type: "string[]", description: "Paths it should read first" },
    depends_on: {
      type: "string[]",
      description: "Stream keys that must finish before this one starts",
    },
    isolation: {
      type: "string",
      enum: ["worktree", "shared"],
      description:
        "worktree (default): its own git worktree. shared: the lead's checkout, for read-only research",
    },
  },
  required: ["title", "goal", "role"],
});

// ── The tools ───────────────────────────────────────────────────────────────

/** The board tools, in the order `tools/list` advertises them. */
export const BOARD_TOOLS: readonly ToolContract<BoardToolName>[] = [
  {
    name: "list_boards",
    title: "List boards",
    description:
      "Every board you can see, with its workspace id and linked repo. Call this FIRST: every other tool needs a `board_id` and there is no default. Pass `repo` (your `git remote get-url origin`, as is) to get only the board(s) linked to the repo you are working in.",
    readOnly: true,
    properties: {
      repo: REPO,
    },
  },
  {
    name: "create_board",
    title: "Create a board for this repo",
    description:
      "Create a new board and link it to the git repo in one step. ONLY after the user chose to create a new board (offered next to the existing ones when list_boards({ repo }) found none) — never on your own initiative. Suggest `owner/name` from the remote as the name. Returns board_id for every other tool.",
    readOnly: false,
    properties: {
      name: {
        type: "string",
        description: "Board name the user agreed to, e.g. `acme/widgets`",
      },
      slug: {
        type: "string",
        description:
          "Lower-case hyphenated key. Omit to derive it from the name.",
      },
      repo: REPO,
    },
    required: ["name", "repo"],
  },
  {
    name: "link_repo",
    title: "Link a board to a repo",
    description:
      "Link a board to a git repo so list_boards({ repo }) finds it. Only call this after the USER has confirmed which board the repo belongs to — never on a guess from the board's name. Owner only. Refuses to replace a different linked repo unless `replace` is true.",
    readOnly: false,
    properties: {
      board_id: BOARD_ID,
      repo: REPO,
      replace: {
        type: "boolean",
        description:
          "Move the link from the repo it has now. Only when the user asked.",
      },
    },
    required: ["board_id", "repo"],
  },
  {
    name: "board_summary",
    title: "Board summary",
    description:
      "Lane-by-lane counts of live cards, plus the board's categories and tag policy. Read this before creating a card so its category and tags match what the board already uses. `stale` counts in-progress cards no agent has touched for over 2 hours — list_reviews flags which ones.",
    readOnly: true,
    properties: {
      board_id: BOARD_ID,
    },
    required: ["board_id"],
  },
  {
    name: "lifecycle_status",
    title: "Lifecycle status",
    description:
      "What the board is waiting on: cards whose decisions are not all ticked (waiting), cards cleared to start (ready), cards being worked (in flight), and cards waiting for a human to review (review). Call this to pick up work rather than guessing from a list.",
    readOnly: true,
    properties: {
      board_id: BOARD_ID,
    },
    required: ["board_id"],
  },
  {
    name: "list_reviews",
    title: "List cards",
    description:
      "Cards on a board, in the order the board draws them. Filter by lane, category, tag or priority. Archived cards are excluded unless asked for. Each card's `stale` is `{ since, lastAgent }` for in-progress work no agent has touched for over 2 hours, else null.",
    readOnly: true,
    properties: {
      board_id: BOARD_ID,
      column: {
        type: "string",
        description: "Lane key, e.g. todo | processing | done",
      },
      category: { type: "string", description: "Category key, e.g. backend" },
      tag: { type: "string" },
      priority: PRIORITY,
      task_id: {
        type: "string",
        description:
          "Exact task id such as BE-07 — matched on the field, not the title",
      },
      include_archived: { type: "boolean" },
      limit: { type: "integer", minimum: 1, maximum: 200 },
    },
    required: ["board_id"],
  },
  {
    name: "get_review",
    title: "Get a card",
    description:
      "One card with its checklist, tags, assignees, links and `streams`, plus the latest `checkpoint` another agent left on it (or null) and `dispatch` — the card's run plan, `{ waves, briefs }`, or null when it has no streams. With a dispatch you are the lead: run it wave by wave, handing each stream's sub-agent its brief verbatim. `item.stale` is `{ since, lastAgent }` when the card sits in progress with no agent activity for over 2 hours (or null): resume it from its checkpoint. `card` takes either the card's id or its task id (e.g. BE-07).",
    readOnly: true,
    properties: {
      board_id: BOARD_ID,
      card: CARD,
    },
    required: ["board_id", "card"],
  },
  {
    name: "create_review",
    title: "Create a card",
    description:
      "Open a new card on a board. Setting `category` also mints the card's permanent task id (BE-07 and so on), so pass it unless you mean to leave the card unfiled. Split a card into `streams` only when it touches two or more independent write areas (e.g. db + mcp + desktop); a 1–2 file card has none. Shared files (types, schema, contracts) go in a W0 stream the others depend on. At most 4 streams can run in one wave, no two streams that run together may own the same path, and every stream needs at least one verify item tagged with its key (`checklist[].stream`). Untagged verify items are the lead's: gate, build, e2e. Isolation defaults to worktree.",
    readOnly: false,
    properties: {
      board_id: BOARD_ID,
      title: { type: "string" },
      body: { type: "string", description: "Markdown body of the card" },
      type: { type: "string", enum: ["epic", "issue", "task"] },
      column: {
        type: "string",
        description: "Lane key; defaults to the board's start lane",
      },
      category: {
        type: "string",
        description: "Category key — this is what mints the task id",
      },
      priority: PRIORITY,
      tags: {
        type: "string[]",
        description: "Reuse the board's existing tags",
      },
      assignees: ASSIGNEES,
      checklist: {
        type: "object[]",
        properties: {
          section: { type: "string", enum: ["decisions", "verify"] },
          text: { type: "string" },
          key: {
            type: "string",
            description: "Stable id like D1 — minted for you if omitted",
          },
          checked: { type: "boolean" },
          group: {
            type: "string",
            description: "Same value on 2+ items makes them a 'pick ONE' group",
          },
          note: { type: "string" },
          stream: {
            type: "string",
            description:
              "Verify items only: the stream key (W1…) this item proves. Each stream needs one",
          },
        },
        required: ["section", "text"],
      },
      streams: streams(
        "Sub-agent jobs a lead runs in waves (BE-19). Omit for a card one agent works end to end",
      ),
      parent_id: { type: "string" },
    },
    required: ["board_id", "title"],
  },
  {
    name: "update_review",
    title: "Update a card",
    description:
      "Patch a card's title, body, priority, tags, assignees, category or streams. Omitted fields are left alone; `tags`, `assignees` and `streams` replace what is there (`streams: []` clears the plan). Streams are checked against the card's checklist: each one needs a verify item tagged with its key — tag them in the same call with `checklist_streams`, or one at a time with toggle_item's `stream`. Use set_status to move a card between lanes. Split a card into `streams` only when it touches two or more independent write areas (e.g. db + mcp + desktop); a 1–2 file card has none. Shared files (types, schema, contracts) go in a W0 stream the others depend on. At most 4 streams can run in one wave, no two streams that run together may own the same path, and every stream needs at least one verify item tagged with its key (`checklist[].stream`). Untagged verify items are the lead's: gate, build, e2e. Isolation defaults to worktree.",
    readOnly: false,
    properties: {
      board_id: BOARD_ID,
      card: CARD,
      title: { type: "string" },
      body: { type: "string" },
      priority: PRIORITY,
      tags: { type: "string[]", description: "Replaces the tag list" },
      category: {
        type: "string",
        description: "Setting this on a card with no task id yet mints one",
      },
      assignees: ASSIGNEES,
      streams: streams(
        "Replaces the whole stream list; pass expected_revision so a concurrent edit is not lost",
      ),
      checklist_streams: {
        type: "string-map",
        description:
          'Tag verify items with the stream they prove, applied with `streams` in one write: { V3: "W1", V4: null }',
      },
      expected_revision: {
        type: "integer",
        description:
          "Refuse the write unless the card is still at this revision — pass what get_review returned to avoid overwriting a concurrent edit.",
      },
    },
    required: ["board_id", "card"],
  },
  {
    name: "set_status",
    title: "Set a card's lane",
    description:
      "Move a card to another lane — the board's status columns. Use list_boards then list_reviews to see the lane keys this board has. Finished, verified work goes to the review lane, not done. Review and done refuse a card while a verify item you ticked lacks passing `evidence` (toggle_item). Moving into review may return `retro` signals: propose lessons and ask the user before writing any.",
    readOnly: false,
    properties: {
      board_id: BOARD_ID,
      card: CARD,
      status: {
        type: "string",
        description: "Lane key, e.g. todo | processing | review | done",
      },
      reason: {
        type: "string",
        maxLength: 2000,
        description:
          "What to change — required when sending a card back from review to an in-progress lane, ignored on any other move.",
      },
    },
    required: ["board_id", "card", "status"],
  },
  {
    name: "toggle_item",
    title: "Toggle a checklist item",
    description:
      "Tick or untick one checklist box on a card, and optionally leave a note under it, or tag a verify item with the stream it proves (BE-19). `key` is the item's stable id, e.g. D1 or V3. Ticking a verify item, send `evidence`. Answers with that box and the card in one line, not the whole card: get_review has the rest.",
    readOnly: false,
    properties: {
      board_id: BOARD_ID,
      card: CARD,
      key: { type: "string", description: "Checklist item key, e.g. D1 or V3" },
      checked: { type: "boolean", description: "Omit to leave the tick alone" },
      note: {
        type: "string",
        description: "A note recorded under the item; empty string clears it",
      },
      text: {
        type: "string",
        description: "Reword the item, keeping its key and tick",
      },
      stream: {
        type: "nullable-string",
        description:
          "Verify items only: the stream key (W1…) this item proves; null removes the tag",
      },
      evidence: {
        type: "object",
        description:
          "Verify items: what you ran to prove it — required before the card can move to review or done.",
        properties: {
          command: { type: "string", maxLength: 1000 },
          ok: { type: "boolean" },
          url: {
            type: "string",
            maxLength: 2000,
            pattern: "^https?:\\/\\/\\S+$",
          },
        },
        required: ["command", "ok"],
      },
    },
    required: ["board_id", "card", "key"],
  },
  {
    name: "review_card",
    title: "Record the user's review of a card",
    description:
      "Write the user's review of a card's checklist in one call: every box they answered, with the tick it should end with. ONLY with picks the user just made (in the option picker, or said plainly in chat) — never tick a decision on your own judgement. Ticking one option of a pick-ONE group unticks the others; boxes not named are left as they are. Free text the user typed (\"Other\") goes in `note`. Returns `ready: true` once every decision is settled; it does not move the card.",
    readOnly: false,
    properties: {
      board_id: BOARD_ID,
      card: CARD,
      picks: {
        type: "object[]",
        description: "Every box the user answered in this pass",
        minItems: 1,
        properties: {
          key: { type: "string", description: "Checklist item key, e.g. D1" },
          checked: { type: "boolean" },
          note: {
            type: "string",
            description: "The user's own words; empty string clears the note",
          },
        },
        required: ["key", "checked"],
      },
      revision: {
        type: "integer",
        description:
          "The card's `revision` from get_review; refused if it changed since",
      },
    },
    required: ["board_id", "card", "picks"],
  },
  {
    name: "checkpoint",
    title: "Record a checkpoint",
    description:
      "Record where you stopped on a card so another agent can resume it. Call after each checklist item you finish, and before you stop mid-task. `get_review` returns the latest checkpoint. Summarise — never paste transcripts, secrets, tokens or .env values. Refused on a finished or archived card.",
    readOnly: false,
    properties: {
      board_id: BOARD_ID,
      card: CARD,
      summary: {
        type: "string",
        description:
          "What is done, what is verified (and how), what is not yet done",
      },
      next_step: {
        type: "string",
        description: "The first thing the next agent should do",
      },
      request: {
        type: "string",
        description: "What the user last asked for, in their words",
      },
      files: {
        type: "string[]",
        description: "Repo-relative paths you changed",
      },
      commands: {
        type: "object[]",
        description: "Verification commands you ran and whether they passed",
        properties: {
          command: { type: "string" },
          ok: { type: "boolean" },
        },
        required: ["command"],
      },
      git: {
        type: "object",
        description:
          "Where the code is: branch, HEAD sha, and a pushed ref holding uncommitted work, if any",
        properties: {
          branch: { type: "string" },
          head: { type: "string" },
          wip_ref: { type: "string" },
          wip_sha: { type: "string" },
        },
      },
    },
    required: ["board_id", "card", "summary"],
  },
  {
    name: "delete_review",
    title: "Archive a card",
    description:
      "Take a card off the board. This ARCHIVES it — the card and its history stay in the database and can be restored. Nothing here deletes rows.",
    readOnly: false,
    properties: {
      board_id: BOARD_ID,
      card: CARD,
    },
    required: ["board_id", "card"],
  },
];

// ── The answers ─────────────────────────────────────────────────────────────
// BE-28: the cloud's answers, field for field; the offline server answers the
// same. `apps/mcp/scripts/mcp-parity.ts` (cloud) and
// `apps/desktop/scripts/mcp-parity.mjs` (offline) check every key.

/** A lane with its live card count, as `board_summary` states it. */
export interface ToolLaneCount {
  key: string;
  label: string;
  role: ColumnRole | null;
  count: number;
}

/** A lane as `list_reviews` names it. */
export interface ToolLane {
  key: string;
  name: string;
  role: ColumnRole | null;
}

/** A card in one line, as `lifecycle_status` lists it. */
export interface CardRef {
  id: string;
  taskId: string | null;
  title: string;
}

/** Something a reviewer may want to turn into a lesson (PD-01). */
export type RetroSignal =
  | {
      kind: "changes_requested";
      reason: string;
      /** The lane the card was sent back from, and the one it went to. */
      from: string;
      to: string;
      at: string;
    }
  | { kind: "user_note"; item: string; note: string; at: string }
  | {
      kind: "verify_failed_then_fixed";
      item: string;
      /** The command whose evidence finally passed. */
      command: string;
      at: string;
    };

/** What each board tool answers, inside its text content, as JSON. */
export interface BoardToolOutputs {
  list_boards: {
    /** The normalized remote, when `repo` was passed. */
    repo?: string;
    boards: BoardSummary[];
    /** What to do next, when `repo` was passed. */
    next?: string;
  };
  create_board: {
    board_id: string;
    name: string;
    slug: string;
    repo: string;
  };
  link_repo: {
    repo: string;
    /** The repo the board was linked to before, or null. */
    previous: string | null;
    /** The boards now linked to `repo`. */
    boards: BoardSummary[];
  };
  board_summary: {
    workspaceId: string;
    role: string;
    /** The board's change sequence. */
    head: number;
    lanes: ToolLaneCount[];
    /** In-progress cards no agent has touched for over 2 hours. */
    stale: number;
    categories: { key: string; name: string }[];
    tags: TagPolicy;
    labels: { tag: string; name: string; tone: string }[];
  };
  list_reviews: { items: Card[]; head: number; columns: ToolLane[] };
  get_review: {
    /** The card; its run plan is `dispatch`, beside it. */
    item: Omit<CardDetail, "dispatch">;
    checkpoint: LatestCheckpoint | null;
    dispatch: Dispatch | null;
  };
  create_review: { item: CardDetail };
  update_review: { item: CardDetail };
  /**
   * The box that changed and the card in one line, not the whole card: a
   * card's detail is 2–3k tokens, and an agent ticks one box after another.
   * `get_review` has the rest. `ready` / `open` as `review_card` says them.
   */
  toggle_item: {
    checklistItem: ChecklistItem;
    card: CardRef & {
      columnKey: string;
      revision: number;
      /** Checked boxes, and all of them. */
      done: number;
      total: number;
    };
    ready: boolean;
    /** When not `ready`: box keys, or `group (D1/D2)` for an unsettled group. */
    open?: string[];
  };
  review_card: {
    ready: boolean;
    /** When `ready`. */
    next?: string;
    /** When not `ready`: box keys, or `group (D1/D2)` for an unsettled group. */
    open?: string[];
    item: CardDetail;
  };
  set_status: {
    item: CardDetail;
    /** Only on a move into a review lane, and only with signals. */
    retro?: { signals: RetroSignal[]; ask: string };
  };
  delete_review: {
    archived: string;
    /** The change it was recorded as; null when it was already archived. */
    seq: number | null;
  };
  checkpoint: { checkpoint: Checkpoint };
  lifecycle_status: {
    waiting: (CardRef & { done: number; total: number })[];
    ready: CardRef[];
    inFlight: (CardRef & { columnKey: string })[];
    review: (CardRef & { columnKey: string })[];
  };
}
