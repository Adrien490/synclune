import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: { section: "py-16" },
	CONTAINER_CLASS: "container",
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} aria-hidden="true" />
	),
}));

import { InstagramTeaserSkeleton } from "../instagram-teaser-skeleton";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("InstagramTeaserSkeleton", () => {
	it("is aria-hidden so it does not nest a live region inside loading.tsx", () => {
		render(<InstagramTeaserSkeleton />);

		const section = screen.getByTestId("instagram-teaser-skeleton");
		expect(section).toHaveAttribute("aria-hidden", "true");
		expect(section).not.toHaveAttribute("role", "status");
	});

	it("renders the 2-column grid layout matching InstagramTeaser", () => {
		const { container } = render(<InstagramTeaserSkeleton />);

		const grid = container.querySelector(".lg\\:grid-cols-\\[1\\.05fr_1fr\\]");
		expect(grid).not.toBeNull();
	});

	it("renders skeleton blocks for visual, title, underline, subtitle, bullets and CTA", () => {
		render(<InstagramTeaserSkeleton />);

		const skeletons = screen.getAllByTestId("skeleton");
		// 1 image + 1 badge + 1 chip + 1 title + 1 underline + 2 subtitle + 2 bullets + 1 cta
		expect(skeletons.length).toBeGreaterThanOrEqual(10);
	});

	it("uses aspect-ratio classes mirroring the production image (4/5 mobile, 5/6 desktop)", () => {
		const { container } = render(<InstagramTeaserSkeleton />);

		const visual = container.querySelector(".aspect-\\[4\\/5\\]");
		expect(visual).not.toBeNull();
		expect(visual?.className).toContain("sm:aspect-[5/6]");
	});
});
