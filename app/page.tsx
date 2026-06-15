import { HomePage } from "../components/HomePage";
import { readScenes } from "../lib/scene-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const scenes = await readScenes();

  return <HomePage initialScenes={scenes} />;
}
