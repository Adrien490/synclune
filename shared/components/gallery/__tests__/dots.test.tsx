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

	describe("dots mode (total <= 5)", () => {
		it("renders tablist when total is 5", () => {
			render(<GalleryDots current={0} total={5} onSelect={vi.fn()} />);

			expect(screen.getByRole("tablist")).toBeInTheDocument();
		});

		it("renders tablist when total is 2", () => {
			render(<GalleryDots current={0} total={2} onSelect={vi.fn()} />);

			expect(screen.getByRole("tablist")).toBeInTheDocument();
		});

		it("tablist has aria-label 'Navigation galerie'", () => {
			render(<GalleryDots current={0} total={3} onSelect={vi.fn()} />);

			expect(screen.getByRole("tablist")).toHaveAttribute("aria-label", "Navigation galerie");
		});

		it("renders the correct number of tab buttons", () => {
			render(<GalleryDots current={0} total={4} onSelect={vi.fn()} />);

			expect(screen.getAllByRole("tab")).toHaveLength(4);
		});

		it("each dot has role='tab' and correct aria-label", () => {
			render(<GalleryDots current={0} total={3} onSelect={vi.fn()} />);

			const tabs = screen.getAllByRole("tab");
			expect(tabs[0]).toHaveAttribute("aria-label", "Image 1 sur 3");
			expect(tabs[1]).toHaveAttribute("aria-label", "Image 2 sur 3");
			expect(tabs[2]).toHaveAttribute("aria-label", "Image 3 sur 3");
		});

		it("each dot has aria-controls referencing gallery panel", () => {
			render(<GalleryDots current={0} total={3} onSelect={vi.fn()} />);

			const tabs = screen.getAllByRole("tab");
			expect(tabs[0]).toHaveAttribute("aria-controls", "gallery-panel-0");
			expect(tabs[1]).toHaveAttribute("aria-controls", "gallery-panel-1");
			expect(tabs[2]).toHaveAttribute("aria-controls", "gallery-panel-2");
		});

		it("the current dot has aria-selected='true'", () => {
			render(<GalleryDots current={1} total={3} onSelect={vi.fn()} />);

			const tabs = screen.getAllByRole("tab");
			expect(tabs[0]).toHaveAttribute("aria-selected", "false");
			expect(tabs[1]).toHaveAttribute("aria-selected", "true");
			expect(tabs[2]).toHaveAttribute("aria-selected", "false");
		});

		it("the first dot has aria-selected='true' when current=0", () => {
			render(<GalleryDots current={0} total={3} onSelect={vi.fn()} />);

			const tabs = screen.getAllByRole("tab");
			expect(tabs[0]).toHaveAttribute("aria-selected", "true");
		});

		it("clicking a dot calls onSelect with the correct index", () => {
			const onSelect = vi.fn();
			render(<GalleryDots current={0} total={3} onSelect={onSelect} />);

			const tabs = screen.getAllByRole("tab");
			fireEvent.click(tabs[2]!);

			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenCalledWith(2);
		});

		it("clicking the first dot calls onSelect with index 0", () => {
			const onSelect = vi.fn();
			render(<GalleryDots current={2} total={3} onSelect={onSelect} />);

			const tabs = screen.getAllByRole("tab");
			fireEvent.click(tabs[0]!);

			expect(onSelect).toHaveBeenCalledWith(0);
		});
	});

	// ============================================================================
	// Fraction counter mode (total > 5)
	// ============================================================================

	describe("fraction counter mode (total > 5)", () => {
		it("renders fraction counter when total is 6", () => {
			render(<GalleryDots current={0} total={6} onSelect={vi.fn()} />);

			expect(screen.getByRole("status")).toBeInTheDocument();
			expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
		});

		it("renders fraction counter when total is 10", () => {
			render(<GalleryDots current={4} total={10} onSelect={vi.fn()} />);

			expect(screen.getByRole("status")).toBeInTheDocument();
		});

		it("fraction counter has role='status'", () => {
			render(<GalleryDots current={0} total={7} onSelect={vi.fn()} />);

			expect(screen.getByRole("status")).toBeInTheDocument();
		});

		it("fraction counter has aria-live='polite'", () => {
			render(<GalleryDots current={0} total={7} onSelect={vi.fn()} />);

			expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
		});

		it("fraction counter displays 1-indexed current over total", () => {
			render(<GalleryDots current={2} total={8} onSelect={vi.fn()} />);

			expect(screen.getByRole("status")).toHaveTextContent("3/8");
		});

		it("fraction counter has descriptive aria-label", () => {
			render(<GalleryDots current={1} total={6} onSelect={vi.fn()} />);

			expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Image 2 sur 6");
		});
	});
});
