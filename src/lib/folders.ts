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
      folders.push({ id: node.id, title: node.title });
    }

    if (node.children) {
      folders.push(...collectFoldersFromNodes(node.children));
    }
  }

  return folders;
}

export async function getAllFolders(): Promise<BookmarkFolder[]> {
  const tree = await chrome.bookmarks.getTree();
  return collectFoldersFromNodes(tree);
}

export function sortFoldersWithRecent(
  folders: BookmarkFolder[],
  recentFolderIds: string[],
): BookmarkFolder[] {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const recentFolders = recentFolderIds
    .map((id) => folderById.get(id))
    .filter((folder): folder is BookmarkFolder => folder !== undefined);

  const recentIdSet = new Set(recentFolders.map((folder) => folder.id));
  const remainingFolders = folders
    .filter((folder) => !recentIdSet.has(folder.id))
    .sort((left, right) => left.title.localeCompare(right.title));

  return [...recentFolders, ...remainingFolders];
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
