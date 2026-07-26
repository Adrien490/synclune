/**
 * Façade rétro-compatible — les schémas sont définis dans :
 * - `product-query.schemas.ts`    (get/filters/listing)
 * - `product-mutation.schemas.ts` (create/update/delete/bulk/toggle/collections)
 * - `product-media.schemas.ts`    (imageSchema partagé)
 *
 * Les anciens imports `from "@/modules/products/schemas/product.schemas"`
 * continuent de fonctionner via ces re-exports.
 */

export { getProductSchema, productFiltersSchema, getProductsSchema } from "./product-query.schemas";

export {
	createProductSchema,
	updateProductSchema,
	deleteProductSchema,
	duplicateProductSchema,
	toggleProductStatusSchema,
	bulkDeleteProductsSchema,
	bulkArchiveProductsSchema,
	bulkAttachCollectionProductsSchema,
	bulkChangeProductStatusSchema,
	updateProductCollectionsSchema,
} from "./product-mutation.schemas";
