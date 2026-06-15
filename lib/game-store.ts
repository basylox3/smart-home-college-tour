import { existsSync } from "node:fs";
import path from "node:path";
import { getDatabase } from "./db";
import type { GameSettings, GameSettingsInput } from "./types";

const settingsKey = "game.settings";
export const localGameUrl = "/game/files/index.html";
const localGameEntry = path.join(process.cwd(), "game", "index.html");

const defaultGameSettings: GameSettings = {
  enabled: false,
  title: "Интерактивный тур по колледжу",
  description:
    "Положите сборку игры в папку game, чтобы абитуриенты могли ходить по корпусам и заходить в кабинеты.",
  gameUrl: localGameUrl,
  updatedAt: new Date(0).toISOString(),
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const isValidGameUrl = (value: string) => {
  if (!value) {
    return true;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const normalizeGameSettings = (value: Partial<GameSettings>): GameSettings => {
  const title = asString(value.title) || defaultGameSettings.title;
  const description = asString(value.description) || defaultGameSettings.description;
  const gameUrl = asString(value.gameUrl);
  const enabled = Boolean(value.enabled) && Boolean(gameUrl);

  return {
    enabled,
    title: title.slice(0, 80),
    description: description.slice(0, 360),
    gameUrl,
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
  };
};

const parseStoredSettings = (raw: string): GameSettings => {
  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return normalizeGameSettings(parsed);
  } catch {
    return defaultGameSettings;
  }
};

const localDefaultSettings = (): GameSettings => ({
  ...defaultGameSettings,
  enabled: existsSync(localGameEntry),
  updatedAt: new Date().toISOString(),
});

const ensureGameSettingsTable = () => {
  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
};

export const readGameSettings = async (): Promise<GameSettings> => {
  ensureGameSettingsTable();

  const row = getDatabase()
    .prepare("SELECT value FROM app_settings WHERE key = ? LIMIT 1")
    .get(settingsKey) as { value: string } | undefined;

  if (!row) {
    return localDefaultSettings();
  }

  return parseStoredSettings(row.value);
};

export const validateGameSettingsInput = (input: GameSettingsInput) => {
  const title = asString(input.title);
  const description = asString(input.description);
  const gameUrl = asString(input.gameUrl);

  if (title.length < 3 || title.length > 80) {
    return { ok: false as const, error: "Название игры должно быть от 3 до 80 символов." };
  }

  if (description.length < 10 || description.length > 360) {
    return { ok: false as const, error: "Описание игры должно быть от 10 до 360 символов." };
  }

  if (!isValidGameUrl(gameUrl)) {
    return {
      ok: false as const,
      error: "Ссылка игры должна быть абсолютной (https://...) или локальной (/game/files/index.html).",
    };
  }

  return {
    ok: true as const,
    data: {
      enabled: Boolean(input.enabled && gameUrl),
      title,
      description,
      gameUrl,
    },
  };
};

export const updateGameSettings = async (input: GameSettingsInput) => {
  ensureGameSettingsTable();

  const validation = validateGameSettingsInput(input);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const nextSettings = normalizeGameSettings({
    ...validation.data,
    updatedAt: new Date().toISOString(),
  });

  getDatabase()
    .prepare(
      "INSERT INTO app_settings(key, value, updated_at) VALUES(?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .run(settingsKey, JSON.stringify(nextSettings), nextSettings.updatedAt);

  return nextSettings;
};
