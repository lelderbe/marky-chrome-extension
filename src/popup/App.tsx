import { useCallback, useEffect, useMemo, useState } from "react";
import { saveToFolder } from "../lib/bookmarks";
import { filterFolders, getAllFolders } from "../lib/folders";
import { getActiveTab } from "../lib/tabs";
import type { BookmarkFolder } from "../types";
import { FilterInput } from "./components/FilterInput";
import { FolderList } from "./components/FolderList";

export function App() {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [allFolders, tab] = await Promise.all([
          getAllFolders(),
          getActiveTab(),
        ]);

        if (!isMounted) {
          return;
        }

        setFolders(allFolders);
        setActiveTab(tab);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleFolders = useMemo(
    () => filterFolders(folders, filterQuery),
    [folders, filterQuery],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterQuery, folders]);

  const handleSelectFolder = useCallback(
    async (folderId: string) => {
      if (!activeTab) {
        window.close();
        return;
      }

      await saveToFolder(activeTab, folderId);
      window.close();
    },
    [activeTab],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.close();
        return;
      }

      if (visibleFolders.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((currentIndex) =>
          Math.min(currentIndex + 1, visibleFolders.length - 1),
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selectedFolder = visibleFolders[selectedIndex];
        if (selectedFolder) {
          void handleSelectFolder(selectedFolder.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSelectFolder, selectedIndex, visibleFolders]);

  if (isLoading) {
    return <div className="popup" />;
  }

  return (
    <div className="popup">
      <FilterInput value={filterQuery} onChange={setFilterQuery} />
      <FolderList
        folders={visibleFolders}
        selectedIndex={selectedIndex}
        onSelect={(folderId) => {
          void handleSelectFolder(folderId);
        }}
        onHover={setSelectedIndex}
      />
    </div>
  );
}
