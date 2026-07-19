import type { BookmarkFolder } from "../../types";

type FolderListProps = {
  folders: BookmarkFolder[];
  selectedIndex: number;
  newFolderTitle?: string;
  onSelect: (folderId: string) => void;
  onCreateNew?: (title: string) => void;
  onHover: (index: number) => void;
};

export function FolderList({
  folders,
  selectedIndex,
  newFolderTitle,
  onSelect,
  onCreateNew,
  onHover,
}: FolderListProps) {
  if (newFolderTitle) {
    const handleClick = () => {
      onCreateNew?.(newFolderTitle);
    };

    const itemClassName =
      selectedIndex === 0
        ? "folder-item folder-item--new folder-item--selected"
        : "folder-item folder-item--new";

    return (
      <ul className="folder-list">
        <li>
          <button
            className={itemClassName}
            type="button"
            onClick={handleClick}
            onMouseEnter={() => onHover(0)}
          >
            New: {newFolderTitle}
          </button>
        </li>
      </ul>
    );
  }

  if (folders.length === 0) {
    return <div className="folder-list-empty">No folders found</div>;
  }

  return (
    <ul className="folder-list">
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
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
            >
              {folder.title}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
