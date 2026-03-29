import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockModerateReview, mockCreateReview, mockDeleteReview, mockUpdateReview } = vi.hoisted(
	() => ({
		mockModerateReview: vi.fn(),
		mockCreateReview: vi.fn(),
		mockDeleteReview: vi.fn(),
		mockUpdateReview: vi.fn(),
	}),
);

vi.mock("@/modules/reviews/actions/moderate-review", () => ({
	moderateReview: mockModerateReview,
}));

vi.mock("@/modules/reviews/actions/create-review", () => ({
	createReview: mockCreateReview,
}));

vi.mock("@/modules/reviews/actions/delete-review", () => ({
	deleteReview: mockDeleteReview,
}));

vi.mock("@/modules/reviews/actions/update-review", () => ({
	updateReview: mockUpdateReview,
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

// Mock TanStack Form — useCreateReviewForm uses useAppForm internally
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
// IMPORTS (after mocks)
// ============================================================================

import { useReviewModeration } from "../use-review-moderation";
import { useCreateReviewForm } from "../use-create-review-form";
import { useDeleteReview } from "../use-delete-review";
import { useUpdateReviewForm } from "../use-update-review-form";

// ============================================================================
// HELPERS
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Avis modéré" };
const ERROR = { status: "error" as const, message: "Erreur" };

// ============================================================================
// useReviewModeration
// ============================================================================

describe("useReviewModeration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockModerateReview.mockResolvedValue(SUCCESS);
	});

	it("returns toggleStatus and isPending", () => {
		const { result } = renderHook(() => useReviewModeration());
		expect(typeof result.current.toggleStatus).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useReviewModeration());
		expect(result.current.isPending).toBe(false);
	});

	it("toggleStatus appends the reviewId to FormData", async () => {
		const { result } = renderHook(() => useReviewModeration());

		await act(async () => {
			result.current.toggleStatus("rev-42");
		});

		const formData = mockModerateReview.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("rev-42");
	});

	it("calls onSuccess when moderation succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useReviewModeration({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("rev-1");
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when moderation fails", async () => {
		mockModerateReview.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useReviewModeration({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("rev-1");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		const { result } = renderHook(() => useReviewModeration());

		await act(async () => {
			result.current.toggleStatus("rev-1");
		});

		expect(mockModerateReview).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useCreateReviewForm
// ============================================================================

describe("useCreateReviewForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateReview.mockResolvedValue(SUCCESS);
	});

	it("returns form, state, action, isPending, and formErrors", () => {
		const { result } = renderHook(() =>
			useCreateReviewForm({ productId: "prod-1", orderItemId: "item-1" }),
		);
		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(Array.isArray(result.current.formErrors)).toBe(true);
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() =>
			useCreateReviewForm({ productId: "prod-1", orderItemId: "item-1" }),
		);
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess with the message when action succeeds", async () => {
		mockCreateReview.mockResolvedValue({ status: "success", message: "Avis publié" });
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useCreateReviewForm({ productId: "prod-1", orderItemId: "item-1", onSuccess }),
		);

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Avis publié");
	});

	it("does not call onSuccess when action fails", async () => {
		mockCreateReview.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useCreateReviewForm({ productId: "prod-1", orderItemId: "item-1", onSuccess }),
		);

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state is updated after action completes", async () => {
		const { result } = renderHook(() =>
			useCreateReviewForm({ productId: "prod-1", orderItemId: "item-1" }),
		);

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});
});

// ============================================================================
// useDeleteReview
// ============================================================================

describe("useDeleteReview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteReview.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useDeleteReview());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useDeleteReview());
		expect(result.current.isPending).toBe(false);
	});

	it("handle passes correct FormData with id field", async () => {
		const { result } = renderHook(() => useDeleteReview());

		await act(async () => {
			result.current.handle("rev-99");
		});

		expect(mockDeleteReview).toHaveBeenCalledTimes(1);
		const formData = mockDeleteReview.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("rev-99");
	});

	it("calls onSuccess with the message on success", async () => {
		mockDeleteReview.mockResolvedValue({ status: "success", message: "Avis supprimé" });
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteReview({ onSuccess }));

		await act(async () => {
			result.current.handle("rev-1");
		});

		expect(onSuccess).toHaveBeenCalledWith("Avis supprimé");
	});

	it("does not call onSuccess on error", async () => {
		mockDeleteReview.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteReview({ onSuccess }));

		await act(async () => {
			result.current.handle("rev-1");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		const { result } = renderHook(() => useDeleteReview());

		await expect(
			act(async () => {
				result.current.handle("rev-1");
			}),
		).resolves.not.toThrow();
	});
});

// ============================================================================
// useUpdateReviewForm
// ============================================================================

const DEFAULT_OPTIONS = {
	reviewId: "rev-1",
	initialRating: 4,
	initialTitle: "Super produit",
	initialContent: "Très satisfait de mon achat.",
	initialMedia: [{ url: "https://example.com/img.jpg", altText: "photo" }],
};

describe("useUpdateReviewForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateReview.mockResolvedValue(SUCCESS);
	});

	it("returns form, state, action, isPending, and formErrors", () => {
		const { result } = renderHook(() => useUpdateReviewForm(DEFAULT_OPTIONS));
		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(Array.isArray(result.current.formErrors)).toBe(true);
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useUpdateReviewForm(DEFAULT_OPTIONS));
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess with the message when action succeeds", async () => {
		mockUpdateReview.mockResolvedValue({ status: "success", message: "Avis modifié" });
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateReviewForm({ ...DEFAULT_OPTIONS, onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Avis modifié");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateReview.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateReviewForm({ ...DEFAULT_OPTIONS, onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state is updated after action completes", async () => {
		const { result } = renderHook(() => useUpdateReviewForm(DEFAULT_OPTIONS));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});
});
