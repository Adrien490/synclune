import { ProductStatus } from "@/app/generated/prisma/client";
import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCTS_SORT_FIELDS,
} from "../constants/product.constants";
import {
	isAllowedMediaDomain,
	ALLOWED_MEDIA_DOMAINS,
} from "@/shared/lib/media-validation";
import { VIDEO_EXTENSIONS } from "@/modules/media/constants/media.constants";
import {
	TEXT_LIMITS,
	ARRAY_LIMITS,
	PRICE_LIMITS,
	DATE_LIMITS,
} from "@/shared/constants/validation-limits";

// ============================================================================
// SINGLE PRODUCT SCHEMA
// ============================================================================

export const getProductSchema = z.object({
	slug: z.string().trim().min(1),
	includeDraft: z.boolean().default(false),
});

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const productFiltersSchema = z
	.object({
		type: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
		color: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
		material: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
		status: z
			.union([z.enum(ProductStatus), z.array(z.enum(ProductStatus))])
			.optional(),
		stockStatus: z.enum(["in_stock", "out_of_stock"]).optional(),
		onSale: z.boolean().optional(),
		ratingMin: z.number().int().min(1).max(5).optional(),
		collectionId: optionalStringOrStringArraySchema,
		collectionSlug: optionalStringOrStringArraySchema,
		priceMin: z.number().int().nonnegative().max(PRICE_LIMITS.FILTER_MAX_CENTS).optional(),
		priceMax: z.number().int().nonnegative().max(PRICE_LIMITS.FILTER_MAX_CENTS).optional(),
		createdAfter: z.coerce
			.date()
			.min(DATE_LIMITS.FILTERS_MIN)
			.max(new Date())
			.optional(),
		createdBefore: z.coerce.date().min(DATE_LIMITS.FILTERS_MIN).optional(),
		updatedAfter: z.coerce
			.date()
			.min(DATE_LIMITS.FILTERS_MIN)
			.max(new Date())
			.optional(),
		updatedBefore: z.coerce.date().min(DATE_LIMITS.FILTERS_MIN).optional(),
	})
	.refine((data) => {
		if (data.priceMin && data.priceMax) {
			return data.priceMin <= data.priceMax;
		}
		return true;
	}, "priceMin must be less than or equal to priceMax")
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	})
	.refine((data) => {
		if (data.updatedAfter && data.updatedBefore) {
			return data.updatedAfter <= data.updatedBefore;
		}
		return true;
	});

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const productSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_PRODUCTS_SORT_FIELDS.includes(value as (typeof GET_PRODUCTS_SORT_FIELDS)[number])
		? value
		: GET_PRODUCTS_DEFAULT_SORT_BY;
}, z.enum(GET_PRODUCTS_SORT_FIELDS));

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getProductsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_PRODUCTS_DEFAULT_PER_PAGE, GET_PRODUCTS_MAX_RESULTS_PER_PAGE),
	sortBy: productSortBySchema.default(GET_PRODUCTS_DEFAULT_SORT_BY),
	search: z.string().max(TEXT_LIMITS.PRODUCT_SEARCH.max).optional(),
	filters: productFiltersSchema.default({}),
	status: z
		.enum([ProductStatus.PUBLIC, ProductStatus.DRAFT, ProductStatus.ARCHIVED])
		.optional()
		.default(ProductStatus.PUBLIC),
});

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/**
 * Helper pour validation des URLs de medias
 * Utilise la fonction centralisee avec tous les domaines autorises
 */
const validateMediaUrl = (url: string): boolean =>
	isAllowedMediaDomain(url, ALLOWED_MEDIA_DOMAINS);

/**
 * Schema pour un media (image ou video)
 * Securise: n'accepte que les URLs provenant de domaines autorises
 */
const imageSchema = z.object({
	url: z
		.string()
		.url({ message: "L'URL du media doit être valide" })
		.refine(validateMediaUrl, {
			message: "L'URL du média doit provenir d'un domaine autorisé",
		}),
	thumbnailUrl: z
		.string()
		.url()
		.refine(validateMediaUrl, {
			message: "L'URL de la miniature doit provenir d'un domaine autorisé",
		})
		.optional()
		.nullable(),
	blurDataUrl: z.string().optional(),
	altText: z.string().max(TEXT_LIMITS.MEDIA_ALT_TEXT.max).optional(),
	mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
});

// Schema pour SKU initial (matching form structure)
const initialSkuSchema = z.object({
	// Prix en euros (sera converti en centimes cote serveur)
	priceInclTaxEuros: z.coerce
		.number({ error: "Le prix est requis" })
		.positive({ error: "Le prix doit être positif" })
		.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix ne peut pas depasser ${PRICE_LIMITS.MAX_EUR} eur` }),

	// Prix compare (optionnel, pour afficher prix barre)
	compareAtPriceEuros: z.coerce
		.number()
		.positive({ error: "Le prix compare doit être positif" })
		.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix compare ne peut pas depasser ${PRICE_LIMITS.MAX_EUR} eur` })
		.optional()
		.or(z.literal(""))
		.transform(val => val === "" ? undefined : val),

	// Inventory: normalized in server action before validation
	inventory: z.coerce
		.number()
		.int({ error: "L'inventaire doit être un entier" })
		.nonnegative({ error: "L'inventaire doit être positif ou nul" })
		.default(0),

	// Boolean fields: normalized in server action before validation
	isActive: z.coerce.boolean().default(true),
	isDefault: z.coerce.boolean().default(true),

	// Optional fields
	colorId: z.string().optional().or(z.literal("")),
	materialId: z.string().optional().or(z.literal("")),
	size: z.string().max(TEXT_LIMITS.SKU_SIZE.max).optional().or(z.literal("")),

	// Medias (images et videos) - premier = principal
	media: z
		.array(imageSchema)
		.max(ARRAY_LIMITS.SKU_MEDIA, { message: `Maximum ${ARRAY_LIMITS.SKU_MEDIA} médias` })
		.refine(
			(media) => new Set(media.map((m) => m.url)).size === media.length,
			{ message: "Les URLs de médias doivent être uniques" }
		)
		.default([]),
}).refine(
	(data) => {
		// Verifier que compareAtPrice >= priceInclTax si present
		if (!data.compareAtPriceEuros) return true;
		return data.compareAtPriceEuros >= data.priceInclTaxEuros;
	},
	{
		message: "Le prix compare doit être superieur ou egal au prix de vente",
		path: ["compareAtPriceEuros"],
	}
);

// Schema pour SKU par defaut (pour update)
const defaultSkuSchema = z.object({
	skuId: z.cuid2({ message: "ID SKU invalide" }),

	// Prix en euros (sera converti en centimes cote serveur)
	priceInclTaxEuros: z.coerce
		.number({ error: "Le prix est requis" })
		.positive({ error: "Le prix doit être positif" })
		.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix ne peut pas depasser ${PRICE_LIMITS.MAX_EUR} eur` }),

	// Prix compare (optionnel, pour afficher prix barre)
	compareAtPriceEuros: z.coerce
		.number()
		.positive({ error: "Le prix compare doit être positif" })
		.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix compare ne peut pas depasser ${PRICE_LIMITS.MAX_EUR} eur` })
		.optional()
		.or(z.literal(""))
		.transform(val => val === "" ? undefined : val),

	// Inventory: normalized in server action before validation
	inventory: z.coerce
		.number()
		.int({ error: "L'inventaire doit être un entier" })
		.nonnegative({ error: "L'inventaire doit être positif ou nul" })
		.default(0),

	// Boolean fields: normalized in server action before validation
	isActive: z.coerce.boolean().default(true),

	// Optional fields
	colorId: z.string().optional().or(z.literal("")),
	materialId: z.string().optional().or(z.literal("")),
	size: z.string().max(TEXT_LIMITS.SKU_SIZE.max).optional().or(z.literal("")),

	// Medias (images et videos) - premier = principal
	media: z
		.array(imageSchema)
		.max(ARRAY_LIMITS.SKU_MEDIA, { message: `Maximum ${ARRAY_LIMITS.SKU_MEDIA} médias` })
		.refine(
			(media) => new Set(media.map((m) => m.url)).size === media.length,
			{ message: "Les URLs de médias doivent être uniques" }
		)
		.default([]),
}).refine(
	(data) => {
		// Verifier que compareAtPrice >= priceInclTax si present
		if (!data.compareAtPriceEuros) return true;
		return data.compareAtPriceEuros >= data.priceInclTaxEuros;
	},
	{
		message: "Le prix compare doit être superieur ou egal au prix de vente",
		path: ["compareAtPriceEuros"],
	}
);

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createProductSchema = z
	.object({
		// Product fields
		title: z
			.string({ error: "Le titre du produit est requis" })
			.min(TEXT_LIMITS.PRODUCT_TITLE.min, { error: `Le titre doit contenir au moins ${TEXT_LIMITS.PRODUCT_TITLE.min} caracteres` })
			.max(TEXT_LIMITS.PRODUCT_TITLE.max, { error: `Le titre ne peut pas depasser ${TEXT_LIMITS.PRODUCT_TITLE.max} caracteres` })
			.trim(),

		description: z
			.string()
			.max(TEXT_LIMITS.PRODUCT_DESCRIPTION.max, {
				error: `La description ne peut pas depasser ${TEXT_LIMITS.PRODUCT_DESCRIPTION.max} caracteres`,
			})
			.trim()
			.optional()
			.or(z.literal("")),

		// Relations (IDs vides seront traites comme null)
		typeId: z
			.string()
			.optional()
			.or(z.literal(""))
			.transform((val) => (val === "" ? undefined : val)),

		// Collections (many-to-many)
		collectionIds: z
			.array(z.cuid2({ message: "ID collection invalide" }))
			.max(ARRAY_LIMITS.PRODUCT_COLLECTIONS, { error: `Un produit ne peut appartenir qu'a ${ARRAY_LIMITS.PRODUCT_COLLECTIONS} collections maximum` })
			.optional()
			.default([]),

		// Status enum
		status: z.enum(["DRAFT", "PUBLIC", "ARCHIVED"]).default("DRAFT"),

		// Initial SKU (required for product creation)
		initialSku: initialSkuSchema,
	})
	.refine((data) => data.initialSku.media.length > 0, {
		message: "Au moins une image est requise",
		path: ["initialSku", "media"],
	})
	.refine(
		(data) => {
			// Verifier que le premier media n'est PAS une video
			const firstMedia = data.initialSku.media[0];
			if (!firstMedia) return true;
			const mediaType = firstMedia.mediaType;
			if (!mediaType) {
				// Si pas de mediaType specifie, verifier l'extension de l'URL
				const url = firstMedia.url.toLowerCase();
				return !VIDEO_EXTENSIONS.some(ext => url.endsWith(ext));
			}
			return mediaType === "IMAGE";
		},
		{
			message:
				"Le premier média doit être une image, pas une vidéo.",
			path: ["initialSku", "media"],
		}
	);

export const updateProductSchema = z
	.object({
		// Product ID (required for update)
		productId: z.cuid2({ message: "ID produit invalide" }),

		// Product fields (modifiables)
		title: z
			.string({ error: "Le titre du produit est requis" })
			.min(TEXT_LIMITS.PRODUCT_TITLE.min, { error: `Le titre doit contenir au moins ${TEXT_LIMITS.PRODUCT_TITLE.min} caracteres` })
			.max(TEXT_LIMITS.PRODUCT_TITLE.max, { error: `Le titre ne peut pas depasser ${TEXT_LIMITS.PRODUCT_TITLE.max} caracteres` })
			.trim(),

		description: z
			.string()
			.max(TEXT_LIMITS.PRODUCT_DESCRIPTION.max, {
				error: `La description ne peut pas depasser ${TEXT_LIMITS.PRODUCT_DESCRIPTION.max} caracteres`,
			})
			.trim()
			.optional()
			.or(z.literal("")),

		// Relations (IDs vides seront traites comme null)
		typeId: z
			.string()
			.optional()
			.or(z.literal(""))
			.transform((val) => (val === "" ? undefined : val)),

		// Collections (many-to-many)
		collectionIds: z
			.array(z.cuid2({ message: "ID collection invalide" }))
			.max(ARRAY_LIMITS.PRODUCT_COLLECTIONS, { error: `Un produit ne peut appartenir qu'a ${ARRAY_LIMITS.PRODUCT_COLLECTIONS} collections maximum` })
			.optional()
			.default([]),

		// Status enum
		status: z.enum(["DRAFT", "PUBLIC", "ARCHIVED"]),

		// Default SKU (modifiable)
		defaultSku: defaultSkuSchema,
	})
	.refine((data) => data.defaultSku.media.length > 0, {
		message: "Au moins une image est requise",
		path: ["defaultSku", "media"],
	})
	.refine(
		(data) => {
			// Verifier que le premier media n'est PAS une video
			const firstMedia = data.defaultSku.media[0];
			if (!firstMedia) return true;
			const mediaType = firstMedia.mediaType;
			if (!mediaType) {
				// Si pas de mediaType specifie, verifier l'extension de l'URL
				const url = firstMedia.url.toLowerCase();
				return !VIDEO_EXTENSIONS.some(ext => url.endsWith(ext));
			}
			return mediaType === "IMAGE";
		},
		{
			message:
				"Le premier média doit être une image, pas une vidéo.",
			path: ["defaultSku", "media"],
		}
	);

export const deleteProductSchema = z.object({
	productId: z.cuid2(),
});

export const duplicateProductSchema = z.object({
	productId: z.cuid2(),
});

export const toggleProductStatusSchema = z.object({
	productId: z.cuid2(),
	currentStatus: z.enum(["DRAFT", "PUBLIC", "ARCHIVED"]),
	targetStatus: z.enum(["DRAFT", "PUBLIC", "ARCHIVED"]).optional(),
});

export const bulkDeleteProductsSchema = z.object({
	productIds: z.array(z.cuid2()).min(1, "Au moins un produit est requis"),
});

export const bulkArchiveProductsSchema = z.object({
	productIds: z.array(z.cuid2()).min(1, "Au moins un produit est requis"),
	targetStatus: z.enum(["ARCHIVED", "PUBLIC"]).default("ARCHIVED"),
});

export const bulkChangeProductStatusSchema = z.object({
	productIds: z
		.array(z.string().min(1))
		.min(1, "Au moins un produit doit être sélectionné"),
	targetStatus: z.enum(["DRAFT", "PUBLIC"]),
});
