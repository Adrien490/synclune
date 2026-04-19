import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockHaptic, mockUseReducedMotion } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
	mockUseReducedMotion: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("motion/react", async () => {
	const React = await import("react");
	return {
		AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		m: {
			div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
				<div {...props}>{children}</div>
			),
			button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
				<button {...props}>{children}</button>
			),
		},
		useReducedMotion: () => mockUseReducedMotion(),
	};
});

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { ProductCardLongPress } from "../product-card-long-press";

// ============================================================================
// Helpers
// ============================================================================

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

/**
 * Simulate a full long-press gesture (touchstart + 500ms timer elapsed).
 * The wrapper div with role=undefined is the direct parent of `children`.
 */
function triggerLongPress() {
	const wrapper = document.querySelector("[class*='touch-manipulation']") as HTMLElement | null;
	if (!wrapper) throw new Error("wrapper not found");
	act(() => {
		fireEvent.touchStart(wrapper, {
			touches: [{ clientX: 10, clientY: 10 }],
		});
		vi.advanceTimersByTime(550);
	});
}

// ============================================================================
// Tests
// ============================================================================

describe("ProductCardLongPress", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseReducedMotion.mockReturnValue(false);
		vi.useFakeTimers({ shouldAdvanceTime: false });
	});

	describe("initial render", () => {
		it("renders children without the quick-action menu", () => {
			render(
				<ProductCardLongPress productTitle="Bague Lune" productUrl="/creations/bague-lune">
					<div data-testid="card-content">Content</div>
				</ProductCardLongPress>,
			);
			expect(screen.getByTestId("card-content")).toBeInTheDocument();
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});
	});

	describe("long-press triggers quick action menu", () => {
		it("opens the menu when long press fires", () => {
			render(
				<ProductCardLongPress
					productTitle="Bague Lune"
					productUrl="/creations/bague-lune"
					onWishlist={vi.fn()}
				>
					<div>Card</div>
				</ProductCardLongPress>,
			);
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();

			triggerLongPress();

			const menu = screen.getByRole("menu");
			expect(menu).toBeInTheDocument();
			expect(menu).toHaveAttribute("aria-label", "Actions rapides pour Bague Lune");
		});

		it("triggers medium haptic on long-press", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			expect(mockHaptic).toHaveBeenCalledWith("medium");
		});
	});

	describe("menu actions", () => {
		it("renders wishlist menuitem when onWishlist prop is provided", () => {
			const onWishlist = vi.fn();
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b" onWishlist={onWishlist}>
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			expect(screen.getByRole("menuitem", { name: /favoris/i })).toBeInTheDocument();
		});

		it("omits wishlist menuitem when onWishlist prop is absent", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			expect(screen.queryByRole("menuitem", { name: /favoris/i })).not.toBeInTheDocument();
		});

		it("always renders 'Voir le produit' link with correct href", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/bague-argent">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			const viewLink = screen.getByRole("menuitem", { name: "Voir le produit" });
			expect(viewLink).toHaveAttribute("href", "/creations/bague-argent");
		});

		it("renders share menuitem", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			expect(screen.getByRole("menuitem", { name: "Partager" })).toBeInTheDocument();
		});
	});

	describe("wishlist interaction", () => {
		it("calls onWishlist and fires light haptic on click", () => {
			const onWishlist = vi.fn();
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b" onWishlist={onWishlist}>
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			const button = screen.getByRole("menuitem", { name: /favoris/i });
			fireEvent.click(button);

			expect(onWishlist).toHaveBeenCalledTimes(1);
			expect(mockHaptic).toHaveBeenCalledWith("light");
		});

		it("closes the menu after wishlist click", () => {
			const onWishlist = vi.fn();
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b" onWishlist={onWishlist}>
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			fireEvent.click(screen.getByRole("menuitem", { name: /favoris/i }));
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});
	});

	describe("share interaction", () => {
		it("calls onShare prop when provided", () => {
			const onShare = vi.fn();
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b" onShare={onShare}>
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			fireEvent.click(screen.getByRole("menuitem", { name: "Partager" }));
			expect(onShare).toHaveBeenCalledTimes(1);
		});
	});

	describe("backdrop dismissal", () => {
		it("closes menu when backdrop is clicked", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress();
			expect(screen.getByRole("menu")).toBeInTheDocument();

			const backdrop = screen.getByRole("button", { name: "Fermer le menu" });
			fireEvent.click(backdrop);

			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});
	});

	describe("reduced motion", () => {
		it("respects prefers-reduced-motion (does not throw)", () => {
			mockUseReducedMotion.mockReturnValue(true);
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			expect(() => triggerLongPress()).not.toThrow();
			expect(screen.getByRole("menu")).toBeInTheDocument();
		});
	});

	describe("gesture cancellation", () => {
		it("does not open menu if touch moves beyond tolerance", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			const wrapper = document.querySelector("[class*='touch-manipulation']") as HTMLElement;
			act(() => {
				fireEvent.touchStart(wrapper, { touches: [{ clientX: 10, clientY: 10 }] });
				fireEvent.touchMove(wrapper, { touches: [{ clientX: 50, clientY: 50 }] });
				vi.advanceTimersByTime(600);
			});
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});

		it("does not open menu if touch ends before delay", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			const wrapper = document.querySelector("[class*='touch-manipulation']") as HTMLElement;
			act(() => {
				fireEvent.touchStart(wrapper, { touches: [{ clientX: 10, clientY: 10 }] });
				fireEvent.touchEnd(wrapper);
				vi.advanceTimersByTime(600);
			});
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});
	});
});
