// What each board tool answers, as data a script can check a live answer
// against (BE-28). `BoardToolOutputs` states it for the compiler; types do not
// exist at run time, so this file states it again for the two parity gates:
// `apps/desktop/scripts/mcp-parity.mjs` (offline server) and
// `apps/mcp/scripts/mcp-parity.ts` in the cloud repo. One definition, so
// the two servers are held to the same answer.
//
// NOTE: An object shape is exact: a missing key and an extra one are both
// drift. Change this file together with `BoardToolOutputs` in board.ts.
import type { BoardToolName } from "./board";

/** A run-time description of a JSON value. */
export type Shape =
  | { kind: "string" | "number" | "boolean" | "any" }
  | { kind: "nullable" | "optional" | "list" | "record"; inner: Shape }
  | { kind: "object"; fields: Record<string, Shape> }
  | { kind: "enum"; values: readonly unknown[] };

const str: Shape = { kind: "string" };
const num: Shape = { kind: "number" };
const bool: Shape = { kind: "boolean" };
const any: Shape = { kind: "any" };
const nullable = (inner: Shape): Shape => ({ kind: "nullable", inner });
const optional = (inner: Shape): Shape => ({ kind: "optional", inner });
const list = (inner: Shape): Shape => ({ kind: "list", inner });
const record = (inner: Shape): Shape => ({ kind: "record", inner });
const obj = (fields: Record<string, Shape>): Shape => ({
  kind: "object",
  fields,
});
const oneOf = (...values: unknown[]): Shape => ({ kind: "enum", values });

const PRIORITY = nullable(oneOf("low", "medium", "high"));
const COLUMN_ROLE = nullable(
  oneOf("intake", "start", "active", "review", "done", "archive"),
);

const BOARD_SUMMARY = obj({
  workspaceId: str,
  name: str,
  role: str,
  changeSeq: num,
  repo: nullable(str),
});
const CHECKLIST_ITEM = obj({
  key: str,
  section: oneOf("decisions", "verify"),
  text: str,
  checked: bool,
  checkedAt: nullable(str),
  note: nullable(str),
  group: nullable(str),
  stream: nullable(str),
  checkedBy: optional(any),
  evidence: optional(any),
});
const STREAM = obj({
  key: str,
  title: str,
  goal: str,
  role: oneOf("research", "implement", "test"),
  owns: list(str),
  reads: list(str),
  dependsOn: list(str),
  isolation: oneOf("worktree", "shared"),
  position: num,
});
const DISPATCH = obj({ waves: list(list(str)), briefs: record(str) });
const CARD_FIELDS: Record<string, Shape> = {
  id: str,
  workspaceId: str,
  seq: num,
  revision: num,
  type: oneOf("epic", "issue", "task"),
  parentId: nullable(str),
  columnKey: str,
  rank: str,
  title: str,
  body: str,
  priority: PRIORITY,
  estimate: nullable(num),
  categoryKey: nullable(str),
  taskId: nullable(str),
  tags: list(str),
  checklistProgress: obj({ done: num, total: num }),
  streams: list(STREAM),
  metadata: nullable(any),
  source: nullable(any),
  createdAt: nullable(str),
  updatedAt: nullable(str),
  startedAt: nullable(str),
  completedAt: nullable(str),
  dueAt: nullable(str),
  archivedAt: nullable(str),
  stale: optional(nullable(any)),
  changesRequested: optional(nullable(any)),
};
const CARD = obj(CARD_FIELDS);
const DETAIL_FIELDS: Record<string, Shape> = {
  ...CARD_FIELDS,
  checklist: list(CHECKLIST_ITEM),
  assignees: obj({ users: list(str), agents: list(str) }),
  links: list(any),
  attachments: list(any),
  subscribers: list(str),
  subscribed: bool,
  favorite: bool,
  commentCount: num,
};
/** `CardDetail`, run plan included. */
const CARD_DETAIL = obj({ ...DETAIL_FIELDS, dispatch: nullable(DISPATCH) });
/** `get_review`'s card: its run plan sits beside it. */
const CARD_DETAIL_NO_DISPATCH = obj(DETAIL_FIELDS);
const CHECKPOINT_FIELDS: Record<string, Shape> = {
  id: str,
  agent: str,
  userId: str,
  machineId: nullable(str),
  createdAt: str,
  request: nullable(str),
  summary: str,
  nextStep: nullable(str),
  files: list(str),
  commands: list(obj({ command: str, ok: nullable(bool) })),
  host: nullable(str),
  session: nullable(str),
  git: nullable(
    obj({
      branch: nullable(str),
      head: nullable(str),
      wipRef: nullable(str),
      wipSha: nullable(str),
      diffStat: nullable(str),
    }),
  ),
};
const CARD_REF_FIELDS: Record<string, Shape> = {
  id: str,
  taskId: nullable(str),
  title: str,
};

/** `BoardToolOutputs`, tool by tool. */
export const BOARD_TOOL_OUTPUT_SHAPES: Record<BoardToolName, Shape> = {
  list_boards: obj({
    repo: optional(str),
    boards: list(BOARD_SUMMARY),
    next: optional(str),
  }),
  create_board: obj({ board_id: str, name: str, slug: str, repo: str }),
  link_repo: obj({
    repo: str,
    previous: nullable(str),
    boards: list(BOARD_SUMMARY),
  }),
  board_summary: obj({
    workspaceId: str,
    role: str,
    head: num,
    lanes: list(obj({ key: str, label: str, role: COLUMN_ROLE, count: num })),
    stale: num,
    categories: list(obj({ key: str, name: str })),
    tags: obj({ max: num, allowed: list(str) }),
    labels: list(obj({ tag: str, name: str, tone: str })),
  }),
  list_reviews: obj({
    items: list(CARD),
    head: num,
    columns: list(obj({ key: str, name: str, role: COLUMN_ROLE })),
  }),
  get_review: obj({
    item: CARD_DETAIL_NO_DISPATCH,
    checkpoint: nullable(
      obj({
        ...CHECKPOINT_FIELDS,
        nextStepFrom: nullable(obj({ id: str, agent: str, createdAt: str })),
      }),
    ),
    dispatch: nullable(DISPATCH),
  }),
  create_review: obj({ item: CARD_DETAIL }),
  update_review: obj({ item: CARD_DETAIL }),
  toggle_item: obj({
    checklistItem: CHECKLIST_ITEM,
    card: obj({
      ...CARD_REF_FIELDS,
      columnKey: str,
      revision: num,
      done: num,
      total: num,
    }),
    ready: bool,
    open: optional(list(str)),
  }),
  review_card: obj({
    ready: bool,
    next: optional(str),
    open: optional(list(str)),
    item: CARD_DETAIL,
  }),
  set_status: obj({
    item: CARD_DETAIL,
    retro: optional(obj({ signals: list(any), ask: str })),
  }),
  delete_review: obj({ archived: str, seq: nullable(num) }),
  checkpoint: obj({ checkpoint: obj(CHECKPOINT_FIELDS) }),
  lifecycle_status: obj({
    waiting: list(obj({ ...CARD_REF_FIELDS, done: num, total: num })),
    ready: list(obj(CARD_REF_FIELDS)),
    inFlight: list(obj({ ...CARD_REF_FIELDS, columnKey: str })),
    review: list(obj({ ...CARD_REF_FIELDS, columnKey: str })),
  }),
};

/**
 * Every way a board tool's answer differs from its contract, as
 * `path: what` lines; empty when it matches.
 */
export function boardToolOutputProblems(
  name: BoardToolName,
  value: unknown,
): string[] {
  const out: string[] = [];
  const check = (shape: Shape, v: unknown, path: string): void => {
    switch (shape.kind) {
      case "any":
        return;
      case "optional":
        if (v !== undefined) check(shape.inner, v, path);
        return;
      case "nullable":
        if (v !== null) check(shape.inner, v, path);
        return;
      case "string":
      case "number":
      case "boolean":
        if (typeof v !== shape.kind)
          out.push(`${path}: expected ${shape.kind}, got ${JSON.stringify(v)}`);
        return;
      case "enum":
        if (!shape.values.includes(v))
          out.push(
            `${path}: ${JSON.stringify(v)} is not one of ${shape.values.join(", ")}`,
          );
        return;
      case "list":
        if (!Array.isArray(v)) out.push(`${path}: expected a list`);
        else
          for (const [i, entry] of v.entries())
            check(shape.inner, entry, `${path}[${i}]`);
        return;
      case "record":
        if (typeof v !== "object" || v === null || Array.isArray(v))
          out.push(`${path}: expected an object`);
        else
          for (const [k, entry] of Object.entries(v))
            check(shape.inner, entry, `${path}.${k}`);
        return;
      case "object": {
        if (typeof v !== "object" || v === null || Array.isArray(v)) {
          out.push(`${path}: expected an object`);
          return;
        }
        const fields = v as Record<string, unknown>;
        for (const [k, field] of Object.entries(shape.fields)) {
          if (!(k in fields) && field.kind !== "optional")
            out.push(`${path}.${k}: missing`);
          else check(field, fields[k], `${path}.${k}`);
        }
        for (const k of Object.keys(fields))
          if (!(k in shape.fields))
            out.push(`${path}.${k}: not in the contract`);
        return;
      }
    }
  };
  check(BOARD_TOOL_OUTPUT_SHAPES[name], value, name);
  return out;
}
