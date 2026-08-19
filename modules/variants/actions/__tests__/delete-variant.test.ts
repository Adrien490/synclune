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

import { deleteVariant } from "../delete-variant";

const prisma = mocks.prisma;

function variantWithCount(variantsCount: number) {
	return {
		id: VARIANT_ID,
		colorId: "c1",
		materialId: null,
		product: {
			id: PRODUCT_ID,
			slug: "collier-goutte",
			name: "Collier goutte",
			_count: { variants: variantsCount },
		},
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(mocks.prisma, makePrismaMock());
	mocks.requireAdmin.mockResolvedValue({ admin: true });
	mocks.prisma.productVariant.delete.mockResolvedValue({});
});

describe("deleteVariant", () => {
	/** « Chaque produit a AU MOINS UNE variante » — l'invariant du schéma lean. */
	it("refuse de supprimer la dernière variante d'un produit", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(variantWithCount(1));

		const result = await deleteVariant(undefined, makeFormData({ variantId: VARIANT_ID }));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("dernière variante");
		expect(prisma.productVariant.delete).not.toHaveBeenCalled();
	});

	it("supprime réellement dès qu'une sœur reste (pas de soft delete)", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(variantWithCount(2));

		const result = await deleteVariant(undefined, makeFormData({ variantId: VARIANT_ID }));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(prisma.productVariant.delete).toHaveBeenCalledWith({ where: { id: VARIANT_ID } });
	});

	it("invalide la couleur portée par la variante supprimée", async () => {
		prisma.productVariant.findUnique.mockResolvedValue(variantWithCount(2));

		await deleteVariant(undefined, makeFormData({ variantId: VARIANT_ID }));

		const tags = mocks.updateTag.mock.calls.map(([tag]) => tag);
		expect(tags.some((tag: string) => tag.includes("c1"))).toBe(true);
	});

	/**
	 * ⚠️ `z.cuid2()` de Zod v4 n'est qu'un `^[0-9a-z]+$` sans borne de longueur :
	 * il ACCEPTE "42" (vérifié). Seul un caractère hors alphabet (majuscule, tiret)
	 * est rejeté. La garde utile reste donc le `findUnique` qui suit — d'où le test
	 * de NOT_FOUND ci-dessus. Ce test verrouille la moitié qui, elle, s'arrête
	 * avant la base.
	 */
	it("rejette un id hors alphabet cuid2 sans toucher la base", async () => {
		const result = await deleteVariant(undefined, makeFormData({ variantId: "Pas-Un-Cuid" }));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(prisma.productVariant.findUnique).not.toHaveBeenCalled();
	});
});
