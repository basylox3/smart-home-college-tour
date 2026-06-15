import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "../../../../lib/auth";
import { createScene, deleteScene, readScenes, updateScene } from "../../../../lib/scene-store";
import type { SceneInput } from "../../../../lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const unauthorized = () => NextResponse.json({ error: "Нужен доступ администратора." }, { status: 401 });

const stringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

const sceneInputFromForm = (formData: FormData): SceneInput => ({
  id: stringValue(formData, "id"),
  title: stringValue(formData, "title"),
  text: stringValue(formData, "text"),
  tags: stringValue(formData, "tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean),
  accent: stringValue(formData, "accent") || "#6ce7ff",
  visual: stringValue(formData, "visual"),
  panoramaImage: stringValue(formData, "panoramaImage"),
});

const panoramaFileFromForm = (formData: FormData) => {
  const file = formData.get("panorama");
  return file instanceof File && file.size > 0 ? file : null;
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  return NextResponse.json(
    { scenes: await readScenes() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Запрос отклонен политикой безопасности." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const result = await createScene(sceneInputFromForm(formData), panoramaFileFromForm(formData));

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось добавить сцену." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Запрос отклонен политикой безопасности." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const result = await updateScene(sceneInputFromForm(formData), panoramaFileFromForm(formData));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось обновить сцену." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Запрос отклонен политикой безопасности." }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as { id?: unknown };
    const id = typeof payload.id === "string" ? payload.id : "";

    if (!id) {
      return NextResponse.json({ error: "Не передан id сцены." }, { status: 400 });
    }

    return NextResponse.json({ scenes: await deleteScene(id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось удалить сцену." },
      { status: 400 },
    );
  }
}
