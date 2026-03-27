import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { GalleryCounter } from "../counter";

// ============================================================================
// TESTS
// ============================================================================

describe("GalleryCounter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(cleanup);

	// ============================================================================
	// Rendering
	// ============================================================================

	describe("rendering", () => {
		it("displays 1-indexed current value (current=0 shows '1 / 5')", () => {
			render(<GalleryCounter current={0} total={5} />);

			expect(screen.getByRole("status")).toHaveTextContent("1 / 5");
		});

		it("displays correct total", () => {
			render(<GalleryCounter current={2} total={8} />);

			expect(screen.getByRole("status")).toHaveTextContent("3 / 8");
		});

		it("displays last image correctly", () => {
			render(<GalleryCounter current={4} total={5} />);

			expect(screen.getByRole("status")).toHaveTextContent("5 / 5");
		});
	});

	// ============================================================================
	// Accessibility
	// ============================================================================

	describe("accessibility", () => {
		it("has role='status'", () => {
			render(<GalleryCounter current={0} total={3} />);

			expect(screen.getByRole("status")).toBeInTheDocument();
		});

		it("has aria-live='polite'", () => {
			render(<GalleryCounter current={0} total={3} />);

			expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
		});

		it("aria-label uses 1-indexed current value", () => {
			render(<GalleryCounter current={0} total={5} />);

			expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Image 1 sur 5");
		});

		it("aria-label updates when current changes", () => {
			render(<GalleryCounter current={3} total={5} />);

			expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Image 4 sur 5");
		});
	});
});
