import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh, mockIsPending } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
	mockIsPending: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/products/hooks/use-refresh-products", () => ({
	useRefreshProducts: () => ({
		refresh: mockRefresh,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: ({
		onRefresh,
		isPending,
		label,
		className,
		variant,
	}: {
		onRefresh: () => void;
		isPending: boolean;
		label?: string;
		className?: string;
		variant?: string;
	}) => (
		<button
			onClick={onRefresh}
			disabled={isPending}
			aria-label={label}
			className={className}
			data-variant={variant}
		>
			{label}
		</button>
	),
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { RefreshProductsButton } from "../refresh-products-button";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("RefreshProductsButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	describe("rendering", () => {
		it("renders a button", () => {
			render(<RefreshProductsButton />);
			expect(screen.getByRole("button")).toBeInTheDocument();
		});

		it("renders with label 'Rafraîchir produits'", () => {
			render(<RefreshProductsButton />);
			expect(screen.getByRole("button", { name: "Rafraîchir produits" })).toBeInTheDocument();
		});

		it("renders with default outline variant", () => {
			render(<RefreshProductsButton />);
			expect(screen.getByRole("button")).toHaveAttribute("data-variant", "outline");
		});

		it("renders with custom variant", () => {
			render(<RefreshProductsButton variant="ghost" />);
			expect(screen.getByRole("button")).toHaveAttribute("data-variant", "ghost");
		});

		it("renders with secondary variant", () => {
			render(<RefreshProductsButton variant="secondary" />);
			expect(screen.getByRole("button")).toHaveAttribute("data-variant", "secondary");
		});

		it("passes custom className to RefreshButton", () => {
			render(<RefreshProductsButton className="custom-class" />);
			expect(screen.getByRole("button")).toHaveClass("custom-class");
		});
	});

	// ─── State ────────────────────────────────────────────────────────────────

	describe("state", () => {
		it("is not disabled when not pending", () => {
			mockIsPending.value = false;
			render(<RefreshProductsButton />);
			expect(screen.getByRole("button")).not.toBeDisabled();
		});

		it("is disabled when pending", () => {
			mockIsPending.value = true;
			render(<RefreshProductsButton />);
			expect(screen.getByRole("button")).toBeDisabled();
		});
	});

	// ─── Interaction ──────────────────────────────────────────────────────────

	describe("interaction", () => {
		it("calls refresh when button is clicked", () => {
			render(<RefreshProductsButton />);
			fireEvent.click(screen.getByRole("button"));
			expect(mockRefresh).toHaveBeenCalledTimes(1);
		});

		it("does not call refresh when disabled (pending)", () => {
			mockIsPending.value = true;
			render(<RefreshProductsButton />);
			fireEvent.click(screen.getByRole("button"));
			expect(mockRefresh).not.toHaveBeenCalled();
		});
	});
});
