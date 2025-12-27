import { ProductStatus } from "@/app/generated/prisma/client";
import type { ProductFilters } from "@/modules/products/data/get-products";
import { productFiltersSchema } from "@/modules/products/data/get-products";
import { getFirstParam } from "@/shared/utils/params";
import type { ProductSearchParams } from "../page";

export const parseFilters = (params: ProductSearchParams): ProductFilters => {
	// Pages publiques : toujours filtrer sur les produits PUBLIC uniquement
	const filters: ProductFilters = {
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
				if (!isNaN(priceValue) && isFinite(priceValue) && priceValue > 0) {
					filters.priceMin = Math.floor(priceValue * 100);
				}
			} else if (key === "priceMax") {
				const priceValue = Number(filterValue);
				// Validate: must be finite, not NaN, and positive
				if (!isNaN(priceValue) && isFinite(priceValue) && priceValue > 0) {
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
			} else if (key === "color") {
				const colors = Array.isArray(value)
					? value
					: filterValue.includes(",")
						? filterValue.split(",")
						: [filterValue];

				// Clean, filter empty, and limit to 20 items
				filters.color = colors
					.map((c) => String(c).trim())
					.filter((c) => c.length > 0)
					.slice(0, 20);
			} else if (key === "material") {
				const materials = Array.isArray(value)
					? value
					: filterValue.includes(",")
						? filterValue.split(",")
						: [filterValue];

				// Clean, filter empty, and limit to 20 items
				filters.material = materials
					.map((m) => String(m).trim())
					.filter((m) => m.length > 0)
					.slice(0, 20);
			}
			// Rating filter
			else if (key === "rating") {
				const ratingValue = Number(filterValue);
				if (!isNaN(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
					filters.ratingMin = Math.floor(ratingValue);
				}
			}
			// Stock status filter
			else if (key === "stockStatus") {
				if (filterValue === "in_stock" || filterValue === "out_of_stock") {
					filters.stockStatus = filterValue;
				}
			}
			// On sale filter
			else if (key === "onSale") {
				if (filterValue === "true" || filterValue === "1") {
					filters.onSale = true;
				}
			}
			// String fields
			else if (key === "collectionId") {
				filters.collectionId = filterValue;
			} else if (key === "collectionSlug") {
				filters.collectionSlug = filterValue;
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
		// Return empty filters object if validation fails (fail-safe)
		return {};
	}
};
