import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// CART LIMITS
// ============================================================================

/**
 * Quantite maximale par article dans une commande
 * Limite UX pour eviter les commandes excessives sur un site artisanal
 */
export const MAX_QUANTITY_PER_ORDER = 10;

/**
 * Nombre maximal d'articles distincts dans un panier.
 *
 * ⚠️ Depuis le passage du panier en cookie (2026-08-04), cette borne est aussi
 * la borne de TAILLE du cookie `cart` : une ligne pèse ~54 octets une fois
 * URL-encodée, donc 50 lignes plafonnent le cookie vers 2,7 Ko sur un budget de
 * 4 Ko. Ne pas relever sans refaire le calcul (cf. `lib/cart-cookie.ts`).
 */
export const MAX_CART_ITEMS = 50;

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

/**
 * Colonnes SKU nécessaires au rendu du panier.
 *
 * Le panier lui-même vit dans le cookie (`lib/cart-cookie.ts`) : la base ne
 * fournit plus que la matérialisation des lignes — libellé, image, prix courant,
 * stock. `priceInclTax` peut être stale jusqu'à 5 min (profil `checkout`), ce qui
 * reste acceptable : (1) `priceAtAdd` (témoin du cookie) est la valeur affichée
 * dans le panier ; (2) le checkout re-valide au prix DB via
 * `payments/services/order-creation.service.ts` ; (3) `updateCartPrices` permet
 * un refresh manuel côté UI.
 */
export const CART_SKU_SELECT = {
	id: true,
	sku: true,
	priceInclTax: true,
	compareAtPrice: true,
	inventory: true,
	isActive: true,
	product: {
		select: {
			id: true,
			title: true,
			slug: true,
			status: true,
		},
	},
	// Famille « vignette unique » (cf. CLAUDE.md § mediaType) : l'appelant prend
	// `images[0]` sans pouvoir trier (`cart-item.service.ts:93`), donc le filtre et
	// l'ordre doivent être portés ICI.
	//
	// Deux défauts corrigés le 2026-08-05, tous deux nommés dans CLAUDE.md :
	//  1. prendre la « première » image sans ordre garanti rendait la vignette
	//     instable ; l'ordre canonique `(position asc, id asc)` + `take: 1` fixe
	//     le média principal (V5 : `isPrimary` n'existe plus, position 0 = principal).
	//  2. aucun filtre `mediaType` : une vidéo en tête atterrissait dans un
	//     `<Image src>` — vignette cassée ET transformation `/_next/image` facturée.
	images: {
		where: { mediaType: "IMAGE" as const },
		take: 1,
		orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
		select: {
			id: true,
			url: true,
			blurDataUrl: true,
			thumbnailUrl: true,
			altText: true,
			mediaType: true,
		},
	},
	colors: {
		select: {
			colorId: true,
			position: true,
			color: {
				select: {
					id: true,
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
} as const satisfies Prisma.ProductSkuSelect;
