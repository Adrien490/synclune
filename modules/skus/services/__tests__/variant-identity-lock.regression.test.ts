/**
 * @regression variant-identity-lock
 *
 * L'identité de variante (productId, set de colorIds, size) n'a plus d'index
 * unique DB depuis la migration M2M couleurs (20260515181712) : la garde
 * applicative `assertUniqueVariantCombination` était un read-then-write NON
 * verrouillé — deux créations concurrentes de la même combinaison passaient
 * toutes les deux (doublon silencieux, sélecteur storefront ambigu).
 *
 * Correctif : advisory lock transactionnel par produit acquis AVANT la lecture
 * des candidats, sérialisant create/update/restore d'un même produit.
 */
import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions";
import {
	assertUniqueVariantCombination,
	normalizeOptionalRefs,
} from "../persist-sku-helpers.service";

function buildTx(candidates: Array<{ id: string; sku: string; colors: { colorId: string }[] }>) {
	return {
		$queryRaw: vi.fn().mockResolvedValue([]),
		productSku: { findMany: vi.fn().mockResolvedValue(candidates) },
	} as unknown as Prisma.TransactionClient & {
		$queryRaw: ReturnType<typeof vi.fn>;
		productSku: { findMany: ReturnType<typeof vi.fn> };
	};
}

describe("assertUniqueVariantCombination — advisory lock (variant-identity-lock)", () => {
	it("acquiert le lock advisory produit AVANT la lecture des candidats", async () => {
		const tx = buildTx([]);

		await assertUniqueVariantCombination(tx, {
			productId: "prod-1",
			colorIds: ["col-1"],
			size: "M",
		});

		expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
		// Tagged template : premier argument = fragments SQL statiques
		const sqlFragments = (tx.$queryRaw.mock.calls[0]![0] as readonly string[]).join("?");
		expect(sqlFragments).toContain("pg_advisory_xact_lock");
		expect(sqlFragments).toContain("hashtext");
		// Le lock DOIT précéder le findMany (sinon la fenêtre de course persiste)
		expect(tx.$queryRaw.mock.invocationCallOrder[0]!).toBeLessThan(
			tx.productSku.findMany.mock.invocationCallOrder[0]!,
		);
	});

	it("compare la taille de manière insensible à la casse", async () => {
		const tx = buildTx([]);

		await assertUniqueVariantCombination(tx, {
			productId: "prod-1",
			colorIds: [],
			size: "M",
		});

		expect(tx.productSku.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					size: { equals: "M", mode: "insensitive" },
				}),
			}),
		);
	});

	it("matche size null strictement (pas de mode insensitive sur null)", async () => {
		const tx = buildTx([]);

		await assertUniqueVariantCombination(tx, {
			productId: "prod-1",
			colorIds: [],
			size: null,
		});

		expect(tx.productSku.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ size: null }),
			}),
		);
	});

	it("rejette une combinaison au même set de couleurs, ordre indifférent", async () => {
		const tx = buildTx([
			{ id: "sku-1", sku: "BRC-01", colors: [{ colorId: "col-2" }, { colorId: "col-1" }] },
		]);

		await expect(
			assertUniqueVariantCombination(tx, {
				productId: "prod-1",
				colorIds: ["col-1", "col-2"],
				size: "M",
			}),
		).rejects.toThrow(BusinessError);
	});

	it("accepte un set de couleurs différent (sous-ensemble ≠ égalité)", async () => {
		const tx = buildTx([{ id: "sku-1", sku: "BRC-01", colors: [{ colorId: "col-1" }] }]);

		await expect(
			assertUniqueVariantCombination(tx, {
				productId: "prod-1",
				colorIds: ["col-1", "col-2"],
				size: "M",
			}),
		).resolves.toBeUndefined();
	});

	it("exclut le SKU édité lui-même via excludeSkuId (cas update/restore)", async () => {
		const tx = buildTx([]);

		await assertUniqueVariantCombination(tx, {
			productId: "prod-1",
			colorIds: ["col-1"],
			size: null,
			excludeSkuId: "sku-self",
		});

		expect(tx.productSku.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ NOT: { id: "sku-self" } }),
			}),
		);
	});
});

describe("normalizeOptionalRefs — normalisation size", () => {
	it("trim la taille et convertit blancs-seuls en null", () => {
		expect(normalizeOptionalRefs({ size: "  M  " }).size).toBe("M");
		expect(normalizeOptionalRefs({ size: "   " }).size).toBeNull();
		expect(normalizeOptionalRefs({}).size).toBeNull();
	});

	it("déduplique les couleurs/matériaux en préservant l'ordre", () => {
		const refs = normalizeOptionalRefs({
			colorIds: ["a", "b", "a"],
			materialIds: ["x", "x", "y"],
		});
		expect(refs.colorIds).toEqual(["a", "b"]);
		expect(refs.materialIds).toEqual(["x", "y"]);
	});
});
