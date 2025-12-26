import type { LucideIcon } from "lucide-react";
import { Gem, Hand, Sparkles, Ruler, Heart } from "lucide-react";
import type { GetProductReturn } from "../types/product.types";

const MAX_COLLECTION_NAME_LENGTH = 20;

export type ProductHighlight = {
	id: string;
	icon: LucideIcon;
	label: string;
	priority: number;
};

/**
 * Genere les highlights produit depuis les donnees existantes
 * pour ameliorer la scanabilite (UX Baymard)
 *
 * @returns Maximum 5 highlights tries par priorite
 */
export function generateHighlights(
	product: GetProductReturn
): ProductHighlight[] {
	const highlights: ProductHighlight[] = [];

	// 1. Materiau principal (priorite haute - critere d'achat cle)
	const primaryMaterial = product.skus[0]?.material?.name;
	if (primaryMaterial) {
		highlights.push({
			id: "material",
			icon: Gem,
			label: primaryMaterial,
			priority: 1,
		});
	}

	// 2. Fait main (toujours vrai pour ce site artisanal)
	highlights.push({
		id: "handmade",
		icon: Hand,
		label: "Fait main",
		priority: 2,
	});

	// 3. Artisanat francais (differenciateur marque)
	highlights.push({
		id: "french",
		icon: Sparkles,
		label: "Artisanat francais",
		priority: 3,
	});

	// 4. Taille ajustable (si applicable)
	const hasAdjustableSize = product.skus.some((sku) =>
		sku.size?.toLowerCase().includes("ajustable")
	);
	if (hasAdjustableSize) {
		highlights.push({
			id: "adjustable",
			icon: Ruler,
			label: "Taille ajustable",
			priority: 4,
		});
	}

	// 5. Collection (si appartient a une collection active)
	const activeCollection = product.collections.find(
		(pc) => pc.collection.status === "PUBLIC"
	);
	if (activeCollection) {
		const name = activeCollection.collection.name;
		const displayName =
			name.length > MAX_COLLECTION_NAME_LENGTH
				? `${name.slice(0, MAX_COLLECTION_NAME_LENGTH)}…`
				: name;
		highlights.push({
			id: "collection",
			icon: Heart,
			label: `Collection ${displayName}`,
			priority: 5,
		});
	}

	// Trier par priorite et limiter a 5
	return highlights.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
