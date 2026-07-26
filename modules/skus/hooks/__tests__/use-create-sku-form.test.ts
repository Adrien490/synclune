import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCreateProductSku } = vi.hoisted(() => ({
	mockCreateProductSku: vi.fn(),
}));

vi.mock("@/modules/skus/actions/create-sku", () => ({
	createProductSku: mockCreateProductSku,
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
	useStore: vi.fn(() => []),
	useTransform: vi.fn((fn: unknown) => fn),
}));

vi.mock("@/modules/skus/constants/create-sku-form-options", () => ({
	createProductSkuFormOpts: {
		defaultValues: {
			productId: "",
			sku: "",
			priceInclTaxEuros: null,
			compareAtPriceEuros: undefined,
			inventory: null,
			isDefault: false,
			isActive: true,
			colorId: "",
			materialId: "",
			size: "",
			primaryImage: undefined,
			galleryMedia: [],
		},
	},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useCreateProductSkuForm } from "../use-create-sku-form";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Variante créée" };
const ERROR = { status: "error" as const, message: "Erreur création" };

// ============================================================================
// Tests
// ============================================================================

describe("useCreateProductSkuForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateProductSku.mockResolvedValue(SUCCESS);
	});

	// ──────────── Return shape ────────────

	it("returns form, state, action and isPending", () => {
		const { result } = renderHook(() => useCreateProductSkuForm());

		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useCreateProductSkuForm());

		expect(result.current.isPending).toBe(false);
	});

	// ──────────── Action state transitions ────────────

	it("state is undefined before any action is dispatched", () => {
		const { result } = renderHook(() => useCreateProductSkuForm());

		expect(result.current.state).toBeUndefined();
	});

	it("state is updated to success after action completes", async () => {
		const { result } = renderHook(() => useCreateProductSkuForm());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});

	it("state is updated to error after failed action", async () => {
		mockCreateProductSku.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useCreateProductSkuForm());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});

	// ──────────── onSuccess callback ────────────

	it("calls onSuccess with the message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateProductSkuForm({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Variante créée");
	});

	it("does not call onSuccess when action fails", async () => {
		mockCreateProductSku.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateProductSkuForm({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when result has no message property", async () => {
		mockCreateProductSku.mockResolvedValue({ status: "success" as const });
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateProductSkuForm({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		const { result } = renderHook(() => useCreateProductSkuForm());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCreateProductSku).toHaveBeenCalledTimes(1);
	});

	it("works with undefined options (no crash)", async () => {
		const { result } = renderHook(() => useCreateProductSkuForm(undefined));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCreateProductSku).toHaveBeenCalledTimes(1);
	});

	// ──────────── showSuccessToast is false ────────────

	it("does not show a success toast (showSuccessToast: false)", async () => {
		const { toast } = await import("sonner");
		const { result } = renderHook(() => useCreateProductSkuForm());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(toast.success).not.toHaveBeenCalled();
	});

	// ──────────── Multiple dispatches ────────────

	it("calls the action each time it is invoked", async () => {
		const { result } = renderHook(() => useCreateProductSkuForm());

		await act(async () => {
			result.current.action(new FormData());
		});
		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCreateProductSku).toHaveBeenCalledTimes(2);
	});
});
