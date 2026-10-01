import "server-only";
import { del, head, issueSignedToken, presignUrl, put } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { config } from "@/lib/config";

// Vercel Blob adapter for the private store; nothing in it is readable without a URL signed here.

export const filesConfigured = () => !!config().files.token;

function token() {
  const value = config().files.token;
  if (!value) throw new Error("Dosya depolama henüz bağlanmadı.");
  return value;
}

/** A browser upload token locked to one pathname, content types and size. */
export const uploadToken = (pathname: string, limits: { types: string[]; maxBytes: number }) => generateClientTokenFromReadWriteToken({
  token: token(), pathname, allowedContentTypes: limits.types, maximumSizeInBytes: limits.maxBytes, validUntil: Date.now() + 2 * 3600_000,
});

/** Stores a small file from the server (browser uploads use uploadToken). */
export const storeFile = (pathname: string, body: Buffer, contentType: string) => put(pathname, body, { token: token(), access: "private", contentType });

/** Size and type as stored, or null when nothing was uploaded there. */
export async function storedFile(pathname: string) {
  try {
    const { size, contentType } = await head(pathname, { token: token() });
    return { size, contentType: contentType.split(";")[0].trim().toLowerCase() };
  } catch { return null; }
}

/** A time-limited link the CDN serves directly (Range requests included); `validUntil` is in ms. */
export async function signedFileUrl(pathname: string, validUntil: number) {
  const signed = await issueSignedToken({ token: token(), pathname, operations: ["get"], validUntil });
  return (await presignUrl(signed, { operation: "get", pathname, access: "private", validUntil })).presignedUrl;
}

/** Best effort: a file left behind costs storage but is never reachable. */
export async function deleteStoredFiles(pathnames: string[]) {
  if (pathnames.length) await del(pathnames, { token: token() }).catch(() => undefined);
}
