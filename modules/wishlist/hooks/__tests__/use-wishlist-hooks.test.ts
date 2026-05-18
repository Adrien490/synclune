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
} = vi.hoisted(() => ({
	mockToggleWishlistItem: vi.fn(),
	mockRemoveFromWishlist: vi.fn(),
	mockRouterPush: vi.fn(),
	mockRouterRefresh: vi.fn(),
	mockIncrementWishlist: vi.fn(),
	mockDecrementWishlist: vi.fn(),
	mockOnItemRemoved: vi.fn(),
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

const UNAUTHORIZED = {
	status: "unauthorized" as const,
	message: "Non autorisé",
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

	it("redirects to login when action returns UNAUTHORIZED", async () => {
		mockToggleWishlistItem.mockResolvedValue(UNAUTHORIZED);
		const { result } = renderHook(() => useWishlistToggle());

		const formData = new FormData();
		formData.append("productId", "prod-1");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining("/connexion?callbackURL="));
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

	it("rolls back badge and redirects to login when action returns UNAUTHORIZED", async () => {
		mockRemoveFromWishlist.mockResolvedValue(UNAUTHORIZED);
		const { result } = renderHook(() => useRemoveFromWishlist());

		const formData = new FormData();
		formData.append("productId", "prod-2");

		await act(async () => {
			result.current.action(formData);
		});

		expect(mockIncrementWishlist).toHaveBeenCalled();
		expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining("/connexion?callbackURL="));
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
