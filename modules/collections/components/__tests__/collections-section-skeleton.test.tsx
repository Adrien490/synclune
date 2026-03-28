import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: {
		section: "py-16 lg:py-24",
	},
}));

import { CollectionsSectionSkeleton } from "../collections-section-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionsSectionSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders without error", () => {
		render(<CollectionsSectionSkeleton />);
		expect(screen.getByRole("region", { name: "Chargement des collections" })).toBeInTheDocument();
	});

	it("has aria-label 'Chargement des collections'", () => {
		render(<CollectionsSectionSkeleton />);
		const section = screen.getByLabelText("Chargement des collections");
		expect(section).toBeInTheDocument();
	});

	// ─── Default collectionsCount ─────────────────────────────────────────────

	it("renders 5 skeleton cards by default", () => {
		const { container } = render(<CollectionsSectionSkeleton />);
		// The carousel items: each is a div with class containing "snap-center"
		const carouselItems = container.querySelectorAll(".snap-center");
		expect(carouselItems).toHaveLength(5);
	});

	// ─── Custom collectionsCount ──────────────────────────────────────────────

	it("renders the specified number of skeleton cards", () => {
		const { container } = render(<CollectionsSectionSkeleton collectionsCount={3} />);
		const carouselItems = container.querySelectorAll(".snap-center");
		expect(carouselItems).toHaveLength(3);
	});

	it("renders 8 skeleton cards when collectionsCount is 8", () => {
		const { container } = render(<CollectionsSectionSkeleton collectionsCount={8} />);
		const carouselItems = container.querySelectorAll(".snap-center");
		expect(carouselItems).toHaveLength(8);
	});
});
