import { describe, expect, test } from "bun:test";
import {
  PROJECT_AVATAR_COLORS,
  PROJECT_AVATAR_ICONS,
  parseProjectAvatar,
} from "../src";

describe("parseProjectAvatar accepts", () => {
  for (const color of PROJECT_AVATAR_COLORS) {
    test(`each kind on ${color}`, () => {
      for (const avatar of [
        { kind: "letter", text: "LW", color },
        { kind: "letter", text: "A", color },
        { kind: "emoji", emoji: "🚀", color },
        { kind: "icon", icon: "Rocket01Icon", color },
      ]) {
        expect(parseProjectAvatar(avatar)).toEqual(avatar as never);
      }
    });
  }

  test("every curated icon", () => {
    for (const icon of PROJECT_AVATAR_ICONS) {
      expect(parseProjectAvatar({ kind: "icon", icon, color: "blue" })).toEqual(
        { kind: "icon", icon, color: "blue" },
      );
    }
  });

  test("letters as graphemes, not code units", () => {
    for (const text of ["Đô", "é", "éa", "日本"]) {
      expect(
        parseProjectAvatar({ kind: "letter", text, color: "red" }),
      ).not.toBeNull();
    }
  });

  test("one multi-code-point emoji grapheme", () => {
    for (const emoji of ["👩‍💻", "👍🏽", "🇻🇳", "1️⃣", "❤️", "🏳️‍🌈"]) {
      expect(
        parseProjectAvatar({ kind: "emoji", emoji, color: "pink" }),
      ).toEqual({ kind: "emoji", emoji, color: "pink" });
    }
  });

  test("and drops extra keys", () => {
    expect(
      parseProjectAvatar({ kind: "letter", text: "A", color: "red", x: 1 }),
    ).toEqual({ kind: "letter", text: "A", color: "red" });
  });
});

describe("parseProjectAvatar refuses", () => {
  test("anything that is not an object", () => {
    for (const value of [null, undefined, "A", 1, true, [], ["letter"]]) {
      expect(parseProjectAvatar(value)).toBeNull();
    }
  });

  test("an unknown or missing kind", () => {
    expect(parseProjectAvatar({ kind: "image", color: "red" })).toBeNull();
    expect(parseProjectAvatar({ text: "A", color: "red" })).toBeNull();
  });

  test("an unknown, hex or missing colour", () => {
    for (const color of ["purple", "#ff0000", "Red", "", undefined, 3]) {
      expect(
        parseProjectAvatar({ kind: "letter", text: "A", color }),
      ).toBeNull();
    }
  });

  test("an unknown icon", () => {
    for (const icon of ["AbacusIcon", "rocket-01", "Rocket01", "", 1]) {
      expect(
        parseProjectAvatar({ kind: "icon", icon, color: "red" }),
      ).toBeNull();
    }
  });

  test("letter text over 2 characters, empty, blank or padded", () => {
    for (const text of ["ABC", "Lane", "", " ", " A", "A ", "A​", 1]) {
      expect(
        parseProjectAvatar({ kind: "letter", text, color: "red" }),
      ).toBeNull();
    }
  });

  test("more than one emoji grapheme, or not an emoji", () => {
    for (const emoji of ["🚀🚀", "👍🏽🎉", "🇻🇳🇺🇸", "A", "AB", "", " ", 1]) {
      expect(
        parseProjectAvatar({ kind: "emoji", emoji, color: "red" }),
      ).toBeNull();
    }
  });

  test("a field from another kind", () => {
    expect(
      parseProjectAvatar({ kind: "emoji", text: "🚀", color: "red" }),
    ).toBeNull();
    expect(
      parseProjectAvatar({ kind: "letter", icon: "StarIcon", color: "red" }),
    ).toBeNull();
  });
});
