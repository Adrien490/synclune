import { z } from "zod";
import { formBooleanSchema } from "@/shared/schemas/boolean.schema";

import {
	PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE,
	VIDEO_EXTENSIONS,
} from "@/modules/media/constants/media-limits.constants";
import {
	ARRAY_LIMITS,
	PRICE_LIMITS,
	STOCK_LIMITS,
	TEXT_LIMITS,
} from "@/shared/constants/validation-limits";

import { imageSchema } from "./product-media.schemas";

// ============================================================================
// SHARED — schéma lean (lot 2) : produit { name, description, priceCents,
// active, media[] }, variante { size, colorId?, materialId?, priceCents?,
// stock, active }. Le média vit sur le PRODUIT.
// ============================================================================

const productNameSchema = z
	.string({ error: "Le nom du produit est requis" })
	.min(TEXT_LIMITS.PRODUCT_TITLE.min, {
		error: `Le nom doit contenir au moins ${TEXT_LIMITS.PRODUCT_TITLE.min} caractères`,
	})
	.max(TEXT_LIMITS.PRODUCT_TITLE.max, {
		error: `Le nom ne peut pas dépasser ${TEXT_LIMITS.PRODUCT_TITLE.max} caractères`,
	})
	.trim();

const productDescriptionSchema = z
	.string()
	.max(TEXT_LIMITS.PRODUCT_DESCRIPTION.max, {
		error: `La description ne peut pas dépasser ${TEXT_LIMITS.PRODUCT_DESCRIPTION.max} caractères`,
	})
	.trim()
	.optional()
	.or(z.literal(""));

const priceEurosSchema = z.coerce
	.number({ error: "Le prix est requis" })
	.min(0.01, { error: "Le prix doit être d'au moins 0,01 €" })
	.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €` });

/** Override de prix de variante — vide = hérite du prix produit. */
const optionalPriceEurosSchema = priceEurosSchema
	.optional()
	.or(z.literal(""))
	.transform((val) => (val === "" ? undefined : val));

const collectionIdsSchema = z
	.array(z.cuid2({ message: "ID collection invalide" }))
	.max(ARRAY_LIMITS.PRODUCT_COLLECTIONS, {
		error: `Un produit ne peut appartenir qu'à ${ARRAY_LIMITS.PRODUCT_COLLECTIONS} collections maximum`,
	})
	.optional()
	.default([]);

const mediaArraySchema = z
	.array(imageSchema)
	.max(ARRAY_LIMITS.VARIANT_MEDIA, { message: `Maximum ${ARRAY_LIMITS.VARIANT_MEDIA} médias` })
	.refine((media) => new Set(media.map((m) => m.url)).size === media.length, {
		message: "Les URLs de médias doivent être uniques",
	})
	.default([]);

/** Le premier média (rang 0 = média principal) doit être une IMAGE. */
function firstMediaIsImage(media: Array<{ url: string; type?: string }>): boolean {
	const first = media[0];
	if (!first) return true;
	if (first.type) return first.type === "IMAGE";
	const url = first.url.toLowerCase();
	return !VIDEO_EXTENSIONS.some((ext) => url.endsWith(ext));
}

const variantFields = {
	// Override du prix produit — vide = prix du produit
	priceEuros: optionalPriceEurosSchema,

	stock: z.coerce
		.number()
		.int({ error: "Le stock doit être un entier" })
		.nonnegative({ error: "Le stock doit être positif ou nul" })
		.max(STOCK_LIMITS.MAX_INVENTORY, {
			error: `Le stock ne peut pas dépasser ${STOCK_LIMITS.MAX_INVENTORY} unités`,
		})
		.default(0),

	active: formBooleanSchema.default(true),

	// FK simples (schéma lean) — vide = aucun
	colorId: z
		.cuid2({ message: "ID couleur invalide" })
		.optional()
		.or(z.literal(""))
		.transform((val) => (val === "" ? undefined : val)),
	materialId: z
		.cuid2({ message: "ID matériau invalide" })
		.optional()
		.or(z.literal(""))
		.transform((val) => (val === "" ? undefined : val)),

	size: z
		.string()
		.max(TEXT_LIMITS.VARIANT_SIZE.max)
		.optional()
		.or(z.literal(""))
		.transform((val) => (val === "" ? undefined : val)),
};

const initialVariantSchema = z.object({ ...variantFields });

const defaultVariantSchema = z.object({
	variantId: z.cuid2({ message: "ID variante invalide" }),
	...variantFields,
	// Stock affiché à l'ouverture du formulaire (champ caché). Sert à appliquer
	// un DELTA relatif plutôt qu'un set absolu last-write-wins qui écraserait un
	// décrément de vente commité pendant l'édition (stock fantôme → survente).
	originalStock: z.coerce
		.number()
		.int({ error: "Le stock d'origine doit être un entier" })
		.nonnegative({ error: "Le stock d'origine doit être positif ou nul" })
		.optional(),
});

// ============================================================================
// CREATE
// ============================================================================

export const createProductSchema = z
	.object({
		name: productNameSchema,
		description: productDescriptionSchema,
		priceEuros: priceEurosSchema,
		active: formBooleanSchema.default(false),
		typeId: z
			.cuid2({ message: "ID type invalide" })
			.optional()
			.or(z.literal(""))
			.transform((val) => (val === "" ? undefined : val)),
		collectionIds: collectionIdsSchema,
		// Médias du PRODUIT — premier = principal
		media: mediaArraySchema,
		// Variante initiale (chaque produit a AU MOINS une variante)
		initialVariant: initialVariantSchema,
	})
	.refine((data) => data.media.length > 0, {
		message: "Au moins une image est requise",
		path: ["media"],
	})
	.refine((data) => firstMediaIsImage(data.media), {
		message: PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE,
		path: ["media"],
	});

// ============================================================================
// UPDATE
// ============================================================================

export const updateProductSchema = z
	.object({
		productId: z.cuid2({ message: "ID produit invalide" }),
		name: productNameSchema,
		description: productDescriptionSchema,
		priceEuros: priceEurosSchema,
		active: formBooleanSchema,
		typeId: z
			.cuid2({ message: "ID type invalide" })
			.optional()
			.or(z.literal(""))
			.transform((val) => (val === "" ? undefined : val)),
		collectionIds: collectionIdsSchema,
		media: mediaArraySchema,
		// Variante principale (modifiable depuis le formulaire produit)
		defaultVariant: defaultVariantSchema,
	})
	.refine((data) => data.media.length > 0, {
		message: "Au moins une image est requise",
		path: ["media"],
	})
	.refine((data) => firstMediaIsImage(data.media), {
		message: PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE,
		path: ["media"],
	});

// ============================================================================
// LIFECYCLE
// ============================================================================

export const deleteProductSchema = z.object({
	productId: z.cuid2(),
});

export const duplicateProductSchema = z.object({
	productId: z.cuid2(),
});

export const toggleProductStatusSchema = z.object({
	productId: z.cuid2(),
	/** Cible explicite ; à défaut, bascule de l'état courant. */
	targetActive: formBooleanSchema.optional(),
});

export const updateProductCollectionsSchema = z.object({
	productId: z.cuid2({ message: "ID produit invalide" }),
	collectionIds: z
		.array(z.cuid2({ message: "ID collection invalide" }))
		.max(ARRAY_LIMITS.PRODUCT_COLLECTIONS, {
			error: `Un produit ne peut appartenir qu'à ${ARRAY_LIMITS.PRODUCT_COLLECTIONS} collections maximum`,
		})
		.default([]),
});
