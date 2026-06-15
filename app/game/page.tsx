import type { Metadata } from "next";
import { GamePage } from "../../components/GamePage";
import { readLocalGameFiles } from "../../lib/game-files";
import { readGameSettings } from "../../lib/game-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Игра-тур | Перспективный колледж",
  description:
    "Интерактивная игра по колледжу: ходите по корпусам, заходите в кабинеты и изучайте кампус в игровом формате.",
  alternates: {
    canonical: "/game",
  },
};

export default async function GameRoutePage() {
  const [settings, localFiles] = await Promise.all([readGameSettings(), readLocalGameFiles()]);

  return <GamePage settings={settings} localFiles={localFiles} />;
}
