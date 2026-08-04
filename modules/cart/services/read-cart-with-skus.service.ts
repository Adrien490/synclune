import { prisma } from "@/shared/lib/prisma";
import { readCartCookie, type CartCookieValue } from "../lib/cart-cookie";

/**
 * SKU tel que le lisent les gardes de mutation du panier.
 *
 * ⚠️ Volontairement PLUS large que `CART_SKU_SELECT` sur un point : ni
 * `deletedAt` ni `product.deletedAt` ne sont filtrés par la requête. Les
 * validateurs (`validateCartItems`, `filterUnavailableItems`) doivent pouvoir
 * REMONTER un article supprimé comme une anomalie `DELETED` — les écarter à la
 * requête les rendrait invisibles, et un panier contenant un produit supprimé
 * passerait pour valide.
 */
const CART_GUARD_SKU_SELECT = {
	id: true,
	isActive: true,
	inventory: true,
	priceInclTax: true,
	compareAtPrice: true,
	deletedAt: true,
	product: {
		select: {
			id: true,
			title: true,
			status: true,
			deletedAt: true,
		},
	},
} as const;

interface CartGuardItem {
	/** Le skuId — identité de la ligne depuis le passage en cookie. */
	id: string;
	skuId: string;
	quantity: number;
	priceAtAdd: number;
	sku: {
		id: string;
		isActive: boolean;
		inventory: number;
		priceInclTax: number;
		compareAtPrice: number | null;
		deletedAt: Date | null;
		product: {
			id: string;
			title: string;
			status: string;
			deletedAt: Date | null;
		};
	};
}

export interface CartWithSkus {
	cookie: CartCookieValue;
	items: CartGuardItem[];
}

/**
 * Lit le panier du cookie et matérialise ses SKUs EN DIRECT, sans cache.
 *
 * Réservé aux Server Actions qui prennent une décision sur l'état courant du
 * catalogue (retrait des indisponibles, rafraîchissement des prix, validation
 * pré-commande, application d'un code promo). Le rendu, lui, passe par
 * `getCart()` et son cache — ici on veut la valeur fraîche, pas la valeur
 * servie.
 *
 * Une ligne dont le SKU n'existe plus du tout en base est écartée : il n'y a
 * rien à en dire à l'utilisateur ni à recalculer.
 */
export async function readCartWithSkus(): Promise<CartWithSkus> {
	const cookie = await readCartCookie();

	if (cookie.items.length === 0) {
		return { cookie, items: [] };
	}

	const skus = await prisma.productSku.findMany({
		where: { id: { in: cookie.items.map((item) => item.skuId) } },
		select: CART_GUARD_SKU_SELECT,
	});
	const bySkuId = new Map(skus.map((sku) => [sku.id, sku]));

	const items = cookie.items.flatMap<CartGuardItem>((item) => {
		const sku = bySkuId.get(item.skuId);
		if (!sku) return [];
		return [
			{
				id: item.skuId,
				skuId: item.skuId,
				quantity: item.quantity,
				priceAtAdd: item.priceAtAdd,
				sku,
			},
		];
	});

	return { cookie, items };
}
