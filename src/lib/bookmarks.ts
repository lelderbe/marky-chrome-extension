import { UNSUPPORTED_URL_PREFIXES } from "../types";

async function getBookmarksBarId(): Promise<string> {
  const tree = await chrome.bookmarks.getTree();
  const rootFolders = tree.flatMap((root) => root.children ?? [])
    .filter((node) => !node.url && !node.unmodifiable);
  const bars = rootFolders.filter((node) => node.folderType === "bookmarks-bar");
  // Account and local bars can coexist. Prefer account storage for new folders.
  const bar = bars.find((node) => node.syncing) ?? bars[0]
    // Before Chrome 134, folderType was unavailable and the bar had ID "1".
    ?? rootFolders.find((node) => node.folderType === undefined && node.id === "1");
  if (!bar) {
    throw new Error("No writable Bookmarks bar found");
  }
  return bar.id;
}

export class CreatedFolderSaveError extends Error {
  constructor(readonly folderId: string) {
    super("The folder was created, but saving the page failed");
  }
}

export function isBookmarkableUrl(url: string | undefined): url is string {
  if (!url) {
    return false;
  }

  return !UNSUPPORTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export async function getBookmarksByUrl(
  url: string,
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return chrome.bookmarks.search({ url });
}

export async function hasBookmarkForUrl(url: string): Promise<boolean> {
  const existing = await getBookmarksByUrl(url);
  return existing.some((bookmark) => Boolean(bookmark.url));
}

export async function saveToFolder(
  tab: chrome.tabs.Tab,
  folderId: string,
): Promise<void> {
  const url = tab.url;
  if (!isBookmarkableUrl(url)) {
    throw new Error("This page cannot be bookmarked");
  }

  const existing = await getBookmarksByUrl(url);
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

export async function createFolderAndSave(
  tab: chrome.tabs.Tab,
  folderTitle: string,
): Promise<void> {
  if (!isBookmarkableUrl(tab.url)) {
    throw new Error("This page cannot be bookmarked");
  }

  const title = folderTitle.trim();
  if (!title) {
    throw new Error("Folder name cannot be empty");
  }

  const parentId = await getBookmarksBarId();
  const folder = await chrome.bookmarks.create({
    parentId,
    title,
  });

  try {
    await saveToFolder(tab, folder.id);
  } catch (error) {
    // Remove only our empty folder; never remove bookmarks added meanwhile.
    let removed = false;
    try {
      if ((await chrome.bookmarks.getChildren(folder.id)).length === 0) {
        await chrome.bookmarks.remove(folder.id);
        removed = true;
      }
    } catch {
      // Preserve the original save error if cleanup is unavailable.
    }
    if (!removed) throw new CreatedFolderSaveError(folder.id);
    throw error;
  }
}
