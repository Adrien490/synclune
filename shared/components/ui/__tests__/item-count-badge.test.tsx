import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockShouldPulse } = vi.hoisted(() => ({
	mockShouldPulse: { value: false },
}));

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

vi.mock("@/shared/hooks", () => ({
	usePulseOnChange: () => mockShouldPulse.value,
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
	beforeEach(() => {
		vi.clearAllMocks();
		mockShouldPulse.value = false;
	});
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

	it("applies pulse class when shouldPulse is true", () => {
		mockShouldPulse.value = true;
		render(<ItemCountBadge {...defaultProps} />);
		const badge = screen.getByTestId("badge");
		expect(badge.className).toContain("animate-badge-pulse");
	});
});
