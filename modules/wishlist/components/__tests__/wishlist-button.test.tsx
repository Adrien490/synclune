import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockIsInWishlist } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockIsInWishlist: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/wishlist/hooks/use-wishlist-toggle", () => ({
	useWishlistToggle: vi.fn(() => ({
		isInWishlist: mockIsInWishlist.value,
		action: mockAction,
		isPending: mockIsPending.value,
		state: undefined,
	})),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		"aria-label": ariaLabel,
		"aria-pressed": ariaPressed,
		"aria-busy": ariaBusy,
		type,
		title,
		onClick,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-label"?: string;
		"aria-pressed"?: boolean;
		"aria-busy"?: boolean;
		type?: string;
		title?: string;
		onClick?: React.MouseEventHandler<HTMLButtonElement>;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			aria-label={ariaLabel}
			aria-pressed={ariaPressed}
			aria-busy={ariaBusy}
			type={type as "submit" | "button" | "reset" | undefined}
			title={title}
			onClick={onClick}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/icons/heart-icon", () => ({
	HeartIcon: ({ variant, className }: { variant?: string; className?: string }) => (
		<svg data-testid="heart-icon" data-variant={variant ?? "outline"} className={className} />
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { WishlistButton } from "../wishlist-button";
import { useWishlistToggle } from "@/modules/wishlist/hooks/use-wishlist-toggle";

// ============================================================================
// HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
	mockIsInWishlist.value = false;
});

function renderButton(overrides: Partial<React.ComponentProps<typeof WishlistButton>> = {}) {
	const props = {
		productId: "prod-1",
		isInWishlist: false,
		...overrides,
	};
	return render(<WishlistButton {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("WishlistButton", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders a heart icon", () => {
		renderButton();
		expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
	});

	it("renders a form wrapping the button", () => {
		const { container } = renderButton();
		expect(container.querySelector("form")).not.toBeNull();
	});

	it("renders a submit button inside the form", () => {
		renderButton();
		expect(screen.getByRole("button")).toBeInTheDocument();
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	it("includes a hidden input with the productId", () => {
		const { container } = renderButton({ productId: "prod-42" });
		const input = container.querySelector('input[name="productId"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("prod-42");
	});

	// ─── Heart icon variant ───────────────────────────────────────────────────

	it("shows filled heart icon when isInWishlist is true", () => {
		mockIsInWishlist.value = true;
		renderButton({ isInWishlist: true });
		expect(screen.getByTestId("heart-icon")).toHaveAttribute("data-variant", "filled");
	});

	it("shows outline heart icon when isInWishlist is false", () => {
		mockIsInWishlist.value = false;
		renderButton({ isInWishlist: false });
		expect(screen.getByTestId("heart-icon")).toHaveAttribute("data-variant", "outline");
	});

	// ─── Accessibility ────────────────────────────────────────────────────────

	it("has aria-label when no product title is provided", () => {
		renderButton({ isInWishlist: false });
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("aria-label", "Ajouter à la wishlist");
	});

	it("has aria-label with product title when productTitle is provided and not in wishlist", () => {
		renderButton({ isInWishlist: false, productTitle: "Bague Lune" });
		expect(screen.getByRole("button")).toHaveAttribute(
			"aria-label",
			"Ajouter Bague Lune à la wishlist",
		);
	});

	it("has aria-label to remove when isInWishlist is true with product title", () => {
		mockIsInWishlist.value = true;
		renderButton({ isInWishlist: true, productTitle: "Bague Lune" });
		expect(screen.getByRole("button")).toHaveAttribute(
			"aria-label",
			"Retirer Bague Lune de la wishlist",
		);
	});

	it("has aria-pressed=false when not in wishlist", () => {
		mockIsInWishlist.value = false;
		renderButton({ isInWishlist: false });
		expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
	});

	it("has aria-pressed=true when in wishlist", () => {
		mockIsInWishlist.value = true;
		renderButton({ isInWishlist: true });
		expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
	});

	it("has aria-busy=true when isPending is true", () => {
		mockIsPending.value = true;
		renderButton();
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
	});

	it("has aria-busy=false when not pending", () => {
		mockIsPending.value = false;
		renderButton();
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
	});

	// ─── Pending / disabled state ─────────────────────────────────────────────

	it("sets aria-busy=true on the button when isPending is true", () => {
		mockIsPending.value = true;
		renderButton();
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
	});

	it("does not set aria-busy when not pending", () => {
		mockIsPending.value = false;
		renderButton();
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
	});

	// ─── Hook integration ─────────────────────────────────────────────────────

	it("passes productId and productTitle as trackingData to useWishlistToggle", () => {
		renderButton({ productId: "prod-99", productTitle: "Collier Étoile" });
		expect(useWishlistToggle).toHaveBeenCalledWith(
			expect.objectContaining({
				trackingData: { productId: "prod-99", productName: "Collier Étoile" },
			}),
		);
	});

	it("uses 'Produit' as fallback productName when productTitle is not provided", () => {
		renderButton({ productId: "prod-1" });
		expect(useWishlistToggle).toHaveBeenCalledWith(
			expect.objectContaining({
				trackingData: { productId: "prod-1", productName: "Produit" },
			}),
		);
	});

	// ─── Click behaviour ──────────────────────────────────────────────────────

	it("button click does not throw and completes normally", () => {
		renderButton();
		expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
	});
});
