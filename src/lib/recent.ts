import {
  RECENT_FOLDERS_KEY,
  RECENT_FOLDERS_LIMIT,
} from "../types";

export async function getRecentFolderIds(): Promise<string[]> {
  const result = await chrome.storage.local.get(RECENT_FOLDERS_KEY);
  const recentFolderIds = result[RECENT_FOLDERS_KEY];

  if (!Array.isArray(recentFolderIds)) {
    return [];
  }

  return recentFolderIds.filter((id): id is string => typeof id === "string");
}

export async function pushRecentFolder(folderId: string): Promise<void> {
  const recentFolderIds = await getRecentFolderIds();
  const nextRecentFolderIds = [
    folderId,
    ...recentFolderIds.filter((id) => id !== folderId),
  ].slice(0, RECENT_FOLDERS_LIMIT);

  await chrome.storage.local.set({
    [RECENT_FOLDERS_KEY]: nextRecentFolderIds,
  });
}
