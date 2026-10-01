import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { newCourseSchema } from "@/lib/akademi/owner-forms";
import { defaultCover, kurus, productFailure, readProductForm, shareCover } from "@/lib/akademi/product-request";
import { deleteStoredFiles } from "@/lib/files/storage";
import { productDetails } from "@/lib/shopier/api";
import { markupDescription } from "@/lib/shopier/description";

export async function GET() {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  return Response.json(await akademi().owner.catalogSnapshot(), { headers: privateNoStore });
}

/** Creates the Shopier product and links it as a course. */
export async function POST(request: Request) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  const form = await readProductForm(request, newCourseSchema);
  if (form instanceof Response) return form;
  const { title, description, price, discountedPrice, listed, accessDays, publish } = form.data;
  try {
    const cover = form.image && await shareCover(form.image);
    const { courseId, product } = await akademi().owner.createCourse(viewer.user.id, {
      title, description: markupDescription(description), priceKurus: kurus(price), discountedPriceKurus: discountedPrice === null ? undefined : kurus(discountedPrice),
      imageUrl: cover?.url ?? defaultCover, hidden: !listed, accessDurationDays: accessDays, status: publish ? "published" : "draft",
    });
    // Shopier copies the image to its own CDN; once it has, ours is no longer needed.
    if (cover && productDetails(product)?.imageUrl) await deleteStoredFiles([cover.pathname]);
    catalogChangedByOwner();
    return Response.json({ courseId }, { status: 201, headers: privateNoStore });
  } catch (error) {
    // The product can exist on Shopier before a later step fails, so the catalog is re-read either way.
    catalogChangedByOwner();
    return productFailure(error);
  }
}
