import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

/**
 * Select mince pour carousels et grilles légères (related / recent / cross-sell).
 *
 * Scope volontairement limité aux champs consommés par ProductCard /
 * getProductCardData : id, slug, title, type.label, skus actifs
 * avec couleur/matériau/taille et UNIQUEMENT l'image primaire.
 *
 * Ne PAS utiliser pour le PLP ni l'admin — voir GET_PRODUCTS_SELECT.
 */
export const PRODUCT_CAROUSEL_SELECT = {
	id: true,
	slug: true,
	title: true,
	status: true,
	createdAt: true,
	type: {
		select: {
			id: true,
			slug: true,
			label: true,
		},
	},
	skus: {
		where: { isActive: true },
		select: {
			id: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			isDefault: true,
			colors: {
				select: {
					colorId: true,
					position: true,
					color: {
						select: {
							id: true,
							slug: true,
							name: true,
							hex: true,
						},
					},
				},
				orderBy: { position: "asc" as const },
			},
			materials: {
				select: {
					materialId: true,
					position: true,
					material: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: { position: "asc" as const },
			},
			size: true,
			images: {
				// Filtre mediaType : une vidéo n'est pas rendue par l'optimiseur d'images.
				// Sans ce filtre, un SKU dont le média `isPrimary` est une VIDÉO retournait
				// 0 image et la carte tombait sur le SVG de secours malgré ses photos —
				// le fallback "première IMAGE" de extractImageFromSku ne pouvait pas jouer.
				where: { mediaType: "IMAGE" as const },
				orderBy: [
					{ isPrimary: "desc" as const },
					{ position: "asc" as const },
					{ id: "asc" as const },
				],
				take: 1,
				select: {
					id: true,
					url: true,
					thumbnailUrl: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					width: true,
					height: true,
					isPrimary: true,
				},
			},
		},
		orderBy: [{ isDefault: "desc" as const }, { priceInclTax: "asc" as const }],
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Select complet pour la page détail d'un produit
 */
export const GET_PRODUCT_SELECT = {
	id: true,
	slug: true,
	title: true,
	description: true,
	type: {
		select: {
			id: true,
			slug: true,
			label: true,
			isActive: true,
		},
	},
	status: true,
	createdAt: true,
	updatedAt: true,
	skus: {
		where: {
			isActive: true,
		},
		select: {
			id: true,
			sku: true,
			colors: {
				select: {
					colorId: true,
					position: true,
					color: {
						select: {
							id: true,
							slug: true,
							name: true,
							hex: true,
							description: true,
						},
					},
				},
				orderBy: { position: "asc" as const },
			},
			materials: {
				select: {
					materialId: true,
					position: true,
					material: {
						select: {
							id: true,
							name: true,
							description: true,
						},
					},
				},
				orderBy: { position: "asc" as const },
			},
			size: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			isDefault: true,
			images: {
				select: {
					id: true,
					url: true,
					thumbnailUrl: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					width: true,
					height: true,
					isPrimary: true,
				},
				// Tiebreaker id : deux images à même position (reorder concurrent)
				// doivent rendre un ordre stable entre requêtes (galerie déterministe)
				orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
				take: 50,
			},
		},
		orderBy: [{ isDefault: "desc" as const }, { priceInclTax: "asc" as const }],
	},
	collections: {
		select: {
			id: true,
			addedAt: true,
			isFeatured: true,
			collection: {
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					status: true,
				},
			},
		},
		orderBy: {
			addedAt: "desc" as const,
		},
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Select for product listings (public storefront + admin).
 * WARNING: Shared between public and admin views.
 * Do NOT add admin-only sensitive fields here (e.g. costPrice, supplierNotes).
 * Create a separate admin select if needed.
 */
export const GET_PRODUCTS_SELECT = {
	id: true,
	slug: true,
	title: true,
	description: true,
	type: {
		select: {
			id: true,
			slug: true,
			label: true,
			isActive: true,
		},
	},
	status: true,
	createdAt: true,
	updatedAt: true,
	skus: {
		where: {
			isActive: true,
		},
		select: {
			id: true,
			sku: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			isDefault: true,
			images: {
				select: {
					id: true,
					url: true,
					thumbnailUrl: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					width: true,
					height: true,
					isPrimary: true,
				},
				// Tiebreaker id : ordre stable à positions égales (cf GET_PRODUCT_SELECT)
				orderBy: [{ position: "asc" }, { id: "asc" }],
			},
			materials: {
				select: {
					materialId: true,
					position: true,
					material: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: { position: "asc" as const },
			},
			colors: {
				select: {
					colorId: true,
					position: true,
					color: {
						select: {
							id: true,
							slug: true,
							name: true,
							hex: true,
						},
					},
				},
				orderBy: { position: "asc" as const },
			},
			size: true,
		},
		orderBy: [{ isDefault: "desc" as const }, { priceInclTax: "asc" as const }],
	},
	_count: {
		select: {
			skus: {
				where: {
					isActive: true,
				},
			},
		},
	},
	collections: {
		select: {
			id: true,
			addedAt: true,
			isFeatured: true,
			collection: {
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					status: true,
				},
			},
		},
		orderBy: {
			addedAt: "desc" as const,
		},
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Ultra-lightweight select for quick search dialog results.
 * Only includes data needed for compact result display (thumbnail, title, price, colors).
 */
export const QUICK_SEARCH_SELECT = {
	id: true,
	slug: true,
	title: true,
	skus: {
		where: { isActive: true },
		select: {
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isDefault: true,
			colors: {
				select: {
					colorId: true,
					position: true,
					color: { select: { slug: true, name: true, hex: true } },
				},
				orderBy: { position: "asc" as const },
			},
			// Filtre mediaType : ce select alimente UNE vignette (`search-result-item`),
			// qui prend `images[0]` et le passe à `<Image src>`. Sans le filtre, un SKU dont
			// le média primaire est une VIDÉO injectait un `.mp4` dans l'optimiseur
			// d'images — vignette cassée + transformation facturée. Et `where isPrimary`
			// seul rendait 0 image sur un SKU sans média primaire, alors qu'il en a.
			// Même correctif que PRODUCT_CAROUSEL_SELECT ; le tri reproduit la priorité
			// de `pickPrimaryImage` (primaire d'abord, puis position).
			images: {
				where: { mediaType: "IMAGE" as const },
				orderBy: [
					{ isPrimary: "desc" as const },
					{ position: "asc" as const },
					{ id: "asc" as const },
				],
				take: 1,
				select: { url: true, blurDataUrl: true, altText: true },
			},
		},
		orderBy: [{ isDefault: "desc" as const }, { priceInclTax: "asc" as const }],
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Select de la duplication de produit (admin) — SKUs + images + jointures M2M.
 *
 * Vit ici, avec les 4 autres selects du module, et non plus en ligne dans
 * `data/get-product-for-duplication.ts` : c'est cette exception qui avait laissé le
 * select dériver. Les migrations M2M de mai 2026 ont déplacé `colorId`/`materialId`
 * de `ProductSku` vers les tables de jointure ; les 4 selects de ce fichier ont été
 * mis à jour, celui de la duplication — invisible ici — ne l'a pas été, et
 * « Dupliquer un produit » a répondu « Le produit source n'existe pas » pendant
 * ~2,5 mois (Prisma levait une `PrismaClientValidationError`, avalée par un `catch`).
 *
 * Validité vérifiée sans base par `__tests__/product-selects-schema-validity.regression.test.ts`.
 */
export const GET_PRODUCT_FOR_DUPLICATION_SELECT = {
	id: true,
	title: true,
	slug: true,
	description: true,
	typeId: true,
	collections: {
		select: {
			collectionId: true,
			collection: {
				select: { slug: true },
			},
		},
	},
	skus: {
		// Un produit vivant ne porte pas de SKU soft-deleted aujourd'hui (seul
		// `delete-product` pose `ProductSku.deletedAt`, et il soft-delete le produit dans
		// la même tx), mais dupliquer une variante supprimée serait silencieux.
		where: { deletedAt: null },
		select: {
			sku: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			isDefault: true,
			// `position` porte l'ordre de saisie : à préserver dans la copie.
			colors: {
				select: { colorId: true, position: true },
				orderBy: { position: "asc" as const },
			},
			materials: {
				select: { materialId: true, position: true },
				orderBy: { position: "asc" as const },
			},
			size: true,
			images: {
				select: {
					url: true,
					thumbnailUrl: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					width: true,
					height: true,
					isPrimary: true,
					position: true,
				},
			},
		},
	},
} as const satisfies Prisma.ProductSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_PRODUCTS_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCTS_MAX_RESULTS_PER_PAGE = 200;
export const GET_PRODUCTS_DEFAULT_SORT_BY = "created-descending";
export const GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY = "created-descending";

// SKU is considered low stock when inventory > 0 AND inventory <= threshold.
// Shared between dashboard alerts and the admin products list filter.
export const LOW_STOCK_THRESHOLD = 3;

export const GET_PRODUCTS_SORT_FIELDS = [
	"title-ascending",
	"title-descending",
	"price-ascending",
	"price-descending",
	"created-ascending",
	"created-descending",
	"createdAt",
	"updatedAt",
	"title",
	"type",
] as const;

// ============================================================================
// DIALOG IDS
// ============================================================================

/** ID du dialog pour le filter sheet produits (Zustand) */
export const PRODUCT_FILTER_DIALOG_ID = "product-filter-sheet";

// ============================================================================
// UI OPTIONS
// ============================================================================

export const PRODUCTS_SORT_OPTIONS = {
	TITLE_ASC: "title-ascending",
	TITLE_DESC: "title-descending",
	PRICE_ASC: "price-ascending",
	PRICE_DESC: "price-descending",
	CREATED_ASC: "created-ascending",
	CREATED_DESC: "created-descending",
} as const;

export const PRODUCTS_SORT_LABELS = {
	[PRODUCTS_SORT_OPTIONS.TITLE_ASC]: "Alphabétique (A-Z)",
	[PRODUCTS_SORT_OPTIONS.TITLE_DESC]: "Alphabétique (Z-A)",
	[PRODUCTS_SORT_OPTIONS.PRICE_ASC]: "Prix croissant",
	[PRODUCTS_SORT_OPTIONS.PRICE_DESC]: "Prix décroissant",
	[PRODUCTS_SORT_OPTIONS.CREATED_ASC]: "Plus anciens",
	[PRODUCTS_SORT_OPTIONS.CREATED_DESC]: "Plus récents",
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
	title: "Titre",
	type: "Type",
};
