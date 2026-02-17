import { NextResponse } from "next/server";
import { readWishes, writeWishes, type WishRecord } from "./storage";

function normalizeBody(body: unknown): Omit<WishRecord, "id"> | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) return null;
  return {
    icon: typeof b.icon === "string" ? b.icon.trim() || "✨" : "✨",
    title,
    description:
      typeof b.description === "string" ? b.description.trim() || undefined : undefined,
    by: typeof b.by === "string" ? b.by.trim() || undefined : undefined,
  };
}

export async function GET() {
  try {
    const wishes = await readWishes();
    return NextResponse.json(wishes);
  } catch (e) {
    console.error("GET /api/wishes", e);
    return NextResponse.json(
      { error: "Failed to load wishes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fields = normalizeBody(body);
    if (!fields) {
      return NextResponse.json(
        { error: "Invalid body: title is required" },
        { status: 400 }
      );
    }
    const wishes = await readWishes();
    const newWish: WishRecord = {
      id: `custom-${Date.now()}`,
      ...fields,
    };
    wishes.unshift(newWish);
    await writeWishes(wishes);
    return NextResponse.json(newWish);
  } catch (e) {
    console.error("POST /api/wishes", e);
    return NextResponse.json(
      { error: "Failed to add wish" },
      { status: 500 }
    );
  }
}
