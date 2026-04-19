import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
		<span data-testid="badge" {...props}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { ItemCountBadge } from "../item-count-badge";

const defaultProps = {
	count: 3,
	singularLabel: "article dans votre panier",
	pluralLabel: "articles dans votre panier",
};

describe("ItemCountBadge", () => {
	afterEach(cleanup);

	// ============================================================================
	// NULL RENDERING
	// ============================================================================

	it("returns null when count is 0", () => {
		const { container } = render(<ItemCountBadge {...defaultProps} count={0} />);
		expect(container.innerHTML).toBe("");
	});

	it("returns null when count is negative", () => {
		const { container } = render(<ItemCountBadge {...defaultProps} count={-1} />);
		expect(container.innerHTML).toBe("");
	});

	// ============================================================================
	// DISPLAY COUNT
	// ============================================================================

	it("displays exact count when <= 99", () => {
		render(<ItemCountBadge {...defaultProps} count={42} />);
		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("displays '99+' when count > 99", () => {
		render(<ItemCountBadge {...defaultProps} count={150} />);
		expect(screen.getByText("99+")).toBeInTheDocument();
	});

	// ============================================================================
	// ARIA-LIVE ANNOUNCEMENTS
	// ============================================================================

	it("announces singular label for count = 1", () => {
		render(<ItemCountBadge {...defaultProps} count={1} />);
		expect(screen.getByText("1 article dans votre panier")).toBeInTheDocument();
	});

	it("announces plural label for count > 1", () => {
		render(<ItemCountBadge {...defaultProps} count={5} />);
		expect(screen.getByText("5 articles dans votre panier")).toBeInTheDocument();
	});

	// ============================================================================
	// BADGE ATTRIBUTES
	// ============================================================================

	it("renders badge with aria-hidden='true'", () => {
		render(<ItemCountBadge {...defaultProps} />);
		const badge = screen.getByTestId("badge");
		expect(badge).toHaveAttribute("aria-hidden", "true");
	});

	// ============================================================================
	// PULSE ANIMATION
	// ============================================================================

	it("does not pulse on initial render", () => {
		render(<ItemCountBadge {...defaultProps} count={3} />);
		const badge = screen.getByTestId("badge");
		expect(badge.className).not.toContain("animate-badge-pulse");
	});

	it("applies pulse class when count changes", () => {
		const { rerender } = render(<ItemCountBadge {...defaultProps} count={3} />);
		rerender(<ItemCountBadge {...defaultProps} count={4} />);
		const badge = screen.getByTestId("badge");
		expect(badge.className).toContain("animate-badge-pulse");
	});

	it("removes pulse class after duration elapses", () => {
		vi.useFakeTimers();
		const { rerender } = render(<ItemCountBadge {...defaultProps} count={3} />);
		rerender(<ItemCountBadge {...defaultProps} count={4} />);
		act(() => {
			vi.advanceTimersByTime(700);
		});
		const badge = screen.getByTestId("badge");
		expect(badge.className).not.toContain("animate-badge-pulse");
		vi.useRealTimers();
	});
});
