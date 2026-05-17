import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS — neutralise motion/react to render direct DOM in JSDOM.
// We strip the motion-only props (initial/animate/exit/transition) so React
// does not emit `Unknown DOM property` warnings.
// ============================================================================

let reducedMotionFlag = false;

vi.mock("motion/react", async () => {
	const { createElement, Fragment } = await import("react");

	const makeStub =
		(tag: string) =>
		({
			initial: _initial,
			animate: _animate,
			exit: _exit,
			transition: _transition,
			...rest
		}: Record<string, unknown> & { children?: React.ReactNode }) =>
			createElement(tag, rest);

	return {
		AnimatePresence: ({ children }: { children: React.ReactNode }) =>
			createElement(Fragment, null, children),
		m: new Proxy(
			{},
			{
				get: (_t, tag: string) => makeStub(tag),
			},
		),
		useReducedMotion: () => reducedMotionFlag,
	};
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { CountBadge } from "../count-badge";

const defaultProps = {
	count: 3,
	singularLabel: "article dans votre panier",
	pluralLabel: "articles dans votre panier",
} as const;

describe("CountBadge", () => {
	afterEach(() => {
		cleanup();
		reducedMotionFlag = false;
	});

	// ============================================================================
	// VISIBILITY
	// ============================================================================

	it("renders nothing visible when count = 0", () => {
		render(<CountBadge {...defaultProps} count={0} />);
		expect(screen.queryByText("0")).not.toBeInTheDocument();
		expect(screen.queryByText(/article/)).not.toBeInTheDocument();
	});

	it("renders nothing visible when count is negative", () => {
		render(<CountBadge {...defaultProps} count={-5} />);
		expect(screen.queryByText("-5")).not.toBeInTheDocument();
	});

	it("displays exact count when 1-99", () => {
		render(<CountBadge {...defaultProps} count={42} />);
		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("caps display to '99+' when count > 99", () => {
		render(<CountBadge {...defaultProps} count={150} />);
		expect(screen.getByText("99+")).toBeInTheDocument();
	});

	// ============================================================================
	// VARIANTS
	// ============================================================================

	it("applies size=lg classes", () => {
		render(<CountBadge {...defaultProps} size="lg" />);
		const badge = screen.getByText("3");
		expect(badge.className).toContain("min-w-[22px]");
		expect(badge.className).toContain("h-[22px]");
	});

	it("applies size=sm classes", () => {
		render(<CountBadge {...defaultProps} size="sm" />);
		const badge = screen.getByText("3");
		expect(badge.className).toContain("h-4");
		expect(badge.className).toContain("min-w-4");
	});

	it("uses bg-primary by default (unified Synclune brand)", () => {
		render(<CountBadge {...defaultProps} />);
		const badge = screen.getByText("3");
		expect(badge.className).toContain("bg-primary");
		expect(badge.className).not.toContain("bg-destructive");
	});

	it("type=dot hides the number and applies dot dimensions", () => {
		render(<CountBadge {...defaultProps} type="dot" count={7} />);
		expect(screen.queryByText("7")).not.toBeInTheDocument();
		// sr-only annoncement still rendered, but no visible 7
		const badge = document.querySelector(".size-2");
		expect(badge).not.toBeNull();
	});

	it("variant=inline removes ring + shadow", () => {
		render(<CountBadge {...defaultProps} variant="inline" />);
		const badge = screen.getByText("3");
		expect(badge.className).not.toContain("ring-2");
		expect(badge.className).not.toContain("shadow-sm");
	});

	it("variant=raised includes ring-2 ring-background", () => {
		render(<CountBadge {...defaultProps} variant="raised" />);
		const badge = screen.getByText("3");
		expect(badge.className).toContain("ring-2");
		expect(badge.className).toContain("ring-background");
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("announces singular for count = 1 via aria-live polite (without aria-atomic)", () => {
		render(<CountBadge {...defaultProps} count={1} />);
		const live = screen.getByText("1 article dans votre panier");
		expect(live).toHaveAttribute("aria-live", "polite");
		expect(live).not.toHaveAttribute("aria-atomic");
	});

	it("announces plural for count > 1", () => {
		render(<CountBadge {...defaultProps} count={5} />);
		expect(screen.getByText("5 articles dans votre panier")).toBeInTheDocument();
	});

	it("silentLiveRegion suppresses the sr-only announcement", () => {
		render(<CountBadge {...defaultProps} silentLiveRegion />);
		expect(screen.queryByText(/articles dans votre panier/)).not.toBeInTheDocument();
	});

	it("marks the visible badge as aria-hidden", () => {
		render(<CountBadge {...defaultProps} />);
		const badge = screen.getByText("3");
		expect(badge).toHaveAttribute("aria-hidden", "true");
	});

	// ============================================================================
	// PULSE ANIMATION
	// ============================================================================

	it("does not pulse on initial render", () => {
		render(<CountBadge {...defaultProps} count={3} />);
		const badge = screen.getByText("3");
		expect(badge.className).not.toContain("animate-badge-pulse");
	});

	it("applies pulse class when count changes", () => {
		const { rerender } = render(<CountBadge {...defaultProps} count={3} />);
		rerender(<CountBadge {...defaultProps} count={4} />);
		const badge = screen.getByText("4");
		expect(badge.className).toContain("animate-badge-pulse");
	});

	it("removes pulse class after duration elapses", () => {
		vi.useFakeTimers();
		const { rerender } = render(<CountBadge {...defaultProps} count={3} />);
		rerender(<CountBadge {...defaultProps} count={4} />);
		act(() => {
			vi.advanceTimersByTime(700);
		});
		const badge = screen.getByText("4");
		expect(badge.className).not.toContain("animate-badge-pulse");
		vi.useRealTimers();
	});

	it("re-applies pulse class on subsequent count change after duration elapses", () => {
		vi.useFakeTimers();
		const { rerender } = render(<CountBadge {...defaultProps} count={1} />);
		rerender(<CountBadge {...defaultProps} count={2} />);
		expect(screen.getByText("2").className).toContain("animate-badge-pulse");
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(screen.getByText("2").className).not.toContain("animate-badge-pulse");
		rerender(<CountBadge {...defaultProps} count={3} />);
		expect(screen.getByText("3").className).toContain("animate-badge-pulse");
		vi.useRealTimers();
	});

	it("skips pulse when prefers-reduced-motion is set", () => {
		reducedMotionFlag = true;
		const { rerender } = render(<CountBadge {...defaultProps} count={3} />);
		rerender(<CountBadge {...defaultProps} count={4} />);
		const badge = screen.getByText("4");
		expect(badge.className).not.toContain("animate-badge-pulse");
	});

	// ============================================================================
	// FLASH "+N"
	// ============================================================================

	it("renders flash +N when bumpKey changes with positive delta", () => {
		const { rerender } = render(<CountBadge {...defaultProps} count={1} />);
		rerender(<CountBadge {...defaultProps} count={3} bumpKey={1} bumpDelta={2} />);
		expect(screen.getByText("+2")).toBeInTheDocument();
	});

	it("does not render flash when bumpDelta is 0 or negative", () => {
		render(<CountBadge {...defaultProps} count={3} bumpKey={1} bumpDelta={-1} />);
		expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
	});

	it("does not render flash without bumpKey", () => {
		render(<CountBadge {...defaultProps} count={3} bumpDelta={2} />);
		expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
	});

	it("does not render flash when type=dot", () => {
		render(<CountBadge {...defaultProps} count={3} type="dot" bumpKey={1} bumpDelta={2} />);
		expect(screen.queryByText("+2")).not.toBeInTheDocument();
	});

	it("does not render flash when prefers-reduced-motion is set", () => {
		reducedMotionFlag = true;
		render(<CountBadge {...defaultProps} count={3} bumpKey={1} bumpDelta={2} />);
		expect(screen.queryByText("+2")).not.toBeInTheDocument();
	});
});
