/**
 * Service de validation metier pour les produits
 * Fonctions pures sans effets de bord
 *
 * ⚠️ Ces `errorMessage` ne sont pas des libellés de log : ils remontent TELS QUELS
 * à l'admin, en toast, depuis `create-product` et `update-product`. Deux règles en
 * découlent, toutes deux enfreintes jusqu'à l'audit du 2026-08-04 :
 *
 * - **tutoiement** (CLAUDE.md § Voix) — les sept messages vouvoyaient ;
 * - **aucun nom d'enum** — ils disaient « PUBLIC » et « DRAFT » là où l'interface
 *   écrit « En vente » et « Brouillon ». L'admin lisait le vocabulaire de la base.
 */

type ProductPublicationValidation = {
	isValid: boolean;
	errorMessage: string | null;
};

type ProductForPublicationCheck = {
	name: string;
	variants: {
		id: string;
		active: boolean;
		stock: number;
	}[];
	// Médias du PRODUIT (schéma lean) : `type` distingue une vraie image d'une
	// vidéo — une vidéo au rang 0 ne suffit PAS à publier (placeholder vitrine).
	media: { type: string }[];
};

type VariantForPublicCheck = {
	active: boolean;
	stock: number;
};

/**
 * Verifie si un produit peut etre publie (statut PUBLIC)
 * Centralise les regles metier pour la publication
 */
export function validateProductForPublication(
	product: ProductForPublicationCheck,
): ProductPublicationValidation {
	// Regle 1: Nom requis
	if (!product.name || product.name.trim().length === 0) {
		return {
			isValid: false,
			errorMessage: "Impossible de publier ce produit : son nom est vide. Renseigne un nom.",
		};
	}

	// Filtrer les VARIANTs actifs
	const activeVariants = product.variants.filter((variant) => variant.active);

	// Regle 2: Au moins 1 VARIANT actif
	if (activeVariants.length === 0) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit : il n'a aucune variante active. Active au moins une variante avant de publier.",
		};
	}

	// Regle 3: Au moins 1 VARIANT actif avec stock
	const hasStock = activeVariants.some((variant) => variant.stock > 0);
	if (!hasStock) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit : aucune variante active n'a de stock. Ajoute du stock à au moins une variante.",
		};
	}

	// Regle 4: Le produit a au moins une IMAGE (média de type IMAGE — le média
	// vit sur le PRODUIT depuis le schéma lean). Une vidéo au rang 0 ne compte
	// pas : la vitrine afficherait le placeholder.
	const hasImage = product.media.some((m) => m.type === "IMAGE");
	if (!hasImage) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de publier ce produit : il n'a aucune image. Ajoute au moins une photo.",
		};
	}

	return { isValid: true, errorMessage: null };
}

/**
 * Verifie si un produit PUBLIC peut etre cree avec le VARIANT initial fourni
 * Version simplifiee pour la creation (pas encore de VARIANT en DB).
 *
 * NOTE (MEDIA-AUDIT-007) : la presence d'au moins une image (media IMAGE) est
 * garantie en amont par `createProductSchema` — refines inconditionnels
 * `initialVariant.media.length > 0` + premier media force a IMAGE
 * (`product-mutation.schemas.ts`). Cette garantie est verrouillee par un test
 * de regression dedie ; ne pas dupliquer un controle d'URL ici (le service
 * pur n'a pas connaissance des extensions).
 */
export function validatePublicProductCreation(
	variant: VariantForPublicCheck,
): ProductPublicationValidation {
	if (!variant.active) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de mettre ce produit en vente avec une variante inactive. Active la variante, ou enregistre-le en brouillon.",
		};
	}

	if (variant.stock <= 0) {
		return {
			isValid: false,
			errorMessage:
				"Impossible de mettre ce produit en vente avec un stock à 0. Ajoute du stock, ou enregistre-le en brouillon.",
		};
	}

	return { isValid: true, errorMessage: null };
}
