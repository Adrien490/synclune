import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCreateReviewResponse, mockUpdateReviewResponse, mockDeleteReviewResponse } = vi.hoisted(
	() => ({
		mockCreateReviewResponse: vi.fn(),
		mockUpdateReviewResponse: vi.fn(),
		mockDeleteReviewResponse: vi.fn(),
	}),
);

vi.mock("@/modules/reviews/actions/create-review-response", () => ({
	createReviewResponse: mockCreateReviewResponse,
}));

vi.mock("@/modules/reviews/actions/update-review-response", () => ({
	updateReviewResponse: mockUpdateReviewResponse,
}));

vi.mock("@/modules/reviews/actions/delete-review-response", () => ({
	deleteReviewResponse: mockDeleteReviewResponse,
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

import { useReviewResponseForm } from "../use-review-response-form";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Erreur" };

afterEach(cleanup);

// ============================================================================
// useReviewResponseForm
// ============================================================================

describe("useReviewResponseForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateReviewResponse.mockResolvedValue(SUCCESS);
		mockUpdateReviewResponse.mockResolvedValue(SUCCESS);
		mockDeleteReviewResponse.mockResolvedValue(SUCCESS);
	});

	it("returns createResponse, editResponse, removeResponse, and isPending", () => {
		const { result } = renderHook(() => useReviewResponseForm());

		expect(typeof result.current.createResponse).toBe("function");
		expect(typeof result.current.editResponse).toBe("function");
		expect(typeof result.current.removeResponse).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false on initial render", () => {
		const { result } = renderHook(() => useReviewResponseForm());

		expect(result.current.isPending).toBe(false);
	});

	it("createResponse sends reviewId and content in FormData", async () => {
		const { result } = renderHook(() => useReviewResponseForm());

		await act(async () => {
			result.current.createResponse("review-123", "Merci pour votre avis");
		});

		expect(mockCreateReviewResponse).toHaveBeenCalledTimes(1);
		const formData = mockCreateReviewResponse.mock.calls[0]?.[1] as FormData;
		expect(formData.get("reviewId")).toBe("review-123");
		expect(formData.get("content")).toBe("Merci pour votre avis");
	});

	it("editResponse sends id and content in FormData", async () => {
		const { result } = renderHook(() => useReviewResponseForm());

		await act(async () => {
			result.current.editResponse("response-456", "Reponse modifiee");
		});

		expect(mockUpdateReviewResponse).toHaveBeenCalledTimes(1);
		const formData = mockUpdateReviewResponse.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("response-456");
		expect(formData.get("content")).toBe("Reponse modifiee");
	});

	it("removeResponse sends id in FormData", async () => {
		const { result } = renderHook(() => useReviewResponseForm());

		await act(async () => {
			result.current.removeResponse("response-789");
		});

		expect(mockDeleteReviewResponse).toHaveBeenCalledTimes(1);
		const formData = mockDeleteReviewResponse.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("response-789");
	});

	it("calls onSuccess when createResponse succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useReviewResponseForm({ onSuccess }));

		await act(async () => {
			result.current.createResponse("review-123", "Super produit");
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("calls onSuccess when editResponse succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useReviewResponseForm({ onSuccess }));

		await act(async () => {
			result.current.editResponse("response-456", "Mise a jour");
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("calls onSuccess when removeResponse succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useReviewResponseForm({ onSuccess }));

		await act(async () => {
			result.current.removeResponse("response-789");
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when createResponse fails", async () => {
		mockCreateReviewResponse.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useReviewResponseForm({ onSuccess }));

		await act(async () => {
			result.current.createResponse("review-123", "Test");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when editResponse fails", async () => {
		mockUpdateReviewResponse.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useReviewResponseForm({ onSuccess }));

		await act(async () => {
			result.current.editResponse("response-456", "Test");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when removeResponse fails", async () => {
		mockDeleteReviewResponse.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useReviewResponseForm({ onSuccess }));

		await act(async () => {
			result.current.removeResponse("response-789");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useReviewResponseForm());

		await expect(
			act(async () => {
				result.current.createResponse("review-123", "Test");
			}),
		).resolves.not.toThrow();
	});
});
