import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// Mock Prisma client before importing schemas so CollectionStatus is available
// as plain string values without requiring a real DB connection.
vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
}));

// Mock collection constants to avoid pulling in Prisma SELECT objects that
// reference ProductStatus and other generated types.
vi.mock("../../constants/collection.constants", () => ({
	GET_COLLECTIONS_DEFAULT_PER_PAGE: 20,
	GET_COLLECTIONS_DEFAULT_SORT_BY: "name-ascending",
	GET_COLLECTIONS_MAX_RESULTS_PER_PAGE: 200,
	GET_COLLECTIONS_SORT_FIELDS: [
		"name-ascending",
		"name-descending",
		"created-ascending",
		"created-descending",
		"products-ascending",
		"products-descending",
	],
}));

// Mock shared pagination helpers that would otherwise require the full
// Next.js/Prisma environment at import time.
vi.mock("@/shared/constants/pagination", () => ({
	cursorSchema: z.string().optional(),
	directionSchema: z.enum(["forward", "backward"]).optional(),
}));

vi.mock("@/shared/utils/pagination", () => ({
	createPerPageSchema: (defaultVal: number, max: number) =>
		z.number().min(1).max(max).optional().default(defaultVal),
}));

import {
	createCollectionSchema,
	updateCollectionSchema,
	bulkDeleteCollectionsSchema,
	bulkArchiveCollectionsSchema,
	collectionFiltersSchema,
	setFeaturedProductSchema,
} from "../collection.schemas";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A valid cuid2 string accepted by z.cuid2() (26 lowercase alphanumeric chars
// starting with a letter, which is the cuid2 format).
const VALID_CUID = "clh1234567890abcdefghijklm";

// Generate an array of `count` valid cuid2 strings (each slightly different).
function makeCuids(count: number): string[] {
	return Array.from({ length: count }, (_, i) => {
		// Pad index to keep total length at 26 characters.
		const suffix = String(i).padStart(10, "0");
		return `clh${suffix}abcdefghijklm`;
	});
}

// ---------------------------------------------------------------------------
// createCollectionSchema
// ---------------------------------------------------------------------------

describe("createCollectionSchema", () => {
	describe("name field", () => {
		it("accepts a valid name", () => {
			const result = createCollectionSchema.safeParse({ name: "Bracelets" });
			expect(result.success).toBe(true);
		});

		it("trims leading and trailing whitespace from name", () => {
			const result = createCollectionSchema.safeParse({ name: "  Colliers  " });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe("Colliers");
			}
		});

		it("rejects a whitespace-only name after trimming", () => {
			const result = createCollectionSchema.safeParse({ name: "   " });
			expect(result.success).toBe(false);
		});

		it("rejects an empty name", () => {
			const result = createCollectionSchema.safeParse({ name: "" });
			expect(result.success).toBe(false);
		});

		it("accepts a name at exactly 100 characters", () => {
			const result = createCollectionSchema.safeParse({ name: "a".repeat(100) });
			expect(result.success).toBe(true);
		});

		it("rejects a name longer than 100 characters", () => {
			const result = createCollectionSchema.safeParse({ name: "a".repeat(101) });
			expect(result.success).toBe(false);
		});

		it("rejects when name is missing", () => {
			const result = createCollectionSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe("description field", () => {
		it("accepts a valid description", () => {
			const result = createCollectionSchema.safeParse({
				name: "Bagues",
				description: "Notre collection de bagues artisanales.",
			});
			expect(result.success).toBe(true);
		});

		it("accepts description at exactly 1000 characters", () => {
			const result = createCollectionSchema.safeParse({
				name: "Bagues",
				description: "a".repeat(1000),
			});
			expect(result.success).toBe(true);
		});

		it("rejects description longer than 1000 characters", () => {
			const result = createCollectionSchema.safeParse({
				name: "Bagues",
				description: "a".repeat(1001),
			});
			expect(result.success).toBe(false);
		});

		it("accepts null description", () => {
			const result = createCollectionSchema.safeParse({
				name: "Bagues",
				description: null,
			});
			expect(result.success).toBe(true);
		});

		it("accepts when description is omitted", () => {
			const result = createCollectionSchema.safeParse({ name: "Bagues" });
			expect(result.success).toBe(true);
		});
	});

	describe("status field", () => {
		it("defaults to DRAFT when status is omitted", () => {
			const result = createCollectionSchema.safeParse({ name: "Pendentifs" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe("DRAFT");
			}
		});

		it("accepts PUBLIC status", () => {
			const result = createCollectionSchema.safeParse({
				name: "Pendentifs",
				status: "PUBLIC",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe("PUBLIC");
			}
		});

		it("accepts DRAFT status explicitly", () => {
			const result = createCollectionSchema.safeParse({
				name: "Pendentifs",
				status: "DRAFT",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe("DRAFT");
			}
		});

		it("accepts ARCHIVED status", () => {
			const result = createCollectionSchema.safeParse({
				name: "Pendentifs",
				status: "ARCHIVED",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe("ARCHIVED");
			}
		});

		it("rejects an invalid status value", () => {
			const result = createCollectionSchema.safeParse({
				name: "Pendentifs",
				status: "PUBLISHED",
			});
			expect(result.success).toBe(false);
		});
	});
});

// ---------------------------------------------------------------------------
// updateCollectionSchema
// ---------------------------------------------------------------------------

describe("updateCollectionSchema", () => {
	const baseValid = {
		id: VALID_CUID,
		name: "Colliers dorés",
		status: "PUBLIC",
	};

	describe("id field", () => {
		it("accepts a valid cuid2 id", () => {
			const result = updateCollectionSchema.safeParse(baseValid);
			expect(result.success).toBe(true);
		});

		it("rejects a plain non-cuid2 string for id", () => {
			const result = updateCollectionSchema.safeParse({ ...baseValid, id: "not-a-cuid2" });
			expect(result.success).toBe(false);
		});

		it("rejects an empty id string", () => {
			const result = updateCollectionSchema.safeParse({ ...baseValid, id: "" });
			expect(result.success).toBe(false);
		});

		it("rejects when id is missing", () => {
			const { id: _id, ...withoutId } = baseValid;
			const result = updateCollectionSchema.safeParse(withoutId);
			expect(result.success).toBe(false);
		});
	});

	describe("name field", () => {
		it("trims leading and trailing whitespace from name", () => {
			const result = updateCollectionSchema.safeParse({ ...baseValid, name: "  Bagues  " });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe("Bagues");
			}
		});

		it("rejects a whitespace-only name after trimming", () => {
			const result = updateCollectionSchema.safeParse({ ...baseValid, name: "   " });
			expect(result.success).toBe(false);
		});

		it("rejects a name longer than 100 characters", () => {
			const result = updateCollectionSchema.safeParse({
				...baseValid,
				name: "a".repeat(101),
			});
			expect(result.success).toBe(false);
		});
	});

	describe("description field", () => {
		it("accepts a valid description", () => {
			const result = updateCollectionSchema.safeParse({
				...baseValid,
				description: "Description de la collection.",
			});
			expect(result.success).toBe(true);
		});

		it("accepts null description", () => {
			const result = updateCollectionSchema.safeParse({
				...baseValid,
				description: null,
			});
			expect(result.success).toBe(true);
		});

		it("accepts omitted description", () => {
			const result = updateCollectionSchema.safeParse(baseValid);
			expect(result.success).toBe(true);
		});

		it("rejects description longer than 1000 characters", () => {
			const result = updateCollectionSchema.safeParse({
				...baseValid,
				description: "a".repeat(1001),
			});
			expect(result.success).toBe(false);
		});
	});

	describe("status field", () => {
		it("accepts PUBLIC", () => {
			const result = updateCollectionSchema.safeParse({ ...baseValid, status: "PUBLIC" });
			expect(result.success).toBe(true);
		});

		it("accepts DRAFT", () => {
			const result = updateCollectionSchema.safeParse({ ...baseValid, status: "DRAFT" });
			expect(result.success).toBe(true);
		});

		it("accepts ARCHIVED", () => {
			const result = updateCollectionSchema.safeParse({ ...baseValid, status: "ARCHIVED" });
			expect(result.success).toBe(true);
		});

		it("rejects an invalid status value", () => {
			const result = updateCollectionSchema.safeParse({ ...baseValid, status: "HIDDEN" });
			expect(result.success).toBe(false);
		});

		it("rejects when status is omitted (required, no default)", () => {
			const { status: _status, ...withoutStatus } = baseValid;
			const result = updateCollectionSchema.safeParse(withoutStatus);
			expect(result.success).toBe(false);
		});
	});
});

// ---------------------------------------------------------------------------
// bulkDeleteCollectionsSchema
// ---------------------------------------------------------------------------

describe("bulkDeleteCollectionsSchema", () => {
	it("accepts an array with a single valid cuid2", () => {
		const result = bulkDeleteCollectionsSchema.safeParse({ ids: [VALID_CUID] });
		expect(result.success).toBe(true);
	});

	it("accepts an array of exactly 200 valid cuid2s", () => {
		const result = bulkDeleteCollectionsSchema.safeParse({ ids: makeCuids(200) });
		expect(result.success).toBe(true);
	});

	it("rejects an empty ids array (min 1)", () => {
		const result = bulkDeleteCollectionsSchema.safeParse({ ids: [] });
		expect(result.success).toBe(false);
	});

	it("rejects an array with 201 ids (exceeds max of 200)", () => {
		const result = bulkDeleteCollectionsSchema.safeParse({ ids: makeCuids(201) });
		expect(result.success).toBe(false);
	});

	it("rejects when any id is not a valid cuid2", () => {
		const result = bulkDeleteCollectionsSchema.safeParse({
			ids: [VALID_CUID, "not-a-cuid2"],
		});
		expect(result.success).toBe(false);
	});

	it("rejects when ids field is missing", () => {
		const result = bulkDeleteCollectionsSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// bulkArchiveCollectionsSchema
// ---------------------------------------------------------------------------

describe("bulkArchiveCollectionsSchema", () => {
	const baseValid = {
		collectionIds: [VALID_CUID],
		targetStatus: "ARCHIVED",
	};

	describe("collectionIds field", () => {
		it("accepts an array with a single valid cuid2", () => {
			const result = bulkArchiveCollectionsSchema.safeParse(baseValid);
			expect(result.success).toBe(true);
		});

		it("accepts an array of exactly 200 valid cuid2s", () => {
			const result = bulkArchiveCollectionsSchema.safeParse({
				...baseValid,
				collectionIds: makeCuids(200),
			});
			expect(result.success).toBe(true);
		});

		it("rejects an empty collectionIds array (min 1)", () => {
			const result = bulkArchiveCollectionsSchema.safeParse({
				...baseValid,
				collectionIds: [],
			});
			expect(result.success).toBe(false);
		});

		it("rejects an array with 201 ids (exceeds max of 200)", () => {
			const result = bulkArchiveCollectionsSchema.safeParse({
				...baseValid,
				collectionIds: makeCuids(201),
			});
			expect(result.success).toBe(false);
		});

		it("rejects when any collectionId is not a valid cuid2", () => {
			const result = bulkArchiveCollectionsSchema.safeParse({
				...baseValid,
				collectionIds: [VALID_CUID, "invalid-id"],
			});
			expect(result.success).toBe(false);
		});

		it("rejects when collectionIds field is missing", () => {
			const { collectionIds: _ids, ...withoutIds } = baseValid;
			const result = bulkArchiveCollectionsSchema.safeParse(withoutIds);
			expect(result.success).toBe(false);
		});
	});

	describe("targetStatus field", () => {
		it("accepts ARCHIVED as targetStatus", () => {
			const result = bulkArchiveCollectionsSchema.safeParse({
				...baseValid,
				targetStatus: "ARCHIVED",
			});
			expect(result.success).toBe(true);
		});

		it("accepts PUBLIC as targetStatus", () => {
			const result = bulkArchiveCollectionsSchema.safeParse({
				...baseValid,
				targetStatus: "PUBLIC",
			});
			expect(result.success).toBe(true);
		});

		it("accepts DRAFT as targetStatus", () => {
			const result = bulkArchiveCollectionsSchema.safeParse({
				...baseValid,
				targetStatus: "DRAFT",
			});
			expect(result.success).toBe(true);
		});

		it("rejects an invalid targetStatus value", () => {
			const result = bulkArchiveCollectionsSchema.safeParse({
				...baseValid,
				targetStatus: "HIDDEN",
			});
			expect(result.success).toBe(false);
		});

		it("rejects when targetStatus is missing", () => {
			const { targetStatus: _status, ...withoutStatus } = baseValid;
			const result = bulkArchiveCollectionsSchema.safeParse(withoutStatus);
			expect(result.success).toBe(false);
		});
	});
});

// ---------------------------------------------------------------------------
// collectionFiltersSchema
// ---------------------------------------------------------------------------

describe("collectionFiltersSchema", () => {
	describe("hasProducts field", () => {
		it("accepts boolean true and keeps it as true", () => {
			const result = collectionFiltersSchema.safeParse({ hasProducts: true });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.hasProducts).toBe(true);
			}
		});

		it("accepts boolean false and keeps it as false", () => {
			const result = collectionFiltersSchema.safeParse({ hasProducts: false });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.hasProducts).toBe(false);
			}
		});

		it('transforms string "true" to boolean true', () => {
			const result = collectionFiltersSchema.safeParse({ hasProducts: "true" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.hasProducts).toBe(true);
			}
		});

		it('transforms string "false" to boolean false', () => {
			const result = collectionFiltersSchema.safeParse({ hasProducts: "false" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.hasProducts).toBe(false);
			}
		});

		it("accepts omitted hasProducts (optional)", () => {
			const result = collectionFiltersSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it("transforms undefined hasProducts to undefined", () => {
			const result = collectionFiltersSchema.safeParse({ hasProducts: undefined });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.hasProducts).toBeUndefined();
			}
		});

		it("rejects a non-boolean, non-string-boolean value for hasProducts", () => {
			const result = collectionFiltersSchema.safeParse({ hasProducts: "yes" });
			expect(result.success).toBe(false);
		});
	});

	describe("status field", () => {
		it("accepts a single CollectionStatus value", () => {
			const result = collectionFiltersSchema.safeParse({ status: "PUBLIC" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe("PUBLIC");
			}
		});

		it("accepts an array of CollectionStatus values", () => {
			const result = collectionFiltersSchema.safeParse({
				status: ["PUBLIC", "DRAFT"],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toEqual(["PUBLIC", "DRAFT"]);
			}
		});

		it("accepts all three statuses in an array", () => {
			const result = collectionFiltersSchema.safeParse({
				status: ["PUBLIC", "DRAFT", "ARCHIVED"],
			});
			expect(result.success).toBe(true);
		});

		it("accepts omitted status (optional)", () => {
			const result = collectionFiltersSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBeUndefined();
			}
		});

		it("rejects an invalid status string", () => {
			const result = collectionFiltersSchema.safeParse({ status: "HIDDEN" });
			expect(result.success).toBe(false);
		});

		it("rejects an array containing an invalid status", () => {
			const result = collectionFiltersSchema.safeParse({
				status: ["PUBLIC", "INVALID"],
			});
			expect(result.success).toBe(false);
		});
	});

	describe("combined fields", () => {
		it("accepts hasProducts and status together", () => {
			const result = collectionFiltersSchema.safeParse({
				hasProducts: "true",
				status: "DRAFT",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.hasProducts).toBe(true);
				expect(result.data.status).toBe("DRAFT");
			}
		});

		it("accepts an empty object (all fields optional)", () => {
			const result = collectionFiltersSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});
});

// ---------------------------------------------------------------------------
// setFeaturedProductSchema
// ---------------------------------------------------------------------------

describe("setFeaturedProductSchema", () => {
	const baseValid = {
		collectionId: VALID_CUID,
		productId: VALID_CUID,
	};

	it("accepts valid cuid2 values for both ids", () => {
		const result = setFeaturedProductSchema.safeParse(baseValid);
		expect(result.success).toBe(true);
	});

	it("rejects an invalid collectionId", () => {
		const result = setFeaturedProductSchema.safeParse({
			...baseValid,
			collectionId: "not-a-cuid2",
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid productId", () => {
		const result = setFeaturedProductSchema.safeParse({
			...baseValid,
			productId: "not-a-cuid2",
		});
		expect(result.success).toBe(false);
	});

	it("rejects an empty collectionId string", () => {
		const result = setFeaturedProductSchema.safeParse({
			...baseValid,
			collectionId: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects an empty productId string", () => {
		const result = setFeaturedProductSchema.safeParse({
			...baseValid,
			productId: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects when collectionId is missing", () => {
		const { collectionId: _cid, ...withoutCollectionId } = baseValid;
		const result = setFeaturedProductSchema.safeParse(withoutCollectionId);
		expect(result.success).toBe(false);
	});

	it("rejects when productId is missing", () => {
		const { productId: _pid, ...withoutProductId } = baseValid;
		const result = setFeaturedProductSchema.safeParse(withoutProductId);
		expect(result.success).toBe(false);
	});

	it("rejects when both ids are missing", () => {
		const result = setFeaturedProductSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it("preserves both id values in parsed output", () => {
		const collectionId = VALID_CUID;
		const productId = "clh9999999990abcdefghijklm";
		const result = setFeaturedProductSchema.safeParse({ collectionId, productId });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.collectionId).toBe(collectionId);
			expect(result.data.productId).toBe(productId);
		}
	});
});
