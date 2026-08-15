import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS — schéma lean (migration lot 2)
//
// Le média vit désormais sur le PRODUIT (ProductMedia), plus sur la variante.
// Le prix affiché d'une variante = variant.priceCents ?? product.priceCents.
// ============================================================================

/**
 * Sous-select média : vignette unique (première IMAGE de l'ordre canonique).
 * Filtre type : une vidéo n'est pas rendue par l'optimiseur d'images — sans ce
 * filtre, un produit dont le média au rang 0 est une VIDÉO retournerait 0
 * image et la carte tomberait sur le SVG de secours malgré ses photos.
 */
const PRIMARY_IMAGE_SELECT = {
	where: { type: "IMAGE" as const },
	orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
	take: 1,
	select: {
		id: true,
		url: true,
		alt: true,
		type: true,
	},
};

/** Sous-select variantes actives, ordre stable. */
const ACTIVE_VARIANTS_SELECT = {
	where: { active: true },
	select: {
		id: true,
		size: true,
		priceCents: true,
		stock: true,
		active: true,
		color: {
			select: { id: true, name: true, hex: true, position: true },
		},
		material: {
			select: { id: true, name: true, position: true },
		},
	},
	orderBy: { id: "asc" as const },
};

/**
 * Select mince pour carousels et grilles légères (related / recent / cross-sell).
 * Scope limité aux champs consommés par ProductCard : identité, prix, variantes
 * actives et UNIQUEMENT l'image primaire du produit.
 */
export const PRODUCT_CAROUSEL_SELECT = {
	id: true,
	slug: true,
	name: true,
	priceCents: true,
	active: true,
	createdAt: true,
	type: {
		select: { id: true, slug: true, label: true },
	},
	media: PRIMARY_IMAGE_SELECT,
	variants: ACTIVE_VARIANTS_SELECT,
} as const satisfies Prisma.ProductSelect;

/**
 * Select complet pour la page détail d'un produit (galerie complète : le tri
 * vidéos/images appartient à l'appelant — cf. pickPrimaryImage).
 */
export const GET_PRODUCT_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	priceCents: true,
	active: true,
	createdAt: true,
	updatedAt: true,
	type: {
		select: { id: true, slug: true, label: true },
	},
	media: {
		select: {
			id: true,
			url: true,
			alt: true,
			type: true,
			position: true,
		},
		// Tiebreaker id : deux médias à même position (reorder concurrent)
		// doivent rendre un ordre stable entre requêtes (galerie déterministe)
		orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
		take: 50,
	},
	variants: {
		where: { active: true },
		select: {
			id: true,
			size: true,
			priceCents: true,
			stock: true,
			active: true,
			color: {
				select: { id: true, name: true, hex: true, position: true },
			},
			material: {
				select: { id: true, name: true, position: true },
			},
		},
		orderBy: { id: "asc" as const },
	},
	collections: {
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			active: true,
		},
		orderBy: { position: "asc" as const },
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Select pour le FORMULAIRE D'ÉDITION admin — dérivé de GET_PRODUCT_SELECT,
 * mais les variantes INACTIVES restent chargées (un produit désactivé doit
 * rester éditable, même trou historique que l'archivage d'avant-migration).
 */
export const GET_PRODUCT_FOR_EDIT_SELECT = {
	...GET_PRODUCT_SELECT,
	variants: {
		...GET_PRODUCT_SELECT.variants,
		where: {},
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Select for product listings (public storefront + admin).
 * WARNING: Shared between public and admin views.
 * Do NOT add admin-only sensitive fields here.
 */
export const GET_PRODUCTS_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	priceCents: true,
	active: true,
	createdAt: true,
	updatedAt: true,
	type: {
		select: { id: true, slug: true, label: true },
	},
	media: PRIMARY_IMAGE_SELECT,
	variants: ACTIVE_VARIANTS_SELECT,
	_count: {
		select: {
			variants: {
				where: { active: true },
			},
		},
	},
	collections: {
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			active: true,
		},
		orderBy: { position: "asc" as const },
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Ultra-lightweight select for quick search dialog results.
 */
export const QUICK_SEARCH_SELECT = {
	id: true,
	slug: true,
	name: true,
	priceCents: true,
	media: {
		where: { type: "IMAGE" as const },
		orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
		take: 1,
		select: { url: true, alt: true },
	},
	variants: {
		where: { active: true },
		select: {
			id: true,
			priceCents: true,
			stock: true,
			color: { select: { name: true, hex: true } },
		},
		orderBy: { id: "asc" as const },
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Select de la duplication de produit (admin) — variantes + médias produit.
 * Vit ici avec les autres selects du module (un select en ligne dans data/
 * avait dérivé pendant 2,5 mois — leçon conservée du monde d'avant).
 */
export const GET_PRODUCT_FOR_DUPLICATION_SELECT = {
	id: true,
	name: true,
	slug: true,
	description: true,
	priceCents: true,
	typeId: true,
	collections: {
		select: { id: true, slug: true },
	},
	media: {
		select: {
			url: true,
			alt: true,
			type: true,
			position: true,
		},
		orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
	},
	variants: {
		select: {
			size: true,
			colorId: true,
			materialId: true,
			priceCents: true,
			stock: true,
			active: true,
		},
		orderBy: { id: "asc" as const },
	},
} as const satisfies Prisma.ProductSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_PRODUCTS_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCTS_MAX_RESULTS_PER_PAGE = 200;
export const GET_PRODUCTS_DEFAULT_SORT_BY = "created-descending";
export const GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY = "created-descending";

// Variant is considered low stock when stock > 0 AND stock <= threshold.
// Shared between dashboard alerts and the admin products list filter.
export const LOW_STOCK_THRESHOLD = 3;

export const GET_PRODUCTS_SORT_FIELDS = [
	"name-ascending",
	"name-descending",
	"price-ascending",
	"price-descending",
	"created-ascending",
	"created-descending",
	"createdAt",
	"updatedAt",
	"name",
] as const;

// ============================================================================
// DIALOG IDS
// ============================================================================

/** ID du dialog pour le filter sheet produits (Zustand) */
export const PRODUCT_FILTER_DIALOG_ID = "product-filter-sheet";

// ============================================================================
// UI OPTIONS
// ============================================================================

/**
 * L'ordre des clés EST l'ordre du tiroir et du menu de tri (`Object.values`).
 * « Plus récents » ouvre la liste : c'est le tri par défaut réel.
 */
export const PRODUCTS_SORT_OPTIONS = {
	CREATED_DESC: "created-descending",
	PRICE_ASC: "price-ascending",
	PRICE_DESC: "price-descending",
	CREATED_ASC: "created-ascending",
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
} as const;

/**
 * Le tri de l'URL nue — SSOT partagée entre le parse, la construction d'URL
 * (qui EFFACE le paramètre plutôt que d'écrire la valeur par défaut) et le
 * compartiment « Trier par ».
 */
export const PRODUCTS_DEFAULT_SORT = PRODUCTS_SORT_OPTIONS.CREATED_DESC;

export const PRODUCTS_SORT_LABELS = {
	[PRODUCTS_SORT_OPTIONS.CREATED_DESC]: "Plus récents",
	[PRODUCTS_SORT_OPTIONS.PRICE_ASC]: "Prix croissant",
	[PRODUCTS_SORT_OPTIONS.PRICE_DESC]: "Prix décroissant",
	[PRODUCTS_SORT_OPTIONS.CREATED_ASC]: "Plus anciens",
	[PRODUCTS_SORT_OPTIONS.NAME_ASC]: "Alphabétique (A-Z)",
	[PRODUCTS_SORT_OPTIONS.NAME_DESC]: "Alphabétique (Z-A)",
} as const;

// ============================================================================
// ADMIN SORT LABELS
// ============================================================================

/**
 * Labels de tri pour l'admin (inclut des options supplémentaires)
 */
export const ADMIN_PRODUCTS_SORT_LABELS: Record<string, string> = {
	...PRODUCTS_SORT_LABELS,
	createdAt: "Date de création",
	updatedAt: "Date de mise à jour",
	name: "Nom",
};
