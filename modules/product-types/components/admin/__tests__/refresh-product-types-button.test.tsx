import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh, mockIsPending } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/product-types/hooks/use-refresh-product-types", () => ({
	useRefreshProductTypes: () => ({
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

import { RefreshProductTypesButton } from "../refresh-product-types-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RefreshProductTypesButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders a button", () => {
		render(<RefreshProductTypesButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("renders with label 'Rafraîchir types de bijoux'", () => {
		render(<RefreshProductTypesButton />);
		expect(screen.getByRole("button", { name: "Rafraîchir types de bijoux" })).toBeInTheDocument();
	});

	it("renders with default outline variant", () => {
		render(<RefreshProductTypesButton />);
		expect(screen.getByRole("button")).toHaveAttribute("data-variant", "outline");
	});

	it("renders with custom ghost variant", () => {
		render(<RefreshProductTypesButton variant="ghost" />);
		expect(screen.getByRole("button")).toHaveAttribute("data-variant", "ghost");
	});

	it("renders with secondary variant", () => {
		render(<RefreshProductTypesButton variant="secondary" />);
		expect(screen.getByRole("button")).toHaveAttribute("data-variant", "secondary");
	});

	it("passes custom className to RefreshButton", () => {
		render(<RefreshProductTypesButton className="my-custom-class" />);
		expect(screen.getByRole("button")).toHaveClass("my-custom-class");
	});

	// ─── State ────────────────────────────────────────────────────────────────

	it("is not disabled when not pending", () => {
		mockIsPending.value = false;
		render(<RefreshProductTypesButton />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	it("is disabled when pending", () => {
		mockIsPending.value = true;
		render(<RefreshProductTypesButton />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	// ─── Interaction ──────────────────────────────────────────────────────────

	it("calls refresh when button is clicked", () => {
		render(<RefreshProductTypesButton />);
		fireEvent.click(screen.getByRole("button"));
		expect(mockRefresh).toHaveBeenCalledTimes(1);
	});

	it("does not call refresh when disabled (pending)", () => {
		mockIsPending.value = true;
		render(<RefreshProductTypesButton />);
		fireEvent.click(screen.getByRole("button"));
		expect(mockRefresh).not.toHaveBeenCalled();
	});
});
