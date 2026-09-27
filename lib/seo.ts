import type { Metadata } from "next";
import { config } from "@/lib/config";

export const absoluteUrl = (path: string) => new URL(path, config().siteUrl).href;

export function pageMetadata(title: string, description: string, path: string, image = "/images/iepM9ikg64bhWu8ixRgbXL2bzM.webp"): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", locale: "tr_TR", siteName: "Nilgün Oygur", images: [{ url: image, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
