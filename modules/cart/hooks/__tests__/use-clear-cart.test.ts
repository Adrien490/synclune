import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as NextNavigation from "next/navigation";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockClearCart, mockToast, mockRouterRefresh, mockAdjustCart, mockBadgeState } = vi.hoisted(
	() => ({
		mockClearCart: vi.fn(),
		mockToast: {
			loading: vi.fn(),
			dismiss: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			warning: vi.fn(),
		},
		mockRouterRefresh: vi.fn(),
		mockAdjustCart: vi.fn(),
		mockBadgeState: { cartCount: 3 },
	}),
);

vi.mock("@/modules/cart/actions/clear-cart", () => ({
	clearCart: mockClearCart,
}));

vi.mock("@/shared/utils/toast", () => ({ toast: mockToast }));

// Mock partiel : `unstable_rethrow` (appelé par withCallbacks sur exception)
// reste la vraie implémentation — seule la navigation est stubée.
vi.mock("next/navigation", async (importOriginal) => ({
	...(await importOriginal<typeof NextNavigation>()),
	useRouter: () => ({ refresh: mockRouterRefresh }),
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (
		selector: (state: { adjustCart: typeof mockAdjustCart; cartCount: number }) => unknown,
	) => selector({ adjustCart: mockAdjustCart, cartCount: mockBadgeState.cartCount }),
}));

// Prevent auth/Stripe initialization during module evaluation
vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useClearCart } from "../use-clear-cart";
import { ActionStatus } from "@/shared/types/server-action";
import { GENERIC_ERROR_MESSAGE } from "@/shared/constants/error-messages";

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

const SUCCESS_RESULT = { status: ActionStatus.SUCCESS, message: "Panier vide" };
const ERROR_RESULT = { status: ActionStatus.ERROR, message: "Erreur lors du vidage" };

// ============================================================================
// Tests
// ============================================================================

describe("useClearCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockClearCart.mockResolvedValue(SUCCESS_RESULT);
		mockBadgeState.cartCount = 3;
	});

	describe("return shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useClearCart());
			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useClearCart());
			expect(result.current.isPending).toBe(false);
		});
	});

	describe("toast callbacks", () => {
		it("shows loading toast with custom message on action start", async () => {
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockToast.loading).toHaveBeenCalledWith("Vidage du panier…");
		});

		it("dismisses loading toast on completion", async () => {
			mockToast.loading.mockReturnValue("toast-id-1");
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockToast.dismiss).toHaveBeenCalledWith("toast-id-1");
		});

		it("does not show success toast (panier vide est sa propre confirmation visuelle)", async () => {
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockToast.success).not.toHaveBeenCalled();
		});

		it("shows error toast on failure", async () => {
			mockClearCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockToast.error).toHaveBeenCalledWith("Erreur lors du vidage");
		});
	});

	describe("onSuccess callback", () => {
		it("fires onSuccess callback on SUCCESS result", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useClearCart(onSuccess));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledTimes(1);
		});

		it("does not fire onSuccess on ERROR result", async () => {
			mockClearCart.mockResolvedValue(ERROR_RESULT);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useClearCart(onSuccess));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("works without onSuccess callback", async () => {
			const { result } = renderHook(() => useClearCart());

			await expect(
				act(async () => {
					result.current.action(makeFormData());
				}),
			).resolves.not.toThrow();
		});
	});

	describe("action state", () => {
		it("reflects success result after call", async () => {
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(SUCCESS_RESULT);
		});

		it("reflects error result after failed call", async () => {
			mockClearCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});

		it("calls clearCart with prev state and FormData", async () => {
			const { result } = renderHook(() => useClearCart());
			const fd = makeFormData();

			await act(async () => {
				result.current.action(fd);
			});

			expect(mockClearCart).toHaveBeenCalledTimes(1);
			expect(mockClearCart).toHaveBeenCalledWith(undefined, fd);
		});
	});

	describe("error handling", () => {
		it("converts thrown exception to error ActionState", async () => {
			mockClearCart.mockRejectedValue(new Error("DB error"));
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useClearCart(onSuccess));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state?.status).toBe(ActionStatus.ERROR);
			expect(onSuccess).not.toHaveBeenCalled();
			// Le message brut de l'exception ne fuite plus (withCallbacks fabrique
			// un état générique — en prod le message serait l'anglais masqué de Next).
			expect(mockToast.error).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);
		});
	});

	/**
	 * @regression clear-cart-optimistic-badge-2026-05-24
	 * Avant fix : `useClearCart` n'était pas optimistic — le badge navbar
	 * restait à N pendant la requête serveur, puis tombait à 0 après
	 * invalidation cache. UX laggy. Fix : `adjustCart(-cartCount)` immédiat
	 * + snapshot ref pour rollback en cas d'erreur serveur.
	 */
	describe("@regression optimistic badge", () => {
		it("zeros out the navbar badge immediately when action fires", async () => {
			mockBadgeState.cartCount = 5;
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-5);
		});

		it("does not call adjustCart when cart is already empty", async () => {
			mockBadgeState.cartCount = 0;
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).not.toHaveBeenCalled();
		});

		it("rolls back the badge count on server error + refreshes router", async () => {
			mockBadgeState.cartCount = 4;
			mockClearCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			// 1er appel optimistic (-4), 2e appel rollback (+4).
			expect(mockAdjustCart).toHaveBeenNthCalledWith(1, -4);
			expect(mockAdjustCart).toHaveBeenNthCalledWith(2, 4);
			expect(mockRouterRefresh).toHaveBeenCalled();
		});

		it("does NOT rollback on success", async () => {
			mockBadgeState.cartCount = 2;
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledTimes(1);
			expect(mockAdjustCart).toHaveBeenCalledWith(-2);
			expect(mockRouterRefresh).not.toHaveBeenCalled();
		});
	});
});
