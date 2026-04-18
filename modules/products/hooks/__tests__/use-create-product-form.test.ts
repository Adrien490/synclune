import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCreateProduct } = vi.hoisted(() => ({
	mockCreateProduct: vi.fn(),
}));

vi.mock("@/modules/products/actions/create-product", () => ({
	createProduct: mockCreateProduct,
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

vi.mock("@/modules/products/constants/create-product-form-options", () => ({
	createProductFormOpts: {
		defaultValues: {
			title: "",
			description: "",
			typeId: undefined,
			collectionIds: [],
			status: "PUBLIC",
			initialSku: {
				sku: "",
				priceInclTaxEuros: null,
				compareAtPriceEuros: undefined,
				inventory: 1,
				isDefault: true,
				isActive: true,
				colorId: "",
				materialId: "",
				size: "",
				media: [],
			},
		},
	},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useCreateProductForm } from "../use-create-product-form";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Produit créé" };
const ERROR = { status: "error" as const, message: "Erreur création" };
const VALIDATION_ERROR = {
	status: "validation_error" as const,
	message: "Le slug existe déjà",
};

// ============================================================================
// Tests
// ============================================================================

describe("useCreateProductForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateProduct.mockResolvedValue(SUCCESS);
	});

	// ──────────── Return shape ────────────

	it("returns form, state, action, isPending, and formErrors", () => {
		const { result } = renderHook(() => useCreateProductForm());

		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(Array.isArray(result.current.formErrors)).toBe(true);
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useCreateProductForm());

		expect(result.current.isPending).toBe(false);
	});

	// ──────────── Action state transitions ────────────

	it("state is undefined before any action is dispatched", () => {
		const { result } = renderHook(() => useCreateProductForm());

		expect(result.current.state).toBeUndefined();
	});

	it("state is updated to success after action completes", async () => {
		const { result } = renderHook(() => useCreateProductForm());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});

	it("state is updated to error after failed action", async () => {
		mockCreateProduct.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useCreateProductForm());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});

	// ──────────── onSuccess callback ────────────

	it("calls onSuccess with the message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateProductForm({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Produit créé");
	});

	it("does not call onSuccess when action fails", async () => {
		mockCreateProduct.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateProductForm({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when result has no message property", async () => {
		mockCreateProduct.mockResolvedValue({ status: "success" as const });
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateProductForm({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		const { result } = renderHook(() => useCreateProductForm());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCreateProduct).toHaveBeenCalledTimes(1);
	});

	it("works with undefined options (no crash)", async () => {
		const { result } = renderHook(() => useCreateProductForm(undefined));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCreateProduct).toHaveBeenCalledTimes(1);
	});

	// ──────────── onError callback ────────────

	it("calls onError with the message when action fails with ERROR status", async () => {
		mockCreateProduct.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useCreateProductForm({ onError }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onError).toHaveBeenCalledWith("Erreur création");
	});

	it("does not call onError when action succeeds", async () => {
		const onError = vi.fn();
		const { result } = renderHook(() => useCreateProductForm({ onError }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onError).not.toHaveBeenCalled();
	});

	// ──────────── onValidationError callback ────────────

	it("calls onValidationError (not onError) when status is VALIDATION_ERROR", async () => {
		mockCreateProduct.mockResolvedValue(VALIDATION_ERROR);
		const onError = vi.fn();
		const onValidationError = vi.fn();
		const { result } = renderHook(() => useCreateProductForm({ onError, onValidationError }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onValidationError).toHaveBeenCalledWith("Le slug existe déjà");
		expect(onError).not.toHaveBeenCalled();
	});

	// ──────────── formErrors ────────────

	it("formErrors is an empty array by default", () => {
		const { result } = renderHook(() => useCreateProductForm());

		expect(result.current.formErrors).toEqual([]);
	});

	it("formErrors exposes the server error message after a failed submission", async () => {
		mockCreateProduct.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useCreateProductForm());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.formErrors).toContain("Erreur création");
	});
});
