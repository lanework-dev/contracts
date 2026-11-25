import { describe, expect, test } from "bun:test";
import { CONTROL_TOOLS, controlToolsFor } from "../src";

const tool = (name: string) =>
  CONTROL_TOOLS.find((entry) => entry.name === name);

describe("a conductor's sessions and the user", () => {
  test("sessions_start takes userAccess, optional, a boolean", () => {
    const start = tool("sessions_start");
    expect(start?.properties.userAccess?.type).toBe("boolean");
    expect(start?.required).not.toContain("userAccess");
  });

  test("sessions_access grants or takes back the user's access", () => {
    const access = tool("sessions_access");
    expect(access?.action).toBe("sessions.access");
    expect(access?.role).toBe("conductor");
    expect(access?.readOnly).toBe(false);
    expect(access?.required).toEqual(["sessionId", "userAccess"]);
  });

  test("sessions_answer answers a permission request of a session", () => {
    const answer = tool("sessions_answer");
    expect(answer?.action).toBe("sessions.answer");
    expect(answer?.role).toBe("conductor");
    expect(answer?.readOnly).toBe(false);
    expect(answer?.required).toEqual(["sessionId", "requestId", "allow"]);
    expect(answer?.properties.message?.type).toBe("string");
  });

  test("thread_read reads back the caller's own thread, for any conversation", () => {
    const read = tool("thread_read");
    expect(read?.action).toBe("thread.read");
    expect(read?.role).toBe("any");
    expect(read?.readOnly).toBe(true);
    expect(read?.required ?? []).toEqual([]);
    expect(read?.properties.limit?.maximum).toBe(20);
  });

  test("follow-ups take a short summary", () => {
    for (const name of [
      "sessions_start",
      "sessions_send",
      "run_steer",
      "run_message",
    ] as const)
      expect(tool(name)?.properties.summary?.type).toBe("string");
  });

  test("conversations_list and conversation_message reach other conversations", () => {
    const list = tool("conversations_list");
    expect(list?.action).toBe("conversations.list");
    expect(list?.readOnly).toBe(true);
    const message = tool("conversation_message");
    expect(message?.action).toBe("conversations.message");
    expect(message?.role).toBe("any");
    expect(message?.required).toEqual(["to", "text"]);
  });
});

describe("a routine run's pace (FE-172)", () => {
  test("schedule_next takes minutes from 5 to 1440 and an optional reason", () => {
    const next = tool("schedule_next");
    expect(next?.action).toBe("loop.next");
    expect(next?.role).toBe("routine");
    expect(next?.readOnly).toBe(false);
    expect(next?.required).toEqual(["minutes"]);
    expect(next?.properties.minutes?.minimum).toBe(5);
    expect(next?.properties.minutes?.maximum).toBe(1440);
    expect(next?.properties.reason?.type).toBe("string");
  });

  test("schedule_stop ends the loop", () => {
    const stop = tool("schedule_stop");
    expect(stop?.action).toBe("loop.stop");
    expect(stop?.role).toBe("routine");
    expect(stop?.required ?? []).toEqual([]);
  });

  test("only a routine run sees them", () => {
    const names = (roles: Parameters<typeof controlToolsFor>[0]) =>
      controlToolsFor(roles).map((entry) => entry.name);
    expect(names({ conductor: true, lead: true })).not.toContain(
      "schedule_next",
    );
    expect(names({ conductor: false, lead: false, routine: true })).toEqual(
      expect.arrayContaining(["schedule_next", "schedule_stop"]),
    );
    expect(
      names({ conductor: false, lead: false, routine: true }),
    ).not.toContain("sessions_start");
  });
});
