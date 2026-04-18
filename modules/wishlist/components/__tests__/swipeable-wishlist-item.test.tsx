import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockSwipeOffset, mockIsSwiping, mockOnItemRemoved } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockSwipeOffset: { value: 0 },
	mockIsSwiping: { value: false },
	mockOnItemRemoved: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/wishlist/hooks/use-swipe-to-remove", () => ({
	useSwipeToRemove: vi.fn(() => ({
		swipeOffset: mockSwipeOffset.value,
		isSwiping: mockIsSwiping.value,
	})),
	SWIPE_REMOVE_THRESHOLD: 80,
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

vi.mock("@/shared/utils/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/modules/wishlist/actions/add-to-wishlist", () => ({
	addToWishlist: vi.fn(),
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (sel: (s: { incrementWishlist: () => void }) => unknown) =>
		sel({ incrementWishlist: vi.fn() }),
}));

vi.mock("lucide-react", () => ({
	Trash2: ({ className }: { className?: string }) => (
		<span data-testid="trash-icon" className={className} />
	),
}));

import { SwipeableWishlistItem } from "../swipeable-wishlist-item";

// ============================================================================
// TESTS
// ============================================================================

describe("SwipeableWishlistItem", () => {
	afterEach(() => {
		cleanup();
		mockSwipeOffset.value = 0;
		mockIsSwiping.value = false;
	});

	it("renders children", () => {
		render(
			<SwipeableWishlistItem productId="prod-1">
				<div data-testid="child">Product Card</div>
			</SwipeableWishlistItem>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("renders delete zone behind content", () => {
		render(
			<SwipeableWishlistItem productId="prod-1">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
	});

	it("hides delete zone with opacity 0 when not swiping", () => {
		render(
			<SwipeableWishlistItem productId="prod-1">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		const deleteZone = screen.getByTestId("trash-icon").parentElement!;
		expect(deleteZone).toHaveAttribute("aria-hidden", "true");
		expect(deleteZone).toHaveStyle({ opacity: "0" });
	});

	it("shows delete zone proportional to swipe progress", () => {
		mockSwipeOffset.value = -40; // Half of threshold (80)

		render(
			<SwipeableWishlistItem productId="prod-1">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		const deleteZone = screen.getByTestId("trash-icon").parentElement!;
		expect(deleteZone).toHaveStyle({ opacity: "0.5" });
	});

	it("caps delete zone opacity at 1", () => {
		mockSwipeOffset.value = -160; // Double the threshold

		render(
			<SwipeableWishlistItem productId="prod-1">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		const deleteZone = screen.getByTestId("trash-icon").parentElement!;
		expect(deleteZone).toHaveStyle({ opacity: "1" });
	});

	it("applies transform to sliding content based on swipe offset", () => {
		mockSwipeOffset.value = -50;

		render(
			<SwipeableWishlistItem productId="prod-1">
				<div data-testid="child">Content</div>
			</SwipeableWishlistItem>,
		);

		const slidingContainer = screen.getByTestId("child").parentElement!;
		expect(slidingContainer).toHaveStyle({ transform: "translateX(-50px)" });
	});

	it("disables transition when actively swiping", () => {
		mockSwipeOffset.value = -30;
		mockIsSwiping.value = true;

		render(
			<SwipeableWishlistItem productId="prod-1">
				<div data-testid="child">Content</div>
			</SwipeableWishlistItem>,
		);

		const slidingContainer = screen.getByTestId("child").parentElement!;
		expect(slidingContainer).toHaveStyle({ transition: "none" });
	});

	it("enables snap-back transition when not swiping", () => {
		mockSwipeOffset.value = 0;
		mockIsSwiping.value = false;

		render(
			<SwipeableWishlistItem productId="prod-1">
				<div data-testid="child">Content</div>
			</SwipeableWishlistItem>,
		);

		const slidingContainer = screen.getByTestId("child").parentElement!;
		expect(slidingContainer).toHaveStyle({ transition: "transform 200ms ease-out" });
	});

	it("has touch-pan-y class for scroll coexistence", () => {
		const { container } = render(
			<SwipeableWishlistItem productId="prod-1">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("touch-pan-y");
	});

	it("has overflow-hidden to clip sliding content", () => {
		const { container } = render(
			<SwipeableWishlistItem productId="prod-1">
				<div>Content</div>
			</SwipeableWishlistItem>,
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("overflow-hidden");
	});
});
