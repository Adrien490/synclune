import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CartRecommendationsSkeleton } from "../cart-recommendations-skeleton";

afterEach(cleanup);

describe("CartRecommendationsSkeleton", () => {
	it("renders without crashing", () => {
		const { container } = render(<CartRecommendationsSkeleton />);
		expect(container.firstChild).not.toBeNull();
	});

	it("renders an aside with the correct aria-label", () => {
		render(<CartRecommendationsSkeleton />);
		const aside = screen.getByRole("complementary");
		expect(aside).toHaveAttribute("aria-label", "Chargement des recommandations");
	});

	it("renders the default number of skeleton cards (4)", () => {
		const { container } = render(<CartRecommendationsSkeleton />);
		const grid = container.querySelector(".grid");
		expect(grid?.children).toHaveLength(4);
	});

	it("renders the correct number of skeleton cards when limit is provided", () => {
		const { container } = render(<CartRecommendationsSkeleton limit={6} />);
		const grid = container.querySelector(".grid");
		expect(grid?.children).toHaveLength(6);
	});

	it("renders 1 skeleton card when limit is 1", () => {
		const { container } = render(<CartRecommendationsSkeleton limit={1} />);
		const grid = container.querySelector(".grid");
		expect(grid?.children).toHaveLength(1);
	});

	it("renders the header skeleton elements", () => {
		const { container } = render(<CartRecommendationsSkeleton />);
		// Header has two skeleton lines in a space-y-2 div
		const headerDiv = container.querySelector(".mb-6.space-y-2");
		expect(headerDiv).not.toBeNull();
		expect(headerDiv?.children).toHaveLength(2);
	});

	it("renders a Separator element (parity with loaded version)", () => {
		const { container } = render(<CartRecommendationsSkeleton />);
		const separator = container.querySelector("[data-slot='separator']");
		expect(separator).not.toBeNull();
	});
});
