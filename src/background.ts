import { hasBookmarkForUrl, isBookmarkableUrl } from "./lib/bookmarks";

const FILLED_ICON = {
  16: "/icons/icon16.png",
  32: "/icons/icon32.png",
  48: "/icons/icon48.png",
  128: "/icons/icon128.png",
};

const OUTLINE_ICON = {
  16: "/icons/icon-outline16.png",
  32: "/icons/icon-outline32.png",
  48: "/icons/icon-outline48.png",
  128: "/icons/icon-outline128.png",
};

async function updateIconForTab(
  tabId: number,
  url: string | undefined,
): Promise<void> {
  const isBookmarked =
    isBookmarkableUrl(url) && (await hasBookmarkForUrl(url));

  try {
    await chrome.action.setIcon({
      tabId,
      path: isBookmarked ? FILLED_ICON : OUTLINE_ICON,
    });
  } catch {
    // Tab may have been closed before the icon could be set.
  }
}

async function updateTabsWithUrl(url: string): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((tab) => {
      if (tab.id === undefined || tab.url !== url) {
        return;
      }

      return updateIconForTab(tab.id, tab.url);
    }),
  );
}

async function updateActiveTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true });
  await Promise.all(
    tabs.map((tab) => {
      if (tab.id === undefined) {
        return;
      }

      return updateIconForTab(tab.id, tab.url);
    }),
  );
}

async function handleBookmarkUrlChange(url: string | undefined): Promise<void> {
  if (!url) {
    await updateActiveTabs();
    return;
  }

  await updateTabsWithUrl(url);
}

async function handleTabActivated(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    await updateIconForTab(tabId, tab.url);
  } catch {
    return;
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void handleTabActivated(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== "complete") {
    return;
  }

  void updateIconForTab(tabId, tab.url);
});

chrome.bookmarks.onCreated.addListener((_id, bookmark) => {
  void handleBookmarkUrlChange(bookmark.url);
});

chrome.bookmarks.onRemoved.addListener((_id, removeInfo) => {
  void handleBookmarkUrlChange(removeInfo.node.url);
});

chrome.bookmarks.onChanged.addListener((_id, changeInfo) => {
  if (!changeInfo.url) {
    return;
  }

  void handleBookmarkUrlChange(changeInfo.url);
});

chrome.runtime.onStartup.addListener(() => {
  void updateActiveTabs();
});

chrome.runtime.onInstalled.addListener(() => {
  void updateActiveTabs();
});
