/**
 * Service de génération des highlights produit
 *
 * Ce module contient les fonctions pures pour :
 * - Générer les points forts d'un produit (UX scanabilité)
 */

import type { GetProductReturn } from "../types/product.types";
import type { ProductHighlight } from "../types/product-services.types";

export type { ProductHighlight } from "../types/product-services.types";

const MAX_COLLECTION_NAME_LENGTH = 20;
const DEFAULT_MATERIAL_DESCRIPTION = "Matériau de qualité sélectionné avec soin";

/**
 * Genere les highlights produit depuis les donnees existantes
 * pour ameliorer la scanabilite (UX Baymard)
 *
 * @returns Maximum 5 highlights tries par priorite
 */
export function generateHighlights(product: GetProductReturn): ProductHighlight[] {
	const highlights: ProductHighlight[] = [];

	// 1. Materiau principal (priorite haute - critere d'achat cle)
	const primaryMaterial = product.skus[0]?.materials[0]?.material;
	if (primaryMaterial?.name) {
		highlights.push({
			id: "material",
			label: primaryMaterial.name,
			description: primaryMaterial.description ?? DEFAULT_MATERIAL_DESCRIPTION,
			priority: 1,
		});
	}

	// 1.5. Couleur principale du SKU par défaut (contenu unique SEO si description peuplée)
	const primaryColor = product.skus[0]?.colors[0]?.color;
	if (primaryColor?.name && primaryColor.description) {
		highlights.push({
			id: "color",
			label: primaryColor.name,
			description: primaryColor.description,
			priority: 1.5,
		});
	}

	// 2. Fait main (toujours vrai pour ce site artisanal)
	highlights.push({
		id: "handmade",
		label: "Fait main",
		description: "Chaque pièce est unique, façonnée à la main",
		priority: 2,
	});

	// 3. Artisanat francais (differenciateur marque)
	highlights.push({
		id: "french",
		label: "Artisanat français",
		description: "Créé dans notre atelier en France",
		priority: 3,
	});

	// 4. Taille ajustable (si applicable)
	const hasAdjustableSize = product.skus.some((sku) =>
		sku.size?.toLowerCase().includes("ajustable"),
	);
	if (hasAdjustableSize) {
		highlights.push({
			id: "adjustable",
			label: "Taille ajustable",
			description: "S'adapte à toutes les morphologies",
			priority: 4,
		});
	}

	// 5. Collection (si appartient a une collection active)
	const activeCollection = product.collections.find((pc) => pc.collection.status === "PUBLIC");
	if (activeCollection) {
		const name = activeCollection.collection.name;
		const displayName =
			name.length > MAX_COLLECTION_NAME_LENGTH
				? `${name.slice(0, MAX_COLLECTION_NAME_LENGTH)}…`
				: name;
		highlights.push({
			id: "collection",
			label: `Collection ${displayName}`,
			description: "Fait partie d'une collection exclusive",
			priority: 5,
		});
	}

	// Trier par priorite et limiter a 5
	return highlights.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
