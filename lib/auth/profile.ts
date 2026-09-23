import { z } from "zod";

// Small raster avatars are stored with the profile; no public file upload endpoint is needed.
export const profileImage = z.string().max(100000).regex(/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/).nullable();
export const profileInput = z.object({ name: z.string().trim().min(1, "Adınızı yazın.").max(100), image: profileImage });
export function avatarSource(value: string | null | undefined) {
  return value && profileImage.safeParse(value).success ? value : undefined;
}
