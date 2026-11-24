import { describe, expect, test } from "bun:test";
import { CONTROL_TOOLS } from "../src";

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
});
