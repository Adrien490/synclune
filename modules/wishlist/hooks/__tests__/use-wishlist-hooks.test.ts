import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockToggleWishlistItem,
	mockRemoveFromWishlist,
	mockRouterPush,
	mockRouterRefresh,
	mockIncrementWishlist,
	mockDecrementWishlist,
	mockOnItemRemoved,
	mockTriggerHaptic,
	mockShowWishlistUndoToast,
} = vi.hoisted(() => ({
	mockToggleWishlistItem: vi.fn(),
	mockRemoveFromWishlist: vi.fn(),
	mockRouterPush: vi.fn(),
	mockRouterRefresh: vi.fn(),
	mockIncrementWishlist: vi.fn(),
	mockDecrementWishlist: vi.fn(),
	mockOnItemRemoved: vi.fn(),
	mockTriggerHaptic: vi.fn(),
	mockShowWishlistUndoToast: vi.fn(),
}));

vi.mock("@/modules/wishlist/actions/toggle-wishlist-item", () => ({
	toggleWishlistItem: mockToggleWishlistItem,
}));

vi.mock("@/modules/wishlist/actions/remove-from-wishlist", () => ({
	removeFromWishlist: mockRemoveFromWishlist,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		refresh: mockRouterRefresh,
	}),
	usePathname: () => "/boutique/produit/bague-or",
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (s: unknown) => unknown) =>
		selector({
			incrementWishlist: mockIncrementWishlist,
			decrementWishlist: mockDecrementWishlist,
		}),
}));

vi.mock("@/modules/wishlist/contexts/wishlist-list-optimistic-context", () => ({
	useWishlistListOptimistic: () => ({
		onItemRemoved: mockOnItemRemoved,
	}),
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

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/modules/wishlist/utils/show-wishlist-undo-toast", () => ({
	showWishlistUndoToast: mockShowWishlistUndoToast,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useWishlistToggle } from "../use-wishlist-toggle";
import { useRemoveFromWishlist } from "../use-remove-from-wishlist";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS_ADDED = {
	status: "success" as const,
	message: "Ajouté aux favoris",
	data: { action: "added" as const },
};

const SUCCESS_REMOVED = {
	status: "success" as const,
	message: "Retiré des favoris",
	data: { action: "removed" as const },
};

const SUCCESS_REMOVE = {
	status: "success" as const,
	message: "Article retiré",
};

const ERROR = {
	status: "error" as const,
	message: "Erreur serveur",
};

// ============================================================================
// useWishlistToggle
// ============================================================================

describe("useWishlistToggle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockToggleWishlistItem.mockResolvedValue(SUCCESS_ADDED);
	});

	it("returns correct shape", () => {
		const { result } = renderHook(() => useWishlistToggle());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.isInWishlist).toBe("boolean");
		expect("state" in result.current).toBe(true);
	});

	it("defaults isInWishlist to false when no options provided", () => {
		const { result } = renderHook(() => useWishlistToggle());
		expect(result.current.isInWishlist).toBe(false);
	});

	it("sets initial isInWishlist from initialIsInWishlist option", () => {
		const { result } = renderHook(() => useWishlistToggle({ initialIsInWishlist: true }));
		expect(result.current.isInWishlist).toBe(true);
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useWishlistToggle());
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess with 'added' when action returns added", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useWishlistToggle({ onSuccess }));

		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(onSuccess).toHaveBeenCalledWith("added");
	});

	it("calls onSuccess with 'removed' when action returns removed", async () => {
		mockToggleWishlistItem.mockResolvedValue(SUCCESS_REMOVED);
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useWishlistToggle({ initialIsInWishlist: true, onSuccess }),
		);

		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(onSuccess).toHaveBeenCalledWith("removed");
	});

	it("add qui échoue → rollback net du badge (un increment optimiste, un decrement de rollback)", async () => {
		// Le rollback suit la direction TENTÉE (ref posée au dispatch), jamais
		// `initialIsInWishlist` : la prop peut être périmée quand deux toggles
		// s'enchaînent avant la revalidation du premier. Ce test verrouille
		// l'invariant net-zéro du badge sur le chemin add.
		mockToggleWishlistItem.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useWishlistToggle());

		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockIncrementWishlist).toHaveBeenCalledTimes(1);
		expect(mockDecrementWishlist).toHaveBeenCalledTimes(1);
	});

	it("remove qui échoue → rollback net du badge (un decrement optimiste, un increment de rollback)", async () => {
		mockToggleWishlistItem.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useWishlistToggle({ initialIsInWishlist: true }));

		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockDecrementWishlist).toHaveBeenCalledTimes(1);
		expect(mockIncrementWishlist).toHaveBeenCalledTimes(1);
	});

	it("calls router.refresh() on error", async () => {
		mockToggleWishlistItem.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useWishlistToggle());

		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockRouterRefresh).toHaveBeenCalled();
	});

	it("never redirects to /connexion on error (login réservé à l'admin depuis 2026-07-31)", async () => {
		mockToggleWishlistItem.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useWishlistToggle());

		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockRouterPush).not.toHaveBeenCalled();
	});

	it("calls triggerHaptic exactly once per add (G10 — single haptic rule)", async () => {
		const { result } = renderHook(() => useWishlistToggle());
		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockTriggerHaptic).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
	});

	it("calls triggerHaptic exactly once per remove (G10 — single haptic rule)", async () => {
		mockToggleWishlistItem.mockResolvedValue(SUCCESS_REMOVED);
		const { result } = renderHook(() => useWishlistToggle({ initialIsInWishlist: true }));
		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockTriggerHaptic).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});

	it("shows undo toast on removed when enableUndoToast=true (G11)", async () => {
		mockToggleWishlistItem.mockResolvedValue(SUCCESS_REMOVED);
		const { result } = renderHook(() =>
			useWishlistToggle({
				initialIsInWishlist: true,
				enableUndoToast: true,
				productTitle: "Bague Lune",
			}),
		);
		const formData = new FormData();
		formData.append("productId", "prod-42");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockShowWishlistUndoToast).toHaveBeenCalledTimes(1);
		expect(mockShowWishlistUndoToast).toHaveBeenCalledWith(
			expect.objectContaining({
				productId: "prod-42",
				productTitle: "Bague Lune",
				onRestored: expect.any(Function),
			}),
		);
	});

	it("does NOT show undo toast on add when enableUndoToast=true (G11 — added skips toast)", async () => {
		const { result } = renderHook(() =>
			useWishlistToggle({ enableUndoToast: true, productTitle: "Bague Lune" }),
		);
		const formData = new FormData();
		formData.append("productId", "prod-42");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockShowWishlistUndoToast).not.toHaveBeenCalled();
	});

	it("does NOT show undo toast on remove when enableUndoToast=false (G11 — opt-in)", async () => {
		mockToggleWishlistItem.mockResolvedValue(SUCCESS_REMOVED);
		const { result } = renderHook(() => useWishlistToggle({ initialIsInWishlist: true }));
		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockShowWishlistUndoToast).not.toHaveBeenCalled();
	});

	it("second action call is ignored while processing (double-submit guard)", async () => {
		let resolveAction!: (v: typeof SUCCESS_ADDED) => void;
		mockToggleWishlistItem.mockReturnValue(
			new Promise<typeof SUCCESS_ADDED>((resolve) => {
				resolveAction = resolve;
			}),
		);

		const { result } = renderHook(() => useWishlistToggle());
		const formData = new FormData();
		formData.append("productId", "prod-1");

		act(() => {
			result.current.action(formData);
		});

		act(() => {
			result.current.action(formData);
		});

		await act(async () => {
			resolveAction(SUCCESS_ADDED);
		});

		// Only one call despite two action invocations
		expect(mockToggleWishlistItem).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useRemoveFromWishlist
// ============================================================================

describe("useRemoveFromWishlist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRemoveFromWishlist.mockResolvedValue(SUCCESS_REMOVE);
	});

	it("returns correct shape", () => {
		const { result } = renderHook(() => useRemoveFromWishlist());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect("state" in result.current).toBe(true);
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useRemoveFromWishlist());
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRemoveFromWishlist({ onSuccess }));

		const formData = new FormData();
		formData.append("productId", "prod-2");

		await act(async () => {
			result.current.action(formData);
		});

		expect(onSuccess).toHaveBeenCalledWith("Article retiré");
	});

	it("calls onOptimisticRemove with productId when action is triggered", async () => {
		const onOptimisticRemove = vi.fn();
		const { result } = renderHook(() => useRemoveFromWishlist({ onOptimisticRemove }));

		const formData = new FormData();
		formData.append("productId", "prod-2");

		await act(async () => {
			result.current.action(formData);
		});

		expect(onOptimisticRemove).toHaveBeenCalledWith("prod-2");
	});

	it("calls decrementWishlist optimistically when action is triggered", async () => {
		const { result } = renderHook(() => useRemoveFromWishlist());

		const formData = new FormData();
		formData.append("productId", "prod-2");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockDecrementWishlist).toHaveBeenCalled();
	});

	it("rolls back badge without redirecting on error (login réservé à l'admin depuis 2026-07-31)", async () => {
		mockRemoveFromWishlist.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useRemoveFromWishlist());

		const formData = new FormData();
		formData.append("productId", "prod-2");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockIncrementWishlist).toHaveBeenCalled();
		expect(mockRouterPush).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRemoveFromWishlist.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRemoveFromWishlist({ onSuccess }));

		const formData = new FormData();
		formData.append("productId", "prod-2");

		await act(async () => {
			result.current.action(formData);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
