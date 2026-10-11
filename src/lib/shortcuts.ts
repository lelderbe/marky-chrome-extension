export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  if (!shortcut) return false;

  const parts = shortcut
    .replace(/⌘/g, "Command+")
    .replace(/⌃/g, "Ctrl+")
    .replace(/⌥/g, "Alt+")
    .replace(/⇧/g, "Shift+")
    .split("+")
    .map((part) => part.trim());
  const key = parts.pop() ?? "";

  if (
    event.metaKey !== parts.includes("Command") ||
    event.ctrlKey !== (parts.includes("Ctrl") || parts.includes("MacCtrl")) ||
    event.altKey !== (parts.includes("Alt") || parts.includes("Option")) ||
    event.shiftKey !== parts.includes("Shift")
  ) return false;

  // Physical letter keys continue working with a non-Latin keyboard layout.
  if (/^[a-z]$/i.test(key)) return event.code === `Key${key.toUpperCase()}`;
  if (/^\d$/.test(key)) return event.code === `Digit${key}`;
  const keys: Record<string, string> = {
    Up: "ArrowUp", Down: "ArrowDown", Left: "ArrowLeft", Right: "ArrowRight",
    Space: " ", Comma: ",", Period: ".", "↑": "ArrowUp", "↓": "ArrowDown",
    "←": "ArrowLeft", "→": "ArrowRight",
  };
  return event.key === (keys[key] ?? key);
}
