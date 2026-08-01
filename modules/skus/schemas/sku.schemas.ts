import { z } from "zod";
import { formBooleanSchema } from "@/shared/schemas/boolean.schema";
import {
	PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE,
	VIDEO_EXTENSIONS,
} from "@/modules/media/constants/media-limits.constants";
import { imageSchema } from "@/modules/products/schemas/product-media.schemas";
import {
	TEXT_LIMITS,
	ARRAY_LIMITS,
	PRICE_LIMITS,
	STOCK_LIMITS,
} from "@/shared/constants/validation-limits";

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
	// .min(0.01) plutot que .positive() pour eviter qu'un prix entre 0 et 0.005€
	// passe le schema Zod puis echoue le CHECK DB priceInclTax > 0 (message opaque).
	priceInclTaxEuros: z.coerce
		.number({ error: "Le prix est requis" })
		.min(0.01, { error: "Le prix doit être d'au moins 0,01 €" })
		.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €` }),

	// Prix compare (optionnel, pour afficher prix barre)
	compareAtPriceEuros: z.coerce
		.number()
		.min(0.01, { error: "Le prix comparé doit être d'au moins 0,01 €" })
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
		// Plafond SERVEUR : il n'existait que dans le formulaire d'ajustement, donc un
		// POST direct passait, et le CHECK DB ne borne que le plancher.
		.max(STOCK_LIMITS.MAX_INVENTORY, {
			error: `Le stock ne peut pas dépasser ${STOCK_LIMITS.MAX_INVENTORY} unités`,
		})
		.default(0),

	// Boolean fields: normalized in server action before validation
	isActive: formBooleanSchema.default(true),
	isDefault: formBooleanSchema.default(false),

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
		.trim()
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
 * Refinement: vérifier que compareAtPrice > priceInclTax si present.
 * Strict : un prix barré égal au prix de vente serait un affichage promo mensonger
 * (aligné sur les forms admin ; le CHECK DB reste >=, plus laxiste).
 */
function refineCompareAtPrice(data: { compareAtPriceEuros?: number; priceInclTaxEuros: number }) {
	if (!data.compareAtPriceEuros) return true;
	return data.compareAtPriceEuros > data.priceInclTaxEuros;
}

const MEDIA_REQUIRED_ERROR = {
	message: "Au moins une image est requise",
	path: ["media"],
};

const FIRST_MEDIA_NOT_VIDEO_ERROR = {
	message: PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE,
	path: ["media"],
};

const COMPARE_PRICE_ERROR = {
	message: "Le prix comparé doit être strictement supérieur au prix de vente",
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
		sku: z.string().max(TEXT_LIMITS.SKU_CODE.max).optional().or(z.literal("")),
	})
	.refine(refineMediaMinOne, MEDIA_REQUIRED_ERROR)
	.refine(refineFirstMediaNotVideo, FIRST_MEDIA_NOT_VIDEO_ERROR)
	.refine(refineCompareAtPrice, COMPARE_PRICE_ERROR);

export const deleteProductSkuSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
});

/**
 * Même forme que `deleteProductSkuSchema`, nommés séparément.
 *
 * `duplicateSku` et `setDefaultSku` validaient littéralement avec le schéma de
 * SUPPRESSION : ça marchait, mais le call site laissait croire à une suppression,
 * et faire divergir l'un des trois (ajouter un champ à la duplication, par
 * exemple) l'aurait fait divergir pour les trois.
 */
export const duplicateProductSkuSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
});

export const setDefaultProductSkuSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
});

export const updateProductSkuStatusSchema = z.object({
	skuId: z.cuid2({ message: "ID variante invalide" }),
	isActive: z.boolean(),
});

// ============================================================================
// UPDATE SCHEMA
// ============================================================================

export const updateProductSkuSchema = baseSkuFieldsSchema
	.extend({
		// SKU ID (required - on modifie un SKU existant)
		skuId: z.cuid2({ message: "ID variante invalide" }),
		// Stock affiché à l'ouverture du formulaire (champ caché). Sert à calculer
		// un DELTA relatif côté action plutôt qu'un set absolu last-write-wins :
		// `inventory - originalInventory` est appliqué en increment sous FOR UPDATE,
		// ce qui préserve les décréments webhook commités pendant l'édition.
		// Default = inventory (compat : si absent, delta = 0, aucun écrasement).
		originalInventory: z.coerce
			.number()
			.int({ error: "Le stock d'origine doit être un entier" })
			.nonnegative({ error: "Le stock d'origine doit être positif ou nul" })
			.optional(),
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
export const updateSkuPriceSchema = z
	.object({
		skuId: z.cuid2({ message: "ID variante invalide" }),
		priceInclTaxEuros: z.coerce
			.number()
			.min(0.01, { error: "Le prix doit être d'au moins 0,01 €" })
			.max(PRICE_LIMITS.MAX_EUR, {
				error: `Le prix ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €`,
			}),
		compareAtPriceEuros: z.coerce
			.number()
			.min(0.01, { error: "Le prix comparé doit être d'au moins 0,01 €" })
			.max(PRICE_LIMITS.MAX_EUR, {
				error: `Le prix comparé ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €`,
			})
			.optional()
			.or(z.literal(""))
			.transform((val) => (val === "" ? undefined : val)),
	})
	.refine(refineCompareAtPrice, COMPARE_PRICE_ERROR);

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
