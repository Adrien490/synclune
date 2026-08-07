/**
 * Types pour la navigation (menu, header, footer)
 */

/**
 * Catégories d'items de navigation pour le menu mobile
 */
type NavCategory = "discovery" | "transaction";

/**
 * Types d'icônes disponibles (mapping côté client)
 */
type IconName =
	| "home"
	| "gem"
	| "sparkles"
	| "shopping-cart"
	| "user"
	| "folder-open"
	| "heart"
	| "log-in"
	| "info"
	| "layout-dashboard";

/**
 * Image pour mega menu collections. Champs secondaires OPTIONNELS : la source
 * est `CollectionImage` (SSOT `modules/collections/types/collection.types.ts`,
 * via `extractCollectionImages`), qui les déclare optionnels — les exiger ici
 * casserait l'assignation, et tous les consommateurs lisent déjà en `??`/`?.`.
 */
type NavItemImage = {
	url: string;
	blurDataUrl?: string | null;
	alt?: string | null;
};

/** Produit pour mega menu (bestseller/nouveauté) */
export type MegaMenuProduct = {
	slug: string;
	title: string;
	priceInclTax: number; // prix en centimes
	imageUrl: string;
	blurDataUrl: string | null;
	/** Vrai si publié depuis moins de 14 jours (badge "Nouveau") */
	isNew?: boolean;
};

/**
 * Item enfant de navigation (sous-menu)
 */
export type NavItemChild = {
	href: string;
	label: string;
	/**
	 * Slug de la collection — alimente `dataAccentForSlug` sur la carte du
	 * méga-menu (même hash que la carte landing et la page fille : la couleur
	 * promise est celle qui accueille au clic). Absent des entrées non-collection
	 * (« Toutes les collections », types de produits).
	 */
	slug?: string;
	badge?: string | number;
	icon?: IconName;
	description?: string | null;
	imageUrl?: string | null;
	blurDataUrl?: string | null;
	/** Images multiples pour mega menu collections (bento grid) */
	images?: NavItemImage[];
	/** Date de création (pour badge "Nouvelle" sur les collections) */
	createdAt?: Date;
};

/**
 * Type de dropdown pour mega menu desktop
 */
type DropdownType = "creations" | "collections";

/**
 * Item de navigation avec enfants possibles
 */
export type NavItemWithChildren = {
	href: string;
	label: string;
	children?: NavItemChild[];
	icon?: IconName;
	/**
	 * Pour desktop: si true, affiche un dropdown au hover
	 * Pour mobile: si true, affiche un collapsible
	 */
	hasDropdown?: boolean;
	/** Type de mega menu (creations = grille types, collections = bento images) */
	dropdownType?: DropdownType;
};

/**
 * Item de navigation simple
 */
type NavItem = {
	href: string;
	label: string;
	icon?: IconName;
};
