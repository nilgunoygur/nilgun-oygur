import { ownerRouteDenied, privateNoStore } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { articleAssets } from "@/lib/db/schema";
import { uploadedImagePrefix } from "@/lib/articles";

const maxBytes = 1_500_000;

function imageMime(bytes: Uint8Array) {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function POST(request: Request) {
  const denied = await ownerRouteDenied();
  if (denied) return denied;

  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > maxBytes) return Response.json({ error: "1,5 MB altında bir JPG, PNG veya WebP seçin." }, { status: 400, headers: privateNoStore });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = imageMime(bytes);
  if (!mime) return Response.json({ error: "Yalnızca JPG, PNG ve WebP görselleri yüklenebilir." }, { status: 400, headers: privateNoStore });

  const [asset] = await getDatabase().insert(articleAssets).values({ name: file.name.slice(0, 160), mime, data: Buffer.from(bytes).toString("base64") }).returning({ id: articleAssets.id, name: articleAssets.name });
  return Response.json({ url: `${uploadedImagePrefix}${asset.id}`, name: asset.name }, { headers: privateNoStore });
}
