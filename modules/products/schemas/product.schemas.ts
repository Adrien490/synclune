import { ProductStatus } from "@/app/generated/prisma/client";
import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCTS_SORT_FIELDS,
} from "../constants/product.constants";

// ============================================================================
// HELPERS
// ============================================================================

const stringOrStringArray = z
	.union([
		z.string().min(1).max(100),
		z.array(z.string().min(1).max(100)).max(50),
	])
	.optional();

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
		collectionId: stringOrStringArray,
		collectionSlug: stringOrStringArray,
		priceMin: z.number().int().nonnegative().max(1000000).optional(),
		priceMax: z.number().int().nonnegative().max(1000000).optional(),
		createdAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"))
			.max(new Date())
			.optional(),
		createdBefore: z.coerce.date().min(new Date("2020-01-01")).optional(),
		updatedAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"))
			.max(new Date())
			.optional(),
		updatedBefore: z.coerce.date().min(new Date("2020-01-01")).optional(),
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
	search: z.string().max(200).optional(),
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
 * Domaines autorises pour les URLs de medias (securite)
 * Seuls les fichiers uploades via UploadThing sont acceptes
 */
const ALLOWED_MEDIA_DOMAINS = [
	"utfs.io",
	"ufs.sh",
	"uploadthing.com",
	"uploadthing-prod.s3.us-west-2.amazonaws.com",
];

/**
 * Verifie si une URL provient d'un domaine autorise
 */
const isAllowedMediaDomain = (url: string): boolean => {
	try {
		const hostname = new URL(url).hostname;
		return ALLOWED_MEDIA_DOMAINS.some(
			(domain) => hostname === domain || hostname.endsWith(`.${domain}`)
		);
	} catch {
		return false;
	}
};

/**
 * Schema pour un media (image ou video)
 * Securise: n'accepte que les URLs provenant d'UploadThing
 */
const imageSchema = z.object({
	url: z
		.string()
		.url({ message: "L'URL du media doit être valide" })
		.refine(isAllowedMediaDomain, {
			message: "L'URL du média doit provenir d'un domaine autorisé (UploadThing)",
		}),
	thumbnailUrl: z
		.string()
		.url()
		.refine(isAllowedMediaDomain, {
			message: "L'URL de la miniature doit provenir d'un domaine autorisé",
		})
		.optional()
		.nullable(),
	blurDataUrl: z.string().optional(),
	altText: z.string().max(200).optional(),
	mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
});

// Schema pour SKU initial (matching form structure)
const initialSkuSchema = z.object({
	// Prix en euros (sera converti en centimes cote serveur)
	priceInclTaxEuros: z.coerce
		.number({ error: "Le prix est requis" })
		.positive({ error: "Le prix doit être positif" })
		.max(999999.99, { error: "Le prix ne peut pas depasser 999999.99 eur" }),

	// Prix compare (optionnel, pour afficher prix barre)
	compareAtPriceEuros: z.coerce
		.number()
		.positive({ error: "Le prix compare doit être positif" })
		.max(999999.99, { error: "Le prix compare ne peut pas depasser 999999.99 eur" })
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
	size: z.string().max(50).optional().or(z.literal("")),

	// Medias (images et videos) - premier = principal
	media: z
		.array(imageSchema)
		.max(6, { message: "Maximum 6 médias" })
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
	skuId: z.cuid({ error: "ID SKU invalide" }),

	// Prix en euros (sera converti en centimes cote serveur)
	priceInclTaxEuros: z.coerce
		.number({ error: "Le prix est requis" })
		.positive({ error: "Le prix doit être positif" })
		.max(999999.99, { error: "Le prix ne peut pas depasser 999999.99 eur" }),

	// Prix compare (optionnel, pour afficher prix barre)
	compareAtPriceEuros: z.coerce
		.number()
		.positive({ error: "Le prix compare doit être positif" })
		.max(999999.99, { error: "Le prix compare ne peut pas depasser 999999.99 eur" })
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
	size: z.string().max(50).optional().or(z.literal("")),

	// Medias (images et videos) - premier = principal
	media: z
		.array(imageSchema)
		.max(6, { message: "Maximum 6 médias" })
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
			.min(2, { error: "Le titre doit contenir au moins 2 caracteres" })
			.max(200, { error: "Le titre ne peut pas depasser 200 caracteres" })
			.trim(),

		description: z
			.string()
			.max(500, {
				error: "La description ne peut pas depasser 500 caracteres",
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
			.array(z.cuid())
			.max(10, { error: "Un produit ne peut appartenir qu'a 10 collections maximum" })
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
				return !(
					url.endsWith(".mp4") ||
					url.endsWith(".webm") ||
					url.endsWith(".mov")
				);
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
		productId: z.cuid({ error: "ID produit invalide" }),

		// Product fields (modifiables)
		title: z
			.string({ error: "Le titre du produit est requis" })
			.min(2, { error: "Le titre doit contenir au moins 2 caracteres" })
			.max(200, { error: "Le titre ne peut pas depasser 200 caracteres" })
			.trim(),

		description: z
			.string()
			.max(500, {
				error: "La description ne peut pas depasser 500 caracteres",
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
			.array(z.cuid())
			.max(10, { error: "Un produit ne peut appartenir qu'a 10 collections maximum" })
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
				return !(
					url.endsWith(".mp4") ||
					url.endsWith(".webm") ||
					url.endsWith(".mov")
				);
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
