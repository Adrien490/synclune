import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCreateRefund } = vi.hoisted(() => ({
	mockCreateRefund: vi.fn(),
}));

vi.mock("@/modules/refunds/actions/create-refund", () => ({
	createRefund: mockCreateRefund,
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

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		store: { subscribe: vi.fn(), getState: vi.fn(() => ({ errors: [] })) },
	}),
}));

vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: vi.fn((base: unknown) => base),
	useStore: vi.fn((_, selector) => {
		// Return sensible defaults per selector
		const fakeState = {
			errors: [],
			values: {
				reason: "CUSTOMER_REQUEST",
				items: [],
			},
		};
		return selector ? selector(fakeState) : [];
	}),
	useTransform: vi.fn((fn: unknown) => fn),
}));

// Mock Prisma enum used by the hook
vi.mock("@/app/generated/prisma/enums", () => ({
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		WRONG_ITEM: "WRONG_ITEM",
		DEFECTIVE: "DEFECTIVE",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
}));

// Mock the refund services
vi.mock("@/modules/refunds/services/refund-restock.service", () => ({
	shouldRestockByDefault: vi.fn(
		(reason: string) => reason === "CUSTOMER_REQUEST" || reason === "WRONG_ITEM",
	),
}));

vi.mock("@/modules/refunds/services/refund-calculation.service", () => ({
	getAvailableQuantity: vi.fn((item: { quantity: number; refundItems: { quantity: number }[] }) => {
		const refunded = item.refundItems.reduce(
			(s: number, r: { quantity: number }) => s + r.quantity,
			0,
		);
		return item.quantity - refunded;
	}),
	initializeRefundItems: vi.fn(() => []),
	getSelectedItems: vi.fn((items: unknown[]) =>
		(items as Array<{ selected: boolean; quantity: number }>).filter(
			(i) => i.selected && i.quantity > 0,
		),
	),
	calculateRefundAmount: vi.fn(() => 0),
	formatItemsForAction: vi.fn((items: unknown[]) => items),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
	useCreateRefundForm,
	getDefaultRestock,
	getAvailableQuantity,
} from "../use-create-refund-form";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Remboursement créé" };
const ERROR = { status: "error" as const, message: "Erreur" };

function makeOrderItem(
	overrides: Partial<{
		id: string;
		skuId: string;
		quantity: number;
		price: number;
		productTitle: string;
		productImageUrl: string | null;
		skuColor: string | null;
		skuMaterial: string | null;
		skuSize: string | null;
		skuImageUrl: string | null;
		refundItems: { quantity: number }[];
	}> = {},
) {
	return {
		id: "item-1",
		skuId: "sku-1",
		quantity: 2,
		price: 5000,
		productTitle: "Bracelet",
		productImageUrl: null,
		skuColor: null,
		skuMaterial: null,
		skuSize: null,
		skuImageUrl: null,
		refundItems: [] as { quantity: number }[],
		...overrides,
	};
}

const DEFAULT_OPTIONS = {
	orderId: "order-1",
	orderItems: [makeOrderItem()],
};

// ============================================================================
// Tests
// ============================================================================

describe("useCreateRefundForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateRefund.mockResolvedValue(SUCCESS);
	});

	// ──────────── Return shape ────────────

	it("returns form, state, action, isPending, and formErrors", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(Array.isArray(result.current.formErrors)).toBe(true);
	});

	it("returns computed values: reason, items, selectedItems, totalAmount, itemsForAction", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		expect(result.current).toHaveProperty("reason");
		expect(result.current).toHaveProperty("items");
		expect(result.current).toHaveProperty("selectedItems");
		expect(result.current).toHaveProperty("totalAmount");
		expect(result.current).toHaveProperty("itemsForAction");
	});

	it("returns helper functions: getDefaultRestock and getAvailableQuantity", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		expect(typeof result.current.getDefaultRestock).toBe("function");
		expect(typeof result.current.getAvailableQuantity).toBe("function");
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		expect(result.current.isPending).toBe(false);
	});

	// ──────────── Action state transitions ────────────

	it("state is undefined before any action is dispatched", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		expect(result.current.state).toBeUndefined();
	});

	it("state is updated to success after action completes", async () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});

	it("state is updated to error after failed action", async () => {
		mockCreateRefund.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});

	// ──────────── onSuccess callback ────────────

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateRefundForm({ ...DEFAULT_OPTIONS, onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Remboursement créé");
	});

	it("does not call onSuccess when action fails", async () => {
		mockCreateRefund.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateRefundForm({ ...DEFAULT_OPTIONS, onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when result has no message property", async () => {
		mockCreateRefund.mockResolvedValue({ status: "success" as const });
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateRefundForm({ ...DEFAULT_OPTIONS, onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	// ──────────── Calculated values ────────────

	it("selectedItems is derived from items via getSelectedItems service", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		// items from useStore returns [], so selectedItems should be []
		expect(Array.isArray(result.current.selectedItems)).toBe(true);
	});

	it("totalAmount is a number", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		expect(typeof result.current.totalAmount).toBe("number");
	});

	it("itemsForAction is an array", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		expect(Array.isArray(result.current.itemsForAction)).toBe(true);
	});

	// ──────────── Re-exported helpers ────────────

	it("getDefaultRestock returns true for CUSTOMER_REQUEST", () => {
		expect(getDefaultRestock("CUSTOMER_REQUEST" as Parameters<typeof getDefaultRestock>[0])).toBe(
			true,
		);
	});

	it("getDefaultRestock returns true for WRONG_ITEM", () => {
		expect(getDefaultRestock("WRONG_ITEM" as Parameters<typeof getDefaultRestock>[0])).toBe(true);
	});

	it("getDefaultRestock returns false for DEFECTIVE", () => {
		expect(getDefaultRestock("DEFECTIVE" as Parameters<typeof getDefaultRestock>[0])).toBe(false);
	});

	it("getDefaultRestock returns false for FRAUD", () => {
		expect(getDefaultRestock("FRAUD" as Parameters<typeof getDefaultRestock>[0])).toBe(false);
	});

	it("getAvailableQuantity calculates remaining quantity", () => {
		const item = {
			id: "item-1",
			quantity: 3,
			price: 5000,
			refundItems: [{ quantity: 1 }],
		};

		expect(getAvailableQuantity(item)).toBe(2);
	});

	it("getAvailableQuantity returns full quantity when nothing refunded yet", () => {
		const item = {
			id: "item-1",
			quantity: 5,
			price: 5000,
			refundItems: [],
		};

		expect(getAvailableQuantity(item)).toBe(5);
	});

	it("getAvailableQuantity returns 0 when fully refunded", () => {
		const item = {
			id: "item-1",
			quantity: 2,
			price: 5000,
			refundItems: [{ quantity: 1 }, { quantity: 1 }],
		};

		expect(getAvailableQuantity(item)).toBe(0);
	});

	// ──────────── Multiple order items ────────────

	it("accepts multiple order items without crashing", () => {
		const { result } = renderHook(() =>
			useCreateRefundForm({
				orderId: "order-1",
				orderItems: [makeOrderItem({ id: "item-1" }), makeOrderItem({ id: "item-2", quantity: 3 })],
			}),
		);

		expect(result.current.form).toBeDefined();
	});

	// ──────────── formErrors ────────────

	it("formErrors is an empty array by default", () => {
		const { result } = renderHook(() => useCreateRefundForm(DEFAULT_OPTIONS));

		expect(result.current.formErrors).toEqual([]);
	});
});
