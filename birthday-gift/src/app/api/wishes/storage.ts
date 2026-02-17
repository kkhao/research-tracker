import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export type WishRecord = {
  id: string;
  icon: string;
  title: string;
  description?: string;
  by?: string;
};

const DEFAULT_PATH = path.join(process.cwd(), "data", "wishes.json");

function getStoragePath(): string {
  return process.env.WISHES_FILE_PATH ?? DEFAULT_PATH;
}

export async function readWishes(): Promise<WishRecord[]> {
  const filePath = getStoragePath();
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

export async function writeWishes(wishes: WishRecord[]): Promise<void> {
  const filePath = getStoragePath();
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(wishes, null, 2), "utf-8");
}
