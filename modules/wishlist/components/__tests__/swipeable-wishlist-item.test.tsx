import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockOnItemRemoved, mockShowUndoToast, capturedSwipeProps } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockOnItemRemoved: vi.fn(),
	mockShowUndoToast: vi.fn(),
	capturedSwipeProps: { current: null as Record<string, unknown> | null },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

/**
 * `SwipeableCard` est la primitive partagée : son comportement de geste
 * (rubber-band, seuil adaptatif, touchcancel, aria-live) a sa propre suite de
 * tests. Ici on ne vérifie que le CONTRAT du wrapper — ce qu'il lui passe.
 */
vi.mock("@/shared/components/swipeable-card", () => ({
	SwipeableCard: (props: Record<string, unknown>) => {
		capturedSwipeProps.current = props;
		const left = props.leftAction as { children: React.ReactNode; label: string } | undefined;
		return (
			<div data-testid="swipeable-card">
				<span data-testid="left-action-label">{left?.label}</span>
				{left?.children}
				{props.children as React.ReactNode}
			</div>
		);
	},
}));

vi.mock("@/shared/hooks/use-gesture-hint-once", () => ({
	useGestureHintOnce: vi.fn((_key: string, opts?: { enabled?: boolean }) => opts?.enabled === true),
}));

vi.mock("@/modules/wishlist/hooks/use-remove-from-wishlist", () => ({
	useRemoveFromWishlist: vi.fn(() => ({
		action: mockAction,
		isPending: false,
		state: undefined,
	})),
}));

vi.mock("@/modules/wishlist/contexts/wishlist-list-optimistic-context", () => ({
	useWishlistListOptimistic: vi.fn(() => ({
		onItemRemoved: mockOnItemRemoved,
	})),
}));

vi.mock("@/modules/wishlist/utils/show-wishlist-undo-toast", () => ({
	showWishlistUndoToast: mockShowUndoToast,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	TrashIcon: ({ className }: { className?: string }) => (
		<span data-testid="trash-icon" className={className} />
	),
}));

import { SwipeableWishlistItem } from "../swipeable-wishlist-item";

// ============================================================================
// TESTS
// ============================================================================

function fireSwipeRemoval() {
	const leftAction = capturedSwipeProps.current?.leftAction as { onAction: () => void };
	leftAction.onAction();
}

describe("SwipeableWishlistItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedSwipeProps.current = null;
	});
	afterEach(cleanup);

	it("renders children inside the shared swipe primitive", () => {
		render(
			<SwipeableWishlistItem productId="prod-1">
				<div data-testid="child">Product Card</div>
			</SwipeableWishlistItem>,
		);

		expect(screen.getByTestId("swipeable-card")).toBeInTheDocument();
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	/**
	 * @regression wishlist-swipe-uses-shared-primitive
	 * Le swipe favoris était une SECONDE implémentation, doublant `SwipeableCard`
	 * sans son `touchcancel` (geste volé par l'OS → carte figée en cours de swipe),
	 * sans seuil adaptatif, sans annonce `aria-live` ni opt-out `data-no-swipe`.
	 */
	it("delegates the gesture to SwipeableCard with a destructive left action", () => {
		render(
			<SwipeableWishlistItem productId="prod-1" itemName="Collier Lune">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
		// Le label alimente l'annonce `aria-live` de la primitive.
		expect(screen.getByTestId("left-action-label")).toHaveTextContent(
			"Collier Lune retiré des favoris",
		);
	});

	it("applies the optimistic removal when the swipe threshold fires", () => {
		render(
			<SwipeableWishlistItem productId="prod-1" itemName="Collier Lune">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		fireSwipeRemoval();

		expect(mockAction).toHaveBeenCalledTimes(1);
		const formData = mockAction.mock.calls[0]![0] as FormData;
		expect(formData.get("productId")).toBe("prod-1");
	});

	/**
	 * @regression wishlist-swipe-destructive-without-undo
	 * Le swipe supprimait définitivement, sans confirmation NI undo — alors que
	 * `showWishlistUndoToast` existait déjà dans le module et servait au cœur de la
	 * fiche produit. La carte disparaissant de la grille, il ne restait rien à
	 * re-taper pour revenir en arrière.
	 */
	it("offers an undo — including on mobile, where the card is gone from the grid", () => {
		render(
			<SwipeableWishlistItem productId="prod-1" itemName="Collier Lune">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		fireSwipeRemoval();

		expect(mockShowUndoToast).toHaveBeenCalledWith(
			expect.objectContaining({
				productId: "prod-1",
				productTitle: "Collier Lune",
				allowUndoOnMobile: true,
			}),
		);
	});

	it("plays the discoverability peek on the first card only", () => {
		const { rerender } = render(
			<SwipeableWishlistItem productId="prod-1" isFirst>
				<div>Content</div>
			</SwipeableWishlistItem>,
		);
		expect(capturedSwipeProps.current?.peek).toBe(true);

		rerender(
			<SwipeableWishlistItem productId="prod-2">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);
		expect(capturedSwipeProps.current?.peek).toBe(false);
	});
});
