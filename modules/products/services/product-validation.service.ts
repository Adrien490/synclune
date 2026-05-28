/**
 * Service de validation metier pour les produits
 * Fonctions pures sans effets de bord
 */

type ProductPublicationValidation = {
	isValid: boolean;
	errorMessage: string | null;
};

type ProductForPublicationCheck = {
	title: string;
	skus: {
		id: string;
		isActive: boolean;
		inventory: number;
		// `mediaType` permet de distinguer une vraie image d'une video : une video
		// `isPrimary` ne suffit PAS a publier (la vitrine affiche un placeholder).
		// Cf MEDIA-AUDIT-002.
		images: { mediaType: string }[];
	}[];
};

type SkuForPublicCheck = {
	isActive: boolean;
	inventory: number;
};

/**
 * Verifie si un produit peut etre publie (statut PUBLIC)
 * Centralise les regles metier pour la publication
 */
export function validateProductForPublication(
	product: ProductForPublicationCheck,
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
				"Impossible de publier ce produit car il n'a aucune variante active. Veuillez activer au moins une variante avant de publier.",
		};
	}

	// Regle 3: Au moins 1 SKU actif avec stock
	const hasStock = activeSkus.some((sku) => sku.inventory > 0);
	if (!hasStock) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit car aucune variante active n'a de stock. Veuillez ajouter du stock à au moins une variante.",
		};
	}

	// Regle 4: Au moins 1 SKU actif avec une image (media de type IMAGE).
	// Aligne sur la logique d'affichage (`extractImageFromSku` ne retourne que des
	// medias IMAGE) : un SKU dont les seuls medias sont des videos afficherait le
	// placeholder en vitrine. Une video marquee `isPrimary` ne compte donc pas.
	const hasImage = activeSkus.some((sku) => sku.images.some((img) => img.mediaType === "IMAGE"));
	if (!hasImage) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit car aucune variante active n'a d'image principale. Veuillez ajouter une image à au moins une variante.",
		};
	}

	return { isValid: true, errorMessage: null };
}

/**
 * Verifie si un produit PUBLIC peut etre cree avec le SKU initial fourni
 * Version simplifiee pour la creation (pas encore de SKU en DB).
 *
 * NOTE (MEDIA-AUDIT-007) : la presence d'au moins une image (media IMAGE) est
 * garantie en amont par `createProductSchema` — refines inconditionnels
 * `initialSku.media.length > 0` + premier media force a IMAGE
 * (`product-mutation.schemas.ts`). Cette garantie est verrouillee par un test
 * de regression dedie ; ne pas dupliquer un controle d'URL ici (le service
 * pur n'a pas connaissance des extensions).
 */
export function validatePublicProductCreation(
	sku: SkuForPublicCheck,
): ProductPublicationValidation {
	if (!sku.isActive) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de créer un produit PUBLIC avec une variante inactive. Veuillez activer la variante ou créer le produit en DRAFT.",
		};
	}

	if (sku.inventory <= 0) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de créer un produit PUBLIC avec un stock à 0. Veuillez ajouter du stock ou créer le produit en DRAFT.",
		};
	}

	return { isValid: true, errorMessage: null };
}
