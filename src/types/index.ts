export type BookmarkFolder = {
  id: string;
  title: string;
  dateGroupModified: number;
};

export const UNSUPPORTED_URL_PREFIXES = ["chrome://", "chrome-extension://"] as const;
