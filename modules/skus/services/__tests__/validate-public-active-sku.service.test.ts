import { describe, it, expect, vi } from "vitest";
import type * as ActionsModule from "@/shared/lib/actions";

// ============================================================================
// Hoisted mocks
// ============================================================================

vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const actual = await importOriginal<typeof ActionsModule>();
	return { ...actual };
});

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
	assertPublicProductKeepsActiveSku,
	selectDeactivatableSkuIds,
	type DeactivationCandidate,
	type ProductPublicActiveCheck,
} from "../validate-public-active-sku.service";
import { BusinessError } from "@/shared/lib/actions";

// ============================================================================
// Tests — selectDeactivatableSkuIds (STOCK-LAST-ACTIVE-SKU-001)
// ============================================================================

describe("selectDeactivatableSkuIds", () => {
	const candidate = (
		skuId: string,
		productId: string,
		productStatus = "PUBLIC",
	): DeactivationCandidate => ({ skuId, productId, productStatus });

	it("épargne le seul SKU actif d'un produit PUBLIC", () => {
		const result = selectDeactivatableSkuIds(
			[candidate("sku-a", "prod-1")],
			new Map([["prod-1", 1]]),
		);

		expect(result).toEqual([]);
	});

	it("désactive quand un frère actif subsiste", () => {
		const result = selectDeactivatableSkuIds(
			[candidate("sku-a", "prod-1")],
			new Map([["prod-1", 2]]),
		);

		expect(result).toEqual(["sku-a"]);
	});

	it("désactive tout sur un produit non PUBLIC, sans regarder les totaux", () => {
		const result = selectDeactivatableSkuIds(
			[candidate("sku-a", "prod-1", "DRAFT"), candidate("sku-b", "prod-1", "DRAFT")],
			new Map(),
		);

		expect(result).toEqual(["sku-a", "sku-b"]);
	});

	it("n'épargne qu'UN SKU quand tous les actifs d'un produit PUBLIC tombent ensemble", () => {
		const result = selectDeactivatableSkuIds(
			[candidate("sku-c", "prod-1"), candidate("sku-a", "prod-1"), candidate("sku-b", "prod-1")],
			new Map([["prod-1", 3]]),
		);

		// `sku-a` (plus petit id) survit — choix déterministe, rejouable.
		expect(result).toEqual(["sku-b", "sku-c"]);
	});

	it("traite chaque produit indépendamment", () => {
		const result = selectDeactivatableSkuIds(
			[candidate("sku-a", "prod-1"), candidate("sku-b", "prod-2")],
			new Map([
				["prod-1", 1], // dernier actif → épargné
				["prod-2", 4], // frères actifs → désactivable
			]),
		);

		expect(result).toEqual(["sku-b"]);
	});

	it("épargne un SKU quand le total actif est inconnu (hypothèse prudente)", () => {
		const result = selectDeactivatableSkuIds([candidate("sku-a", "prod-1")], new Map());

		expect(result).toEqual([]);
	});

	it("retourne un tableau vide sans candidat", () => {
		expect(selectDeactivatableSkuIds([], new Map())).toEqual([]);
	});
});

// ============================================================================
// Tests — assertPublicProductKeepsActiveSku
// ============================================================================

describe("assertPublicProductKeepsActiveSku", () => {
	it("does nothing when product is DRAFT (any SKU state allowed)", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "DRAFT",
			activeTotal: 1,
			activeAffected: 1, // last active SKU deactivated
		};
		expect(() => assertPublicProductKeepsActiveSku(check)).not.toThrow();
	});

	it("does nothing when product is ARCHIVED", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "ARCHIVED",
			activeTotal: 2,
			activeAffected: 2,
		};
		expect(() => assertPublicProductKeepsActiveSku(check)).not.toThrow();
	});

	it("passes when PUBLIC and at least 1 active SKU remains", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 3,
			activeAffected: 2, // 3 - 2 = 1 remains
		};
		expect(() => assertPublicProductKeepsActiveSku(check)).not.toThrow();
	});

	it("passes when PUBLIC and many active SKUs remain", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 10,
			activeAffected: 1,
		};
		expect(() => assertPublicProductKeepsActiveSku(check)).not.toThrow();
	});

	it("throws BusinessError when PUBLIC and deactivating last active SKU", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 1,
			activeAffected: 1, // 0 remains
		};
		expect(() => assertPublicProductKeepsActiveSku(check)).toThrow(BusinessError);
	});

	it("throws BusinessError when PUBLIC and activeAffected > activeTotal (defensive)", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 2,
			activeAffected: 3,
		};
		expect(() => assertPublicProductKeepsActiveSku(check)).toThrow(BusinessError);
	});

	it("uses default French error message", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 1,
			activeAffected: 1,
		};
		expect(() => assertPublicProductKeepsActiveSku(check)).toThrow(
			/Impossible de desactiver la derniere variante active/,
		);
	});

	it("uses messageOverride when provided", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 1,
			activeAffected: 1,
		};
		expect(() => assertPublicProductKeepsActiveSku(check, "Custom error")).toThrow("Custom error");
	});

	it("is a noop when activeTotal=0 and activeAffected=0 for non-PUBLIC", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "DRAFT",
			activeTotal: 0,
			activeAffected: 0,
		};
		expect(() => assertPublicProductKeepsActiveSku(check)).not.toThrow();
	});
});
