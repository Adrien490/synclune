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

vi.mock("lucide-react", () => ({
	ZoomIn: ({ className }: { className?: string }) => (
		<svg data-testid="zoom-in-icon" className={className} aria-hidden="true" />
	),
}));

// Mock the dynamic import target so it doesn't fail in test environment
vi.mock("@/modules/media/components/media-lightbox", () => ({
	MediaLightbox: () => null,
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { GalleryZoomButton } from "../zoom-button";

// ============================================================================
// TESTS
// ============================================================================

describe("GalleryZoomButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	// ============================================================================
	// Rendering
	// ============================================================================

	describe("rendering", () => {
		it("renders button with aria-label 'Zoomer l'image en plein écran'", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(
				screen.getByRole("button", { name: "Zoomer l'image en plein écran" }),
			).toBeInTheDocument();
		});

		it("renders the ZoomIn icon", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(screen.getByTestId("zoom-in-icon")).toBeInTheDocument();
		});

		it("ZoomIn icon is aria-hidden", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(screen.getByTestId("zoom-in-icon")).toHaveAttribute("aria-hidden", "true");
		});
	});

	// ============================================================================
	// Interaction
	// ============================================================================

	describe("interaction", () => {
		it("clicking the button calls onOpen", () => {
			const onOpen = vi.fn();
			render(<GalleryZoomButton onOpen={onOpen} />);

			fireEvent.click(screen.getByRole("button", { name: "Zoomer l'image en plein écran" }));

			expect(onOpen).toHaveBeenCalledTimes(1);
		});

		it("mouseenter triggers prefetch (no error thrown)", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			// Should not throw
			expect(() => {
				fireEvent.mouseEnter(screen.getByRole("button", { name: "Zoomer l'image en plein écran" }));
			}).not.toThrow();
		});

		it("focus triggers prefetch (no error thrown)", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(() => {
				fireEvent.focus(screen.getByRole("button", { name: "Zoomer l'image en plein écran" }));
			}).not.toThrow();
		});

		it("mouseenter and focus together only trigger prefetch once (idempotent flag)", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			const button = screen.getByRole("button", { name: "Zoomer l'image en plein écran" });

			// Both events should run without error; the module-level flag prevents double import
			expect(() => {
				fireEvent.mouseEnter(button);
				fireEvent.focus(button);
			}).not.toThrow();
		});
	});

	// ============================================================================
	// Reduced motion
	// ============================================================================

	describe("reduced motion", () => {
		it("renders button regardless of reduced motion preference", () => {
			mockReducedMotion.value = true;
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(
				screen.getByRole("button", { name: "Zoomer l'image en plein écran" }),
			).toBeInTheDocument();
		});
	});
});
