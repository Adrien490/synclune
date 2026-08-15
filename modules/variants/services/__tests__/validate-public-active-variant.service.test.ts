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
	assertPublicProductKeepsActiveVariant,
	selectDeactivatableVariantIds,
	type DeactivationCandidate,
	type ProductPublicActiveCheck,
} from "../validate-public-active-variant.service";
import { BusinessError } from "@/shared/lib/actions";

// ============================================================================
// Tests — selectDeactivatableVariantIds (STOCK-LAST-ACTIVE-VARIANT-001)
// ============================================================================

describe("selectDeactivatableVariantIds", () => {
	const candidate = (
		variantId: string,
		productId: string,
		productStatus = "PUBLIC",
	): DeactivationCandidate => ({ variantId, productId, productStatus });

	it("épargne le seul VARIANT actif d'un produit PUBLIC", () => {
		const result = selectDeactivatableVariantIds(
			[candidate("variant-a", "prod-1")],
			new Map([["prod-1", 1]]),
		);

		expect(result).toEqual([]);
	});

	it("désactive quand un frère actif subsiste", () => {
		const result = selectDeactivatableVariantIds(
			[candidate("variant-a", "prod-1")],
			new Map([["prod-1", 2]]),
		);

		expect(result).toEqual(["variant-a"]);
	});

	it("désactive tout sur un produit non PUBLIC, sans regarder les totaux", () => {
		const result = selectDeactivatableVariantIds(
			[candidate("variant-a", "prod-1", "DRAFT"), candidate("variant-b", "prod-1", "DRAFT")],
			new Map(),
		);

		expect(result).toEqual(["variant-a", "variant-b"]);
	});

	it("n'épargne qu'UN VARIANT quand tous les actifs d'un produit PUBLIC tombent ensemble", () => {
		const result = selectDeactivatableVariantIds(
			[
				candidate("variant-c", "prod-1"),
				candidate("variant-a", "prod-1"),
				candidate("variant-b", "prod-1"),
			],
			new Map([["prod-1", 3]]),
		);

		// `variant-a` (plus petit id) survit — choix déterministe, rejouable.
		expect(result).toEqual(["variant-b", "variant-c"]);
	});

	it("traite chaque produit indépendamment", () => {
		const result = selectDeactivatableVariantIds(
			[candidate("variant-a", "prod-1"), candidate("variant-b", "prod-2")],
			new Map([
				["prod-1", 1], // dernier actif → épargné
				["prod-2", 4], // frères actifs → désactivable
			]),
		);

		expect(result).toEqual(["variant-b"]);
	});

	it("épargne un VARIANT quand le total actif est inconnu (hypothèse prudente)", () => {
		const result = selectDeactivatableVariantIds([candidate("variant-a", "prod-1")], new Map());

		expect(result).toEqual([]);
	});

	it("retourne un tableau vide sans candidat", () => {
		expect(selectDeactivatableVariantIds([], new Map())).toEqual([]);
	});
});

// ============================================================================
// Tests — assertPublicProductKeepsActiveVariant
// ============================================================================

describe("assertPublicProductKeepsActiveVariant", () => {
	it("does nothing when product is DRAFT (any VARIANT state allowed)", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "DRAFT",
			activeTotal: 1,
			activeAffected: 1, // last active VARIANT deactivated
		};
		expect(() => assertPublicProductKeepsActiveVariant(check)).not.toThrow();
	});

	it("does nothing when product is ARCHIVED", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "ARCHIVED",
			activeTotal: 2,
			activeAffected: 2,
		};
		expect(() => assertPublicProductKeepsActiveVariant(check)).not.toThrow();
	});

	it("passes when PUBLIC and at least 1 active VARIANT remains", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 3,
			activeAffected: 2, // 3 - 2 = 1 remains
		};
		expect(() => assertPublicProductKeepsActiveVariant(check)).not.toThrow();
	});

	it("passes when PUBLIC and many active VARIANTs remain", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 10,
			activeAffected: 1,
		};
		expect(() => assertPublicProductKeepsActiveVariant(check)).not.toThrow();
	});

	it("throws BusinessError when PUBLIC and deactivating last active VARIANT", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 1,
			activeAffected: 1, // 0 remains
		};
		expect(() => assertPublicProductKeepsActiveVariant(check)).toThrow(BusinessError);
	});

	it("throws BusinessError when PUBLIC and activeAffected > activeTotal (defensive)", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 2,
			activeAffected: 3,
		};
		expect(() => assertPublicProductKeepsActiveVariant(check)).toThrow(BusinessError);
	});

	it("uses default French error message", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 1,
			activeAffected: 1,
		};
		expect(() => assertPublicProductKeepsActiveVariant(check)).toThrow(
			/Impossible de desactiver la derniere variante active/,
		);
	});

	it("uses messageOverride when provided", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "PUBLIC",
			activeTotal: 1,
			activeAffected: 1,
		};
		expect(() => assertPublicProductKeepsActiveVariant(check, "Custom error")).toThrow(
			"Custom error",
		);
	});

	it("is a noop when activeTotal=0 and activeAffected=0 for non-PUBLIC", () => {
		const check: ProductPublicActiveCheck = {
			productStatus: "DRAFT",
			activeTotal: 0,
			activeAffected: 0,
		};
		expect(() => assertPublicProductKeepsActiveVariant(check)).not.toThrow();
	});
});
