export type BookmarkFolder = {
  id: string;
  title: string;
};

export const RECENT_FOLDERS_KEY = "recentFolderIds";
export const RECENT_FOLDERS_LIMIT = 5;

export const UNSUPPORTED_URL_PREFIXES = ["chrome://", "chrome-extension://"] as const;
