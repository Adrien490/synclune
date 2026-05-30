import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { GalleryDots } from "../dots";

// ============================================================================
// TESTS
// ============================================================================

describe("GalleryDots", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	// ============================================================================
	// Dots mode (total <= 5)
	// ============================================================================
	// role="group" et non "tablist" : la bande de vignettes est l'unique tablist
	// canonique (pas de double jeu d'onglets pour les lecteurs d'écran).

	describe("dots mode (total <= 5)", () => {
		it("renders a group when total is 5", () => {
			render(<GalleryDots current={0} total={5} onSelect={vi.fn()} />);

			expect(screen.getByRole("group")).toBeInTheDocument();
		});

		it("renders a group when total is 2", () => {
			render(<GalleryDots current={0} total={2} onSelect={vi.fn()} />);

			expect(screen.getByRole("group")).toBeInTheDocument();
		});

		it("does not expose a tablist (single tablist pattern — thumbnails own it)", () => {
			render(<GalleryDots current={0} total={3} onSelect={vi.fn()} />);

			expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
		});

		it("group has aria-label 'Navigation galerie'", () => {
			render(<GalleryDots current={0} total={3} onSelect={vi.fn()} />);

			expect(screen.getByRole("group")).toHaveAttribute("aria-label", "Navigation galerie");
		});

		it("renders the correct number of dot buttons", () => {
			render(<GalleryDots current={0} total={4} onSelect={vi.fn()} />);

			expect(screen.getAllByRole("button")).toHaveLength(4);
		});

		it("each dot button has the correct aria-label", () => {
			render(<GalleryDots current={0} total={3} onSelect={vi.fn()} />);

			const buttons = screen.getAllByRole("button");
			expect(buttons[0]).toHaveAttribute("aria-label", "Image 1 sur 3");
			expect(buttons[1]).toHaveAttribute("aria-label", "Image 2 sur 3");
			expect(buttons[2]).toHaveAttribute("aria-label", "Image 3 sur 3");
		});

		it("the current dot has aria-current='true'", () => {
			render(<GalleryDots current={1} total={3} onSelect={vi.fn()} />);

			const buttons = screen.getAllByRole("button");
			expect(buttons[0]).not.toHaveAttribute("aria-current");
			expect(buttons[1]).toHaveAttribute("aria-current", "true");
			expect(buttons[2]).not.toHaveAttribute("aria-current");
		});

		it("the first dot has aria-current='true' when current=0", () => {
			render(<GalleryDots current={0} total={3} onSelect={vi.fn()} />);

			const buttons = screen.getAllByRole("button");
			expect(buttons[0]).toHaveAttribute("aria-current", "true");
		});

		it("clicking a dot calls onSelect with the correct index", () => {
			const onSelect = vi.fn();
			render(<GalleryDots current={0} total={3} onSelect={onSelect} />);

			const buttons = screen.getAllByRole("button");
			fireEvent.click(buttons[2]!);

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenCalledWith(2);
		});

		it("clicking the first dot calls onSelect with index 0", () => {
			const onSelect = vi.fn();
			render(<GalleryDots current={2} total={3} onSelect={onSelect} />);

			const buttons = screen.getAllByRole("button");
			fireEvent.click(buttons[0]!);

			expect(onSelect).toHaveBeenCalledWith(0);
		});

		it("active and inactive dot spans have no viewTransitionName", () => {
			render(<GalleryDots current={1} total={3} onSelect={vi.fn()} />);

			const buttons = screen.getAllByRole("button");
			const activeSpan = buttons[1]!.querySelector("span") as HTMLSpanElement;
			const inactiveSpan = buttons[0]!.querySelector("span") as HTMLSpanElement;

			expect(activeSpan.style.viewTransitionName).toBe("");
			expect(inactiveSpan.style.viewTransitionName).toBe("");
		});
	});

	// ============================================================================
	// Fraction counter mode (total > 5) — badge visuel only (aria-hidden)
	// ============================================================================
	// L'annonce SR est portée par l'unique région aria-live de la galerie.

	describe("fraction counter mode (total > 5)", () => {
		it("renders a fraction badge when total is 6", () => {
			const { container } = render(<GalleryDots current={0} total={6} onSelect={vi.fn()} />);

			expect(container).toHaveTextContent("1/6");
			expect(screen.queryByRole("group")).not.toBeInTheDocument();
		});

		it("does not expose a status role (single live region pattern)", () => {
			render(<GalleryDots current={0} total={7} onSelect={vi.fn()} />);

			expect(screen.queryByRole("status")).not.toBeInTheDocument();
		});

		it("the fraction badge is aria-hidden", () => {
			const { container } = render(<GalleryDots current={0} total={7} onSelect={vi.fn()} />);

			const badge = container.querySelector("[aria-hidden='true']");
			expect(badge).not.toBeNull();
			expect(badge).toHaveTextContent("1/7");
		});

		it("fraction badge displays 1-indexed current over total", () => {
			const { container } = render(<GalleryDots current={2} total={8} onSelect={vi.fn()} />);

			expect(container).toHaveTextContent("3/8");
		});

		it("fraction badge displays correct value mid-range", () => {
			const { container } = render(<GalleryDots current={4} total={10} onSelect={vi.fn()} />);

			expect(container).toHaveTextContent("5/10");
		});
	});
});
