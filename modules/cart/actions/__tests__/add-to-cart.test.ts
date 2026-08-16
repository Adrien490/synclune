/**
 * `addToCart` — les gardes que seule l'action décide (le parsing du cookie a sa
 * propre suite dans `lib/__tests__/cart-cookie.test.ts`) :
 *
 *  - validation Zod AVANT toute lecture DB (endpoint RPC public) ;
 *  - le VARIANT est validé en base (existence, activation, stock) — sans cette
 *    lecture, un cuid2 forgé entrerait dans le cookie ;
 *  - le plafond `MAX_QUANTITY_PER_ORDER` s'applique en CUMUL (existant + ajout) ;
 *  - le prix témoin est TOUJOURS relu en base, jamais fourni par le client ;
 *  - le plafond `MAX_CART_ITEMS` ne bloque que les NOUVELLES lignes ;
 *  - la ligne touchée passe en tête du cookie (ordre d'affichage).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { CART_ERROR_MESSAGES } from "../../constants/error-messages";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "../../constants/cart";

const mocks = vi.hoisted(() => ({
	readCartCookie: vi.fn(),
	writeCartCookie: vi.fn(),
	prisma: { productVariant: { findUnique: vi.fn() } },
}));

vi.mock("@/modules/cart/lib/cart-cookie", () => ({
	readCartCookie: mocks.readCartCookie,
	writeCartCookie: mocks.writeCartCookie,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mocks.prisma }));

import { addToCart } from "../add-to-cart";

const VARIANT_A = "cm1234567890abcdefghijk12";
const VARIANT_B = "cm1234567890abcdefghijk34";

function makeFormData(variantId: string, quantity?: number) {
	const fd = new FormData();
	fd.set("variantId", variantId);
	if (quantity !== undefined) fd.set("quantity", String(quantity));
	return fd;
}

function makeDbVariant(overrides?: {
	stock?: number;
	active?: boolean;
	priceCents?: number | null;
	productActive?: boolean;
	productPriceCents?: number;
}) {
	return {
		id: VARIANT_A,
		stock: overrides?.stock ?? 10,
		active: overrides?.active ?? true,
		priceCents: overrides?.priceCents === undefined ? 2500 : overrides.priceCents,
		product: {
			active: overrides?.productActive ?? true,
			priceCents: overrides?.productPriceCents ?? 3000,
		},
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.readCartCookie.mockResolvedValue({ items: [] });
	mocks.prisma.productVariant.findUnique.mockResolvedValue(makeDbVariant());
});

describe("addToCart — validation d'entrée", () => {
	it("rejette un variantId non-cuid2 SANS toucher la base ni le cookie", async () => {
		const result = await addToCart(undefined, makeFormData("not-a-cuid"));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.prisma.productVariant.findUnique).not.toHaveBeenCalled();
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("rejette une quantité au-dessus du plafond par le schéma", async () => {
		const result = await addToCart(undefined, makeFormData(VARIANT_A, MAX_QUANTITY_PER_ORDER + 1));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});
});

describe("addToCart — gardes DB", () => {
	it("refuse un VARIANT introuvable", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(null);
		const result = await addToCart(undefined, makeFormData(VARIANT_A));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(CART_ERROR_MESSAGES.VARIANT_NOT_FOUND);
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("refuse un produit non public", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(
			makeDbVariant({ productActive: false }),
		);
		const result = await addToCart(undefined, makeFormData(VARIANT_A));
		expect(result.message).toBe(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
	});

	it("refuse un VARIANT inactif", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(makeDbVariant({ active: false }));
		const result = await addToCart(undefined, makeFormData(VARIANT_A));
		expect(result.message).toBe(CART_ERROR_MESSAGES.VARIANT_INACTIVE);
	});

	it("refuse un premier ajout d'un VARIANT en rupture totale (message dédié)", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(makeDbVariant({ stock: 0 }));
		const result = await addToCart(undefined, makeFormData(VARIANT_A));
		expect(result.message).toBe(CART_ERROR_MESSAGES.OUT_OF_STOCK);
	});

	it("refuse quand le stock ne couvre pas la quantité demandée", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(makeDbVariant({ stock: 2 }));
		const result = await addToCart(undefined, makeFormData(VARIANT_A, 3));
		expect(result.message).toBe(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
	});
});

describe("addToCart — cumul avec la ligne existante", () => {
	it("refuse quand existant + ajout dépasse MAX_QUANTITY_PER_ORDER", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_A, quantity: MAX_QUANTITY_PER_ORDER - 1, priceAtAdd: 2500 }],
		});
		const result = await addToCart(undefined, makeFormData(VARIANT_A, 2));
		expect(result.message).toBe(CART_ERROR_MESSAGES.QUANTITY_MAX);
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("refuse quand le stock ne couvre pas le CUMUL (existant + ajout)", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(makeDbVariant({ stock: 3 }));
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_A, quantity: 2, priceAtAdd: 2500 }],
		});
		const result = await addToCart(undefined, makeFormData(VARIANT_A, 2));
		expect(result.message).toBe(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
	});

	it("fusionne la quantité et annonce la mise à jour", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_A, quantity: 2, priceAtAdd: 2500 }],
		});
		const result = await addToCart(undefined, makeFormData(VARIANT_A, 3));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Quantité mise à jour (5)");
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [expect.objectContaining({ variantId: VARIANT_A, quantity: 5 })],
			}),
		);
	});
});

describe("addToCart — plafond de lignes distinctes", () => {
	function fullCart() {
		return {
			items: Array.from({ length: MAX_CART_ITEMS }, (_, i) => ({
				// cuid2-like distinct du VARIANT ajouté
				variantId: `cmfull${String(i).padStart(19, "0")}`,
				quantity: 1,
				priceAtAdd: 100,
			})),
		};
	}

	it("refuse une NOUVELLE ligne quand le panier est plein", async () => {
		mocks.readCartCookie.mockResolvedValue(fullCart());
		const result = await addToCart(undefined, makeFormData(VARIANT_A));
		expect(result.message).toBe(CART_ERROR_MESSAGES.CART_ITEMS_LIMIT(MAX_CART_ITEMS));
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("accepte d'augmenter une ligne EXISTANTE d'un panier plein", async () => {
		const cart = fullCart();
		cart.items[0] = { variantId: VARIANT_A, quantity: 1, priceAtAdd: 2500 };
		mocks.readCartCookie.mockResolvedValue(cart);
		const result = await addToCart(undefined, makeFormData(VARIANT_A));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});
});

describe("addToCart — prix témoin et ordre du cookie", () => {
	it("écrit TOUJOURS le prix relu en base (override variante)", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(makeDbVariant({ priceCents: 1990 }));
		await addToCart(undefined, makeFormData(VARIANT_A));
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [expect.objectContaining({ priceAtAdd: 1990 })],
			}),
		);
	});

	it("retombe sur le prix produit quand l'override est null", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(
			makeDbVariant({ priceCents: null, productPriceCents: 4200 }),
		);
		await addToCart(undefined, makeFormData(VARIANT_A));
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [expect.objectContaining({ priceAtAdd: 4200 })],
			}),
		);
	});

	it("place la ligne touchée en TÊTE du cookie (ordre d'affichage)", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_B, quantity: 1, priceAtAdd: 100 }],
		});
		await addToCart(undefined, makeFormData(VARIANT_A));
		const written = mocks.writeCartCookie.mock.calls[0]![0] as {
			items: { variantId: string }[];
		};
		expect(written.items.map((i) => i.variantId)).toEqual([VARIANT_A, VARIANT_B]);
	});

	it("retourne le variantId et la quantité en data au succès", async () => {
		const result = await addToCart(undefined, makeFormData(VARIANT_A, 2));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Article ajouté au panier");
		expect(result.data).toEqual({ cartItemId: VARIANT_A, quantity: 2 });
	});
});
