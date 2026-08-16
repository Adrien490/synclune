/**
 * `removeFromCart` — geste idempotent (double clic, onglet resté ouvert sur un
 * panier déjà vidé) : une ligne absente n'est pas une erreur, et rien n'est
 * réécrit pour rien.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const mocks = vi.hoisted(() => ({
	readCartCookie: vi.fn(),
	writeCartCookie: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-cookie", () => ({
	readCartCookie: mocks.readCartCookie,
	writeCartCookie: mocks.writeCartCookie,
}));

import { removeFromCart } from "../remove-from-cart";

const VARIANT_A = "cm1234567890abcdefghijk12";
const VARIANT_B = "cm1234567890abcdefghijk34";

function makeFormData(variantId: string) {
	const fd = new FormData();
	fd.set("variantId", variantId);
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
});

describe("removeFromCart", () => {
	it("rejette un variantId invalide", async () => {
		// "not-a-cuid" : les tirets échouent la regex cuid2 (un simple mot
		// minuscule comme "nope" la PASSE — Zod ne borne pas la longueur).
		const result = await removeFromCart(undefined, makeFormData("not-a-cuid"));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});

	it("retire la ligne visée et préserve les autres", async () => {
		const result = await removeFromCart(undefined, makeFormData(VARIANT_A));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.writeCartCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				items: [{ variantId: VARIANT_B, quantity: 1, priceAtAdd: 1500 }],
			}),
		);
	});

	it("est idempotent : ligne absente ⇒ succès SANS réécriture", async () => {
		mocks.readCartCookie.mockResolvedValue({
			items: [{ variantId: VARIANT_B, quantity: 1, priceAtAdd: 1500 }],
		});
		const result = await removeFromCart(undefined, makeFormData(VARIANT_A));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.writeCartCookie).not.toHaveBeenCalled();
	});
});
