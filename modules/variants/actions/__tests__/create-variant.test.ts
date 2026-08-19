import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { makeFormData, makePrismaMock, PRODUCT_ID, uniqueViolation, VARIANT_ID } from "./_helpers";
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

import { createVariant } from "../create-variant";

const prisma = mocks.prisma;

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(mocks.prisma, makePrismaMock());
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.prisma.product.findUnique.mockResolvedValue({
		id: PRODUCT_ID,
		slug: "collier-goutte",
		name: "Collier goutte",
	});
	mocks.prisma.productVariant.create.mockResolvedValue({
		id: VARIANT_ID,
		colorId: null,
		materialId: null,
	});
});

describe("createVariant", () => {
	it("écrit null pour un prix vide (la variante hérite du produit)", async () => {
		const result = await createVariant(
			undefined,
			makeFormData({ productId: PRODUCT_ID, priceEuros: "", stock: "3", active: "true" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(prisma.productVariant.create.mock.calls[0]![0].data).toMatchObject({
			productId: PRODUCT_ID,
			priceCents: null,
			stock: 3,
			active: true,
			colorId: null,
			materialId: null,
			size: null,
		});
	});

	it("convertit un prix en centimes et trim la taille", async () => {
		await createVariant(
			undefined,
			makeFormData({ productId: PRODUCT_ID, priceEuros: "19.99", stock: "1", size: "  52  " }),
		);

		expect(prisma.productVariant.create.mock.calls[0]![0].data).toMatchObject({
			priceCents: 1999,
			size: "52",
		});
	});

	it("répond NOT_FOUND quand le produit parent n'existe pas", async () => {
		prisma.product.findUnique.mockResolvedValue(null);

		const result = await createVariant(
			undefined,
			makeFormData({ productId: PRODUCT_ID, stock: "1" }),
		);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(prisma.productVariant.create).not.toHaveBeenCalled();
	});

	/** L'unicité (productId, size, colorId, materialId) est portée par la DB. */
	it("traduit P2002 en message nommant les trois axes", async () => {
		prisma.productVariant.create.mockRejectedValue(uniqueViolation());

		const result = await createVariant(
			undefined,
			makeFormData({ productId: PRODUCT_ID, stock: "1" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("taille, couleur et matériau");
	});

	it("refuse un stock au-delà du plafond d'inventaire", async () => {
		const result = await createVariant(
			undefined,
			makeFormData({ productId: PRODUCT_ID, stock: "999999" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(prisma.productVariant.create).not.toHaveBeenCalled();
	});
});
