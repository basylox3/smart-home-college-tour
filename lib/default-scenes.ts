import type { TourScene } from "./types";

const defaultTimestamp = "2026-04-27T00:00:00.000Z";

export const defaultScenes: TourScene[] = [
  {
    id: "atrium",
    title: "Атриум будущего",
    text: "Центральное пространство с LED-навигацией, цифровой стойкой и открытыми зонами для встреч студентов, преподавателей и гостей.",
    tags: ["LED-навигация", "Открытые пространства", "Гибкие сценарии"],
    accent: "#6ce7ff",
    visual: "visual-atrium",
    panoramaImage: "",
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: "lab",
    title: "Инженерные лаборатории",
    text: "Кластеры практики с робототехникой, прототипированием и станциями командной разработки, где теория сразу переходит в проект.",
    tags: ["Робототехника", "Проектная работа", "Прототипирование"],
    accent: "#8f7dff",
    visual: "visual-lab",
    panoramaImage: "",
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: "media",
    title: "Медиа-кампус",
    text: "Съемочные зоны, звук, монтаж и digital-студии для контента, презентаций и работы над публичными проектами колледжа.",
    tags: ["Контент-студии", "Подкасты", "Монтаж и сцена"],
    accent: "#70ffb8",
    visual: "visual-media",
    panoramaImage: "",
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
  {
    id: "projects",
    title: "Центр студенческих проектов",
    text: "Коворкинг с командными столами, экранами и быстрыми презентационными зонами для хакатонов, защиты и совместной работы.",
    tags: ["Коворкинг", "Хакатоны", "Командные проекты"],
    accent: "#ffc670",
    visual: "visual-projects",
    panoramaImage: "",
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp,
  },
];

export const cloneDefaultScenes = () => defaultScenes.map((scene) => ({ ...scene, tags: [...scene.tags] }));
