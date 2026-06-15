"use client";

import Link from "next/link";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { InteractiveShell } from "./InteractiveShell";
import { PanoramaOrb } from "./PanoramaOrb";
import type { TourScene } from "../lib/types";

type HomePageProps = {
  initialScenes: TourScene[];
};

type CollegeReview = {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  date: string;
  isSample?: boolean;
};

const fallbackVisuals = ["visual-atrium", "visual-lab", "visual-media", "visual-projects"];
const reviewStorageKey = "perspektivny-college-reviews";
const reviewRoleOptions = ["студент", "выпускник", "родитель", "абитуриент", "гость дня открытых дверей"];
const reviewRatingOptions = [
  { value: 5, label: "5 - очень понравилось" },
  { value: 4, label: "4 - хорошо" },
  { value: 3, label: "3 - нормально" },
  { value: 2, label: "2 - есть проблемы" },
];
const sampleReviews: CollegeReview[] = [
  {
    id: "sample-alina",
    name: "Алина М.",
    role: "студентка 2 курса, IT-направление",
    rating: 5,
    text: "Больше всего нравится, что здесь не только теория. Уже на первом курсе мы делали небольшие сайты и разбирали реальные ошибки, а не просто переписывали конспект. Иногда темп быстрый, но если спрашивать, преподаватели нормально объясняют.",
    date: "апрель 2026",
    isSample: true,
  },
  {
    id: "sample-igor",
    name: "Игорь С.",
    role: "родитель абитуриента",
    rating: 4,
    text: "Были на дне открытых дверей. Понравилось, что показали аудитории и спокойно ответили на вопросы про практику и поступление. Не все кабинеты выглядят одинаково новыми, но по оборудованию и отношению впечатление осталось хорошее.",
    date: "март 2026",
    isSample: true,
  },
  {
    id: "sample-daniil",
    name: "Даниил К.",
    role: "выпускник, медиа-направление",
    rating: 5,
    text: "Колледж дал нормальную базу и портфолио. Самое полезное было в проектах: съемки, монтаж, дедлайны и защита перед группой. Не скажу, что все идеально, но если самому включаться, возможностей хватает.",
    date: "февраль 2026",
    isSample: true,
  },
];

function getReviewInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || "О").toUpperCase();
}

function getReviewStars(rating: number) {
  const safeRating = Math.max(1, Math.min(5, rating));
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
}

function isCollegeReview(value: unknown): value is CollegeReview {
  if (!value || typeof value !== "object") {
    return false;
  }

  const review = value as Partial<CollegeReview>;
  return (
    typeof review.id === "string" &&
    typeof review.name === "string" &&
    typeof review.role === "string" &&
    typeof review.text === "string" &&
    typeof review.date === "string" &&
    typeof review.rating === "number"
  );
}

export function HomePage({ initialScenes }: HomePageProps) {
  const [scenes, setScenes] = useState(initialScenes);
  const [activeCard, setActiveCard] = useState(0);
  const [isCompactTour, setIsCompactTour] = useState(false);
  const [viewerSceneIndex, setViewerSceneIndex] = useState<number | null>(null);
  const [viewerPan, setViewerPan] = useState(50);
  const [reviews, setReviews] = useState<CollegeReview[]>(sampleReviews);
  const [reviewStatus, setReviewStatus] = useState("");
  const activeScene = scenes[activeCard] || scenes[0];
  const viewerScene = viewerSceneIndex == null ? null : scenes[viewerSceneIndex] || null;

  useEffect(() => {
    setViewerPan(50);
  }, [viewerSceneIndex]);

  useEffect(() => {
    if (viewerSceneIndex == null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewerSceneIndex(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerSceneIndex]);

  useEffect(() => {
    let cancelled = false;

    const refreshScenes = async () => {
      try {
        const response = await fetch("/api/scenes", { cache: "no-store" });
        const payload = (await response.json()) as { scenes?: TourScene[] };

        if (!cancelled && response.ok && Array.isArray(payload.scenes) && payload.scenes.length > 0) {
          setScenes(payload.scenes);
          setActiveCard((current) => Math.min(current, payload.scenes!.length - 1));
        }
      } catch {
        // The server-rendered data remains usable if refresh fails.
      }
    };

    refreshScenes();
    window.addEventListener("focus", refreshScenes);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshScenes);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(reviewStorageKey);
      const customReviews = stored ? (JSON.parse(stored) as unknown[]).filter(isCollegeReview) : [];

      if (customReviews.length > 0) {
        setReviews([...customReviews, ...sampleReviews]);
      }
    } catch {
      // If localStorage is unavailable, the sample reviews remain visible.
    }
  }, []);

  useEffect(() => {
    const updateCompactState = () => setIsCompactTour(window.innerWidth < 640);

    updateCompactState();
    window.addEventListener("resize", updateCompactState);

    return () => window.removeEventListener("resize", updateCompactState);
  }, []);

  useEffect(() => {
    if (viewerSceneIndex !== null) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || scenes.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveCard((current) => (current + 1) % scenes.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [scenes.length, viewerSceneIndex]);

  const tourStats = useMemo(
    () => [
      [String(scenes.length).padStart(2, "0"), "актуальных точек в панорамном маршруте"],
      ["360", "панорамный просмотр для загруженных сцен"],
      ["API", "контент обновляется через защищенную админку"],
    ],
    [scenes.length],
  );

  const stepCarousel = (direction: number) => {
    if (!scenes.length) {
      return;
    }

    setActiveCard((current) => (current + direction + scenes.length) % scenes.length);
  };

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const role = String(formData.get("role") || "").trim();
    const rating = Number(formData.get("rating") || 5);
    const text = String(formData.get("text") || "").trim();

    if (name.length < 2 || role.length < 2 || text.length < 24) {
      setReviewStatus("Добавьте имя, роль и отзыв хотя бы на 2-3 предложения.");
      return;
    }

    const review: CollegeReview = {
      id: `review-${Date.now()}`,
      name,
      role,
      rating: Math.max(1, Math.min(5, rating)),
      text,
      date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
    };
    const customReviews = [review, ...reviews.filter((item) => !item.isSample)];

    try {
      window.localStorage.setItem(reviewStorageKey, JSON.stringify(customReviews));
      setReviewStatus("Отзыв добавлен и сохранен в этом браузере.");
    } catch {
      setReviewStatus("Отзыв добавлен, но браузер не разрешил сохранить его надолго.");
    }

    setReviews([...customReviews, ...sampleReviews]);
    form.reset();
  };

  const deleteReview = (reviewId: string) => {
    const customReviews = reviews.filter((item) => !item.isSample && item.id !== reviewId);

    try {
      if (customReviews.length > 0) {
        window.localStorage.setItem(reviewStorageKey, JSON.stringify(customReviews));
      } else {
        window.localStorage.removeItem(reviewStorageKey);
      }

      setReviewStatus("Отзыв удален.");
    } catch {
      setReviewStatus("Отзыв удален из списка, но браузер не разрешил обновить сохранение.");
    }

    setReviews([...customReviews, ...sampleReviews]);
  };

  return (
    <>
      <InteractiveShell />
      <div className="page-shell">
        <header className="site-header">
          <a className="brand" href="#top" aria-label="Перейти к началу страницы">
            <span className="brand-mark">ПК</span>
            <span className="brand-text">Перспективный колледж</span>
          </a>

          <button className="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
            <span />
            <span />
          </button>

          <nav className="site-nav" id="site-nav">
            <div className="site-nav__main">
              <a href="#tour">3D тур</a>
              <Link href="/plans">Планы</Link>
              <a href="#programs">Программы</a>
              <a href="#reviews">Отзывы</a>
              <a href="#campus">Кампус</a>
              <a href="#contact">Контакты</a>
            </div>
            <div className="site-nav__utility" aria-label="Дополнительные разделы">
              <Link href="/game">Игра</Link>
              <Link href="/admin">Админ</Link>
            </div>
            <a className="button button-small button-ghost magnet" href="#contact">
              Записаться
            </a>
          </nav>
        </header>

        <main>
          <section className="hero section" id="top">
            <div className="hero-copy reveal">
              <p className="eyebrow">Интерактивная презентация нового поколения</p>
              <h1>Перспективный колледж с живым 3D туром</h1>
              <p className="hero-text">
                Исследуйте кампус, лаборатории и общественные пространства в иммерсивном формате.
                Панорамные сцены управляются из админки, а публичная страница всегда берет свежие
                данные с сервера.
              </p>

              <div className="hero-actions">
                <a className="button magnet" href="#tour">
                  Открыть 3D тур
                </a>
                <Link className="button button-ghost magnet" href="/game">
                  Перейти в игру
                </Link>
                <Link className="button button-ghost magnet" href="/plans">
                  Планы колледжа
                </Link>
              </div>

              <ul className="hero-badges" aria-label="Преимущества">
                <li>Панорамы 360 для аудиторий</li>
                <li>React-графика и плавные состояния</li>
                <li>SQLite-хранилище и защищенный API</li>
                <li>Отдельная вкладка интерактивной игры</li>
              </ul>
            </div>

            <div className="hero-stage reveal" data-scene>
              <div className="scene-frame">
                <div
                  className="scene-grid"
                  data-float
                  data-x="0"
                  data-y="100"
                  data-z="-40"
                  data-depth="0.02"
                  data-rx="76"
                />
                <div className="scene-ring ring-a" data-float data-x="0" data-y="0" data-z="40" data-depth="0.04" />
                <div className="scene-ring ring-b" data-float data-x="0" data-y="0" data-z="90" data-depth="0.06" />

                <div className="scene-core" data-float data-x="0" data-y="0" data-z="140" data-depth="0.08">
                  <div className="scene-core__halo" />
                  {activeScene?.panoramaImage ? (
                    <PanoramaOrb image={activeScene.panoramaImage} title={activeScene.title} accent={activeScene.accent} />
                  ) : (
                    <div className="scene-core__body" />
                  )}
                  <div className="scene-core__pulse" />
                </div>

                <article className="float-panel float-panel--left" data-float data-x="-158" data-y="-118" data-z="190" data-depth="0.08">
                  <span className="panel-label">Маршрут</span>
                  <strong>{scenes.length} сцен</strong>
                  <p>Атриум, лаборатории, проекты и любые новые точки из админки.</p>
                </article>

                <article className="float-panel float-panel--right" data-float data-x="158" data-y="-118" data-z="210" data-depth="0.08">
                  <span className="panel-label">Панорамы</span>
                  <strong>360° просмотр</strong>
                  <p>Загруженные изображения превращаются в живой сферический превью-объект.</p>
                </article>

                <article className="float-panel float-panel--bottom" data-float data-x="0" data-y="148" data-z="185" data-depth="0.06">
                  <span className="panel-label">Фокус</span>
                  <strong>{activeScene?.title || "Активная сцена"}</strong>
                  <p>Текущая точка тура синхронизирована с каруселью.</p>
                </article>

                <div className="scan-line" />
              </div>
            </div>

            <div className="stats-grid reveal">
              {tourStats.map(([value, label]) => (
                <article className="stat-card" data-tilt key={value}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="tour section" id="tour">
            <div className="section-head reveal">
              <p className="eyebrow">Маршрут 3D тура</p>
              <h2>Сцены берутся из SQLite и обновляются через админку</h2>
              <p>
                Публичный тур показывает актуальные точки кампуса, а загруженные панорамы становятся
                интерактивным 360-превью без клиентского хранения в localStorage.
              </p>
            </div>

            <div className="tour-layout">
              <aside className="tour-sidebar reveal">
                <p className="eyebrow">Активная сцена</p>
                <h3>{activeScene?.title || "Сцена тура"}</h3>
                <p>{activeScene?.text || "Описание появится после добавления сцены."}</p>

                <div className="chip-row" aria-label="Теги сцены">
                  {(activeScene?.tags || ["3D тур"]).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                {activeScene?.panoramaImage ? (
                  <div className="panorama-console">
                    <PanoramaOrb image={activeScene.panoramaImage} title={activeScene.title} accent={activeScene.accent} compact />
                    <p>Водите по сфере мышью или пальцем, чтобы сместить панорамный обзор.</p>
                  </div>
                ) : (
                  <div className="empty-state">
                    <strong>Панорама не загружена</strong>
                    <p>Добавьте 360-картинку в админке, чтобы сцена стала объемнее.</p>
                  </div>
                )}

                <div className="tour-controls">
                  <button className="control-button" type="button" onClick={() => stepCarousel(-1)}>
                    Назад
                  </button>
                  <button className="control-button control-primary magnet" type="button" onClick={() => stepCarousel(1)}>
                    Далее
                  </button>
                </div>

                <ul className="tour-points">
                  <li>Серверная выдача через `/api/scenes`</li>
                  <li>Панорамы хранятся файлами, метаданные в SQLite</li>
                  <li>Админские изменения доступны только после входа</li>
                </ul>
              </aside>

              <div className="tour-stage reveal">
                <div className="tour-carousel" aria-live="polite">
                  {scenes.map((scene, index) => {
                    let offset = index - activeCard;

                    if (offset > scenes.length / 2) offset -= scenes.length;
                    if (offset < -scenes.length / 2) offset += scenes.length;

                    const spread = scenes.length > 0 ? 360 / scenes.length : 0;
                    const angle = offset * spread;
                    const absOffset = Math.abs(offset);
                    const radius = isCompactTour ? 190 : 280;
                    const scale = offset === 0 ? 1 : 0.82 - absOffset * 0.06;
                    const visualClass = scene.panoramaImage
                      ? "has-image has-panorama"
                      : scene.visual || fallbackVisuals[index % fallbackVisuals.length];
                    const generatedBackground = !scene.panoramaImage && !scene.visual;

                    return (
                      <article
                        className={offset === 0 ? "tour-card is-active" : "tour-card"}
                        key={scene.id}
                        onClick={() => {
                          setActiveCard(index);
                          setViewerSceneIndex(index);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActiveCard(index);
                            setViewerSceneIndex(index);
                          }
                        }}
                        style={
                          {
                            opacity: absOffset > 2 ? 0 : 1,
                            filter: offset === 0 ? "none" : "blur(1px) saturate(0.8)",
                            transform: `translate3d(-50%, calc(-50% + ${absOffset * 12}px), 0) rotateY(${angle}deg) translateZ(${radius}px) scale(${Math.max(scale, 0.64)})`,
                            zIndex: 20 - absOffset,
                            "--scene-accent": scene.accent,
                          } as CSSProperties
                        }
                      >
                        <span className="tour-card__index">{String(index + 1).padStart(2, "0")}</span>
                        <div
                          className={`tour-card__visual ${visualClass}`}
                          style={
                            generatedBackground
                              ? {
                                  background: `radial-gradient(circle at 50% 38%, ${scene.accent}55, transparent 36%), linear-gradient(135deg, ${scene.accent}22, rgba(12, 24, 44, 0.92))`,
                                }
                              : undefined
                          }
                        >
                          {scene.panoramaImage ? (
                            <PanoramaOrb image={scene.panoramaImage} title={scene.title} accent={scene.accent} compact />
                          ) : null}
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="tour-card__copy">
                          <h3>{scene.title}</h3>
                          <p>{scene.text}</p>
                          <span className="tour-card__hint">Нажмите, чтобы открыть просмотр</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="programs section" id="programs">
            <div className="section-head reveal">
              <p className="eyebrow">Направления</p>
              <h2>Программы, которые ощущаются современно не только в названии</h2>
              <p>
                Визуальная подача поддерживает образ колледжа: технологии, креативность и среда, где
                обучение сразу связано с практикой.
              </p>
            </div>

            <div className="program-grid">
              {[
                ["01", "IT и разработка", "Веб, мобильные продукты, интерфейсы и цифровые сервисы от идеи до прототипа."],
                ["02", "Робототехника", "Сенсоры, автоматизация, мехатроника и практические инженерные задачи."],
                ["03", "Медиа и контент", "Съемка, звук, монтаж, брендинг и цифровая коммуникация в реальных проектах."],
              ].map(([index, title, text]) => (
                <article className="program-card reveal" data-tilt key={index}>
                  <span className="program-icon">{index}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="reviews section" id="reviews">
            <div className="section-head reveal">
              <p className="eyebrow">Отзывы</p>
              <h2>Впечатления о колледже, которые звучат как живой опыт</h2>
              <p>
                В блоке есть демо-отзывы для витрины сайта. Свой отзыв можно написать через форму: он появится
                первым и сохранится в этом браузере.
              </p>
            </div>

            <div className="reviews-layout">
              <div className="reviews-list reveal" aria-live="polite">
                {reviews.map((review) => (
                  <article className="review-card" data-tilt key={review.id}>
                    <div className="review-card__top">
                      <span className="review-avatar">{getReviewInitials(review.name)}</span>
                      <div>
                        <h3>{review.name}</h3>
                        <p>{review.role}</p>
                      </div>
                      {!review.isSample ? (
                        <div className="review-actions">
                          <span className="review-badge">ваш отзыв</span>
                          <button
                            className="review-delete"
                            type="button"
                            onClick={() => deleteReview(review.id)}
                            aria-label={`Удалить отзыв от ${review.name}`}
                          >
                            Удалить
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="review-rating" aria-label={`Оценка ${review.rating} из 5`}>
                      {getReviewStars(review.rating)}
                    </div>
                    <p className="review-text">{review.text}</p>
                    <span className="review-date">{review.date}</span>
                  </article>
                ))}
              </div>

              <form className="review-form reveal" onSubmit={submitReview}>
                <p className="eyebrow">Добавить отзыв</p>
                <h3>Напишите свой отзыв</h3>
                <p className="review-form__hint">
                  Лучше писать конкретно: что понравилось, что можно улучшить, где вы учились или почему
                  выбирали колледж.
                </p>

                <label>
                  Ваше имя
                  <input name="name" type="text" placeholder="Например: Мария П." maxLength={40} required />
                </label>

                <fieldset className="review-choice-group">
                  <legend>Кто вы</legend>
                  <div className="review-choice-grid" aria-label="Категория автора отзыва">
                    {reviewRoleOptions.map((role) => (
                      <label className="review-choice" key={role}>
                        <input type="radio" name="role" value={role} required />
                        <span>{role}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="review-choice-group">
                  <legend>Оценка</legend>
                  <div className="review-choice-grid review-choice-grid--rating" aria-label="Оценка колледжа">
                    {reviewRatingOptions.map((option) => (
                      <label className="review-choice" key={option.value}>
                        <input
                          type="radio"
                          name="rating"
                          value={String(option.value)}
                          defaultChecked={option.value === 5}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label>
                  Текст отзыва
                  <textarea
                    name="text"
                    rows={6}
                    maxLength={620}
                    placeholder="Напишите 2-4 предложения простым языком"
                    required
                  />
                </label>

                <button className="button magnet" type="submit">
                  Опубликовать отзыв
                </button>
                <p className="review-form__status" role="status">
                  {reviewStatus}
                </p>
              </form>
            </div>
          </section>

          <section className="campus section" id="campus">
            <div className="campus-panel reveal">
              <div className="campus-copy">
                <p className="eyebrow">Пространство</p>
                <h2>Кампус, который можно настраивать без правки кода</h2>
                <p>
                  Администратор добавляет новую точку, панораму, теги и акцентный цвет. Публичный тур
                  сразу показывает обновленный маршрут через серверный API.
                </p>
              </div>

              <div className="campus-track">
                <div className="track-step" data-tilt>
                  <strong>01</strong>
                  <span>Вход в защищенную админку по паролю из env</span>
                </div>
                <div className="track-step" data-tilt>
                  <strong>02</strong>
                  <span>Загрузка панорамной картинки и настройка сцены</span>
                </div>
                <div className="track-step" data-tilt>
                  <strong>03</strong>
                  <span>Обновление SQLite и публичного 3D тура</span>
                </div>
              </div>
            </div>
          </section>

          <section className="contact section" id="contact">
            <div className="cta-panel reveal">
              <div>
                <p className="eyebrow">Публичный доступ</p>
                <h2>Сайт готов к показу абитуриентам, родителям и партнерам</h2>
                <p>
                  Используйте страницу как цифровую витрину колледжа: откройте ссылку, проведите по
                  экрану и покажите интерактивный 3D-подход к презентации кампуса.
                </p>
              </div>

              <div className="cta-actions">
                <a className="button magnet" href="#top">
                  Вернуться к началу
                </a>
                <Link className="button button-ghost magnet" href="/admin">
                  Открыть админку
                </Link>
              </div>
            </div>

            <div className="game-cta reveal">
              <div>
                <p className="eyebrow">Новый режим</p>
                <h3>Игра-экскурсия по колледжу</h3>
                <p>
                  Запускайте интерактивную игру в отдельной вкладке: перемещение по кампусу, вход в
                  кабинеты и знакомство с пространством в формате живой прогулки.
                </p>
              </div>
              <Link className="button" href="/game">
                Открыть вкладку игры
              </Link>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <span>Перспективный колледж</span>
          <span>Next.js, SQLite, API и панорамный 3D тур</span>
        </footer>
      </div>

      {viewerScene ? (
        <section className="tour-viewer" role="dialog" aria-modal="true" aria-label={`Просмотр: ${viewerScene.title}`}>
          <div className="tour-viewer__backdrop" onClick={() => setViewerSceneIndex(null)} />
          <div className="tour-viewer__panel">
            <div className="tour-viewer__head">
              <div>
                <p className="eyebrow">Просмотр комнаты</p>
                <h3>{viewerScene.title}</h3>
              </div>
              <button className="control-button" type="button" onClick={() => setViewerSceneIndex(null)}>
                Закрыть
              </button>
            </div>

            <p className="tour-viewer__text">{viewerScene.text}</p>

            {viewerScene.panoramaImage ? (
              <>
                <div
                  className="tour-panorama-view"
                  style={{
                    backgroundImage: `url(${viewerScene.panoramaImage})`,
                    backgroundPosition: `${viewerPan}% center`,
                  }}
                  onPointerMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const next = ((event.clientX - bounds.left) / bounds.width) * 100;
                    setViewerPan(Math.max(0, Math.min(100, next)));
                  }}
                />
                <div className="tour-panorama-slider">
                  <label htmlFor="tour-panorama-range">Ползунок обзора</label>
                  <input
                    id="tour-panorama-range"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={viewerPan}
                    aria-label="Повернуть панораму"
                    onChange={(event) => setViewerPan(Number(event.currentTarget.value))}
                  />
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>Для этой комнаты пока нет панорамы</strong>
                <p>Добавьте 360-изображение в админке для полноценного просмотра.</p>
              </div>
            )}

            <div className="chip-row" aria-label="Теги комнаты">
              {viewerScene.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
