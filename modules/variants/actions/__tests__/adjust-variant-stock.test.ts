import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { STOCK_LIMITS } from "@/shared/constants/validation-limits";
import { makeFormData, makePrismaMock, PRODUCT_ID, VARIANT_ID } from "./_helpers";
import type { VariantPrismaMock } from "./_helpers";

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	updateTag: vi.fn(),
	prisma: {} as VariantPrismaMock,
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next/cache", () => ({
	updateTag: mocks.updateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

import { adjustVariantStock } from "../adjust-variant-stock";

const prisma = mocks.prisma;

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(mocks.prisma, makePrismaMock());
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.prisma.productVariant.findUnique.mockResolvedValue({
		id: VARIANT_ID,
		stock: 5,
		colorId: null,
		materialId: null,
		product: { id: PRODUCT_ID, slug: "collier-goutte" },
	});
	mocks.prisma.productVariant.updateMany.mockResolvedValue({ count: 1 });
});

describe("adjustVariantStock", () => {
	it("refuse un appel non authentifié sans toucher la base", async () => {
		mocks.requireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await adjustVariantStock(
			undefined,
			makeFormData({ variantId: VARIANT_ID, adjustment: "1" }),
		);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(prisma.productVariant.updateMany).not.toHaveBeenCalled();
	});

	it("rejette un ajustement nul (geste sans effet)", async () => {
		const result = await adjustVariantStock(
			undefined,
			makeFormData({ variantId: VARIANT_ID, adjustment: "0" }),
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(prisma.productVariant.updateMany).not.toHaveBeenCalled();
	});

	it("répond NOT_FOUND au féminin quand la variante n'existe pas", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(null);

		const result = await adjustVariantStock(
			undefined,
			makeFormData({ variantId: VARIANT_ID, adjustment: "1" }),
		);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(result.message).toContain("non trouvée");
	});

	/**
	 * Le cœur de l'action : l'écriture est CONDITIONNELLE (`updateMany` avec
	 * plancher et plafond dans le WHERE), jamais un read-then-write — les bijoux
	 * sont souvent à stock 1 et une vente concurrente doit gagner.
	 */
	it("borne l'écriture par un plancher quand l'ajustement est négatif", async () => {
		await adjustVariantStock(undefined, makeFormData({ variantId: VARIANT_ID, adjustment: "-3" }));

		const where = prisma.productVariant.updateMany.mock.calls[0]![0].where;
		expect(where.id).toBe(VARIANT_ID);
		expect(where.stock.gte).toBe(3);
		expect(prisma.productVariant.updateMany.mock.calls[0]![0].data).toEqual({
			stock: { increment: -3 },
		});
	});

	it("borne l'écriture par le plafond d'inventaire quand l'ajustement est positif", async () => {
		await adjustVariantStock(undefined, makeFormData({ variantId: VARIANT_ID, adjustment: "10" }));

		const where = prisma.productVariant.updateMany.mock.calls[0]![0].where;
		expect(where.stock.gte).toBe(0);
		expect(where.stock.lte).toBe(STOCK_LIMITS.MAX_INVENTORY - 10);
	});

	it("explique le refus par le stock quand la garde de plancher n'a rien mis à jour", async () => {
		prisma.productVariant.updateMany.mockResolvedValue({ count: 0 });

		const result = await adjustVariantStock(
			undefined,
			makeFormData({ variantId: VARIANT_ID, adjustment: "-3" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Stock insuffisant");
	});

	it("explique le refus par le plafond quand la garde haute n'a rien mis à jour", async () => {
		prisma.productVariant.updateMany.mockResolvedValue({ count: 0 });

		const result = await adjustVariantStock(
			undefined,
			makeFormData({ variantId: VARIANT_ID, adjustment: "3" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain(String(STOCK_LIMITS.MAX_INVENTORY));
	});

	it("invalide les tags de cache et annonce le nouveau stock en cas de succès", async () => {
		const result = await adjustVariantStock(
			undefined,
			makeFormData({ variantId: VARIANT_ID, adjustment: "2" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("7");
		const tags = mocks.updateTag.mock.calls.map(([tag]) => tag);
		expect(tags).toContain("products-list");
		expect(tags.some((tag: string) => tag.includes(PRODUCT_ID))).toBe(true);
	});
});
