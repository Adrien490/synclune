import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: { spacious: "py-16" },
}));

vi.mock("@/shared/constants/process-steps", () => ({
	STEP_COLORS: {
		primary: "border-primary bg-primary/10 text-primary",
		secondary: "border-secondary bg-secondary/10 text-secondary",
	},
}));

vi.mock("lucide-react", () => ({
	Lightbulb: () => <svg aria-hidden="true" />,
	Pencil: () => <svg aria-hidden="true" />,
	Hammer: () => <svg aria-hidden="true" />,
	CheckCircle: () => <svg aria-hidden="true" />,
}));

// ---------------------------------------------------------------------------

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AtelierSectionSkeleton", () => {
	let AtelierSectionSkeleton: React.ComponentType;

	beforeAll(async () => {
		({ AtelierSectionSkeleton } = await import("../atelier-section-skeleton"));
	});

	it("renders a section element", () => {
		render(<AtelierSectionSkeleton />);

		const section = document.querySelector("section");
		expect(section).not.toBeNull();
	});

	it("renders section with aria-label for loading state", () => {
		render(<AtelierSectionSkeleton />);

		const section = screen.getByRole("region", {
			name: "Chargement de la section atelier",
		});
		expect(section).toBeInTheDocument();
	});

	it("renders skeleton elements", () => {
		render(<AtelierSectionSkeleton />);

		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders desktop timeline with 4 column containers", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const desktopTimeline = container.querySelector(".hidden.lg\\:grid.lg\\:grid-cols-4");
		expect(desktopTimeline).not.toBeNull();

		const stepDivs = desktopTimeline!.querySelectorAll(":scope > div");
		expect(stepDivs).toHaveLength(4);
	});

	it("renders mobile timeline with 4 step items", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const mobileTimeline = container.querySelector(".lg\\:hidden");
		expect(mobileTimeline).not.toBeNull();

		const stepItems = mobileTimeline!.querySelectorAll(":scope > div");
		expect(stepItems).toHaveLength(4);
	});

	it("desktop timeline has 4 icon circle skeletons", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const desktopTimeline = container.querySelector(".hidden.lg\\:grid.lg\\:grid-cols-4");
		const circleSkeletons = Array.from(
			desktopTimeline!.querySelectorAll("[data-testid='skeleton']"),
		).filter((el) => el.classList.contains("rounded-full") && el.classList.contains("h-12"));

		expect(circleSkeletons).toHaveLength(4);
	});

	it("mobile timeline has 4 icon circle skeletons", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const mobileTimeline = container.querySelector(".lg\\:hidden");
		const circleSkeletons = Array.from(
			mobileTimeline!.querySelectorAll("[data-testid='skeleton']"),
		).filter((el) => el.classList.contains("rounded-full") && el.classList.contains("h-12"));

		expect(circleSkeletons).toHaveLength(4);
	});

	it("renders polaroid gallery skeleton grid", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const polaroidGrid = container.querySelector(".grid-cols-1");
		expect(polaroidGrid).not.toBeNull();
	});

	it("renders 4 polaroid skeleton items in the gallery grid", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const polaroidGrid = container.querySelector(".grid-cols-1");
		const polaroidSkeletons = polaroidGrid!.querySelectorAll("[data-testid='skeleton']");
		expect(polaroidSkeletons).toHaveLength(4);
	});

	it("renders CTA skeleton at the bottom", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const ctaSection = container.querySelector(".mt-12.text-center");
		expect(ctaSection).not.toBeNull();

		const ctaSkeletons = ctaSection!.querySelectorAll("[data-testid='skeleton']");
		expect(ctaSkeletons.length).toBeGreaterThan(0);
	});

	it("renders header skeleton with 2 skeleton items", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const header = container.querySelector(".mb-10");
		expect(header).not.toBeNull();

		const headerSkeletons = header!.querySelectorAll("[data-testid='skeleton']");
		expect(headerSkeletons).toHaveLength(2);
	});

	it("renders photo hero skeleton", () => {
		const { container } = render(<AtelierSectionSkeleton />);

		const heroSkeleton = container.querySelector(".aspect-\\[4\\/3\\]");
		expect(heroSkeleton).not.toBeNull();
	});
});
