import type { Metadata } from "next";
import { AdminPanel } from "../../components/AdminPanel";
import { getAdminSession } from "../../lib/auth";
import { readGameSettings } from "../../lib/game-store";
import { readScenes } from "../../lib/scene-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Админка 3D тура | Перспективный колледж",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const authorized = await getAdminSession();
  const scenes = authorized ? await readScenes() : [];
  const gameSettings = authorized ? await readGameSettings() : null;

  return <AdminPanel initialAuthorized={authorized} initialScenes={scenes} initialGameSettings={gameSettings} />;
}
