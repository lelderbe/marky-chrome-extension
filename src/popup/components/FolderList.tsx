import { useEffect, useRef } from "react";
import type { BookmarkFolder } from "../../types";

type FolderListProps = {
  folders: BookmarkFolder[];
  selectedIndex: number;
  newFolderTitle?: string;
  currentFolderIds?: string[];
  disabled?: boolean;
  onSelect: (folderId: string) => void;
  onCreateNew?: (title: string) => void;
  onHover: (index: number) => void;
};

export function FolderList({
  folders,
  selectedIndex,
  newFolderTitle,
  currentFolderIds = [],
  disabled = false,
  onSelect,
  onCreateNew,
  onHover,
}: FolderListProps) {
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const container = list.current;
    const selected = container?.children[selectedIndex];
    if (!container || !selected) return;
    const row = selected.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    if (row.top < viewport.top) container.scrollTop += row.top - viewport.top;
    else if (row.bottom > viewport.bottom) container.scrollTop += row.bottom - viewport.bottom;
  }, [selectedIndex, folders, newFolderTitle]);

  if (newFolderTitle) {
    const handleClick = () => {
      onCreateNew?.(newFolderTitle);
    };

    const itemClassName =
      selectedIndex === 0
        ? "folder-item folder-item--new folder-item--selected"
        : "folder-item folder-item--new";

    return (
      <ul ref={list} className="folder-list">
        <li>
          <button
            className={itemClassName}
            type="button"
            disabled={disabled}
            onClick={handleClick}
            onMouseEnter={() => onHover(0)}
            onFocus={() => onHover(0)}
          >
            <span>{chrome.i18n.getMessage("newFolder", newFolderTitle)}</span>
            <small className="folder-description">{chrome.i18n.getMessage("newFolderDescription")}</small>
          </button>
        </li>
      </ul>
    );
  }

  if (folders.length === 0) {
    return <div className="folder-list-empty">{chrome.i18n.getMessage("noFolders")}</div>;
  }

  return (
    <ul ref={list} className="folder-list">
      {folders.map((folder, index) => {
        const handleClick = () => {
          onSelect(folder.id);
        };

        const handleMouseEnter = () => {
          onHover(index);
        };

        const itemClassName =
          index === selectedIndex
            ? "folder-item folder-item--selected"
            : "folder-item";

        return (
          <li key={folder.id}>
            <button
              className={itemClassName}
              type="button"
              disabled={disabled}
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
              onFocus={handleMouseEnter}
            >
              <span className="folder-title">{folder.title}</span>
              {currentFolderIds.includes(folder.id) && (
                <span className="folder-current" title={chrome.i18n.getMessage("currentFolder")}>
                  <span aria-hidden="true">✓ </span>{chrome.i18n.getMessage("currentFolder")}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
