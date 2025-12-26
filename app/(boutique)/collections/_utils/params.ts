import { ProductStatus } from "@/app/generated/prisma/client";
import type { ProductFilters } from "@/modules/products/data/get-products";
import { productFiltersSchema } from "@/modules/products/data/get-products";
import type { CollectionSearchParams } from "../[slug]/page";
import { getFirstParam } from "@/shared/utils/params";

export const parseFilters = (
	params: CollectionSearchParams,
	collectionSlug: string
): ProductFilters => {
	// Pages publiques : toujours filtrer sur les produits PUBLIC uniquement
	const filters: ProductFilters = {
		collectionSlug, // Always filter by the collection
		status: ProductStatus.PUBLIC,
	};

	Object.entries(params).forEach(([key, value]) => {
		// Ignore navigation/pagination parameters
		if (
			key === "cursor" ||
			key === "direction" ||
			key === "perPage" ||
			key === "sortBy" ||
			key === "search"
		) {
			return;
		}

		const filterValue = getFirstParam(value);

		if (filterValue) {
			// Price fields (convert euros to cents) - Secured conversion
			if (key === "priceMin") {
				const priceValue = Number(filterValue);
				// Validate: must be finite, not NaN, and positive
				if (
					!isNaN(priceValue) &&
					isFinite(priceValue) &&
					priceValue > 0
				) {
					filters.priceMin = Math.floor(priceValue * 100);
				}
			} else if (key === "priceMax") {
				const priceValue = Number(filterValue);
				// Validate: must be finite, not NaN, and positive
				if (
					!isNaN(priceValue) &&
					isFinite(priceValue) &&
					priceValue > 0
				) {
					filters.priceMax = Math.floor(priceValue * 100);
				}
			}
			// Multi-select fields - Sanitized with limits
			else if (key === "type") {
				const types = Array.isArray(value)
					? value
					: filterValue.includes(",")
						? filterValue.split(",")
						: [filterValue];

				// Clean, filter empty, and limit to 20 items
				filters.type = types
					.map((t) => String(t).trim())
					.filter((t) => t.length > 0)
					.slice(0, 20);
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
			// console.warn("Invalid filters detected and sanitized");
		}
		// Return filters with collectionSlug at minimum (fail-safe)
		return { collectionSlug };
	}
};
