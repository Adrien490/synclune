import { prisma } from "@/shared/lib/prisma";
import { readCartCookie, type CartCookieValue } from "../lib/cart-cookie";

/**
 * VARIANT tel que le lisent les gardes de mutation du panier.
 *
 * Depuis le schéma lean (lot 2) il n'y a plus de soft delete : une ligne dont
 * la variante n'existe plus en base est simplement écartée.
 */
const CART_GUARD_VARIANT_SELECT = {
	id: true,
	active: true,
	stock: true,
	priceCents: true,
	product: {
		select: {
			id: true,
			name: true,
			active: true,
			priceCents: true,
		},
	},
} as const;

interface CartGuardItem {
	/** Identité de la ligne depuis le passage en cookie. */
	variantId: string;
	quantity: number;
	priceAtAdd: number;
	variant: {
		id: string;
		active: boolean;
		stock: number;
		/** Override — null = prix du produit. */
		priceCents: number | null;
		product: {
			id: string;
			name: string;
			active: boolean;
			priceCents: number;
		};
	};
}

export interface CartWithVariants {
	cookie: CartCookieValue;
	items: CartGuardItem[];
}

/**
 * Lit le panier du cookie et matérialise ses VARIANTs EN DIRECT, sans cache.
 *
 * Réservé aux Server Actions qui prennent une décision sur l'état courant du
 * catalogue (retrait des indisponibles, rafraîchissement des prix, validation
 * pré-commande, application d'un code promo). Le rendu, lui, passe par
 * `getCart()` et son cache — ici on veut la valeur fraîche, pas la valeur
 * servie.
 *
 * Une ligne dont le VARIANT n'existe plus du tout en base est écartée : il n'y a
 * rien à en dire à l'utilisateur ni à recalculer.
 */
export async function readCartWithVariants(): Promise<CartWithVariants> {
	const cookie = await readCartCookie();

	if (cookie.items.length === 0) {
		return { cookie, items: [] };
	}

	const variants = await prisma.productVariant.findMany({
		where: { id: { in: cookie.items.map((item) => item.variantId) } },
		select: CART_GUARD_VARIANT_SELECT,
	});
	const byVariantId = new Map(variants.map((variant) => [variant.id, variant]));

	const items = cookie.items.flatMap<CartGuardItem>((item) => {
		const variant = byVariantId.get(item.variantId);
		if (!variant) return [];
		return [
			{
				variantId: item.variantId,
				quantity: item.quantity,
				priceAtAdd: item.priceAtAdd,
				variant,
			},
		];
	});

	return { cookie, items };
}
