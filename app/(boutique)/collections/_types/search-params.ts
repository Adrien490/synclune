import type { PublicBaseSearchParams as BaseSearchParams } from "@/shared/types/search-params";
import type { ProductFiltersSearchParams } from "../../produits/_types/search-params";

/**
 * Collection page search params (base + filters, without collection filters)
 */
export type CollectionSearchParams = BaseSearchParams &
	Omit<ProductFiltersSearchParams, "collectionId" | "collectionSlug">;
