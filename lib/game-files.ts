import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import type { LocalGameFile } from "./types";

export const gameDirectory = path.join(process.cwd(), "game");
const maxDepth = 4;

const titleFromPath = (relativePath: string, isIndex: boolean) => {
  const parts = relativePath.split("/").filter(Boolean);
  const base = isIndex ? parts.at(-2) || "Главная игра" : parts.at(-1) || "Игра";

  return base
    .replace(/\.(html|htm)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const scanDirectory = async (directory: string, relativeRoot = "", depth = 0): Promise<LocalGameFile[]> => {
  if (depth > maxDepth) {
    return [];
  }

  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: LocalGameFile[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.toLowerCase() === "readme.md") {
      continue;
    }

    const relativePath = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await scanDirectory(fullPath, relativePath, depth + 1)));
      continue;
    }

    if (!entry.isFile() || !/\.html?$/i.test(entry.name)) {
      continue;
    }

    const normalizedPath = relativePath.replace(/\\/g, "/");
    const isIndex = entry.name.toLowerCase() === "index.html" || entry.name.toLowerCase() === "index.htm";

    results.push({
      title: titleFromPath(normalizedPath, isIndex),
      fileName: entry.name,
      relativePath: normalizedPath,
      url: `/game/files/${normalizedPath}`,
      folder: normalizedPath.includes("/") ? normalizedPath.split("/").slice(0, -1).join("/") : "game",
      isIndex,
    });
  }

  return results;
};

export const readLocalGameFiles = async () => {
  await mkdir(gameDirectory, { recursive: true });
  const files = await scanDirectory(gameDirectory);

  return files.sort((left, right) => {
    if (left.isIndex !== right.isIndex) {
      return left.isIndex ? -1 : 1;
    }

    return left.relativePath.localeCompare(right.relativePath, "ru");
  });
};
