import { z } from "zod";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";

/**
 * Filtres de la liste des VARIANTs d'un produit (admin).
 *
 * ⚠️ Ce schéma ne déclare QUE des filtres réellement câblés à une surface :
 * le sheet (`variants-filter-sheet.tsx`) et l'URL de
 * `catalogue/produits/[slug]/variantes`. Huit filtres fantômes ont été retirés
 * lors de l'audit du module (2026-08-19) — `material` (par NOM, marqué
 * « legacy »), `priceMin`/`priceMax`, `stockMin`/`stockMax`, `inStock`,
 * `outOfStock`, `size`, `hasOrders` : aucun n'avait de producteur, mais tous
 * portaient du `WHERE` à maintenir, deux `refine` d'exclusion mutuelle et une
 * ligne de risque à chaque migration de schéma. Même logique que la règle des
 * tags de cache : un filtre n'existe que s'il a un émetteur ET un lecteur.
 */
export const productVariantFiltersSchema = z.object({
	/** Borne la liste à un produit — le seul appelant en production en pose un. */
	productId: optionalStringOrStringArraySchema,
	colorId: optionalStringOrStringArraySchema,
	materialId: optionalStringOrStringArraySchema,

	active: z.boolean().optional(),

	/**
	 * Statuts de stock cochés — UNION (OR) des cases du sheet.
	 *
	 * ⚠️ Tableau et non chaîne : le sheet a toujours été multi-select, mais la
	 * page ne transmettait le filtre que si EXACTEMENT un statut était coché
	 * (`stockStatuses.length === 1 ? … : undefined`). Cocher « En stock » +
	 * « Stock faible » affichait donc deux badges et n'appliquait aucun filtre.
	 * `in_stock` contient `low_stock` : leur union vaut `in_stock`, ce que
	 * l'admin attend.
	 */
	stockStatus: z
		.array(z.enum(["in_stock", "low_stock", "out_of_stock"]))
		.min(1)
		.optional(),
});

export type ProductVariantFilters = z.infer<typeof productVariantFiltersSchema>;
