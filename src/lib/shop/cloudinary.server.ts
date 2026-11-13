import { createHash } from "node:crypto";

const FOLDER = "zbs";

export function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

/** Store a photo and return a URL. Cloudinary when keys exist; otherwise a public file URL. */
export async function storeImageUrl(dataUrl: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Нужно фото" };
  }
  if (dataUrl.length > 2_400_000) {
    return { ok: false, error: "Фото слишком тяжёлое. Сожмите его и попробуйте снова." };
  }
  if (!cloudinaryConfigured()) {
    return {
      ok: false,
      error: "Добавьте CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY и CLOUDINARY_API_SECRET",
    };
  }
  try {
    const url = await uploadCloudinary(dataUrl);
    return { ok: true, url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cloudinary";
    return { ok: false, error: message };
  }
}

async function uploadCloudinary(dataUrl: string): Promise<string> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!.trim();
  const key = process.env.CLOUDINARY_API_KEY!.trim();
  const secret = process.env.CLOUDINARY_API_SECRET!.trim();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`folder=${FOLDER}&timestamp=${timestamp}${secret}`)
    .digest("hex");
  const form = new FormData();
  form.set("file", dataUrl);
  form.set("api_key", key);
  form.set("timestamp", String(timestamp));
  form.set("signature", signature);
  form.set("folder", FOLDER);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !body.secure_url) {
    throw new Error(body.error?.message || "Cloudinary не принял фото");
  }
  return body.secure_url;
}
