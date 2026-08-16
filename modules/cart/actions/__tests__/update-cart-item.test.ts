/**
 * `updateCartItem` — la garde clé : la ligne est re-validée en base à CHAQUE
 * soumission, quantité inchangée COMPRISE (c'est le geste « réessayer » d'une
 * cliente dont la ligne est en rupture), mais l'écriture n'a lieu que si la
 * quantité change réellement.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { CART_ERROR_MESSAGES } from "../../constants/error-messages";

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

import { updateCartItem } from "../update-cart-item";

const VARIANT_A = "cm1234567890abcdefghijk12";
const VARIANT_B = "cm1234567890abcdefghijk34";

function makeFormData(variantId: string, quantity: number) {
	const fd = new FormData();
	fd.set("variantId", variantId);
	fd.set("quantity", String(quantity));
	return fd;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.readCartCookie.mockResolvedValue({
		items: [
			{ variantId: VARIANT_A, quantity: 2, priceAtAdd: 2500 },
			{ variantId: VARIANT_B, quantity: 1, priceAtAdd: 1500 },
		],
	});
	mocks.prisma.productVariant.findUnique.mockResolvedValue({
		stock: 10,
		active: true,
		product: { active: true },
	});
});

describe("updateCartItem", () => {
	it("rejette un variantId invalide sans lecture DB", async () => {
		// "not-a-cuid" : les tirets échouent la regex cuid2 (un simple mot
		// minuscule comme "nope" la PASSE — Zod ne borne pas la longueur).
		const result = await updateCartItem(undefined, makeFormData("not-a-cuid", 2));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.prisma.productVariant.findUnique).not.toHaveBeenCalled();
	});

	it("refuse une ligne absente du panier", async () => {
		mocks.readCartCookie.mockResolvedValue({ items: [] });
		const result = await updateCartItem(undefined, makeFormData(VARIANT_A, 2));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Article introuvable dans le panier");
	});

	it("refuse un VARIANT disparu ou inactif", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue(null);
		const result = await updateCartItem(undefined, makeFormData(VARIANT_A, 2));
		expect(result.message).toBe(CART_ERROR_MESSAGES.VARIANT_INACTIVE);
	});

	it("refuse un produit non public", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue({
			stock: 10,
			active: true,
			product: { active: false },
		});
		const result = await updateCartItem(undefined, makeFormData(VARIANT_A, 2));
		expect(result.message).toBe(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
	});

	it("refuse une quantité au-dessus du stock", async () => {
		mocks.prisma.productVariant.findUnique.mockResolvedValue({
			stock: 2,
			active: true,
			product: { active: true },
		});
		const result = await updateCartItem(undefined, makeFormData(VARIANT_A, 5));
		expect(result.message).toBe(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("re-valide en base MÊME à quantité inchangée, mais n'écrit pas", async () => {
		const result = await updateCartItem(undefined, makeFormData(VARIANT_A, 2));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.prisma.productVariant.findUnique).toHaveBeenCalledOnce();
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("réécrit la seule ligne visée, les autres intactes", async () => {
		const result = await updateCartItem(undefined, makeFormData(VARIANT_A, 4));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe("Quantité mise à jour (4)");
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [
					{ variantId: VARIANT_A, quantity: 4, priceAtAdd: 2500 },
					{ variantId: VARIANT_B, quantity: 1, priceAtAdd: 1500 },
				],
			}),
		);
	});
});
