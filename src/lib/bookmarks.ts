import { UNSUPPORTED_URL_PREFIXES } from "../types";

export function isBookmarkableUrl(url: string | undefined): url is string {
  if (!url) {
    return false;
  }

  return !UNSUPPORTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export async function saveToFolder(
  tab: chrome.tabs.Tab,
  folderId: string,
): Promise<void> {
  const url = tab.url;
  if (!isBookmarkableUrl(url)) {
    return;
  }

  const existing = await chrome.bookmarks.search({ url });
  const inTarget = existing.find((bookmark) => bookmark.parentId === folderId);

  if (inTarget) {
    return;
  }

  const elsewhere = existing.find((bookmark) => bookmark.parentId !== folderId);
  if (elsewhere) {
    await chrome.bookmarks.move(elsewhere.id, { parentId: folderId });
    return;
  }

  await chrome.bookmarks.create({
    parentId: folderId,
    title: tab.title ?? url,
    url,
  });
}
