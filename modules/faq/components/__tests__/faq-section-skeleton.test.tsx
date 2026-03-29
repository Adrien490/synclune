import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} aria-hidden="true" />
	),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: {
		section: "py-16 md:py-24",
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FaqSectionSkeleton } from "../faq-section-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("FaqSectionSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders without crashing", () => {
		expect(() => render(<FaqSectionSkeleton />)).not.toThrow();
	});

	it("renders a section element", () => {
		const { container } = render(<FaqSectionSkeleton />);
		const section = container.querySelector("section");
		expect(section).not.toBeNull();
	});

	// ─── Accessibility ────────────────────────────────────────────────────────

	it("has aria-label describing loading state", () => {
		render(<FaqSectionSkeleton />);
		expect(screen.getByLabelText("Chargement des questions frequentes")).toBeInTheDocument();
	});

	// ─── Skeleton structure ───────────────────────────────────────────────────

	it("renders skeleton items for the header", () => {
		render(<FaqSectionSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		// At least title + subtitle skeletons
		expect(skeletons.length).toBeGreaterThanOrEqual(2);
	});

	it("renders 6 accordion skeleton items", () => {
		const { container } = render(<FaqSectionSkeleton />);
		// Each accordion item wraps its skeleton in a div with rounded-xl border
		const accordionItems = container.querySelectorAll(".rounded-xl.border");
		expect(accordionItems).toHaveLength(6);
	});

	it("renders CTA skeleton section", () => {
		const { container } = render(<FaqSectionSkeleton />);
		// The CTA card div has rounded-2xl border
		const ctaSection = container.querySelector(".rounded-2xl");
		expect(ctaSection).not.toBeNull();
	});

	// ─── Total skeleton count ─────────────────────────────────────────────────

	it("renders the correct total number of skeleton elements", () => {
		render(<FaqSectionSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		// 2 header + 6 accordion + 3 CTA = 11 skeletons
		expect(skeletons).toHaveLength(11);
	});
});
