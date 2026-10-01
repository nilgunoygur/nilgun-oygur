import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { fallbackCover } from "@/lib/akademi/catalog";
import { productFormSchema } from "@/lib/akademi/owner-forms";
import { kurus, productFailure, readProductForm, releaseCover, shareCover } from "@/lib/akademi/product-request";
import { markupDescription } from "@/lib/shopier/description";
import { publicOrigin } from "@/lib/site";

export async function GET() {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  return Response.json(await akademi().owner.catalogSnapshot(), { headers: privateNoStore });
}

export async function POST(request: Request) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  const form = await readProductForm(request, productFormSchema);
  if (form instanceof Response) return form;
  const { title, description, price, discountedPrice, listed, accessDays, publish } = form.data;
  try {
    const cover = form.image && await shareCover(form.image);
    const { product } = await akademi().owner.createCourse(viewer.user.id, {
      title, description: markupDescription(description), priceKurus: kurus(price), discountedPriceKurus: discountedPrice && kurus(discountedPrice),
      // Shopier needs one image to create a product.
      imageUrl: cover?.url ?? `${publicOrigin}${fallbackCover}`, hidden: !listed, accessDurationDays: accessDays, status: publish ? "published" : "draft",
    });
    await releaseCover(cover, product);
    return new Response(null, { status: 201, headers: privateNoStore });
  } catch (error) {
    return productFailure(error);
  } finally {
    // The product can exist on Shopier before a later step fails, so the catalog is re-read either way.
    catalogChangedByOwner();
  }
}
