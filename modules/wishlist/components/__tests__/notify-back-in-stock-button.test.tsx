import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending, mockIsInWishlist } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
	mockIsInWishlist: { value: false },
}));

vi.mock("@/modules/wishlist/hooks/use-wishlist-toggle", () => ({
	useWishlistToggle: vi.fn(() => ({
		isInWishlist: mockIsInWishlist.value,
		action: mockAction,
		isPending: mockIsPending.value,
	})),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		variant,
		size: _size,
		"aria-label": ariaLabel,
		"aria-busy": ariaBusy,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		variant?: string;
		size?: string;
		"aria-label"?: string;
		"aria-busy"?: boolean;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | "reset" | undefined}
			data-variant={variant}
			aria-label={ariaLabel}
			aria-busy={ariaBusy}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Bell: () => <svg data-testid="icon-bell" />,
	Check: () => <svg data-testid="icon-check" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { NotifyBackInStockButton } from "../notify-back-in-stock-button";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
	mockIsInWishlist.value = false;
});

beforeEach(() => {
	mockIsPending.value = false;
	mockIsInWishlist.value = false;
});

describe("NotifyBackInStockButton", () => {
	// ─── Not in wishlist state ────────────────────────────────────────────────

	it("renders a form with submit button when not in wishlist", () => {
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={false} />,
		);
		expect(screen.getByRole("button")).toBeInTheDocument();
		expect(document.querySelector("form")).not.toBeNull();
	});

	it("renders bell icon when not in wishlist", () => {
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={false} />,
		);
		expect(screen.getByTestId("icon-bell")).toBeInTheDocument();
	});

	it("shows 'M'alerter quand disponible' text when not in wishlist", () => {
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={false} />,
		);
		expect(screen.getByRole("button").textContent).toContain("M");
		expect(document.body.textContent).toContain("alerter");
	});

	it("has correct aria-label with product title", () => {
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={false} />,
		);
		expect(screen.getByRole("button")).toHaveAttribute(
			"aria-label",
			"M'alerter quand Bague Lune sera disponible",
		);
	});

	it("includes hidden input with productId", () => {
		const { container } = render(
			<NotifyBackInStockButton
				productId="prod-42"
				productTitle="Bague Lune"
				isInWishlist={false}
			/>,
		);
		const input = container.querySelector('input[name="productId"]') as HTMLInputElement;
		expect(input.value).toBe("prod-42");
	});

	it("button is enabled when not pending", () => {
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={false} />,
		);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Enregistrement…' when isPending is true", () => {
		mockIsPending.value = true;
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={false} />,
		);
		expect(document.body.textContent).toContain("Enregistrement…");
	});

	it("disables button when isPending is true", () => {
		mockIsPending.value = true;
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={false} />,
		);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("sets aria-busy=true when pending", () => {
		mockIsPending.value = true;
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={false} />,
		);
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
	});

	// ─── In wishlist state ────────────────────────────────────────────────────

	it("shows confirmation message when isInWishlist is true", () => {
		mockIsInWishlist.value = true;
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={true} />,
		);
		expect(document.body.textContent).toContain("Vous serez notifié");
	});

	it("shows check icon when isInWishlist is true", () => {
		mockIsInWishlist.value = true;
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={true} />,
		);
		expect(screen.getByTestId("icon-check")).toBeInTheDocument();
	});

	it("does not render a button when isInWishlist is true", () => {
		mockIsInWishlist.value = true;
		render(
			<NotifyBackInStockButton productId="prod-1" productTitle="Bague Lune" isInWishlist={true} />,
		);
		expect(screen.queryByRole("button")).toBeNull();
	});
});
