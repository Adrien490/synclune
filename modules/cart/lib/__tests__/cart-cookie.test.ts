import { describe, it, expect, vi, beforeEach } from "vitest";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCookieStore } = vi.hoisted(() => ({
	mockCookieStore: {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		has: vi.fn(),
	},
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(async () => mockCookieStore),
}));

import { readCartCookie, writeCartCookie, clearCartCookie } from "../cart-cookie";

const SKU_A = "cm1234567890abcdefghijk12";
const SKU_B = "cm1234567890abcdefghijk34";
const SKU_C = "cm1234567890abcdefghijk56";

function setCookieValue(value: string | undefined) {
	mockCookieStore.get.mockReturnValue(value === undefined ? undefined : { value });
}

/** Forme sérialisée : `{"i":[[skuId, qty, priceAtAdd]]}` */
function serialize(items: Array<[string, number, number]>) {
	return JSON.stringify({ i: items });
}

beforeEach(() => {
	vi.clearAllMocks();
	mockCookieStore.has.mockReturnValue(false);
});

// ============================================================================
// readCartCookie — le cookie est une entrée CLIENT, jamais de confiance
// ============================================================================

describe("readCartCookie", () => {
	it("retourne un panier vide sans cookie", async () => {
		setCookieValue(undefined);
		expect(await readCartCookie()).toEqual({ items: [] });
	});

	it("retourne un panier vide sur JSON invalide", async () => {
		setCookieValue("not-json{");
		expect(await readCartCookie()).toEqual({ items: [] });
	});

	it("retourne un panier vide sur un JSON qui n'est pas un objet", async () => {
		setCookieValue(JSON.stringify([SKU_A, 1, 100]));
		expect(await readCartCookie()).toEqual({ items: [] });
	});

	it("lit une ligne bien formée", async () => {
		setCookieValue(serialize([[SKU_A, 2, 4990]]));
		expect(await readCartCookie()).toEqual({
			items: [{ skuId: SKU_A, quantity: 2, priceAtAdd: 4990 }],
		});
	});

	it("préserve l'ordre du cookie (le plus récent en tête)", async () => {
		setCookieValue(
			serialize([
				[SKU_C, 1, 100],
				[SKU_A, 1, 200],
				[SKU_B, 1, 300],
			]),
		);
		const cart = await readCartCookie();
		expect(cart.items.map((i) => i.skuId)).toEqual([SKU_C, SKU_A, SKU_B]);
	});

	describe("lignes malformées — écartées silencieusement", () => {
		it.each([
			["skuId non-cuid2", ["NOT-A-CUID", 1, 100]],
			["skuId non-string", [42, 1, 100]],
			["quantité 0", [SKU_B, 0, 100]],
			["quantité négative", [SKU_B, -3, 100]],
			["quantité non entière", [SKU_B, 1.5, 100]],
			["quantité au-dessus du plafond", [SKU_B, MAX_QUANTITY_PER_ORDER + 1, 100]],
			["prix négatif", [SKU_B, 1, -100]],
			["prix non entier", [SKU_B, 1, 10.5]],
			["prix délirant", [SKU_B, 1, 999_999_999]],
			["ligne non-tableau", { skuId: SKU_B, quantity: 1, priceAtAdd: 100 }],
		])("écarte %s en gardant les lignes valides", async (_label, badEntry) => {
			setCookieValue(JSON.stringify({ i: [[SKU_A, 1, 100], badEntry] }));
			const cart = await readCartCookie();
			expect(cart.items).toEqual([{ skuId: SKU_A, quantity: 1, priceAtAdd: 100 }]);
		});

		it("accepte un prix de 0 (article offert)", async () => {
			setCookieValue(serialize([[SKU_A, 1, 0]]));
			const cart = await readCartCookie();
			expect(cart.items).toEqual([{ skuId: SKU_A, quantity: 1, priceAtAdd: 0 }]);
		});
	});

	it("dédoublonne par skuId en gardant la première occurrence", async () => {
		setCookieValue(
			serialize([
				[SKU_A, 2, 100],
				[SKU_A, 9, 999],
			]),
		);
		const cart = await readCartCookie();
		expect(cart.items).toEqual([{ skuId: SKU_A, quantity: 2, priceAtAdd: 100 }]);
	});

	it("tronque à MAX_CART_ITEMS", async () => {
		const many = Array.from(
			{ length: MAX_CART_ITEMS + 10 },
			(_, i) => [`cm${String(i).padStart(23, "0")}`, 1, 100] as [string, number, number],
		);
		setCookieValue(serialize(many));
		const cart = await readCartCookie();
		expect(cart.items).toHaveLength(MAX_CART_ITEMS);
	});
});

// ============================================================================
// writeCartCookie
// ============================================================================

describe("writeCartCookie", () => {
	it("écrit la forme compacte attendue", async () => {
		await writeCartCookie({
			items: [{ skuId: SKU_A, quantity: 2, priceAtAdd: 4990 }],
		});

		const [name, value] = mockCookieStore.set.mock.calls[0]!;
		expect(name).toBe("cart");
		expect(JSON.parse(value as string)).toEqual({ i: [[SKU_A, 2, 4990]] });
	});

	it("pose les attributs de sécurité", async () => {
		await writeCartCookie({
			items: [{ skuId: SKU_A, quantity: 1, priceAtAdd: 100 }],
		});
		expect(mockCookieStore.set.mock.calls[0]![2]).toMatchObject({
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7, // 7 jours glissants
		});
	});

	it("SUPPRIME le cookie plutôt que d'écrire un panier vide", async () => {
		await writeCartCookie({ items: [] });
		expect(mockCookieStore.delete).toHaveBeenCalledWith("cart");
		expect(mockCookieStore.set).not.toHaveBeenCalled();
	});

	it("tronque à MAX_CART_ITEMS", async () => {
		await writeCartCookie({
			items: Array.from({ length: MAX_CART_ITEMS + 5 }, (_, i) => ({
				skuId: `cm${String(i).padStart(23, "0")}`,
				quantity: 1,
				priceAtAdd: 100,
			})),
		});
		const value = mockCookieStore.set.mock.calls[0]![1] as string;
		expect(JSON.parse(value).i).toHaveLength(MAX_CART_ITEMS);
	});

	/**
	 * Le budget d'un cookie est de 4 Ko, et Next sérialise la valeur avec
	 * `encodeURIComponent` : chaque caractère de ponctuation JSON coûte 3 octets
	 * une fois encodé, pas 1. C'est ce calcul qui fixe `MAX_CART_ITEMS` — cette
	 * assertion le rejoue pour qu'un relèvement du plafond ne passe pas en silence.
	 */
	it("un panier PLEIN tient dans le budget de 4 Ko une fois URL-encodé", async () => {
		await writeCartCookie({
			items: Array.from({ length: MAX_CART_ITEMS }, (_, i) => ({
				skuId: `cm${String(i).padStart(23, "z")}`,
				quantity: MAX_QUANTITY_PER_ORDER,
				priceAtAdd: 999_999,
			})),
		});
		const value = mockCookieStore.set.mock.calls[0]![1] as string;
		const encodedBytes = new TextEncoder().encode(encodeURIComponent(value)).length;
		expect(encodedBytes).toBeLessThan(4096);
	});
});

// ============================================================================
// Aller-retour
// ============================================================================

describe("aller-retour write → read", () => {
	it("restitue exactement ce qui a été écrit", async () => {
		const cart = {
			items: [
				{ skuId: SKU_A, quantity: 2, priceAtAdd: 4990 },
				{ skuId: SKU_B, quantity: 1, priceAtAdd: 12000 },
			],
		};

		await writeCartCookie(cart);
		setCookieValue(mockCookieStore.set.mock.calls[0]![1] as string);

		expect(await readCartCookie()).toEqual(cart);
	});
});

describe("clearCartCookie", () => {
	it("supprime le cookie", async () => {
		await clearCartCookie();
		expect(mockCookieStore.delete).toHaveBeenCalledWith("cart");
	});
});
