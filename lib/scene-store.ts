import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cloneDefaultScenes } from "./default-scenes";
import { getDatabase } from "./db";
import type { SceneInput, TourScene } from "./types";

const uploadDirectory = path.join(process.cwd(), "public", "uploads", "tour");
const maxUploadSize = 12 * 1024 * 1024;
const supportedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeTags = (value: unknown) => {
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8);
      }
    } catch {
      // Fall through to comma/pipe parsing for malformed legacy values.
    }
  }

  const rawTags = Array.isArray(value) ? value : String(value || "").split(/[|,]/);

  return rawTags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8);
};

type SceneRow = {
  id: string;
  title: string;
  text: string;
  tags: string;
  accent: string;
  visual: string;
  panorama_image: string;
  created_at: string;
  updated_at: string;
};

export const normalizeScene = (scene: Partial<TourScene>, index: number): TourScene => {
  const now = new Date().toISOString();
  const title = asString(scene.title) || `Сцена ${index + 1}`;
  const text = asString(scene.text) || "Описание пространства будет добавлено администратором.";

  return {
    id: asString(scene.id) || `scene-${index + 1}`,
    title: title.slice(0, 90),
    text: text.slice(0, 520),
    tags: normalizeTags(scene.tags).length ? normalizeTags(scene.tags) : ["3D тур"],
    accent: isHexColor(asString(scene.accent)) ? asString(scene.accent) : "#6ce7ff",
    visual: asString(scene.visual),
    panoramaImage: asString(scene.panoramaImage),
    createdAt: asString(scene.createdAt) || now,
    updatedAt: asString(scene.updatedAt) || now,
  };
};

export const validateSceneInput = (input: SceneInput) => {
  const title = asString(input.title);
  const text = asString(input.text);
  const accent = asString(input.accent) || "#6ce7ff";
  const tags = normalizeTags(input.tags);

  if (title.length < 2 || title.length > 90) {
    return { ok: false as const, error: "Название сцены должно быть от 2 до 90 символов." };
  }

  if (text.length < 8 || text.length > 520) {
    return { ok: false as const, error: "Описание сцены должно быть от 8 до 520 символов." };
  }

  if (!isHexColor(accent)) {
    return { ok: false as const, error: "Цвет акцента должен быть в формате #6ce7ff." };
  }

  return {
    ok: true as const,
    data: {
      id: input.id ? asString(input.id) : undefined,
      title,
      text,
      tags: tags.length ? tags : ["Панорама", "3D тур"],
      accent,
      visual: asString(input.visual),
      panoramaImage: asString(input.panoramaImage),
    },
  };
};

const sceneFromRow = (row: SceneRow, index: number): TourScene =>
  normalizeScene(
    {
      id: row.id,
      title: row.title,
      text: row.text,
      tags: normalizeTags(row.tags),
      accent: row.accent,
      visual: row.visual,
      panoramaImage: row.panorama_image,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    index,
  );

const insertSceneStatement = () =>
  getDatabase().prepare(`
    INSERT INTO scenes (
      id, title, text, tags, accent, visual, panorama_image, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

const updateSceneStatement = () =>
  getDatabase().prepare(`
    UPDATE scenes
    SET title = ?, text = ?, tags = ?, accent = ?, visual = ?, panorama_image = ?, updated_at = ?
    WHERE id = ?
  `);

const ensureSeeded = () => {
  const database = getDatabase();
  const count = database.prepare("SELECT COUNT(*) as count FROM scenes").get() as { count: number };

  if (count.count > 0) {
    return;
  }

  const insert = insertSceneStatement();
  database.exec("BEGIN");

  try {
    cloneDefaultScenes().forEach((scene, index) => {
      insert.run(
        scene.id,
        scene.title,
        scene.text,
        JSON.stringify(scene.tags),
        scene.accent,
        scene.visual,
        scene.panoramaImage,
        index,
        scene.createdAt,
        scene.updatedAt,
      );
    });

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
};

const replaceScenes = (scenes: TourScene[]) => {
  const database = getDatabase();
  const insert = insertSceneStatement();

  database.exec("BEGIN");

  try {
    database.prepare("DELETE FROM scenes").run();
    scenes.forEach((scene, index) => {
      insert.run(
        scene.id,
        scene.title,
        scene.text,
        JSON.stringify(scene.tags),
        scene.accent,
        scene.visual,
        scene.panoramaImage,
        index,
        scene.createdAt,
        scene.updatedAt,
      );
    });
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
};

export const readScenes = async () => {
  ensureSeeded();

  const rows = getDatabase()
    .prepare("SELECT * FROM scenes ORDER BY sort_order ASC, created_at ASC")
    .all() as SceneRow[];

  return rows.map(sceneFromRow);
};

export const writeScenes = async (scenes: TourScene[]) => {
  const normalizedScenes = scenes.map(normalizeScene);
  replaceScenes(normalizedScenes);

  return normalizedScenes;
};

export const savePanoramaUpload = async (file: File | null) => {
  if (!file || file.size === 0) {
    return "";
  }

  const extension = supportedImageTypes.get(file.type);

  if (!extension) {
    throw new Error("Поддерживаются только JPG, PNG, WebP и AVIF изображения.");
  }

  if (file.size > maxUploadSize) {
    throw new Error("Панорама должна быть не больше 12 МБ.");
  }

  await mkdir(uploadDirectory, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDirectory, fileName), bytes);

  return `/uploads/tour/${fileName}`;
};

export const deletePanoramaUpload = async (url: string) => {
  if (!url.startsWith("/uploads/tour/")) {
    return;
  }

  const safeName = path.basename(url);

  try {
    await unlink(path.join(uploadDirectory, safeName));
  } catch {
    // Missing local files should not block scene updates.
  }
};

export const createScene = async (input: SceneInput, panoramaFile: File | null) => {
  const validation = validateSceneInput(input);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const scenes = await readScenes();
  const now = new Date().toISOString();
  const panoramaImage = (await savePanoramaUpload(panoramaFile)) || validation.data.panoramaImage || "";
  const nextScene = normalizeScene(
    {
      ...validation.data,
      id: `scene-${randomUUID()}`,
      visual: validation.data.visual || "",
      panoramaImage,
      createdAt: now,
      updatedAt: now,
    },
    scenes.length,
  );

  insertSceneStatement().run(
    nextScene.id,
    nextScene.title,
    nextScene.text,
    JSON.stringify(nextScene.tags),
    nextScene.accent,
    nextScene.visual,
    nextScene.panoramaImage,
    scenes.length,
    nextScene.createdAt,
    nextScene.updatedAt,
  );

  return { scenes: await readScenes(), scene: nextScene };
};

export const updateScene = async (input: SceneInput, panoramaFile: File | null) => {
  const id = asString(input.id);

  if (!id) {
    throw new Error("Не передан id сцены.");
  }

  const validation = validateSceneInput(input);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const scenes = await readScenes();
  const existingScene = scenes.find((scene) => scene.id === id);

  if (!existingScene) {
    throw new Error("Сцена не найдена.");
  }

  const uploadedImage = await savePanoramaUpload(panoramaFile);
  const panoramaImage = uploadedImage || validation.data.panoramaImage || existingScene.panoramaImage;
  const nextScene = normalizeScene(
    {
      ...existingScene,
      ...validation.data,
      id,
      visual: validation.data.visual || existingScene.visual,
      panoramaImage,
      updatedAt: new Date().toISOString(),
    },
    scenes.findIndex((scene) => scene.id === id),
  );
  updateSceneStatement().run(
    nextScene.title,
    nextScene.text,
    JSON.stringify(nextScene.tags),
    nextScene.accent,
    nextScene.visual,
    nextScene.panoramaImage,
    nextScene.updatedAt,
    id,
  );

  if (uploadedImage && existingScene.panoramaImage && existingScene.panoramaImage !== uploadedImage) {
    await deletePanoramaUpload(existingScene.panoramaImage);
  }

  return { scenes: await readScenes(), scene: nextScene };
};

export const deleteScene = async (id: string) => {
  const scenes = await readScenes();

  if (scenes.length <= 1) {
    throw new Error("Нельзя удалить последнюю сцену тура.");
  }

  const scene = scenes.find((item) => item.id === id);

  if (!scene) {
    throw new Error("Сцена не найдена.");
  }

  getDatabase().prepare("DELETE FROM scenes WHERE id = ?").run(id);
  await deletePanoramaUpload(scene.panoramaImage);

  return readScenes();
};

export const resetScenes = async () => writeScenes(cloneDefaultScenes());
