import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { makeFormData, makePrismaMock, OTHER_VARIANT_ID, PRODUCT_ID, VARIANT_ID } from "./_helpers";
import type { VariantPrismaMock } from "./_helpers";

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	updateTag: vi.fn(),
	applyStockDeltaTx: vi.fn(),
	prisma: {} as VariantPrismaMock,
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next/cache", () => ({
	updateTag: mocks.updateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("../../services/apply-stock-delta.service", () => ({
	applyStockDeltaTx: mocks.applyStockDeltaTx,
}));

import { updateVariant } from "../update-variant";

const prisma = mocks.prisma;

function existingVariant(options: {
	active?: boolean;
	productActive?: boolean;
	siblings?: { id: string; active: boolean }[];
}) {
	const { active = true, productActive = true, siblings = [] } = options;
	return {
		id: VARIANT_ID,
		stock: 4,
		active,
		colorId: "c1",
		materialId: null,
		product: {
			id: PRODUCT_ID,
			slug: "collier-goutte",
			active: productActive,
			variants: [{ id: VARIANT_ID, active }, ...siblings],
		},
	};
}

const BASE_FORM = {
	variantId: VARIANT_ID,
	priceEuros: "30",
	stock: "6",
	originalStock: "4",
	active: "true",
};

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(mocks.prisma, makePrismaMock());
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.prisma.productVariant.findUnique.mockResolvedValue(existingVariant({}));
	mocks.prisma.$transaction.mockImplementation(
		async (fn: (tx: typeof mocks.prisma) => Promise<unknown>) => fn(mocks.prisma),
	);
	mocks.prisma.productVariant.update.mockResolvedValue({});
	mocks.applyStockDeltaTx.mockResolvedValue(2);
});

describe("updateVariant", () => {
	/**
	 * Le stock s'écrit en DELTA RELATIF sous verrou (SSOT `applyStockDeltaTx`) :
	 * un `stock: <valeur>` absolu écraserait un décrément commité par le webhook
	 * d'encaissement entre l'ouverture du formulaire et l'enregistrement
	 * (stock fantôme → survente → commande FAILED + remboursement).
	 */
	it("délègue le stock au service de delta et l'applique en increment", async () => {
		const result = await updateVariant(undefined, makeFormData(BASE_FORM));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.applyStockDeltaTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				variantId: VARIANT_ID,
				targetStock: 6,
				originalStock: 4,
				fallbackStock: 4,
			}),
		);
		expect(prisma.productVariant.update.mock.calls[0]![0].data).toMatchObject({
			stock: { increment: 2 },
			priceCents: 3000,
		});
	});

	it("refuse de désactiver la dernière variante active d'un produit en vente", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(
			existingVariant({ siblings: [{ id: OTHER_VARIANT_ID, active: false }] }),
		);

		const result = await updateVariant(undefined, makeFormData({ ...BASE_FORM, active: "false" }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Masque d'abord le produit");
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it("accepte la désactivation tant qu'une sœur active survit", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(
			existingVariant({ siblings: [{ id: OTHER_VARIANT_ID, active: true }] }),
		);

		const result = await updateVariant(undefined, makeFormData({ ...BASE_FORM, active: "false" }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	/** Invalidation : ANCIENNE et NOUVELLE couleur, sinon un compteur reste faux. */
	it("invalide l'ancienne et la nouvelle couleur", async () => {
		await updateVariant(
			undefined,
			makeFormData({ ...BASE_FORM, colorId: "d2e3f4g5h6i7j8k9l0mnopqr" }),
		);

		const tags = mocks.updateTag.mock.calls.map(([tag]) => tag);
		expect(tags.some((tag: string) => tag.includes("c1"))).toBe(true);
		expect(tags.some((tag: string) => tag.includes("d2e3f4g5h6i7j8k9l0mnopqr"))).toBe(true);
	});
});
