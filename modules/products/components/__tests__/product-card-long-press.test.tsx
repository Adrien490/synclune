import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockHaptic, mockUseLongPress, mockUseReducedMotion } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
	mockUseLongPress: vi.fn(),
	mockUseReducedMotion: vi.fn(),
}));

vi.mock("@/shared/hooks/use-long-press", () => ({
	useLongPress: mockUseLongPress,
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

afterEach(cleanup);

function setupLongPress(triggerCallback: { current: null | (() => void) }) {
	mockUseLongPress.mockImplementation(({ onLongPress }: { onLongPress: () => void }) => {
		triggerCallback.current = () => act(() => onLongPress());
		return {
			onTouchStart: vi.fn(),
			onTouchMove: vi.fn(),
			onTouchEnd: vi.fn(),
			onTouchCancel: vi.fn(),
			onClick: vi.fn(),
			isPressing: false,
		};
	});
}

// ============================================================================
// Tests
// ============================================================================

describe("ProductCardLongPress", () => {
	let triggerLongPress: { current: null | (() => void) };

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseReducedMotion.mockReturnValue(false);
		triggerLongPress = { current: null };
		setupLongPress(triggerLongPress);
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

		it("spreads long-press handlers onto the wrapper", () => {
			render(
				<ProductCardLongPress productTitle="Bague" productUrl="/creations/bague">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			expect(mockUseLongPress).toHaveBeenCalledWith(
				expect.objectContaining({ onLongPress: expect.any(Function) }),
			);
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

			triggerLongPress.current!();

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
			triggerLongPress.current!();
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
			triggerLongPress.current!();
			expect(screen.getByRole("menuitem", { name: /favoris/i })).toBeInTheDocument();
		});

		it("omits wishlist menuitem when onWishlist prop is absent", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress.current!();
			expect(screen.queryByRole("menuitem", { name: /favoris/i })).not.toBeInTheDocument();
		});

		it("always renders 'Voir le produit' link with correct href", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/bague-argent">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress.current!();
			const viewLink = screen.getByRole("menuitem", { name: "Voir le produit" });
			expect(viewLink).toHaveAttribute("href", "/creations/bague-argent");
		});

		it("renders share menuitem", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress.current!();
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
			triggerLongPress.current!();
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
			triggerLongPress.current!();
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
			triggerLongPress.current!();
			fireEvent.click(screen.getByRole("menuitem", { name: "Partager" }));
			expect(onShare).toHaveBeenCalledTimes(1);
		});

		it("falls back to navigator.share when onShare is not provided and API exists", async () => {
			const navigatorShare = vi.fn().mockResolvedValue(undefined);
			vi.stubGlobal("navigator", {
				...globalThis.navigator,
				share: navigatorShare,
			});
			render(
				<ProductCardLongPress productTitle="Bague" productUrl="/creations/bague">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress.current!();
			fireEvent.click(screen.getByRole("menuitem", { name: "Partager" }));

			// Allow the promise to settle
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(navigatorShare).toHaveBeenCalledWith(expect.objectContaining({ title: "Bague" }));
			vi.unstubAllGlobals();
		});

		it("swallows errors from navigator.share silently (user-cancelled)", async () => {
			const navigatorShare = vi.fn().mockRejectedValue(new Error("Abort"));
			vi.stubGlobal("navigator", {
				...globalThis.navigator,
				share: navigatorShare,
			});
			render(
				<ProductCardLongPress productTitle="Bague" productUrl="/creations/bague">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress.current!();
			await expect(
				(async () => {
					fireEvent.click(screen.getByRole("menuitem", { name: "Partager" }));
					await new Promise((resolve) => setTimeout(resolve, 0));
				})(),
			).resolves.not.toThrow();
			vi.unstubAllGlobals();
		});
	});

	describe("backdrop dismissal", () => {
		it("closes menu when backdrop is clicked", () => {
			render(
				<ProductCardLongPress productTitle="B" productUrl="/creations/b">
					<div>Card</div>
				</ProductCardLongPress>,
			);
			triggerLongPress.current!();
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
			expect(() => triggerLongPress.current!()).not.toThrow();
			expect(screen.getByRole("menu")).toBeInTheDocument();
		});
	});
});
