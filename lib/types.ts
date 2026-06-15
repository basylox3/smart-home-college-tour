export type TourScene = {
  id: string;
  title: string;
  text: string;
  tags: string[];
  accent: string;
  visual: string;
  panoramaImage: string;
  createdAt: string;
  updatedAt: string;
};

export type SceneInput = {
  id?: string;
  title: string;
  text: string;
  tags: string[];
  accent: string;
  visual?: string;
  panoramaImage?: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type GameSettings = {
  enabled: boolean;
  title: string;
  description: string;
  gameUrl: string;
  updatedAt: string;
};

export type GameSettingsInput = {
  enabled: boolean;
  title: string;
  description: string;
  gameUrl: string;
};

export type LocalGameFile = {
  title: string;
  fileName: string;
  relativePath: string;
  url: string;
  folder: string;
  isIndex: boolean;
};
