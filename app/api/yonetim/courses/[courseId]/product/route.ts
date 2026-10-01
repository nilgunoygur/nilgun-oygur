import { z } from "zod";
import { ownerRoute, privateNoStore } from "@/lib/auth/viewer";
import { akademi, catalogChangedByOwner } from "@/lib/akademi/server";
import { productChangeSchema } from "@/lib/akademi/owner-forms";
import { kurus, productFailure, readProductForm, refuse, shareCover } from "@/lib/akademi/product-request";
import { deleteStoredFiles } from "@/lib/files/storage";
import { productDetails } from "@/lib/shopier/api";
import { markupDescription } from "@/lib/shopier/description";

/** Changes the course's Shopier product; only the fields in the request are sent to Shopier. */
export async function PUT(request: Request, { params }: RouteContext<"/api/yonetim/courses/[courseId]/product">) {
  const viewer = await ownerRoute();
  if (viewer instanceof Response) return viewer;
  const courseId = z.uuid().safeParse((await params).courseId);
  if (!courseId.success) return refuse("Geçersiz istek.");
  const form = await readProductForm(request, productChangeSchema);
  if (form instanceof Response) return form;
  const { title, description, price, discountedPrice, listed, inStock } = form.data;
  try {
    const cover = form.image && await shareCover(form.image);
    const product = await akademi().owner.updateCourseProduct(viewer.user.id, courseId.data, {
      title, description: description === undefined ? undefined : markupDescription(description),
      priceKurus: price === undefined ? undefined : kurus(price), discountedPriceKurus: discountedPrice == null ? discountedPrice : kurus(discountedPrice),
      hidden: listed === undefined ? undefined : !listed, inStock, imageUrl: cover?.url,
    });
    if (cover && productDetails(product)?.imageUrl) await deleteStoredFiles([cover.pathname]);
    catalogChangedByOwner();
    return new Response(null, { status: 204, headers: privateNoStore });
  } catch (error) {
    // A change can reach Shopier before a later step fails, so public pages re-read it either way.
    catalogChangedByOwner();
    return productFailure(error);
  }
}
