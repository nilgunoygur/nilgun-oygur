import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { getDatabase } from "@/lib/db";
import { articleAssets } from "@/lib/db/schema";
import { uploadedImagePrefix } from "@/lib/articles";
import { imageMime } from "@/lib/files/image-type";

const maxBytes = 1_500_000;

export async function POST(request: Request) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;

  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > maxBytes) return Response.json({ error: "1,5 MB altında bir JPG, PNG veya WebP seçin." }, { status: 400, headers: privateNoStore });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = imageMime(bytes);
  if (!mime) return Response.json({ error: "Yalnızca JPG, PNG ve WebP görselleri yüklenebilir." }, { status: 400, headers: privateNoStore });

  const [asset] = await getDatabase().insert(articleAssets).values({ name: file.name.slice(0, 160), mime, data: Buffer.from(bytes).toString("base64") }).returning({ id: articleAssets.id, name: articleAssets.name });
  return Response.json({ url: `${uploadedImagePrefix}${asset.id}`, name: asset.name }, { headers: privateNoStore });
}
