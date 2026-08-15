import { z } from "zod";
import { formBooleanSchema } from "@/shared/schemas/boolean.schema";
import { PRICE_LIMITS, STOCK_LIMITS, TEXT_LIMITS } from "@/shared/constants/validation-limits";

// ============================================================================
// Schémas variantes — schéma lean (lot 2) : { colorId?, materialId?, size?,
// priceCents? (override du prix produit), stock, active }. Le média vit sur
// le PRODUIT, plus sur la variante.
// ============================================================================

export const getProductVariantSchema = z.object({
	variantId: z.cuid2({ message: "ID variante invalide" }),
});

// ============================================================================
// SHARED
// ============================================================================

const optionalPriceEurosSchema = z.coerce
	.number()
	.min(0.01, { error: "Le prix doit être d'au moins 0,01 €" })
	.max(PRICE_LIMITS.MAX_EUR, { error: `Le prix ne peut pas dépasser ${PRICE_LIMITS.MAX_EUR} €` })
	.optional()
	.or(z.literal(""))
	.transform((val) => (val === "" ? undefined : val));

const baseVariantFieldsSchema = z.object({
	// Override du prix produit — vide = hérite du prix produit
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
});

// ============================================================================
// CRUD
// ============================================================================

export const createProductVariantSchema = baseVariantFieldsSchema.extend({
	productId: z.cuid2({ message: "ID produit invalide" }),
});

export const updateProductVariantSchema = baseVariantFieldsSchema.extend({
	variantId: z.cuid2({ message: "ID variante invalide" }),
	// Stock affiché à l'ouverture du formulaire (delta relatif, anti stock fantôme)
	originalStock: z.coerce
		.number()
		.int({ error: "Le stock d'origine doit être un entier" })
		.nonnegative({ error: "Le stock d'origine doit être positif ou nul" })
		.optional(),
});

export const deleteProductVariantSchema = z.object({
	variantId: z.cuid2({ message: "ID variante invalide" }),
});

export const duplicateProductVariantSchema = z.object({
	variantId: z.cuid2({ message: "ID variante invalide" }),
});

export const updateProductVariantStatusSchema = z.object({
	variantId: z.cuid2({ message: "ID variante invalide" }),
	active: formBooleanSchema,
});

export const updateVariantPriceSchema = z.object({
	variantId: z.cuid2({ message: "ID variante invalide" }),
	// Vide = retire l'override, la variante retombe sur le prix produit
	priceEuros: optionalPriceEurosSchema,
});

export const adjustVariantStockSchema = z.object({
	variantId: z.cuid2({ message: "ID variante invalide" }),
	adjustment: z.coerce
		.number()
		.int({ error: "L'ajustement doit être un entier" })
		.min(-STOCK_LIMITS.MAX_INVENTORY)
		.max(STOCK_LIMITS.MAX_INVENTORY)
		.refine((v) => v !== 0, { error: "L'ajustement ne peut pas être nul" }),
});
