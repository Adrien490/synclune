import { ProductStatus } from "@/app/generated/prisma/client";
import type { ProductsSearchParams } from "../_types/search-params";
import { getFirstParam } from "@/shared/utils/params";
import type { ProductFilters } from "@/modules/products/data/get-products";
import { productFiltersSchema } from "@/modules/products/data/get-products";

export const parseFilters = (
	params: ProductsSearchParams
): ProductFilters => {
	const filters: ProductFilters = {};

	Object.entries(params).forEach(([key, value]) => {
		if (key.startsWith("filter_")) {
			const filterKey = key.replace("filter_", "");
			const filterValue = getFirstParam(value);

			if (filterValue) {
				// Number fields - Secured conversion
				if (filterKey === "priceMin" || filterKey === "priceMax") {
					const numValue = Number(filterValue);
					if (!isNaN(numValue) && isFinite(numValue) && numValue >= 0) {
						filters[filterKey] = Math.floor(numValue);
					}
				}
				// Date fields
				else if (
					filterKey === "createdAfter" ||
					filterKey === "createdBefore" ||
					filterKey === "updatedAfter" ||
					filterKey === "updatedBefore"
				) {
					filters[filterKey] = new Date(filterValue);
				}
				// Status field (ProductStatus enum)
				else if (filterKey === "status") {
					const statusValues = Array.isArray(value)
						? value
						: filterValue.includes(",")
							? filterValue.split(",")
							: [filterValue];

					// Validate and cast to ProductStatus enum
					const validStatuses = statusValues.filter(
						(s): s is ProductStatus =>
							s === ProductStatus.DRAFT ||
							s === ProductStatus.PUBLIC ||
							s === ProductStatus.ARCHIVED
					);

					if (validStatuses.length > 0) {
						filters.status = validStatuses;
					}
				}
				// Multi-select fields - Sanitized with limits
				else if (
					filterKey === "typeId" ||
					filterKey === "collectionId" ||
					filterKey === "collectionSlug"
				) {
					const backendKey = filterKey === "typeId" ? "type" : filterKey;
					const values = Array.isArray(value)
						? value
						: filterValue.includes(",")
							? filterValue.split(",")
							: [filterValue];

					// Clean, filter empty, and limit to 20 items
					filters[backendKey] = values
						.map((v) => String(v).trim())
						.filter((v) => v.length > 0)
						.slice(0, 20);
				}
			}
		}
	});

	// Validate the final filters object with Zod schema
	// This ensures all values respect constraints (positive numbers, valid types, etc.)
	try {
		return productFiltersSchema.parse(filters);
	} catch {
		// Log security warning in development
		if (process.env.NODE_ENV === "development") {
			// console.warn("Invalid filters detected and sanitized:", error);
		}
		// Return empty filters object if validation fails (fail-safe)
		return {};
	}
};
