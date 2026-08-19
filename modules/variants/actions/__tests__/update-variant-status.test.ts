import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { makeFormData, makePrismaMock, OTHER_VARIANT_ID, PRODUCT_ID, VARIANT_ID } from "./_helpers";
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

import { updateVariantStatus } from "../update-variant-status";

const prisma = mocks.prisma;

function variantWithSiblings(options: {
	active?: boolean;
	productActive?: boolean;
	siblings?: { id: string; active: boolean }[];
}) {
	const { active = true, productActive = true, siblings = [] } = options;
	return {
		id: VARIANT_ID,
		active,
		colorId: null,
		materialId: null,
		product: {
			id: PRODUCT_ID,
			slug: "collier-goutte",
			active: productActive,
			variants: [{ id: VARIANT_ID, active }, ...siblings],
		},
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(mocks.prisma, makePrismaMock());
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.prisma.productVariant.update.mockResolvedValue({});
});

describe("updateVariantStatus", () => {
	it("est un no-op annoncé quand le statut demandé est déjà le statut courant", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(variantWithSiblings({ active: true }));

		const result = await updateVariantStatus(
			undefined,
			makeFormData({ variantId: VARIANT_ID, active: "true" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("déjà active");
		expect(prisma.productVariant.update).not.toHaveBeenCalled();
	});

	/**
	 * Invariant vitrine : un produit EN VENTE sans variante active affiche une
	 * fiche sans rien d'achetable. La garde est la seule chose qui l'empêche.
	 */
	it("refuse de désactiver la DERNIÈRE variante active d'un produit en vente", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(
			variantWithSiblings({
				active: true,
				productActive: true,
				siblings: [{ id: OTHER_VARIANT_ID, active: false }],
			}),
		);

		const result = await updateVariantStatus(
			undefined,
			makeFormData({ variantId: VARIANT_ID, active: "false" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Masque d'abord le produit");
		expect(prisma.productVariant.update).not.toHaveBeenCalled();
	});

	/**
	 * ⚠️ Le pendant de la garde ci-dessus, et le verrou de la correction du menu
	 * d'actions : la règle porte sur la dernière variante ACTIVE, jamais sur le
	 * REPRÉSENTANT. `use-variant-actions` masquait pourtant le geste dès que la
	 * variante était représentante, en invoquant un refus qui n'existe pas —
	 * la variante par défaut d'un produit à plusieurs actives était indésactivable.
	 */
	it("accepte de désactiver une variante tant qu'une sœur active survit", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(
			variantWithSiblings({
				active: true,
				productActive: true,
				siblings: [{ id: OTHER_VARIANT_ID, active: true }],
			}),
		);

		const result = await updateVariantStatus(
			undefined,
			makeFormData({ variantId: VARIANT_ID, active: "false" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(prisma.productVariant.update).toHaveBeenCalledWith({
			where: { id: VARIANT_ID },
			data: { active: false },
		});
	});

	it("laisse désactiver la dernière variante active d'un produit MASQUÉ", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(
			variantWithSiblings({ active: true, productActive: false }),
		);

		const result = await updateVariantStatus(
			undefined,
			makeFormData({ variantId: VARIANT_ID, active: "false" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("répond NOT_FOUND quand la variante n'existe pas", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(null);

		const result = await updateVariantStatus(
			undefined,
			makeFormData({ variantId: VARIANT_ID, active: "false" }),
		);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});
});
