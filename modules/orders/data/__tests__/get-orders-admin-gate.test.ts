/**
 * @regression orders-data-admin-gate
 *
 * `getOrders` et `getOrderById` sont ADMIN ONLY — il n'existe aucune variante
 * publique (le client passe par /suivi-commande). La garde `isAdmin()` doit
 * rendre un résultat VIDE sans toucher à la base : ces fonctions nourrissent
 * des pages, une erreur levée casserait le rendu là où un vide affiche
 * simplement « aucune commande ».
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrderById } from "../get-order";
import { getOrders } from "../get-orders";

const mocks = vi.hoisted(() => ({
	isAdmin: vi.fn(),
	findMany: vi.fn(),
	findUnique: vi.fn(),
	count: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	isAdmin: mocks.isAdmin,
}));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: { findMany: mocks.findMany, findUnique: mocks.findUnique, count: mocks.count },
	},
}));
// `fetchOrders` / `fetchOrderById` sont des scopes `"use cache"` : hors runtime
// Next, cacheLife/cacheTag doivent être neutralisés.
vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

const ORDER_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";

beforeEach(() => {
	vi.clearAllMocks();
	mocks.isAdmin.mockResolvedValue(true);
});

describe("getOrders — garde admin", () => {
	it("non-admin : liste vide, la base n'est JAMAIS lue", async () => {
		mocks.isAdmin.mockResolvedValue(false);

		const result = await getOrders({});

		expect(result.orders).toEqual([]);
		expect(result.totalCount).toBe(0);
		expect(mocks.findMany).not.toHaveBeenCalled();
		expect(mocks.count).not.toHaveBeenCalled();
	});

	it("params invalides (perPage non numérique) : liste vide sans lire la base", async () => {
		const result = await getOrders({ perPage: "abc" as unknown as number });

		expect(result.orders).toEqual([]);
		expect(mocks.findMany).not.toHaveBeenCalled();
	});

	it("admin : lit la base et rend lignes + total", async () => {
		mocks.findMany.mockResolvedValue([{ id: ORDER_ID }]);
		mocks.count.mockResolvedValue(1);

		const result = await getOrders({});

		expect(result.orders).toEqual([{ id: ORDER_ID }]);
		expect(result.totalCount).toBe(1);
	});
});

describe("getOrderById — garde admin", () => {
	it("non-admin : null, la base n'est JAMAIS lue", async () => {
		mocks.isAdmin.mockResolvedValue(false);

		await expect(getOrderById(ORDER_ID)).resolves.toBeNull();
		expect(mocks.findUnique).not.toHaveBeenCalled();
	});

	it("orderId vide : null sans lire la base", async () => {
		await expect(getOrderById("")).resolves.toBeNull();
		expect(mocks.findUnique).not.toHaveBeenCalled();
	});

	it("admin : rend la commande", async () => {
		mocks.findUnique.mockResolvedValue({ id: ORDER_ID });
		await expect(getOrderById(ORDER_ID)).resolves.toEqual({ id: ORDER_ID });
	});
});
