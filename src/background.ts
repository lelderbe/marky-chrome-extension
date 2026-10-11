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

type Confirmation = { timer?: ReturnType<typeof setTimeout> };
const confirmations = new Map<number, Confirmation>();

function cancelConfirmation(tabId: number): void {
  const confirmation = confirmations.get(tabId);
  if (confirmation?.timer !== undefined) clearTimeout(confirmation.timer);
  confirmations.delete(tabId);
}

async function clearConfirmation(tabId: number): Promise<void> {
  cancelConfirmation(tabId);
  try {
    await chrome.action.setBadgeText({ tabId, text: "" });
  } catch {
    // The tab may have closed.
  }
}

async function showSavedConfirmation(tabId: number, url: string): Promise<void> {
  cancelConfirmation(tabId);
  const confirmation: Confirmation = {};
  confirmations.set(tabId, confirmation);
  const isCurrent = () => confirmations.get(tabId) === confirmation;
  const tab = await chrome.tabs.get(tabId);
  if (!isCurrent()) return;
  if (tab.url !== url) {
    cancelConfirmation(tabId);
    return;
  }
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#188038" });
  if (!isCurrent()) return;
  await chrome.action.setIcon({ tabId, path: FILLED_ICON });
  if (!isCurrent()) return;
  await chrome.action.setBadgeText({ tabId, text: "✓" });
  if (!isCurrent()) return;
  confirmation.timer = setTimeout(() => {
    if (isCurrent()) void clearConfirmation(tabId);
  }, 1200);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== "marky:saved" ||
      !Number.isInteger(message.tabId) || typeof message.url !== "string") return;
  void showSavedConfirmation(message.tabId, message.url).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false }),
  );
  return true;
});

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
  if (changeInfo.url) void clearConfirmation(tabId);
  if (!changeInfo.url && changeInfo.status !== "complete") {
    return;
  }

  void updateIconForTab(tabId, tab.url);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  cancelConfirmation(tabId);
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
