"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { InteractiveShell } from "./InteractiveShell";
import { PanoramaOrb } from "./PanoramaOrb";
import type { GameSettings, TourScene } from "../lib/types";

type AdminPanelProps = {
  initialAuthorized: boolean;
  initialScenes: TourScene[];
  initialGameSettings: GameSettings | null;
};

type SceneFormState = {
  id: string;
  title: string;
  text: string;
  tags: string;
  accent: string;
  visual: string;
  panoramaImage: string;
};

const emptyForm: SceneFormState = {
  id: "",
  title: "",
  text: "",
  tags: "Панорама, 3D тур",
  accent: "#6ce7ff",
  visual: "visual-atrium",
  panoramaImage: "",
};

const visualOptions = [
  ["visual-atrium", "Атриум"],
  ["visual-lab", "Лаборатория"],
  ["visual-media", "Медиа"],
  ["visual-projects", "Проекты"],
  ["", "Без шаблона"],
];

type GameFormState = {
  enabled: boolean;
  title: string;
  description: string;
  gameUrl: string;
};

const emptyGameForm: GameFormState = {
  enabled: false,
  title: "Интерактивный тур по колледжу",
  description:
    "Подключите сборку игры, чтобы абитуриенты могли гулять по колледжу и заходить в кабинеты.",
  gameUrl: "",
};

const gameSettingsToForm = (settings: GameSettings | null): GameFormState => {
  if (!settings) {
    return emptyGameForm;
  }

  return {
    enabled: settings.enabled,
    title: settings.title,
    description: settings.description,
    gameUrl: settings.gameUrl,
  };
};

const sceneToForm = (scene: TourScene): SceneFormState => ({
  id: scene.id,
  title: scene.title,
  text: scene.text,
  tags: scene.tags.join(", "),
  accent: scene.accent,
  visual: scene.visual,
  panoramaImage: scene.panoramaImage,
});

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = (await response.json()) as { error?: unknown };
    return typeof payload.error === "string" ? payload.error : fallback;
  } catch {
    return fallback;
  }
};

export function AdminPanel({ initialAuthorized, initialScenes, initialGameSettings }: AdminPanelProps) {
  const [authorized, setAuthorized] = useState(initialAuthorized);
  const [scenes, setScenes] = useState(initialScenes);
  const [gameForm, setGameForm] = useState<GameFormState>(gameSettingsToForm(initialGameSettings));
  const [password, setPassword] = useState("");
  const [form, setForm] = useState<SceneFormState>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [message, setMessage] = useState("");
  const [messageState, setMessageState] = useState<"" | "error" | "success">("");
  const [isPending, setIsPending] = useState(false);

  const editingScene = useMemo(() => scenes.find((scene) => scene.id === form.id), [form.id, scenes]);
  const previewImage = filePreview || form.panoramaImage;

  useEffect(() => {
    if (!selectedFile) {
      setFilePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setFilePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const showMessage = (text: string, state: "" | "error" | "success" = "") => {
    setMessage(text);
    setMessageState(state);
  };

  const loadAdminScenes = async () => {
    const response = await fetch("/api/admin/scenes", { cache: "no-store" });

    if (response.status === 401) {
      setAuthorized(false);
      setScenes([]);
      throw new Error("Сессия администратора истекла. Войдите заново.");
    }

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Не удалось загрузить сцены."));
    }

    const payload = (await response.json()) as { scenes?: TourScene[] };
    setScenes(payload.scenes || []);

    return payload.scenes || [];
  };

  const loadGameSettings = async () => {
    const response = await fetch("/api/admin/game", { cache: "no-store" });

    if (response.status === 401) {
      setAuthorized(false);
      throw new Error("Сессия администратора истекла. Войдите заново.");
    }

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Не удалось загрузить настройки игры."));
    }

    const payload = (await response.json()) as { settings?: GameSettings };
    setGameForm(gameSettingsToForm(payload.settings || null));
    return payload.settings || null;
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    showMessage("Проверяю пароль…");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Неверный пароль."));
      }

      setAuthorized(true);
      setPassword("");
      await Promise.all([loadAdminScenes(), loadGameSettings()]);
      showMessage("Вход выполнен. Можно управлять 3D туром.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось войти.", "error");
    } finally {
      setIsPending(false);
    }
  };

  const handleLogout = async () => {
    setIsPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthorized(false);
      setScenes([]);
      setGameForm(emptyGameForm);
      setForm(emptyForm);
      setSelectedFile(null);
      setIsPending(false);
      showMessage("Сессия администратора завершена.", "success");
    }
  };

  const handleSubmitScene = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    showMessage(form.id ? "Обновляю сцену…" : "Добавляю сцену…");

    try {
      const formData = new FormData();
      formData.set("id", form.id);
      formData.set("title", form.title);
      formData.set("text", form.text);
      formData.set("tags", form.tags);
      formData.set("accent", form.accent);
      formData.set("visual", form.visual);
      formData.set("panoramaImage", form.panoramaImage);

      if (selectedFile) {
        formData.set("panorama", selectedFile);
      }

      const response = await fetch("/api/admin/scenes", {
        method: form.id ? "PATCH" : "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Не удалось сохранить сцену."));
      }

      const payload = (await response.json()) as { scenes?: TourScene[]; scene?: TourScene };
      setScenes(payload.scenes || []);
      setForm(emptyForm);
      setSelectedFile(null);
      showMessage(form.id ? "Сцена обновлена." : "Сцена добавлена в 3D тур.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось сохранить сцену.", "error");
    } finally {
      setIsPending(false);
    }
  };

  const editScene = (scene: TourScene) => {
    setForm(sceneToForm(scene));
    setSelectedFile(null);
    showMessage("Сцена открыта для редактирования. Фото можно оставить прежним.", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSceneById = async (scene: TourScene) => {
    if (!window.confirm(`Удалить сцену "${scene.title}"? Панорамный файл тоже будет удален.`)) {
      return;
    }

    setIsPending(true);
    showMessage("Удаляю сцену…");

    try {
      const response = await fetch("/api/admin/scenes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: scene.id }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Не удалось удалить сцену."));
      }

      const payload = (await response.json()) as { scenes?: TourScene[] };
      setScenes(payload.scenes || []);

      if (form.id === scene.id) {
        setForm(emptyForm);
        setSelectedFile(null);
      }

      showMessage("Сцена удалена.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось удалить сцену.", "error");
    } finally {
      setIsPending(false);
    }
  };

  const resetTour = async () => {
    if (!window.confirm("Сбросить 3D тур к стартовым сценам? Загруженные панорамы будут отвязаны.")) {
      return;
    }

    setIsPending(true);
    showMessage("Сбрасываю тур…");

    try {
      const response = await fetch("/api/admin/scenes/reset", { method: "POST" });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Не удалось сбросить тур."));
      }

      const payload = (await response.json()) as { scenes?: TourScene[] };
      setScenes(payload.scenes || []);
      setForm(emptyForm);
      setSelectedFile(null);
      showMessage("Демо-сцены восстановлены.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось сбросить тур.", "error");
    } finally {
      setIsPending(false);
    }
  };

  const saveGameSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    showMessage("Сохраняю настройки игры…");

    try {
      const response = await fetch("/api/admin/game", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameForm),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Не удалось сохранить игровые настройки."));
      }

      const payload = (await response.json()) as { settings?: GameSettings };
      setGameForm(gameSettingsToForm(payload.settings || null));
      showMessage("Игровой режим сохранен.", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Не удалось сохранить игровые настройки.", "error");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <InteractiveShell />
      <main className="page-shell admin-page">
        <header className="admin-topbar">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <img src="/college-logo.svg" alt="" />
            </span>
            <span className="brand-text">3D тур</span>
          </Link>
          <div className="admin-topbar__actions">
            <Link className="control-button" href="/">
              На сайт
            </Link>
            {authorized ? (
              <button className="control-button" type="button" onClick={handleLogout} disabled={isPending}>
                Выйти
              </button>
            ) : null}
          </div>
        </header>

        <section className="admin-panel reveal is-visible">
          <div className="admin-intro">
            <p className="eyebrow">Админ-доступ</p>
            <h1>Настройка 3D тура и панорам</h1>
            <p>
              Здесь добавляются точки маршрута, тексты, теги, акцентные цвета и панорамные картинки.
              Данные сохраняются в SQLite, а публичная страница получает их через `/api/scenes`.
            </p>

            <div className="admin-access-card" data-tilt>
              <span>Безопасность</span>
              <strong>Пароль из env</strong>
              <p>
                По умолчанию используется `123456789`. Для продакшена задайте `ADMIN_PASSWORD` и
                `ADMIN_SESSION_SECRET` в `.env.local`.
              </p>
            </div>
          </div>

          <div className="admin-workspace">
            {!authorized ? (
              <form className="admin-login" onSubmit={handleLogin}>
                <h2>Вход администратора</h2>
                <label>
                  Пароль
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <button className="button magnet" type="submit" disabled={isPending}>
                  {isPending ? "Проверяю…" : "Войти в панель"}
                </button>
                <p className={`form-message ${messageState ? `is-${messageState}` : ""}`} role="status">
                  {message}
                </p>
              </form>
            ) : (
              <div className="admin-dashboard">
                <div className="dashboard-head">
                  <div>
                    <p className="eyebrow">Панель управления</p>
                    <h2>{editingScene ? "Редактирование сцены" : "Новая сцена 3D тура"}</h2>
                  </div>
                  <button
                    className="control-button"
                    type="button"
                    onClick={() => {
                      void Promise.all([loadAdminScenes(), loadGameSettings()]);
                    }}
                    disabled={isPending}
                  >
                    Обновить
                  </button>
                </div>

                <form className="scene-form" onSubmit={handleSubmitScene}>
                  <label>
                    Название сцены
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      name="title"
                      type="text"
                      placeholder="Например: IT-аудитория…"
                      autoComplete="off"
                      required
                    />
                  </label>

                  <label>
                    Описание
                    <textarea
                      value={form.text}
                      onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                      name="text"
                      rows={4}
                      placeholder="Кратко опишите пространство для абитуриентов…"
                      autoComplete="off"
                      required
                    />
                  </label>

                  <label>
                    Теги через запятую
                    <input
                      value={form.tags}
                      onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                      name="tags"
                      type="text"
                      placeholder="360, лаборатория, практика…"
                      autoComplete="off"
                    />
                  </label>

                  <div className="form-grid">
                    <label>
                      Цвет акцента
                      <input
                        value={form.accent}
                        onChange={(event) => setForm((current) => ({ ...current, accent: event.target.value }))}
                        name="accent"
                        type="color"
                      />
                    </label>
                    <label>
                      Шаблон без панорамы
                      <select
                        value={form.visual}
                        onChange={(event) => setForm((current) => ({ ...current, visual: event.target.value }))}
                        name="visual"
                      >
                        {visualOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="panorama-upload">
                    Панорамная картинка
                    <input
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                      name="panorama"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                    />
                    <span>Лучше загружать equirectangular 360-изображение до 12 МБ.</span>
                  </label>

                  <div className="panorama-preview-card">
                    {previewImage ? (
                      <PanoramaOrb image={previewImage} title={form.title || "Предпросмотр"} accent={form.accent} compact />
                    ) : (
                      <div className="empty-state">
                        <strong>Панорама пока не выбрана</strong>
                        <p>Сцена будет использовать выбранный визуальный шаблон.</p>
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button className="button magnet" type="submit" disabled={isPending}>
                      {isPending ? "Сохраняю…" : editingScene ? "Сохранить сцену" : "Добавить в 3D тур"}
                    </button>
                    {editingScene ? (
                      <button
                        className="control-button"
                        type="button"
                        onClick={() => {
                          setForm(emptyForm);
                          setSelectedFile(null);
                          showMessage("Редактирование отменено.", "success");
                        }}
                      >
                        Отменить редактирование
                      </button>
                    ) : null}
                  </div>
                  <p className={`form-message ${messageState ? `is-${messageState}` : ""}`} role="status">
                    {message}
                  </p>
                </form>

                <div className="admin-scenes">
                  <div className="admin-scenes-head">
                    <h3>Сцены тура</h3>
                    <button className="control-button" type="button" onClick={resetTour} disabled={isPending}>
                      Сбросить демо
                    </button>
                  </div>

                  <div className="admin-scene-list" aria-live="polite">
                    {scenes.map((scene, index) => (
                      <article className="admin-scene-item" key={scene.id}>
                        <div className="admin-scene-info">
                          <div className="admin-scene-thumb">
                            {scene.panoramaImage ? (
                              <img src={scene.panoramaImage} alt="" width={64} height={64} loading="lazy" />
                            ) : (
                              <span>{String(index + 1).padStart(2, "0")}</span>
                            )}
                          </div>
                          <div>
                            <strong>{scene.title}</strong>
                            <p>{scene.tags.join(", ") || "Без тегов"}</p>
                          </div>
                        </div>
                        <div className="admin-scene-actions">
                          <button className="control-button admin-edit" type="button" onClick={() => editScene(scene)}>
                            Изменить
                          </button>
                          <button
                            className="control-button admin-delete"
                            type="button"
                            onClick={() => deleteSceneById(scene)}
                            disabled={isPending || scenes.length <= 1}
                          >
                            Удалить
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="admin-scenes game-settings-panel">
                  <div className="admin-scenes-head">
                    <h3>Игровой режим</h3>
                    <Link className="control-button" href="/game">
                      Открыть вкладку игры
                    </Link>
                  </div>

                  <form className="scene-form" onSubmit={saveGameSettings}>
                    <label className="toggle-row">
                      <span>Включить игровой режим</span>
                      <input
                        type="checkbox"
                        checked={gameForm.enabled}
                        onChange={(event) =>
                          setGameForm((current) => ({
                            ...current,
                            enabled: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Название вкладки игры
                      <input
                        type="text"
                        name="gameTitle"
                        value={gameForm.title}
                        onChange={(event) => setGameForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Например: Прогулка по колледжу…"
                        autoComplete="off"
                        required
                      />
                    </label>

                    <label>
                      Описание
                      <textarea
                        rows={3}
                        name="gameDescription"
                        value={gameForm.description}
                        onChange={(event) =>
                          setGameForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Что пользователь сможет сделать в игре…"
                        autoComplete="off"
                        required
                      />
                    </label>

                    <label>
                      Ручная ссылка на игру (необязательно)
                      <input
                        type="text"
                        name="gameUrl"
                        value={gameForm.gameUrl}
                        onChange={(event) => setGameForm((current) => ({ ...current, gameUrl: event.target.value }))}
                        placeholder="https://example.com/college-game или /game/files/index.html…"
                        autoComplete="off"
                      />
                      <span>
                        Для локальных файлов можно ничего не вводить: вкладка `/game` сама найдет HTML
                        файлы в папке `game`.
                      </span>
                    </label>

                    <div className="form-actions">
                      <button
                        className="control-button"
                        type="button"
                        onClick={() =>
                          setGameForm((current) => ({
                            ...current,
                            enabled: true,
                            gameUrl: "/game/files/index.html",
                          }))
                        }
                      >
                        Использовать папку game
                      </button>
                      <button className="button magnet" type="submit" disabled={isPending}>
                        {isPending ? "Сохраняю…" : "Сохранить игру"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
