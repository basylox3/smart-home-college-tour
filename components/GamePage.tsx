"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { InteractiveShell } from "./InteractiveShell";
import type { GameSettings, LocalGameFile } from "../lib/types";

type GamePageProps = {
  settings: GameSettings;
  localFiles: LocalGameFile[];
};

const adminSourceId = "__admin_game_url__";
const gameControls = [
  { key: "ArrowUp", label: "Вверх", className: "game-control-up" },
  { key: "ArrowLeft", label: "Влево", className: "game-control-left" },
  { key: "ArrowDown", label: "Вниз", className: "game-control-down" },
  { key: "ArrowRight", label: "Вправо", className: "game-control-right" },
];

export function GamePage({ settings, localFiles }: GamePageProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [fullscreenRequested, setFullscreenRequested] = useState(false);
  const [files, setFiles] = useState(localFiles);
  const [selectedUrl, setSelectedUrl] = useState(() => {
    if (localFiles[0]?.url) {
      return localFiles[0].url;
    }

    return settings.enabled && !settings.gameUrl.startsWith("/game/files/") ? settings.gameUrl : "";
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sources = useMemo(() => {
    const sourceList = files.map((file) => ({
      id: file.url,
      title: file.title,
      subtitle: file.relativePath,
      url: file.url,
      local: true,
    }));

    const settingsUrlIsLocal = settings.gameUrl.startsWith("/game/files/");

    if (settings.enabled && settings.gameUrl && !settingsUrlIsLocal && !sourceList.some((source) => source.url === settings.gameUrl)) {
      sourceList.push({
        id: adminSourceId,
        title: "Ссылка из админки",
        subtitle: settings.gameUrl,
        url: settings.gameUrl,
        local: false,
      });
    }

    return sourceList;
  }, [files, settings.enabled, settings.gameUrl]);

  const selectedSource = sources.find((source) => source.url === selectedUrl) || sources[0] || null;
  const canRun = Boolean(selectedSource?.url);

  const sendGameKey = useCallback((key: string, pressed: boolean) => {
    const frameWindow = iframeRef.current?.contentWindow;

    if (!frameWindow) {
      return;
    }

    frameWindow.postMessage({ type: "campus-flow-key", key, pressed }, "*");

    try {
      const eventType = pressed ? "keydown" : "keyup";
      const event = new KeyboardEvent(eventType, { key, bubbles: true, cancelable: true });
      frameWindow.dispatchEvent(event);
      frameWindow.document.dispatchEvent(event);
      iframeRef.current?.focus();
    } catch {
      // External game URLs can block direct event dispatch; postMessage remains available for local games.
    }
  }, []);

  const pressGameKey = (key: string) => {
    sendGameKey(key, true);
  };

  const releaseGameKey = (key: string) => {
    sendGameKey(key, false);
  };

  const updateHorizontalSlider = (value: number) => {
    sendGameKey("ArrowLeft", value < -0.18);
    sendGameKey("ArrowRight", value > 0.18);
  };

  const resetHorizontalSlider = (target: HTMLInputElement) => {
    target.value = "0";
    sendGameKey("ArrowLeft", false);
    sendGameKey("ArrowRight", false);
  };

  const refreshFiles = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/game/files", { cache: "no-store" });
      const payload = (await response.json()) as { files?: LocalGameFile[] };
      const nextFiles = payload.files || [];

      setFiles(nextFiles);

      if (nextFiles.length > 0 && !nextFiles.some((file) => file.url === selectedUrl)) {
        setSelectedUrl(nextFiles[0].url);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <InteractiveShell />
      <a className="skip-link" href="#game-content">
        Перейти к содержимому
      </a>
      <main className="page-shell game-page" id="game-content">
        <header className="site-header">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <img src="/college-logo.svg" alt="" />
            </span>
            <span className="brand-text">Перспективный колледж</span>
          </Link>
          <button className="nav-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="site-nav">
            <span />
            <span />
          </button>
          <nav className="site-nav game-nav" id="site-nav">
            <div className="site-nav__main">
              <Link href="/">Главная</Link>
              <Link href="/#tour">3D тур</Link>
              <Link href="/plans">Планы</Link>
            </div>
            <div className="site-nav__utility" aria-label="Дополнительные разделы">
              <Link href="/game" aria-current="page">
                Игра
              </Link>
              <Link href="/admin">Админ</Link>
            </div>
          </nav>
        </header>

        <section className="section game-hero reveal is-visible">
          <div className="section-head game-headline">
            <p className="eyebrow">Файлы из VS Code</p>
            <h1>Локальная игра запускается из папки game</h1>
            <p>
              Скинь HTML/CSS/JS сборку в папку `game`. Сайт сам найдет `.html` файлы и откроет
              выбранный файл прямо здесь, без внешней ссылки.
            </p>
          </div>

          <div className="game-workbench">
            <aside className="game-file-panel kinetic-item">
              <div className="game-file-panel__head">
                <div>
                  <p className="eyebrow">Локальные файлы</p>
                  <h2>Что запускать</h2>
                </div>
                <button className="control-button" type="button" onClick={refreshFiles} disabled={isRefreshing}>
                  {isRefreshing ? "Ищу…" : "Обновить"}
                </button>
              </div>

              {sources.length > 0 ? (
                <div className="game-file-list" aria-label="Файлы игры">
                  {sources.map((source) => (
                    <button
                      className={source.url === selectedSource?.url ? "game-file-card is-active kinetic-item" : "game-file-card kinetic-item"}
                      type="button"
                      key={source.id}
                      onClick={() => setSelectedUrl(source.url)}
                    >
                      <span>{source.local ? "HTML" : "URL"}</span>
                      <strong>{source.title}</strong>
                      <small>{source.subtitle}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <strong>Файлы игры не найдены</strong>
                  <p>
                    Положи в `game` файл `index.html` или любую папку с `index.html`, потом
                    нажми `Обновить`.
                  </p>
                </div>
              )}

              <div className="game-folder-help">
                <strong>Как положить игру</strong>
                <p>Обычный проект из VS Code:</p>
                <code>game/index.html</code>
                <code>game/style.css</code>
                <code>game/script.js</code>
                <p>Или отдельная папка:</p>
                <code>game/my-college-game/index.html</code>
              </div>
            </aside>

            <div className={fullscreenRequested ? "game-stage is-fullscreen kinetic-item" : "game-stage kinetic-item"}>
              <div className="game-stage__head">
                <div>
                  <strong>{selectedSource?.title || "Игра не выбрана"}</strong>
                  {selectedSource ? <p>{selectedSource.subtitle}</p> : null}
                </div>
                <div className="game-stage__actions">
                  <button className="control-button" type="button" onClick={() => setFullscreenRequested((state) => !state)} disabled={!canRun}>
                    {fullscreenRequested ? "Обычный режим" : "На весь экран"}
                  </button>
                  {selectedSource ? (
                    <a className="control-button" href={selectedSource.url} target="_blank" rel="noreferrer">
                      Открыть отдельно
                    </a>
                  ) : null}
                </div>
              </div>

              {canRun ? (
                <iframe
                  ref={iframeRef}
                  className="game-frame"
                  title={`Игра: ${selectedSource.title}`}
                  src={selectedSource.url}
                  allow="fullscreen; autoplay; gamepad"
                  onLoad={() => iframeRef.current?.focus()}
                />
              ) : (
                <div className="empty-state game-empty">
                  <strong>Выбери файл игры</strong>
                  <p>Когда в папке `game` появится HTML-файл, он отобразится слева.</p>
                </div>
              )}

              {canRun ? (
                <div className="game-mobile-controls" aria-label="Мобильное управление игрой">
                  <div className="game-mobile-dpad" aria-label="Движение">
                    {gameControls.map((control) => (
                      <button
                        className={`game-mobile-button ${control.className}`}
                        type="button"
                        key={control.key}
                        aria-label={control.label}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          pressGameKey(control.key);
                        }}
                        onPointerUp={() => releaseGameKey(control.key)}
                        onPointerCancel={() => releaseGameKey(control.key)}
                        onPointerLeave={() => releaseGameKey(control.key)}
                      >
                        {control.key === "ArrowUp" ? "↑" : control.key === "ArrowDown" ? "↓" : control.key === "ArrowLeft" ? "←" : "→"}
                      </button>
                    ))}
                  </div>

                  <div className="game-mobile-slider" aria-label="Горизонтальное движение">
                    <label htmlFor="game-mobile-slider">Ползунок движения</label>
                    <input
                      id="game-mobile-slider"
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      defaultValue="0"
                      aria-label="Двигаться влево или вправо"
                      onInput={(event) => updateHorizontalSlider(Number(event.currentTarget.value))}
                      onPointerUp={(event) => resetHorizontalSlider(event.currentTarget)}
                      onPointerCancel={(event) => resetHorizontalSlider(event.currentTarget)}
                      onTouchEnd={(event) => resetHorizontalSlider(event.currentTarget)}
                      onBlur={(event) => resetHorizontalSlider(event.currentTarget)}
                    />
                  </div>

                  <button
                    className="game-mobile-button game-mobile-action"
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      pressGameKey("e");
                    }}
                    onPointerUp={() => releaseGameKey("e")}
                    onPointerCancel={() => releaseGameKey("e")}
                    onPointerLeave={() => releaseGameKey("e")}
                  >
                    E
                    <span>действие</span>
                  </button>
                </div>
              ) : null}

              <p className="game-frame-note">
                Для локальных файлов iframe работает внутри сайта. Если используешь внешнюю ссылку,
                источник может запретить встраивание.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
