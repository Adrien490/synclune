import { z } from "zod";
// Enum GÉNÉRÉ plutôt que le littéral `["DRAFT", "PUBLIC", "ARCHIVED"]` répété 4 fois :
// les valeurs coïncidaient, mais rien ne les rattachait à `schema.prisma`. Ajouter un
// statut au modèle aurait laissé ces 4 schémas le refuser en silence — le reste du
// repo dérive déjà ses enums du client Prisma (OrderStatus, RefundStatus, …).
import { PublicationStatus } from "@/app/generated/prisma/enums";
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
// SKU SHARED
// ============================================================================

const baseSkuFields = {
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
		// Parité avec `sku.schemas.ts` : plafond côté SERVEUR, pas seulement dans l'UI.
		.max(STOCK_LIMITS.MAX_INVENTORY, {
			error: `Le stock ne peut pas dépasser ${STOCK_LIMITS.MAX_INVENTORY} unités`,
		})
		.default(0),

	// Boolean fields: normalized in server action before validation
	isActive: formBooleanSchema.default(true),

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

	// Medias (images et videos) - premier = principal
	media: z
		.array(imageSchema)
		.max(ARRAY_LIMITS.SKU_MEDIA, { message: `Maximum ${ARRAY_LIMITS.SKU_MEDIA} médias` })
		.refine((media) => new Set(media.map((m) => m.url)).size === media.length, {
			message: "Les URLs de médias doivent être uniques",
		})
		.default([]),
};

// Strict (`>`), aligné sur sku.schemas.ts : un prix barré ÉGAL au prix de vente
// serait un affichage promo mensonger. Les deux formulaires éditent le même SKU
// — le `>=` d'ici divergeait du refine strict du formulaire variante.
const skuPriceRefinement = <T extends { compareAtPriceEuros?: number; priceInclTaxEuros: number }>(
	data: T,
) => {
	if (!data.compareAtPriceEuros) return true;
	return data.compareAtPriceEuros > data.priceInclTaxEuros;
};

const initialSkuSchema = z
	.object({
		...baseSkuFields,
	})
	.refine(skuPriceRefinement, {
		message: "Le prix comparé doit être strictement supérieur au prix de vente",
		path: ["compareAtPriceEuros"],
	});

const defaultSkuSchema = z
	.object({
		skuId: z.cuid2({ message: "ID variante invalide" }),
		...baseSkuFields,
		// Stock affiché à l'ouverture du formulaire (champ caché) — parité avec
		// `updateProductSkuSchema.originalInventory`. Sert à appliquer un DELTA relatif
		// sous `FOR UPDATE` plutôt qu'un set absolu last-write-wins, qui écrasait les
		// décréments de vente commités pendant l'édition (stock fantôme → survente).
		// Default = inventory côté action : absent ⇒ delta 0, aucun écrasement.
		originalInventory: z.coerce
			.number()
			.int({ error: "Le stock d'origine doit être un entier" })
			.nonnegative({ error: "Le stock d'origine doit être positif ou nul" })
			.optional(),
	})
	.refine(skuPriceRefinement, {
		message: "Le prix comparé doit être strictement supérieur au prix de vente",
		path: ["compareAtPriceEuros"],
	});

// ============================================================================
// CREATE
// ============================================================================

export const createProductSchema = z
	.object({
		// Product fields
		title: z
			.string({ error: "Le titre du produit est requis" })
			.min(TEXT_LIMITS.PRODUCT_TITLE.min, {
				error: `Le titre doit contenir au moins ${TEXT_LIMITS.PRODUCT_TITLE.min} caractères`,
			})
			.max(TEXT_LIMITS.PRODUCT_TITLE.max, {
				error: `Le titre ne peut pas dépasser ${TEXT_LIMITS.PRODUCT_TITLE.max} caractères`,
			})
			.trim(),

		description: z
			.string()
			.max(TEXT_LIMITS.PRODUCT_DESCRIPTION.max, {
				error: `La description ne peut pas dépasser ${TEXT_LIMITS.PRODUCT_DESCRIPTION.max} caractères`,
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
			.max(ARRAY_LIMITS.PRODUCT_COLLECTIONS, {
				error: `Un produit ne peut appartenir qu'à ${ARRAY_LIMITS.PRODUCT_COLLECTIONS} collections maximum`,
			})
			.optional()
			.default([]),

		// Status enum
		status: z.enum(PublicationStatus).default("DRAFT"),

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
				return !VIDEO_EXTENSIONS.some((ext) => url.endsWith(ext));
			}
			return mediaType === "IMAGE";
		},
		{
			message: PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE,
			path: ["initialSku", "media"],
		},
	);

// ============================================================================
// UPDATE
// ============================================================================

export const updateProductSchema = z
	.object({
		// Product ID (required for update)
		productId: z.cuid2({ message: "ID produit invalide" }),

		// Product fields (modifiables)
		title: z
			.string({ error: "Le titre du produit est requis" })
			.min(TEXT_LIMITS.PRODUCT_TITLE.min, {
				error: `Le titre doit contenir au moins ${TEXT_LIMITS.PRODUCT_TITLE.min} caractères`,
			})
			.max(TEXT_LIMITS.PRODUCT_TITLE.max, {
				error: `Le titre ne peut pas dépasser ${TEXT_LIMITS.PRODUCT_TITLE.max} caractères`,
			})
			.trim(),

		description: z
			.string()
			.max(TEXT_LIMITS.PRODUCT_DESCRIPTION.max, {
				error: `La description ne peut pas dépasser ${TEXT_LIMITS.PRODUCT_DESCRIPTION.max} caractères`,
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
			.max(ARRAY_LIMITS.PRODUCT_COLLECTIONS, {
				error: `Un produit ne peut appartenir qu'à ${ARRAY_LIMITS.PRODUCT_COLLECTIONS} collections maximum`,
			})
			.optional()
			.default([]),

		// Status enum
		status: z.enum(PublicationStatus),

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
				return !VIDEO_EXTENSIONS.some((ext) => url.endsWith(ext));
			}
			return mediaType === "IMAGE";
		},
		{
			message: PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE,
			path: ["defaultSku", "media"],
		},
	);

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
	currentStatus: z.enum(PublicationStatus),
	targetStatus: z.enum(PublicationStatus).optional(),
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
