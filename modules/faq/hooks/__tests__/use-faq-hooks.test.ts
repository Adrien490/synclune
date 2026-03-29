import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockDeleteFaqItem, mockReorderFaqItems } = vi.hoisted(() => ({
	mockDeleteFaqItem: vi.fn(),
	mockReorderFaqItems: vi.fn(),
}));

vi.mock("@/modules/faq/actions/delete-faq-item", () => ({
	deleteFaqItem: mockDeleteFaqItem,
}));

vi.mock("@/modules/faq/actions/reorder-faq-items", () => ({
	reorderFaqItems: mockReorderFaqItems,
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useDeleteFaqItem } from "../use-delete-faq-item";
import { useReorderFaqItems } from "../use-reorder-faq-items";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Erreur" };

afterEach(cleanup);

// ============================================================================
// useDeleteFaqItem
// ============================================================================

describe("useDeleteFaqItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteFaqItem.mockResolvedValue({ ...SUCCESS, message: "Element supprime" });
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useDeleteFaqItem());

		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("isPending is false on initial render", () => {
		const { result } = renderHook(() => useDeleteFaqItem());

		expect(result.current.isPending).toBe(false);
	});

	it("handle appends id to FormData and calls action", async () => {
		const { result } = renderHook(() => useDeleteFaqItem());

		await act(async () => {
			result.current.handle("faq-item-123");
		});

		expect(mockDeleteFaqItem).toHaveBeenCalledTimes(1);
		const formData = mockDeleteFaqItem.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("faq-item-123");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteFaqItem({ onSuccess }));

		await act(async () => {
			result.current.handle("faq-item-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("Element supprime");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteFaqItem.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteFaqItem({ onSuccess }));

		await act(async () => {
			result.current.handle("faq-item-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useDeleteFaqItem());

		await expect(
			act(async () => {
				result.current.handle("faq-item-123");
			}),
		).resolves.not.toThrow();
	});
});

// ============================================================================
// useReorderFaqItems
// ============================================================================

describe("useReorderFaqItems", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReorderFaqItems.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and reorder", () => {
		const { result } = renderHook(() => useReorderFaqItems());

		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.reorder).toBe("function");
	});

	it("isPending is false on initial render", () => {
		const { result } = renderHook(() => useReorderFaqItems());

		expect(result.current.isPending).toBe(false);
	});

	it("reorder sends items as JSON in FormData", async () => {
		const { result } = renderHook(() => useReorderFaqItems());
		const items = [
			{ id: "item-1", position: 0 },
			{ id: "item-2", position: 1 },
		];

		await act(async () => {
			result.current.reorder(items);
		});

		expect(mockReorderFaqItems).toHaveBeenCalledTimes(1);
		const formData = mockReorderFaqItems.mock.calls[0]?.[1] as FormData;
		expect(formData.get("items")).toBe(JSON.stringify(items));
	});

	it("reorder works with a single item", async () => {
		const { result } = renderHook(() => useReorderFaqItems());
		const items = [{ id: "item-1", position: 0 }];

		await act(async () => {
			result.current.reorder(items);
		});

		const formData = mockReorderFaqItems.mock.calls[0]?.[1] as FormData;
		expect(formData.get("items")).toBe(JSON.stringify(items));
	});

	it("reorder works with an empty items array", async () => {
		const { result } = renderHook(() => useReorderFaqItems());

		await act(async () => {
			result.current.reorder([]);
		});

		const formData = mockReorderFaqItems.mock.calls[0]?.[1] as FormData;
		expect(formData.get("items")).toBe(JSON.stringify([]));
	});
});
