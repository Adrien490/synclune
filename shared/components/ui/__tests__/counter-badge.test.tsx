import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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

import { CounterBadge } from "../counter-badge";

describe("CounterBadge", () => {
	beforeEach(vi.clearAllMocks);
	afterEach(cleanup);

	// ============================================================================
	// STATUS THRESHOLDS (tested indirectly via className)
	// ============================================================================

	it("applies 'low' variant for percentage < 33%", () => {
		render(<CounterBadge count={3} max={100} label="items" />);
		const badge = screen.getByTestId("badge");
		expect(badge.className).toContain("bg-success");
	});

	it("applies 'medium' variant for percentage 33%-65%", () => {
		render(<CounterBadge count={50} max={100} label="items" />);
		const badge = screen.getByTestId("badge");
		expect(badge.className).toContain("bg-warning");
		expect(badge.className).not.toContain("bg-warning/30");
	});

	it("applies 'high' variant for percentage 66%-89%", () => {
		render(<CounterBadge count={80} max={100} label="items" />);
		const badge = screen.getByTestId("badge");
		expect(badge.className).toContain("bg-warning/30");
	});

	it("applies 'critical' variant for percentage >= 90%", () => {
		render(<CounterBadge count={95} max={100} label="items" />);
		const badge = screen.getByTestId("badge");
		expect(badge.className).toContain("bg-destructive");
	});

	// ============================================================================
	// CONTENT
	// ============================================================================

	it("renders count/max and label", () => {
		render(<CounterBadge count={5} max={10} label="utilisés" />);
		expect(screen.getByText("5/10 utilisés")).toBeInTheDocument();
	});

	it("renders icon when provided", () => {
		const MockIcon = (props: React.SVGProps<SVGSVGElement>) => (
			<svg data-testid="icon" {...props} />
		);
		render(<CounterBadge count={1} max={10} label="test" icon={MockIcon as never} />);
		expect(screen.getByTestId("icon")).toBeInTheDocument();
	});

	it("does not render icon when not provided", () => {
		render(<CounterBadge count={1} max={10} label="test" />);
		expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("has role='status', aria-live='polite', aria-atomic='true'", () => {
		render(<CounterBadge count={1} max={10} label="test" />);
		const badge = screen.getByRole("status");
		expect(badge).toHaveAttribute("aria-live", "polite");
		expect(badge).toHaveAttribute("aria-atomic", "true");
	});
});
