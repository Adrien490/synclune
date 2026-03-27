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

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		className,
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		className?: string;
	}) => (
		<button onClick={onClick} aria-label={ariaLabel} className={className}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	ChevronLeft: ({ className }: { className?: string }) => (
		<svg data-testid="chevron-left" className={className} aria-hidden="true" />
	),
	ChevronRight: ({ className }: { className?: string }) => (
		<svg data-testid="chevron-right" className={className} aria-hidden="true" />
	),
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import React from "react";
import { GalleryNavigation } from "../navigation";

// ============================================================================
// TESTS
// ============================================================================

describe("GalleryNavigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	// ============================================================================
	// Rendering
	// ============================================================================

	describe("rendering", () => {
		it("renders prev button with aria-label 'Image précédente'", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			expect(screen.getByRole("button", { name: "Image précédente" })).toBeInTheDocument();
		});

		it("renders next button with aria-label 'Image suivante'", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			expect(screen.getByRole("button", { name: "Image suivante" })).toBeInTheDocument();
		});

		it("renders ChevronLeft icon inside prev button", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			expect(screen.getByTestId("chevron-left")).toBeInTheDocument();
		});

		it("renders ChevronRight icon inside next button", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
		});

		it("icons are aria-hidden", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			expect(screen.getByTestId("chevron-left")).toHaveAttribute("aria-hidden", "true");
			expect(screen.getByTestId("chevron-right")).toHaveAttribute("aria-hidden", "true");
		});
	});

	// ============================================================================
	// Interaction
	// ============================================================================

	describe("interaction", () => {
		it("clicking prev button calls onPrev", () => {
			const onPrev = vi.fn();
			render(<GalleryNavigation onPrev={onPrev} onNext={vi.fn()} />);

			fireEvent.click(screen.getByRole("button", { name: "Image précédente" }));

			expect(onPrev).toHaveBeenCalledTimes(1);
		});

		it("clicking next button calls onNext", () => {
			const onNext = vi.fn();
			render(<GalleryNavigation onPrev={vi.fn()} onNext={onNext} />);

			fireEvent.click(screen.getByRole("button", { name: "Image suivante" }));

			expect(onNext).toHaveBeenCalledTimes(1);
		});

		it("clicking prev does not call onNext", () => {
			const onNext = vi.fn();
			render(<GalleryNavigation onPrev={vi.fn()} onNext={onNext} />);

			fireEvent.click(screen.getByRole("button", { name: "Image précédente" }));

			expect(onNext).not.toHaveBeenCalled();
		});

		it("clicking next does not call onPrev", () => {
			const onPrev = vi.fn();
			render(<GalleryNavigation onPrev={onPrev} onNext={vi.fn()} />);

			fireEvent.click(screen.getByRole("button", { name: "Image suivante" }));

			expect(onPrev).not.toHaveBeenCalled();
		});
	});

	// ============================================================================
	// Reduced motion
	// ============================================================================

	describe("reduced motion", () => {
		it("renders both buttons regardless of reduced motion preference", () => {
			mockReducedMotion.value = true;
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			expect(screen.getByRole("button", { name: "Image précédente" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Image suivante" })).toBeInTheDocument();
		});
	});
});
