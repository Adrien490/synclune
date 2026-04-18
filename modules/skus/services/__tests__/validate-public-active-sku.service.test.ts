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
	assertBulkPublicProductsKeepActiveSku,
	type ProductPublicActiveCheck,
	type BulkProductActiveBreakdown,
} from "../validate-public-active-sku.service";
import { BusinessError } from "@/shared/lib/actions";

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

// ============================================================================
// Tests — assertBulkPublicProductsKeepActiveSku
// ============================================================================

describe("assertBulkPublicProductsKeepActiveSku", () => {
	it("does nothing on empty breakdown", () => {
		const breakdown: BulkProductActiveBreakdown = new Map();
		expect(() => assertBulkPublicProductsKeepActiveSku(breakdown)).not.toThrow();
	});

	it("passes when every PUBLIC product keeps at least 1 SKU", () => {
		const breakdown: BulkProductActiveBreakdown = new Map([
			["prod-1", { productStatus: "PUBLIC", activeTotal: 3, activeAffected: 1 }],
			["prod-2", { productStatus: "PUBLIC", activeTotal: 5, activeAffected: 2 }],
			["prod-3", { productStatus: "DRAFT", activeTotal: 1, activeAffected: 1 }],
		]);
		expect(() => assertBulkPublicProductsKeepActiveSku(breakdown)).not.toThrow();
	});

	it("throws for the first PUBLIC product that would end up without active SKU", () => {
		const breakdown: BulkProductActiveBreakdown = new Map([
			["prod-ok", { productStatus: "PUBLIC", activeTotal: 3, activeAffected: 1 }],
			["prod-broken", { productStatus: "PUBLIC", activeTotal: 1, activeAffected: 1 }],
			["prod-never-checked", { productStatus: "PUBLIC", activeTotal: 1, activeAffected: 1 }],
		]);
		expect(() => assertBulkPublicProductsKeepActiveSku(breakdown)).toThrow(BusinessError);
	});

	it("ignores DRAFT / ARCHIVED products even when they lose all active SKUs", () => {
		const breakdown: BulkProductActiveBreakdown = new Map([
			["prod-draft", { productStatus: "DRAFT", activeTotal: 1, activeAffected: 1 }],
			["prod-archived", { productStatus: "ARCHIVED", activeTotal: 1, activeAffected: 1 }],
		]);
		expect(() => assertBulkPublicProductsKeepActiveSku(breakdown)).not.toThrow();
	});

	it("does not throw when activeAffected = 0 on PUBLIC (no change)", () => {
		const breakdown: BulkProductActiveBreakdown = new Map([
			["prod-1", { productStatus: "PUBLIC", activeTotal: 1, activeAffected: 0 }],
		]);
		expect(() => assertBulkPublicProductsKeepActiveSku(breakdown)).not.toThrow();
	});
});
