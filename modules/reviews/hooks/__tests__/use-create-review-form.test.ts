import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCreateReview } = vi.hoisted(() => ({
	mockCreateReview: vi.fn(),
}));

vi.mock("@/modules/reviews/actions/create-review", () => ({
	createReview: mockCreateReview,
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

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useCreateReviewForm } from "../use-create-review-form";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Avis publié" };
const ERROR = { status: "error" as const, message: "Erreur" };

const DEFAULT_OPTIONS = {
	productId: "prod-1",
	orderItemId: "item-1",
};

// ============================================================================
// Tests
// ============================================================================

describe("useCreateReviewForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateReview.mockResolvedValue(SUCCESS);
	});

	// ──────────── Return shape ────────────

	it("returns form, state, action, isPending, and formErrors", () => {
		const { result } = renderHook(() => useCreateReviewForm(DEFAULT_OPTIONS));

		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(Array.isArray(result.current.formErrors)).toBe(true);
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useCreateReviewForm(DEFAULT_OPTIONS));

		expect(result.current.isPending).toBe(false);
	});

	// ──────────── Form initialization with options ────────────

	it("accepts productId and orderItemId without crashing", () => {
		const { result } = renderHook(() =>
			useCreateReviewForm({ productId: "prod-42", orderItemId: "item-99" }),
		);

		expect(result.current.form).toBeDefined();
	});

	it("does not crash when onSuccess option is omitted", () => {
		const { result } = renderHook(() =>
			useCreateReviewForm({ productId: "prod-1", orderItemId: "item-1" }),
		);

		expect(result.current).toBeDefined();
	});

	// ──────────── Action state transitions ────────────

	it("state is undefined before any action is dispatched", () => {
		const { result } = renderHook(() => useCreateReviewForm(DEFAULT_OPTIONS));

		expect(result.current.state).toBeUndefined();
	});

	it("state is updated to success after action completes", async () => {
		const { result } = renderHook(() => useCreateReviewForm(DEFAULT_OPTIONS));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});

	it("state is updated to error after failed action", async () => {
		mockCreateReview.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useCreateReviewForm(DEFAULT_OPTIONS));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});

	// ──────────── onSuccess callback ────────────

	it("calls onSuccess with the message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateReviewForm({ ...DEFAULT_OPTIONS, onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Avis publié");
	});

	it("does not call onSuccess when action fails", async () => {
		mockCreateReview.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateReviewForm({ ...DEFAULT_OPTIONS, onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when result has no message property", async () => {
		mockCreateReview.mockResolvedValue({ status: "success" as const });
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateReviewForm({ ...DEFAULT_OPTIONS, onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	// ──────────── Rating default value ────────────

	it("form is initialized (useAppForm is called)", () => {
		// The form is wired to useAppForm with rating: 5 as default
		// We verify the hook returns a form object without errors
		const { result } = renderHook(() => useCreateReviewForm(DEFAULT_OPTIONS));

		expect(result.current.form).not.toBeNull();
	});

	// ──────────── formErrors ────────────

	it("formErrors is an empty array by default", () => {
		const { result } = renderHook(() => useCreateReviewForm(DEFAULT_OPTIONS));

		expect(result.current.formErrors).toEqual([]);
	});

	// ──────────── Multiple dispatches ────────────

	it("calls the action each time it is invoked", async () => {
		const { result } = renderHook(() => useCreateReviewForm(DEFAULT_OPTIONS));

		await act(async () => {
			result.current.action(new FormData());
		});
		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCreateReview).toHaveBeenCalledTimes(2);
	});
});
