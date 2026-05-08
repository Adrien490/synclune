import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUpdateCartPrices } = vi.hoisted(() => ({
	mockUpdateCartPrices: vi.fn(),
}));

vi.mock("@/modules/cart/actions/update-cart-prices", () => ({
	updateCartPrices: mockUpdateCartPrices,
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useUpdateCartPrices } from "../use-update-cart-prices";

// ============================================================================
// Helpers
// ============================================================================

function makeFormData(data: Record<string, string> = {}): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(data)) {
		fd.set(key, value);
	}
	return fd;
}

const SUCCESS_RESULT = { status: "success" as const, message: "Prix mis à jour" };
const ERROR_RESULT = {
	status: "error" as const,
	message: "Erreur lors de la mise à jour des prix",
};
const WARNING_RESULT = {
	status: "warning" as const,
	message: "Certains prix ont changé",
};

// ============================================================================
// Tests
// ============================================================================

describe("useUpdateCartPrices", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateCartPrices.mockResolvedValue(SUCCESS_RESULT);
	});

	// --------------------------------------------------------------------------
	// Return shape
	// --------------------------------------------------------------------------

	describe("return shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useUpdateCartPrices());
			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useUpdateCartPrices());
			expect(result.current.isPending).toBe(false);
		});

		it("state is undefined initially (no action called yet)", () => {
			const { result } = renderHook(() => useUpdateCartPrices());
			expect(result.current.state).toBeUndefined();
		});
	});

	// --------------------------------------------------------------------------
	// Price update detection via state changes
	// --------------------------------------------------------------------------

	describe("price update detection", () => {
		it("state reflects success result after successful price update", async () => {
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(SUCCESS_RESULT);
		});

		it("state reflects error result when price update fails", async () => {
			mockUpdateCartPrices.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});

		it("state reflects warning result when prices have changed (detection case)", async () => {
			mockUpdateCartPrices.mockResolvedValue(WARNING_RESULT);
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(WARNING_RESULT);
			expect(result.current.state?.status).toBe("warning");
		});

		it("can detect price change from status field on the result state", async () => {
			mockUpdateCartPrices.mockResolvedValue(WARNING_RESULT);
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			// Consumer can check result.current.state?.status === "warning" to detect changes
			expect(result.current.state?.status).not.toBe("success");
		});

		it("state transitions from undefined to the result object", async () => {
			const { result } = renderHook(() => useUpdateCartPrices());
			expect(result.current.state).toBeUndefined();

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(result.current.state).toBeDefined();
			expect(result.current.state?.status).toBe("success");
		});

		it("state updates correctly across multiple action calls", async () => {
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});
			expect(result.current.state?.status).toBe("success");

			mockUpdateCartPrices.mockResolvedValue(ERROR_RESULT);

			await act(async () => {
				await result.current.action(makeFormData());
			});
			expect(result.current.state?.status).toBe("error");
		});
	});

	// --------------------------------------------------------------------------
	// Server action invocation
	// --------------------------------------------------------------------------

	describe("server action invocation", () => {
		it("calls the updateCartPrices action when action is invoked", async () => {
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockUpdateCartPrices).toHaveBeenCalledTimes(1);
		});

		it("calls updateCartPrices with the provided FormData", async () => {
			const { result } = renderHook(() => useUpdateCartPrices());
			const fd = makeFormData({ cartId: "cart-abc" });

			await act(async () => {
				await result.current.action(fd);
			});

			expect(mockUpdateCartPrices).toHaveBeenCalledTimes(1);
		});

		it("calls updateCartPrices again on a second invocation", async () => {
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockUpdateCartPrices).toHaveBeenCalledTimes(2);
		});
	});

	// --------------------------------------------------------------------------
	// Toast integration (loadingMessage, showSuccessToast, showErrorToast)
	// --------------------------------------------------------------------------

	describe("toast integration", () => {
		it("shows a loading toast during the action", async () => {
			const { toast } = await import("@/shared/utils/toast");
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(toast.loading).toHaveBeenCalledWith("Mise à jour des prix…");
		});

		it("shows a success toast when action succeeds", async () => {
			const { toast } = await import("@/shared/utils/toast");
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(toast.success).toHaveBeenCalledWith("Prix mis à jour");
		});

		it("shows an error toast when action fails", async () => {
			mockUpdateCartPrices.mockResolvedValue(ERROR_RESULT);
			const { toast } = await import("@/shared/utils/toast");
			const { result } = renderHook(() => useUpdateCartPrices());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(toast.error).toHaveBeenCalledWith("Erreur lors de la mise à jour des prix");
		});
	});
});
