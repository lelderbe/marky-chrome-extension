import type { BookmarkFolder } from "../../types";

type FolderListProps = {
  folders: BookmarkFolder[];
  selectedIndex: number;
  onSelect: (folderId: string) => void;
  onHover: (index: number) => void;
};

export function FolderList({
  folders,
  selectedIndex,
  onSelect,
  onHover,
}: FolderListProps) {
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
