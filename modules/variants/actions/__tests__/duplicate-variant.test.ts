import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import {
	makeFormData,
	makePrismaMock,
	OTHER_VARIANT_ID,
	PRODUCT_ID,
	uniqueViolation,
	VARIANT_ID,
} from "./_helpers";
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

import { duplicateVariant } from "../duplicate-variant";

const prisma = mocks.prisma;

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(mocks.prisma, makePrismaMock());
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.prisma.productVariant.findUnique.mockResolvedValue({
		productId: PRODUCT_ID,
		priceCents: 2500,
		stock: 7,
		colorId: "c1",
		materialId: "m1",
		size: "M",
		product: { id: PRODUCT_ID, slug: "collier-goutte", name: "Collier goutte" },
	});
	mocks.prisma.productVariant.create.mockResolvedValue({ id: OTHER_VARIANT_ID });
});

describe("duplicateVariant", () => {
	/**
	 * ⚠️ MOITIÉ SERVEUR du contrat de duplication. `use-duplicate-variant` garde
	 * le retour sur la présence de `variantId` : les deux moitiés doivent bouger
	 * ensemble. Elles avaient divergé — le hook exigeait
	 * `{ id, variant, productId, productSlug }`, son garde ne passait jamais, et
	 * dupliquer une variante ne rendait AUCUN retour visible.
	 */
	it("renvoie l'id de la copie sous la clé `variantId`", async () => {
		const result = await duplicateVariant(undefined, makeFormData({ variantId: VARIANT_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ variantId: OTHER_VARIANT_ID });
	});

	/**
	 * La contrainte (productId, size, colorId, materialId) rend la copie à
	 * l'identique impossible : la copie naît sans taille, inactive et à stock 0
	 * pour que l'admin la différencie avant de la publier.
	 */
	it("crée une copie inactive, à stock 0 et sans taille", async () => {
		await duplicateVariant(undefined, makeFormData({ variantId: VARIANT_ID }));

		expect(prisma.productVariant.create.mock.calls[0]![0].data).toMatchObject({
			productId: PRODUCT_ID,
			priceCents: 2500,
			stock: 0,
			active: false,
			colorId: "c1",
			materialId: "m1",
			size: null,
		});
	});

	it("traduit une violation d'unicité en message actionnable", async () => {
		prisma.productVariant.create.mockRejectedValue(uniqueViolation());

		const result = await duplicateVariant(undefined, makeFormData({ variantId: VARIANT_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("existe déjà");
	});

	it("répond NOT_FOUND quand la variante source a disparu", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(null);

		const result = await duplicateVariant(undefined, makeFormData({ variantId: VARIANT_ID }));

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(prisma.productVariant.create).not.toHaveBeenCalled();
	});
});
