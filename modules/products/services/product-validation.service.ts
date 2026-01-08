/**
 * Service de validation metier pour les produits
 * Fonctions pures sans effets de bord
 */

export type ProductPublicationValidation = {
	isValid: boolean;
	errorMessage: string | null;
};

export type ProductForPublicationCheck = {
	title: string;
	skus: {
		id: string;
		isActive: boolean;
		inventory: number;
		images: { id: string }[];
	}[];
};

export type SkuForPublicCheck = {
	isActive: boolean;
};

/**
 * Verifie si un produit peut etre publie (statut PUBLIC)
 * Centralise les regles metier pour la publication
 */
export function validateProductForPublication(
	product: ProductForPublicationCheck
): ProductPublicationValidation {
	// Regle 1: Titre requis
	if (!product.title || product.title.trim().length === 0) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit car le titre est vide. Veuillez renseigner un titre.",
		};
	}

	// Filtrer les SKUs actifs
	const activeSkus = product.skus.filter((sku) => sku.isActive);

	// Regle 2: Au moins 1 SKU actif
	if (activeSkus.length === 0) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit car il n'a aucun SKU actif. Veuillez activer au moins un SKU avant de publier.",
		};
	}

	// Regle 3: Au moins 1 SKU actif avec stock
	const hasStock = activeSkus.some((sku) => sku.inventory > 0);
	if (!hasStock) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit car aucun SKU actif n'a de stock. Veuillez ajouter du stock a au moins une variante.",
		};
	}

	// Regle 4: Au moins 1 SKU actif avec image principale
	const hasImage = activeSkus.some((sku) => sku.images.length > 0);
	if (!hasImage) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit car aucun SKU actif n'a d'image principale. Veuillez ajouter une image a au moins une variante.",
		};
	}

	return { isValid: true, errorMessage: null };
}

/**
 * Verifie si un produit PUBLIC peut etre cree avec le SKU initial fourni
 * Version simplifiee pour la creation (pas encore de SKU en DB)
 */
export function validatePublicProductCreation(sku: SkuForPublicCheck): ProductPublicationValidation {
	if (!sku.isActive) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de creer un produit PUBLIC avec un SKU inactif. Veuillez activer le SKU ou creer le produit en DRAFT.",
		};
	}

	return { isValid: true, errorMessage: null };
}
