import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
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

import { updateVariantPrice } from "../update-variant-price";

const prisma = mocks.prisma;

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(mocks.prisma, makePrismaMock());
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.prisma.productVariant.findUnique.mockResolvedValue({
		id: VARIANT_ID,
		product: { id: PRODUCT_ID, slug: "collier-goutte", priceCents: 4200 },
	});
	mocks.prisma.productVariant.update.mockResolvedValue({});
});

describe("updateVariantPrice", () => {
	it("convertit les euros saisis en centimes", async () => {
		const result = await updateVariantPrice(
			undefined,
			makeFormData({ variantId: VARIANT_ID, priceEuros: "30.50" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(prisma.productVariant.update).toHaveBeenCalledWith({
			where: { id: VARIANT_ID },
			data: { priceCents: 3050 },
		});
	});

	/**
	 * ⚠️ Sémantique du champ vide : la variante RETOMBE sur le prix du produit.
	 * C'est le seul geste qui délie un override — le formulaire ne l'offrait pas
	 * (il s'ouvrait sur le prix effectif et refusait la soumission à vide), si
	 * bien qu'ouvrir puis enregistrer épinglait le prix hérité pour toujours.
	 */
	it("retire l'override quand le prix est vide", async () => {
		const result = await updateVariantPrice(
			undefined,
			makeFormData({ variantId: VARIANT_ID, priceEuros: "" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(prisma.productVariant.update).toHaveBeenCalledWith({
			where: { id: VARIANT_ID },
			data: { priceCents: null },
		});
		expect(result.message).toContain("suit le prix du produit");
	});

	it("refuse un prix nul ou négatif", async () => {
		const result = await updateVariantPrice(
			undefined,
			makeFormData({ variantId: VARIANT_ID, priceEuros: "0" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(prisma.productVariant.update).not.toHaveBeenCalled();
	});

	it("ignore un champ compareAtPriceEuros hérité (colonne supprimée)", async () => {
		await updateVariantPrice(
			undefined,
			makeFormData({ variantId: VARIANT_ID, priceEuros: "30", compareAtPriceEuros: "45" }),
		);

		expect(prisma.productVariant.update).toHaveBeenCalledWith({
			where: { id: VARIANT_ID },
			data: { priceCents: 3000 },
		});
	});
});
