import { z } from "zod";

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
 * Schema pour un media (image ou video)
 */
const imageSchema = z.object({
	url: z.url({ message: "L'URL du media doit etre valide" }),
	thumbnailUrl: z.url().optional().nullable(), // URL de la miniature pour les videos
	blurDataUrl: z.string().optional(), // Base64 blur placeholder pour les images
	altText: z.string().max(200).optional(),
	mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
});

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createProductSkuSchema = z
	.object({
		// Product ID (required - on cree un SKU pour un produit existant)
		productId: z
			.string({ error: "Le produit est requis" })
			.min(1, { error: "Le produit est requis" }),

		// SKU - optional, sera auto-genere si non fourni
		sku: z.string().optional().or(z.literal("")),

		// Prix en euros (sera converti en centimes cote serveur)
		priceInclTaxEuros: z.coerce
			.number({ error: "Le prix est requis" })
			.positive({ error: "Le prix doit etre positif" })
			.max(999999.99, { error: "Le prix ne peut pas depasser 999999.99 eur" }),

		// Prix compare (optionnel, pour afficher prix barre)
		compareAtPriceEuros: z.coerce
			.number()
			.positive({ error: "Le prix compare doit etre positif" })
			.max(999999.99, { error: "Le prix compare ne peut pas depasser 999999.99 eur" })
			.optional()
			.or(z.literal(""))
			.transform(val => val === "" ? undefined : val),

		// Inventory: normalized in server action before validation
		inventory: z.coerce
			.number()
			.int({ error: "L'inventaire doit etre un entier" })
			.nonnegative({ error: "L'inventaire doit etre positif ou nul" })
			.default(0),

		// Boolean fields: normalized in server action before validation
		isActive: z.coerce.boolean().default(true),
		isDefault: z.coerce.boolean().default(false),

		// Optional fields
		colorId: z.string().optional().or(z.literal("")),
		material: z.string().max(200).optional().or(z.literal("")),
		size: z.string().max(50).optional().or(z.literal("")),

		// Medias (images et videos)
		primaryImage: imageSchema.optional(),
		galleryMedia: z
			.array(imageSchema)
			.max(9, { error: "Maximum 9 medias dans la galerie" })
			.default([]),
	})
	.refine(
		(data) => {
			// Verifier que le media principal n'est PAS une video
			if (!data.primaryImage) return true;
			const mediaType = data.primaryImage.mediaType;
			if (!mediaType) {
				// Si pas de mediaType specifie, verifier l'extension de l'URL
				const url = data.primaryImage.url.toLowerCase();
				return !(url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.endsWith('.avi'));
			}
			return mediaType === "IMAGE";
		},
		{
			message: "Le media principal ne peut pas etre une video. Veuillez selectionner une image.",
			path: ["primaryImage"],
		}
	)
	.refine(
		(data) => {
			// Verifier que compareAtPrice >= priceInclTax si present
			if (!data.compareAtPriceEuros) return true;
			return data.compareAtPriceEuros >= data.priceInclTaxEuros;
		},
		{
			message: "Le prix compare doit etre superieur ou egal au prix de vente",
			path: ["compareAtPriceEuros"],
		}
	);

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

// ============================================================================
// UPDATE SCHEMA
// ============================================================================

export const updateProductSkuSchema = z
	.object({
		// SKU ID (required - on modifie un SKU existant)
		skuId: z
			.string({ error: "L'ID du SKU est requis" })
			.min(1, { error: "L'ID du SKU est requis" }),

		// Prix en euros (sera converti en centimes cote serveur)
		priceInclTaxEuros: z.coerce
			.number({ error: "Le prix est requis" })
			.positive({ error: "Le prix doit etre positif" })
			.max(999999.99, { error: "Le prix ne peut pas depasser 999999.99 eur" }),

		// Prix compare (optionnel, pour afficher prix barre)
		compareAtPriceEuros: z.coerce
			.number()
			.positive({ error: "Le prix compare doit etre positif" })
			.max(999999.99, { error: "Le prix compare ne peut pas depasser 999999.99 eur" })
			.optional()
			.or(z.literal(""))
			.transform(val => val === "" ? undefined : val),

		// Inventory: normalized in server action before validation
		inventory: z.coerce
			.number()
			.int({ error: "L'inventaire doit etre un entier" })
			.nonnegative({ error: "L'inventaire doit etre positif ou nul" })
			.default(0),

		// Boolean fields: normalized in server action before validation
		isActive: z.coerce.boolean().default(true),
		isDefault: z.coerce.boolean().default(false),

		// Optional fields
		colorId: z.string().optional().or(z.literal("")),
		material: z.string().max(200).optional().or(z.literal("")),
		size: z.string().max(50).optional().or(z.literal("")),

		// Medias (images et videos)
		primaryImage: imageSchema.optional(),
		galleryMedia: z
			.array(imageSchema)
			.max(9, { error: "Maximum 9 medias dans la galerie" })
			.default([]),
	})
	.refine(
		(data) => {
			// Verifier que le media principal n'est PAS une video
			if (!data.primaryImage) return true;
			const mediaType = data.primaryImage.mediaType;
			if (!mediaType) {
				// Si pas de mediaType specifie, verifier l'extension de l'URL
				const url = data.primaryImage.url.toLowerCase();
				return !(url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.endsWith('.avi'));
			}
			return mediaType === "IMAGE";
		},
		{
			message: "Le media principal ne peut pas etre une video. Veuillez selectionner une image.",
			path: ["primaryImage"],
		}
	)
	.refine(
		(data) => {
			// Verifier que compareAtPrice >= priceInclTax si present
			if (!data.compareAtPriceEuros) return true;
			return data.compareAtPriceEuros >= data.priceInclTaxEuros;
		},
		{
			message: "Le prix compare doit etre superieur ou egal au prix de vente",
			path: ["compareAtPriceEuros"],
		}
	);
