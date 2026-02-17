import { NextResponse } from "next/server";
import { readWishes, writeWishes } from "../storage";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(
  _request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;
    if (!id || !id.startsWith("custom-")) {
      return NextResponse.json(
        { error: "Only custom wishes can be deleted" },
        { status: 400 }
      );
    }
    const wishes = await readWishes();
    const index = wishes.findIndex((w) => w.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Wish not found" }, { status: 404 });
    }
    wishes.splice(index, 1);
    await writeWishes(wishes);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/wishes/[id]", e);
    return NextResponse.json(
      { error: "Failed to delete wish" },
      { status: 500 }
    );
  }
}
