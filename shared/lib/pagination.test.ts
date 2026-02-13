import { describe, expect, it } from "vitest";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";

// ─── buildCursorPagination ──────────────────────────────────────────

describe("buildCursorPagination", () => {
	it("returns take+1 with no cursor and no skip for first page", () => {
		const result = buildCursorPagination({ take: 20 });
		expect(result).toEqual({ take: 21 });
		expect(result.skip).toBeUndefined();
		expect(result.cursor).toBeUndefined();
	});

	it("returns take+1, skip=1, and cursor for forward pagination with cursor", () => {
		const result = buildCursorPagination({
			take: 20,
			cursor: "abc-123",
			direction: "forward",
		});
		expect(result).toEqual({
			take: 21,
			skip: 1,
			cursor: { id: "abc-123" },
		});
	});

	it("returns -(take+1), skip=1, and cursor for backward pagination", () => {
		const result = buildCursorPagination({
			take: 20,
			cursor: "xyz-789",
			direction: "backward",
		});
		expect(result).toEqual({
			take: -21,
			skip: 1,
			cursor: { id: "xyz-789" },
		});
	});

	it("defaults to forward direction when not specified but cursor is present", () => {
		const result = buildCursorPagination({
			take: 20,
			cursor: "def-456",
		});
		expect(result).toEqual({
			take: 21,
			skip: 1,
			cursor: { id: "def-456" },
		});
	});

	it("throws error when take is zero", () => {
		expect(() => buildCursorPagination({ take: 0 })).toThrow(
			"take must be positive, got 0",
		);
	});

	it("throws error when take is negative", () => {
		expect(() => buildCursorPagination({ take: -5 })).toThrow(
			"take must be positive, got -5",
		);
	});

	it("handles various take values correctly", () => {
		expect(buildCursorPagination({ take: 10 }).take).toBe(11);
		expect(buildCursorPagination({ take: 50 }).take).toBe(51);
		expect(buildCursorPagination({ take: 100 }).take).toBe(101);
		expect(
			buildCursorPagination({ take: 10, cursor: "id", direction: "backward" })
				.take,
		).toBe(-11);
	});
});

// ─── processCursorResults ──────────────────────────────────────────

describe("processCursorResults", () => {
	// Helper to create mock items
	const createItems = (count: number, startId = 1): Array<{ id: string }> =>
		Array.from({ length: count }, (_, i) => ({ id: `item-${startId + i}` }));

	describe("validation and edge cases", () => {
		it("throws error when requestedTake is zero", () => {
			expect(() => processCursorResults([], 0)).toThrow(
				"requestedTake must be positive, got 0",
			);
		});

		it("throws error when requestedTake is negative", () => {
			expect(() => processCursorResults([], -5)).toThrow(
				"requestedTake must be positive, got -5",
			);
		});

		it("returns empty result for empty items array", () => {
			const result = processCursorResults([], 20);
			expect(result.items).toEqual([]);
			expect(result.pagination).toEqual({
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			});
		});
	});

	describe("forward pagination (first page, no cursor)", () => {
		it("returns all items when items.length <= take", () => {
			const items = createItems(20);
			const result = processCursorResults(items, 20, "forward");

			expect(result.items).toHaveLength(20);
			expect(result.items).toEqual(items);
			expect(result.pagination).toEqual({
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			});
		});

		it("slices last item when items.length > take", () => {
			const items = createItems(21); // Requested 20, got 21 (has more)
			const result = processCursorResults(items, 20, "forward");

			expect(result.items).toHaveLength(20);
			expect(result.items).toEqual(items.slice(0, -1));
			expect(result.pagination).toEqual({
				nextCursor: "item-20", // Last item of sliced results
				prevCursor: null, // No previous page (first page)
				hasNextPage: true,
				hasPreviousPage: false,
			});
		});

		it("handles single item result correctly", () => {
			const items = createItems(1);
			const result = processCursorResults(items, 1, "forward");

			expect(result.items).toHaveLength(1);
			expect(result.pagination).toEqual({
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			});
		});

		it("detects next page when exactly take+1 items", () => {
			const items = createItems(11);
			const result = processCursorResults(items, 10, "forward");

			expect(result.items).toHaveLength(10);
			expect(result.pagination.hasNextPage).toBe(true);
			expect(result.pagination.nextCursor).toBe("item-10");
		});
	});

	describe("forward pagination (with cursor)", () => {
		it("returns all items with prevCursor when items.length <= take", () => {
			const items = createItems(20, 21); // Items 21-40
			const result = processCursorResults(items, 20, "forward", "item-20");

			expect(result.items).toHaveLength(20);
			expect(result.items).toEqual(items);
			expect(result.pagination).toEqual({
				nextCursor: null, // No more pages
				prevCursor: "item-21", // First item of current page
				hasNextPage: false,
				hasPreviousPage: true, // Has cursor = has previous
			});
		});

		it("slices last item and sets both cursors when items.length > take", () => {
			const items = createItems(21, 21); // Items 21-41, requested 20
			const result = processCursorResults(items, 20, "forward", "item-20");

			expect(result.items).toHaveLength(20);
			expect(result.items).toEqual(items.slice(0, -1));
			expect(result.pagination).toEqual({
				nextCursor: "item-40", // Last of 20 items
				prevCursor: "item-21", // First of 20 items
				hasNextPage: true,
				hasPreviousPage: true,
			});
		});

		it("handles last page correctly (items.length < take)", () => {
			const items = createItems(15, 81); // Items 81-95, requested 20
			const result = processCursorResults(items, 20, "forward", "item-80");

			expect(result.items).toHaveLength(15);
			expect(result.pagination).toEqual({
				nextCursor: null,
				prevCursor: "item-81",
				hasNextPage: false,
				hasPreviousPage: true,
			});
		});
	});

	describe("backward pagination", () => {
		it("returns all items when items.length <= take", () => {
			const items = createItems(20, 1); // Items 1-20 (before cursor 21)
			const result = processCursorResults(items, 20, "backward", "item-21");

			expect(result.items).toHaveLength(20);
			expect(result.items).toEqual(items);
			expect(result.pagination).toEqual({
				nextCursor: "item-20", // Last item (for going forward)
				prevCursor: null, // No more before
				hasNextPage: true, // Can go forward (has cursor)
				hasPreviousPage: false, // No more items before
			});
		});

		it("slices first item when items.length > take (has more before)", () => {
			const items = createItems(21, 1); // Items 1-21 (before cursor 22)
			const result = processCursorResults(items, 20, "backward", "item-22");

			expect(result.items).toHaveLength(20);
			expect(result.items).toEqual(items.slice(1)); // Remove first (item-1)
			expect(result.pagination).toEqual({
				nextCursor: "item-21", // Last item (for going forward)
				prevCursor: "item-2", // First of sliced items (for continuing backward)
				hasNextPage: true, // Can go forward (has cursor)
				hasPreviousPage: true, // Has more before (hasMore)
			});
		});

		it("handles single item result correctly", () => {
			const items = createItems(1, 10);
			const result = processCursorResults(items, 1, "backward", "item-11");

			expect(result.items).toHaveLength(1);
			expect(result.pagination).toEqual({
				nextCursor: "item-10",
				prevCursor: null,
				hasNextPage: true,
				hasPreviousPage: false,
			});
		});

		it("detects previous page when exactly take+1 items", () => {
			const items = createItems(11, 10); // Items 10-20 (before cursor 21)
			const result = processCursorResults(items, 10, "backward", "item-21");

			expect(result.items).toHaveLength(10);
			expect(result.items).toEqual(items.slice(1)); // Items 11-20
			expect(result.pagination.hasPreviousPage).toBe(true);
			expect(result.pagination.prevCursor).toBe("item-11");
		});

		it("handles edge case with 2 items when take=1", () => {
			const items = createItems(2, 5); // Items 5-6 (before cursor 7)
			const result = processCursorResults(items, 1, "backward", "item-7");

			expect(result.items).toHaveLength(1);
			expect(result.items[0].id).toBe("item-6"); // Sliced first item
			expect(result.pagination).toEqual({
				nextCursor: "item-6",
				prevCursor: "item-6",
				hasNextPage: true,
				hasPreviousPage: true,
			});
		});
	});

	describe("cursor ID verification", () => {
		it("returns correct nextCursor and prevCursor IDs for forward with cursor", () => {
			const items = createItems(11, 50); // Items 50-60
			const result = processCursorResults(items, 10, "forward", "item-49");

			expect(result.items[0].id).toBe("item-50"); // First item
			expect(result.items[result.items.length - 1].id).toBe("item-59"); // Last item
			expect(result.pagination.prevCursor).toBe("item-50"); // First item ID
			expect(result.pagination.nextCursor).toBe("item-59"); // Last item ID
		});

		it("returns correct nextCursor and prevCursor IDs for backward with cursor", () => {
			const items = createItems(11, 40); // Items 40-50
			const result = processCursorResults(items, 10, "backward", "item-51");

			expect(result.items).toHaveLength(10);
			expect(result.items[0].id).toBe("item-41"); // First after slice
			expect(result.items[result.items.length - 1].id).toBe("item-50"); // Last
			expect(result.pagination.prevCursor).toBe("item-41"); // First item ID
			expect(result.pagination.nextCursor).toBe("item-50"); // Last item ID
		});

		it("ensures nextCursor is always last item ID (forward)", () => {
			const items = createItems(5, 100);
			const result = processCursorResults(items, 10, "forward", "item-99");

			expect(result.pagination.nextCursor).toBe(null);
			expect(result.pagination.prevCursor).toBe("item-100");
		});

		it("ensures prevCursor is always first item ID (backward)", () => {
			const items = createItems(5, 1);
			const result = processCursorResults(items, 10, "backward", "item-6");

			expect(result.pagination.prevCursor).toBe(null);
			expect(result.pagination.nextCursor).toBe("item-5");
		});
	});

	describe("default direction parameter", () => {
		it("defaults to forward when direction is not specified", () => {
			const items = createItems(11);
			const resultWithoutDirection = processCursorResults(items, 10);
			const resultWithForward = processCursorResults(items, 10, "forward");

			expect(resultWithoutDirection).toEqual(resultWithForward);
		});

		it("defaults to forward when currentCursor is provided but direction is omitted", () => {
			const items = createItems(11, 21);
			const resultWithoutDirection = processCursorResults(
				items,
				10,
				undefined,
				"item-20",
			);
			const resultWithForward = processCursorResults(
				items,
				10,
				"forward",
				"item-20",
			);

			expect(resultWithoutDirection).toEqual(resultWithForward);
		});
	});

	describe("realistic pagination scenarios", () => {
		it("simulates paginating through 100 items with take=20 (forward)", () => {
			// Page 1: items 1-20
			const page1Items = createItems(21, 1);
			const page1 = processCursorResults(page1Items, 20, "forward");
			expect(page1.items).toHaveLength(20);
			expect(page1.pagination.hasNextPage).toBe(true);
			expect(page1.pagination.hasPreviousPage).toBe(false);
			expect(page1.pagination.nextCursor).toBe("item-20");

			// Page 2: items 21-40
			const page2Items = createItems(21, 21);
			const page2 = processCursorResults(page2Items, 20, "forward", "item-20");
			expect(page2.items).toHaveLength(20);
			expect(page2.pagination.hasNextPage).toBe(true);
			expect(page2.pagination.hasPreviousPage).toBe(true);
			expect(page2.pagination.nextCursor).toBe("item-40");
			expect(page2.pagination.prevCursor).toBe("item-21");

			// Last page: items 81-100
			const lastPageItems = createItems(20, 81);
			const lastPage = processCursorResults(
				lastPageItems,
				20,
				"forward",
				"item-80",
			);
			expect(lastPage.items).toHaveLength(20);
			expect(lastPage.pagination.hasNextPage).toBe(false);
			expect(lastPage.pagination.hasPreviousPage).toBe(true);
			expect(lastPage.pagination.nextCursor).toBe(null);
		});

		it("simulates going backward from end to beginning", () => {
			// From item-100, go backward to items 81-99 (19 items)
			const page1Items = createItems(19, 81);
			const page1 = processCursorResults(page1Items, 19, "backward", "item-100");
			expect(page1.items).toHaveLength(19); // All items (no slice)
			expect(page1.pagination.hasPreviousPage).toBe(false); // No more before
			expect(page1.pagination.prevCursor).toBe(null);
			expect(page1.pagination.hasNextPage).toBe(true); // Can go forward
			expect(page1.pagination.nextCursor).toBe("item-99");

			// From item-80, go backward to items 61-79 (19 items)
			const page2Items = createItems(19, 61);
			const page2 = processCursorResults(page2Items, 19, "backward", "item-80");
			expect(page2.items).toHaveLength(19);
			expect(page2.pagination.hasPreviousPage).toBe(false);
			expect(page2.pagination.prevCursor).toBe(null);
			expect(page2.pagination.hasNextPage).toBe(true);
			expect(page2.pagination.nextCursor).toBe("item-79");
		});
	});
});
