import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProductCardSkeleton } from "../product-card-skeleton";

afterEach(cleanup);

describe("ProductCardSkeleton", () => {
	it("renders without crashing", () => {
		const { container } = render(<ProductCardSkeleton />);
		expect(container.firstChild).not.toBeNull();
	});

	it("exposes the .product-card-skeleton hook class for layout queries", () => {
		const { container } = render(<ProductCardSkeleton />);
		expect(container.querySelector(".product-card-skeleton")).not.toBeNull();
	});

	it("is marked aria-hidden (decorative placeholder)", () => {
		const { container } = render(<ProductCardSkeleton />);
		expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders an image placeholder with motion-safe pulse", () => {
		const { container } = render(<ProductCardSkeleton />);
		const mediaPlaceholder = container.querySelector(".aspect-3\\/4");
		expect(mediaPlaceholder).not.toBeNull();
		expect(mediaPlaceholder?.classList.contains("motion-safe:animate-pulse")).toBe(true);
	});
});
