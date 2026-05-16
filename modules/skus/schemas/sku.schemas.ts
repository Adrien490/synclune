import { z } from "zod";
import { VIDEO_EXTENSIONS } from "@/modules/media/constants/media-limits.constants";
import { imageSchema } from "@/modules/products/schemas/product-media.schemas";
import { TEXT_LIMITS, ARRAY_LIMITS, PRICE_LIMITS } from "@/shared/constants/validation-limits";

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getProductSkuSchema = z.object({
	sku: z.string().trim().min(1),
});

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/**
 * Schema de base partagé entre create et update
 * Contient tous les champs communs aux deux operations.
 *
 * Les médias sont un tableau unifié `media[]` aligné sur le formulaire produit
 * (premier item = principal, drag-reorder côté UI). Le serveur calcule
 * `isPrimary`/`position` à partir de l'ordre du tableau.
 */
const baseSkuFieldsSchema = z.object({
	// Prix en euros (sera converti en centimes cote serveur)
	priceInclTaxEuros: z.coerce
		.number({ error: "Le prix est requis" })
		.positive({ error: "Le prix doit être positif" })
		.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €` }),

	// Prix compare (optionnel, pour afficher prix barre)
	compareAtPriceEuros: z.coerce
		.number()
		.positive({ error: "Le prix comparé doit être positif" })
		.max(PRICE_LIMITS.MAX_EUR, {
			error: `Le prix comparé ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €`,
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

	// Couleurs M2M : ordre = priorité (1re = principale pour vignette + snapshot facture)
	colorIds: z
		.array(z.cuid2({ message: "ID couleur invalide" }))
		.max(ARRAY_LIMITS.SKU_COLORS, {
			error: `Une variante ne peut avoir que ${ARRAY_LIMITS.SKU_COLORS} couleurs maximum`,
		})
		.optional()
		.default([]),
	// Matériaux M2M : ordre = priorité (1er = principal pour SEO/care-tips)
	materialIds: z
		.array(z.cuid2({ message: "ID matériau invalide" }))
		.max(ARRAY_LIMITS.SKU_MATERIALS, {
			error: `Une variante ne peut avoir que ${ARRAY_LIMITS.SKU_MATERIALS} matériaux maximum`,
		})
		.optional()
		.default([]),
	size: z
		.string()
		.max(TEXT_LIMITS.SKU_SIZE.max)
		.optional()
		.or(z.literal(""))
		.transform((val) => (val === "" ? undefined : val)),

	// Medias unifiés (images + vidéos). Premier item = principal côté UI/serveur.
	media: z
		.array(imageSchema)
		.max(ARRAY_LIMITS.SKU_MEDIA, { message: `Maximum ${ARRAY_LIMITS.SKU_MEDIA} médias` })
		.refine((m) => new Set(m.map((x) => x.url)).size === m.length, {
			message: "Les URLs de médias doivent être uniques",
		})
		.default([]),
});

/**
 * Refinement: vérifier qu'au moins 1 média est présent.
 */
function refineMediaMinOne(data: { media: unknown[] }) {
	return data.media.length > 0;
}

/**
 * Refinement: vérifier que le premier media (= image principale) n'est PAS une vidéo.
 */
function refineFirstMediaNotVideo(data: {
	media: Array<{ url: string; mediaType?: "IMAGE" | "VIDEO" }>;
}) {
	const first = data.media[0];
	if (!first) return true; // empty handled by refineMediaMinOne
	const mediaType = first.mediaType;
	if (!mediaType) {
		const url = first.url.toLowerCase();
		return !VIDEO_EXTENSIONS.some((ext) => url.endsWith(ext));
	}
	return mediaType === "IMAGE";
}

/**
 * Refinement: vérifier que compareAtPrice >= priceInclTax si present
 */
function refineCompareAtPrice(data: { compareAtPriceEuros?: number; priceInclTaxEuros: number }) {
	if (!data.compareAtPriceEuros) return true;
	return data.compareAtPriceEuros >= data.priceInclTaxEuros;
}

const MEDIA_REQUIRED_ERROR = {
	message: "Au moins une image est requise",
	path: ["media"],
};

const FIRST_MEDIA_NOT_VIDEO_ERROR = {
	message: "Le premier média doit être une image, pas une vidéo.",
	path: ["media"],
};

const COMPARE_PRICE_ERROR = {
	message: "Le prix comparé doit être supérieur ou égal au prix de vente",
	path: ["compareAtPriceEuros"],
};

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createProductSkuSchema = baseSkuFieldsSchema
	.extend({
		// Product ID (required - on cree un SKU pour un produit existant)
		productId: z.cuid2({ message: "ID produit invalide" }),

		// SKU - optional, sera auto-genere si non fourni
		sku: z.string().max(50).optional().or(z.literal("")),
	})
	.refine(refineMediaMinOne, MEDIA_REQUIRED_ERROR)
	.refine(refineFirstMediaNotVideo, FIRST_MEDIA_NOT_VIDEO_ERROR)
	.refine(refineCompareAtPrice, COMPARE_PRICE_ERROR);

export const deleteProductSkuSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
});

export const updateProductSkuStatusSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
	isActive: z.boolean(),
});

/**
 * Helper pour parser et valider un tableau d'IDs depuis JSON
 * Rejette explicitement les erreurs au lieu de retourner un tableau vide
 */
const cuid2Schema = z.cuid2({ message: "ID invalide dans le tableau" });

const parseJsonIdsArray = z.string().transform((str, ctx): string[] | typeof z.NEVER => {
	try {
		const parsed: unknown = JSON.parse(str);
		if (!Array.isArray(parsed)) {
			ctx.addIssue({ code: "custom", message: "Format invalide: tableau attendu" });
			return z.NEVER;
		}
		// Valider que chaque element est un CUID2 valide
		const items = parsed as unknown as unknown[];
		for (const id of items) {
			if (typeof id !== "string" || !cuid2Schema.safeParse(id).success) {
				ctx.addIssue({ code: "custom", message: "ID invalide dans le tableau" });
				return z.NEVER;
			}
		}
		return items as string[];
	} catch {
		ctx.addIssue({ code: "custom", message: "JSON invalide" });
		return z.NEVER;
	}
});

export const bulkActivateSkusSchema = z.object({
	ids: parseJsonIdsArray,
});

export const bulkDeactivateSkusSchema = z.object({
	ids: parseJsonIdsArray,
});

export const bulkDeleteSkusSchema = z.object({
	ids: parseJsonIdsArray,
});

export const bulkAdjustStockSchema = z.object({
	ids: parseJsonIdsArray,
	mode: z.enum(["relative", "absolute"]),
	value: z.coerce.number().int(),
});

export const bulkUpdatePriceSchema = z.object({
	ids: parseJsonIdsArray,
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
		skuId: z.cuid2({ message: "ID variante invalide" }),
	})
	.refine(refineMediaMinOne, MEDIA_REQUIRED_ERROR)
	.refine(refineFirstMediaNotVideo, FIRST_MEDIA_NOT_VIDEO_ERROR)
	.refine(refineCompareAtPrice, COMPARE_PRICE_ERROR);

// ============================================================================
// QUICK UPDATE SCHEMAS (Admin dialogs)
// ============================================================================

/**
 * Schema pour la mise à jour rapide du prix d'un SKU
 * Utilisé dans le dialog de modification rapide de prix
 * Note: Les prix sont en EUROS (convertis en centimes côté serveur)
 */
export const updateSkuPriceSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
	priceInclTaxEuros: z.coerce
		.number()
		.positive({ error: "Le prix doit être supérieur à 0" })
		.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €` }),
	compareAtPriceEuros: z.coerce
		.number()
		.positive({ error: "Le prix comparé doit être positif" })
		.max(PRICE_LIMITS.MAX_EUR, {
			error: `Le prix comparé ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €`,
		})
		.optional()
		.or(z.literal(""))
		.transform((val) => (val === "" ? undefined : val)),
});

/**
 * Schema pour l'ajustement de stock d'un SKU
 * Utilisé dans le dialog d'ajustement de stock
 */
export const adjustSkuStockSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
	adjustment: z
		.number()
		.int({ error: "L'ajustement doit être un entier" })
		.min(-99999, { error: "L'ajustement ne peut pas être inférieur à -99 999" })
		.max(99999, { error: "L'ajustement ne peut pas dépasser 99 999" })
		.refine((val) => val !== 0, { message: "L'ajustement ne peut pas être 0" }),
	reason: z.string().max(500).optional(),
});
