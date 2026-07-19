import type { BookmarkFolder } from "../types";

function collectFoldersFromNodes(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): BookmarkFolder[] {
  const folders: BookmarkFolder[] = [];

  for (const node of nodes) {
    if (node.id === "0") {
      if (node.children) {
        folders.push(...collectFoldersFromNodes(node.children));
      }
      continue;
    }

    if (!node.url) {
      folders.push({
        id: node.id,
        title: node.title,
        dateGroupModified: node.dateGroupModified ?? node.dateAdded ?? 0,
      });
    }

    if (node.children) {
      folders.push(...collectFoldersFromNodes(node.children));
    }
  }

  return folders;
}

export function sortFoldersByModifiedDate(
  folders: BookmarkFolder[],
): BookmarkFolder[] {
  return [...folders].sort(
    (left, right) => right.dateGroupModified - left.dateGroupModified,
  );
}

export function filterFolders(
  folders: BookmarkFolder[],
  query: string,
): BookmarkFolder[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return folders;
  }

  return folders.filter((folder) =>
    folder.title.toLowerCase().includes(normalizedQuery),
  );
}

export async function getAllFolders(): Promise<BookmarkFolder[]> {
  const tree = await chrome.bookmarks.getTree();
  return sortFoldersByModifiedDate(collectFoldersFromNodes(tree));
}
