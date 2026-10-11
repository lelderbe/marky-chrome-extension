import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreatedFolderSaveError, createFolderAndSave, getBookmarksByUrl, isBookmarkableUrl, saveToFolder } from "../lib/bookmarks";
import { filterFolders, getAllFolders } from "../lib/folders";
import { matchesShortcut } from "../lib/shortcuts";
import { getActiveTab } from "../lib/tabs";
import type { BookmarkFolder } from "../types";
import { FilterInput } from "./components/FilterInput";
import { FolderList } from "./components/FolderList";

const USED_KEY = "marky.hasSaved";
const message = (key: string, value?: string) => chrome.i18n.getMessage(key, value);
type SaveAction = { kind: "folder"; id: string } | { kind: "new"; title: string };

function needsHelp(): boolean {
  try { return localStorage.getItem(USED_KEY) !== "true"; }
  catch { return true; }
}

export function App() {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab>();
  const [bookmarks, setBookmarks] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<"load" | "save" | "settings" | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showHelp, setShowHelp] = useState(needsHelp);
  const [shortcut, setShortcut] = useState<string | null>(null);
  const saving = useRef(false);
  const lastAction = useRef<SaveAction | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const focusSearch = useCallback(() => {
    searchInput.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);
    void (async () => {
      try {
        const [allFolders, tab] = await Promise.all([getAllFolders(), getActiveTab()]);
        const saved = isBookmarkableUrl(tab?.url) ? await getBookmarksByUrl(tab.url) : [];
        if (!mounted) return;
        setFolders(allFolders);
        setActiveTab(tab);
        setBookmarks(saved.filter((bookmark) => Boolean(bookmark.url)));
      } catch {
        if (mounted) setError("load");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [loadAttempt]);

  useEffect(() => {
    let mounted = true;
    void chrome.commands.getAll().then((commands) => {
      if (mounted) setShortcut(commands.find((command) => command.name === "_execute_action")?.shortcut ?? "");
    }).catch(() => {
      if (mounted) setShortcut(null);
    });
    return () => { mounted = false; };
  }, []);

  const visibleFolders = useMemo(() => filterFolders(folders, filterQuery), [folders, filterQuery]);
  const currentFolderIds = bookmarks.flatMap((bookmark) => bookmark.parentId ? [bookmark.parentId] : []);
  const currentFolders = folders.filter((folder) => currentFolderIds.includes(folder.id));
  const trimmedQuery = filterQuery.trim();
  const canCreateNew = trimmedQuery.length > 0 && visibleFolders.length === 0;
  const available = !isLoading && error !== "load" && isBookmarkableUrl(activeTab?.url);
  const selectedFolder = visibleFolders[selectedIndex];
  const alreadyInSelection = selectedFolder && currentFolderIds.includes(selectedFolder.id);

  useEffect(() => { setSelectedIndex(0); }, [filterQuery, folders]);

  useEffect(() => {
    if (available && !isSaving) focusSearch();
  }, [available, isSaving, focusSearch]);

  const save = useCallback(async (action: SaveAction) => {
    if (saving.current || !available || !activeTab) return;
    // A ref blocks repeat Enter/clicks even before React has rendered the busy state.
    saving.current = true;
    setIsSaving(true);
    setError(null);
    lastAction.current = action;
    try {
      if (action.kind === "new") await createFolderAndSave(activeTab, action.title);
      else await saveToFolder(activeTab, action.id);
    } catch (saveError) {
      if (saveError instanceof CreatedFolderSaveError) {
        lastAction.current = { kind: "folder", id: saveError.folderId };
        try { setFolders(await getAllFolders()); } catch { /* Retry still targets the already-created folder. */ }
      }
      setError("save");
      saving.current = false;
      setIsSaving(false);
      return;
    }
    try { localStorage.setItem(USED_KEY, "true"); } catch { /* Saving still succeeds without preferences. */ }
    if (activeTab.id !== undefined) {
      // Confirmation is best effort; an icon error must never turn a successful save into a retry.
      try { await chrome.runtime.sendMessage({ type: "marky:saved", tabId: activeTab.id, url: activeTab.url }); } catch { /* Tab or worker may have closed. */ }
    }
    window.close();
  }, [activeTab, available]);

  const openShortcutSettings = async () => {
    try {
      await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
      window.close();
    } catch {
      setError("settings");
      focusSearch();
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || matchesShortcut(event, shortcut ?? "")) {
        event.preventDefault();
        window.close();
        return;
      }
      // Buttons retain their native Enter/Space behavior (help, retry, and individual folders).
      if (event.target instanceof Element && event.target.closest("button")) return;
      if (!available || saving.current) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(0, Math.min(index + (event.key === "ArrowDown" ? 1 : -1), visibleFolders.length - 1)));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (canCreateNew) void save({ kind: "new", title: trimmedQuery });
        else if (selectedFolder) void save({ kind: "folder", id: selectedFolder.id });
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [available, canCreateNew, save, selectedFolder, shortcut, trimmedQuery, visibleFolders.length]);

  const footerKey = isSaving ? "saving" : canCreateNew ? "keyboardCreate" : alreadyInSelection ? "keyboardAlreadySaved" : bookmarks.length ? "keyboardMove" : "keyboardSave";

  return (
    <div className="popup" aria-busy={isLoading || isSaving} onClick={(event) => {
      if (event.detail > 0 && event.target instanceof Element &&
          !event.target.closest("input, button, a")) focusSearch();
    }}>
      <header className="popup-header">
        <h1>{message("savePageTo")}</h1>
        <button
          className="help-button"
          type="button"
          disabled={isSaving}
          aria-label={message("help")}
          aria-expanded={showHelp}
          aria-controls="popup-help"
          onMouseDown={(event) => {
            // Mouse clicks keep the search caret; Tab still reaches the help button.
            if (event.button === 0) event.preventDefault();
          }}
          onClick={(event) => {
            setShowHelp((value) => !value);
            if (event.detail > 0) focusSearch();
          }}
        >?</button>
      </header>
      {showHelp && (
        <section id="popup-help" className="popup-help" aria-label={message("help")}>
          <p>{message("firstSaveHint")}</p>
          {shortcut ? <p className="shortcut-hint">{message("openWithShortcut", shortcut)}</p> : <p className="shortcut-hint">{message(shortcut === "" ? "shortcutUnassigned" : "shortcutUnknown")}</p>}
          <button className="text-button" type="button" disabled={isSaving} onClick={() => void openShortcutSettings()}>{message("configureShortcut")}</button>
        </section>
      )}
      {isLoading ? <p className="popup-status" role="status">{message("loading")}</p> : error === "load" ? (
        <div className="popup-error" role="alert">
          <p>{message("loadError")}</p>
          <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>{message("retry")}</button>
        </div>
      ) : !available ? (
        <div className="popup-status" role="status">
          <p>{message(activeTab?.url ? "unsupportedPage" : "missingPage")}</p>
        </div>
      ) : (
        <>
          {bookmarks.length > 0 && (
            <p className="saved-location">{message("alreadySavedIn", currentFolders.map((folder) => folder.title).join(", ") || message("unknownFolder"))}</p>
          )}
          <FilterInput inputRef={searchInput} value={filterQuery} onChange={(value) => { setFilterQuery(value); setError(null); }} disabled={isSaving} />
          <FolderList folders={visibleFolders} selectedIndex={selectedIndex} currentFolderIds={currentFolderIds} disabled={isSaving}
            newFolderTitle={canCreateNew ? trimmedQuery : undefined}
            onSelect={(id) => { void save({ kind: "folder", id }); }}
            onCreateNew={(title) => { void save({ kind: "new", title }); }} onHover={setSelectedIndex} />
          <footer className="keyboard-hint" role="status">{message(footerKey)}</footer>
        </>
      )}
      {(error === "save" || error === "settings") && (
        <div className="popup-error" role="alert">
          <p>{message(error === "save" ? "saveError" : "settingsError")}</p>
          <button type="button" disabled={isSaving} onClick={() => {
            if (error === "settings") void openShortcutSettings();
            else if (lastAction.current) void save(lastAction.current);
          }}>{message("retry")}</button>
        </div>
      )}
    </div>
  );
}
