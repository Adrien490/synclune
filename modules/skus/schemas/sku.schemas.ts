import { z } from "zod";

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getProductSkuSchema = z.object({
	sku: z.string().trim().min(1),
});

// ============================================================================
// SECURITY: ALLOWED MEDIA DOMAINS
// ============================================================================

/**
 * Whitelist des domaines autorisés pour les URLs de médias
 * Seuls les fichiers hébergés sur UploadThing sont acceptés
 */
const ALLOWED_MEDIA_DOMAINS = [
	"utfs.io",
	"ufs.sh",
	"uploadthing.com",
	"uploadthing-prod.s3.us-west-2.amazonaws.com",
];

/**
 * Vérifie si une URL provient d'un domaine autorisé
 */
function isAllowedMediaDomain(url: string): boolean {
	try {
		const hostname = new URL(url).hostname;
		return ALLOWED_MEDIA_DOMAINS.some(
			(domain) => hostname === domain || hostname.endsWith(`.${domain}`)
		);
	} catch {
		return false;
	}
}

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/**
 * Schema pour un media (image ou video)
 * Accepte null pour permettre la suppression explicite
 */
const imageSchema = z
	.object({
		url: z
			.string()
			.url({ message: "L'URL du media doit être valide" })
			.refine(isAllowedMediaDomain, {
				message: "L'URL du média doit provenir d'un domaine autorisé (UploadThing)",
			}),
		thumbnailUrl: z
			.string()
			.url()
			.refine((url) => !url || isAllowedMediaDomain(url), {
				message: "L'URL de la miniature doit provenir d'un domaine autorisé",
			})
			.optional()
			.nullable(),
		blurDataUrl: z.string().optional().nullable(), // Base64 blur placeholder pour les images
		altText: z.string().max(200).optional().nullable(),
		mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
	})
	.nullable();

/**
 * Extensions video supportees pour validation
 */
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"] as const;

/**
 * Verifie si une URL est une video basee sur son extension
 */
function isVideoUrl(url: string): boolean {
	const lowerUrl = url.toLowerCase();
	return VIDEO_EXTENSIONS.some((ext) => lowerUrl.endsWith(ext));
}

/**
 * Schema de base partagé entre create et update
 * Contient tous les champs communs aux deux operations
 */
const baseSkuFieldsSchema = z.object({
	// Prix en euros (sera converti en centimes cote serveur)
	priceInclTaxEuros: z.coerce
		.number({ error: "Le prix est requis" })
		.positive({ error: "Le prix doit être positif" })
		.max(999999.99, { error: "Le prix ne peut pas depasser 999999.99 eur" }),

	// Prix compare (optionnel, pour afficher prix barre)
	compareAtPriceEuros: z.coerce
		.number()
		.positive({ error: "Le prix compare doit être positif" })
		.max(999999.99, {
			error: "Le prix compare ne peut pas depasser 999999.99 eur",
		})
		.optional()
		.or(z.literal(""))
		.transform((val) => (val === "" ? undefined : val)),

	// Inventory: normalized in server action before validation
	inventory: z.coerce
		.number()
		.int({ error: "L'inventaire doit être un entier" })
		.nonnegative({ error: "L'inventaire doit être positif ou nul" })
		.default(0),

	// Boolean fields: normalized in server action before validation
	isActive: z.coerce.boolean().default(true),
	isDefault: z.coerce.boolean().default(false),

	// Optional fields
	colorId: z.string().optional().or(z.literal("")),
	materialId: z.string().optional().or(z.literal("")),
	size: z.string().max(50).optional().or(z.literal("")),

	// Medias (images et videos)
	primaryImage: imageSchema.optional(),
	galleryMedia: z
		.array(imageSchema)
		.max(10, { error: "Maximum 10 medias dans la galerie" })
		.default([])
		.transform((arr) => arr.filter((item): item is NonNullable<typeof item> => item !== null)),
});

/**
 * Refinement: verifier que le media principal n'est PAS une video
 * Gere les cas: undefined, null, ou objet image
 */
function refinePrimaryImageNotVideo(data: { primaryImage?: { url: string; mediaType?: "IMAGE" | "VIDEO" } | null }) {
	if (!data.primaryImage) return true; // undefined ou null = OK
	const mediaType = data.primaryImage.mediaType;
	if (!mediaType) {
		return !isVideoUrl(data.primaryImage.url);
	}
	return mediaType === "IMAGE";
}

/**
 * Refinement: verifier que compareAtPrice >= priceInclTax si present
 */
function refineCompareAtPrice(data: { compareAtPriceEuros?: number; priceInclTaxEuros: number }) {
	if (!data.compareAtPriceEuros) return true;
	return data.compareAtPriceEuros >= data.priceInclTaxEuros;
}

const PRIMARY_IMAGE_ERROR = {
	message:
		"Le media principal ne peut pas être une video. Veuillez sélectionner une image.",
	path: ["primaryImage"],
};

const COMPARE_PRICE_ERROR = {
	message: "Le prix compare doit être superieur ou egal au prix de vente",
	path: ["compareAtPriceEuros"],
};

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createProductSkuSchema = baseSkuFieldsSchema
	.extend({
		// Product ID (required - on cree un SKU pour un produit existant)
		productId: z
			.string({ error: "Le produit est requis" })
			.min(1, { error: "Le produit est requis" }),

		// SKU - optional, sera auto-genere si non fourni
		sku: z.string().optional().or(z.literal("")),
	})
	.refine(refinePrimaryImageNotVideo, PRIMARY_IMAGE_ERROR)
	.refine(refineCompareAtPrice, COMPARE_PRICE_ERROR);

export const deleteProductSkuSchema = z.object({
	skuId: z.string(),
});

export const updateProductSkuStatusSchema = z.object({
	skuId: z.string(),
	isActive: z.boolean(),
});

export const bulkActivateSkusSchema = z.object({
	ids: z.string().transform((str) => {
		try {
			const parsed = JSON.parse(str);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}),
});

export const bulkDeactivateSkusSchema = z.object({
	ids: z.string().transform((str) => {
		try {
			const parsed = JSON.parse(str);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}),
});

export const bulkDeleteSkusSchema = z.object({
	ids: z.string().transform((str) => {
		try {
			const parsed = JSON.parse(str);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}),
});

export const bulkAdjustStockSchema = z.object({
	ids: z.string().transform((str) => {
		try {
			const parsed = JSON.parse(str);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}),
	mode: z.enum(["relative", "absolute"]),
	value: z.coerce.number().int(),
});

export const bulkUpdatePriceSchema = z.object({
	ids: z.string().transform((str) => {
		try {
			const parsed = JSON.parse(str);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}),
	mode: z.enum(["percentage", "absolute"]),
	value: z.coerce.number(),
	updateCompareAtPrice: z.coerce.boolean().default(false),
});

// ============================================================================
// UPDATE SCHEMA
// ============================================================================

export const updateProductSkuSchema = baseSkuFieldsSchema
	.extend({
		// SKU ID (required - on modifie un SKU existant)
		skuId: z
			.string({ error: "L'ID du SKU est requis" })
			.min(1, { error: "L'ID du SKU est requis" }),
	})
	.refine(refinePrimaryImageNotVideo, PRIMARY_IMAGE_ERROR)
	.refine(refineCompareAtPrice, COMPARE_PRICE_ERROR);
