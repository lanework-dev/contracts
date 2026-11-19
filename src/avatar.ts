// A project's chosen avatar: a letter, an emoji or an icon on a colour from a
// fixed palette. Synced with the project, so every machine and teammate sees
// the same mark. A project without one keeps its default mark: its owner's
// GitHub icon, or the letter tile.

/**
 * Colour ids, never hex: there are no custom colours. Each app draws an id
 * its own way, in light and dark.
 */
export const PROJECT_AVATAR_COLORS = [
  // solid
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "sky",
  "blue",
  "violet",
  "pink",
  // gradient
  "sunset",
  "ocean",
  "forest",
  "candy",
  "dusk",
  "aurora",
] as const;

export type ProjectAvatarColor = (typeof PROJECT_AVATAR_COLORS)[number];

/**
 * The icons a project may pick: export names from `@hugeicons/core-free-icons`
 * (checked against 4.3.0). A curated list, not the whole set, so an app only
 * bundles these. Removing a name is a breaking change; adding one is minor.
 */
export const PROJECT_AVATAR_ICONS = [
  // work and code
  "Rocket01Icon",
  "SourceCodeIcon",
  "ComputerTerminal01Icon",
  "GitBranchIcon",
  "Bug01Icon",
  "Database01Icon",
  "ServerStack01Icon",
  "CloudIcon",
  "Globe02Icon",
  "Link01Icon",
  "Layers01Icon",
  "Package01Icon",
  "DashboardSquare01Icon",
  "Settings01Icon",
  "Wrench01Icon",
  "Shield01Icon",
  "LockIcon",
  "Robot01Icon",
  "AiBrain01Icon",
  "SparklesIcon",
  "MagicWand01Icon",
  // business
  "Briefcase01Icon",
  "Analytics01Icon",
  "ChartLineData01Icon",
  "Wallet01Icon",
  "CreditCardIcon",
  "ShoppingCart01Icon",
  "ShoppingBag01Icon",
  "Store01Icon",
  "Target02Icon",
  "Flag01Icon",
  "Award01Icon",
  // communication and documents
  "Mail01Icon",
  "BubbleChatIcon",
  "Notification01Icon",
  "Calendar03Icon",
  "Clock01Icon",
  "Folder01Icon",
  "File01Icon",
  "Book02Icon",
  "School01Icon",
  "PencilEdit01Icon",
  // people and places
  "Home01Icon",
  "UserIcon",
  "UserGroupIcon",
  "Location01Icon",
  "Compass01Icon",
  "Car01Icon",
  "Airplane01Icon",
  "AnchorIcon",
  // media and play
  "PaintBoardIcon",
  "ColorsIcon",
  "Image01Icon",
  "Camera01Icon",
  "MusicNote01Icon",
  "HeadphonesIcon",
  "GameController01Icon",
  "PuzzleIcon",
  // science
  "Atom01Icon",
  "TestTube01Icon",
  "Idea01Icon",
  // nature and things
  "Sun01Icon",
  "Moon02Icon",
  "FlashIcon",
  "FireIcon",
  "Leaf01Icon",
  "Plant01Icon",
  "Tree01Icon",
  "Coffee01Icon",
  "Pizza01Icon",
  "BirthdayCakeIcon",
  "GiftIcon",
  "Diamond01Icon",
  "CrownIcon",
  "StarIcon",
  "FavouriteIcon",
  "SmileIcon",
] as const;

export type ProjectAvatarIcon = (typeof PROJECT_AVATAR_ICONS)[number];

/**
 * A project's chosen avatar. On the wire `avatar?: ProjectAvatar | null`:
 * absent leaves it alone, `null` clears it back to the default mark.
 */
export type ProjectAvatar =
  /** 1-2 characters (graphemes), e.g. initials. */
  | { kind: "letter"; text: string; color: ProjectAvatarColor }
  /** Exactly one emoji grapheme. */
  | { kind: "emoji"; emoji: string; color: ProjectAvatarColor }
  /** A name from {@link PROJECT_AVATAR_ICONS}. */
  | { kind: "icon"; icon: ProjectAvatarIcon; color: ProjectAvatarColor };

const COLORS: ReadonlySet<string> = new Set(PROJECT_AVATAR_COLORS);
const ICONS: ReadonlySet<string> = new Set(PROJECT_AVATAR_ICONS);
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
// Control and format characters (zero-width joiners, direction marks).
const CONTROL = /\p{Cc}|\p{Cf}/u;
// A grapheme that is an emoji: a pictograph, a flag (regional indicators) or
// a keycap.
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

function graphemes(text: string): string[] {
  return Array.from(GRAPHEMES.segment(text), (s) => s.segment);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read an avatar from untrusted input, strictly: an unknown kind, colour or
 * icon, letter text that is empty, blank or over 2 characters, or an emoji
 * that is not exactly one emoji grapheme gives null. Extra keys are dropped.
 */
export function parseProjectAvatar(value: unknown): ProjectAvatar | null {
  if (!isObject(value)) return null;
  const { kind, color } = value;
  if (typeof color !== "string" || !COLORS.has(color)) return null;
  const c = color as ProjectAvatarColor;

  switch (kind) {
    case "letter": {
      const { text } = value;
      if (typeof text !== "string" || text.trim() !== text) return null;
      if (CONTROL.test(text)) return null;
      const n = graphemes(text).length;
      if (n < 1 || n > 2) return null;
      return { kind, text, color: c };
    }
    case "emoji": {
      const { emoji } = value;
      if (typeof emoji !== "string") return null;
      const g = graphemes(emoji);
      if (g.length !== 1 || !EMOJI.test(emoji)) return null;
      return { kind, emoji, color: c };
    }
    case "icon": {
      const { icon } = value;
      if (typeof icon !== "string" || !ICONS.has(icon)) return null;
      return { kind, icon: icon as ProjectAvatarIcon, color: c };
    }
    default:
      return null;
  }
}
