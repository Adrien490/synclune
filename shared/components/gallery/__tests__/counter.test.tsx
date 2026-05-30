import { cleanup, render } from "@testing-library/react";
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
			const { container } = render(<GalleryCounter current={0} total={5} />);

			expect(container).toHaveTextContent("1 / 5");
		});

		it("displays correct total", () => {
			const { container } = render(<GalleryCounter current={2} total={8} />);

			expect(container).toHaveTextContent("3 / 8");
		});

		it("displays last image correctly", () => {
			const { container } = render(<GalleryCounter current={4} total={5} />);

			expect(container).toHaveTextContent("5 / 5");
		});
	});

	// ============================================================================
	// Accessibility — badge visuel only (l'annonce SR vit dans la galerie, région unique)
	// ============================================================================

	describe("accessibility", () => {
		it("the badge is aria-hidden (pas de live region dupliquée)", () => {
			const { container } = render(<GalleryCounter current={0} total={3} />);

			const badge = container.querySelector("[aria-hidden='true']");
			expect(badge).not.toBeNull();
			expect(badge).toHaveTextContent("1 / 3");
		});

		it("does not expose a status role (single live region pattern)", () => {
			const { queryByRole } = render(<GalleryCounter current={0} total={3} />);

			expect(queryByRole("status")).not.toBeInTheDocument();
		});
	});

	// ============================================================================
	// Responsive (desktop-only — GalleryDots prend le relais mobile)
	// ============================================================================

	describe("responsive", () => {
		it("wrapper is hidden on mobile (hidden sm:block)", () => {
			const { container } = render(<GalleryCounter current={0} total={3} />);

			const wrapper = container.firstElementChild;
			expect(wrapper?.className).toContain("hidden");
			expect(wrapper?.className).toContain("sm:block");
		});
	});
});
