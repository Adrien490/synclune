import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProductMainSkeleton } from "../product-main-skeleton";

afterEach(cleanup);

describe("ProductMainSkeleton", () => {
	it("renders without crashing", () => {
		const { container } = render(<ProductMainSkeleton />);
		expect(container.firstChild).not.toBeNull();
	});

	it("exposes a role=status with aria-busy=true for AT users", () => {
		render(<ProductMainSkeleton />);
		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-busy", "true");
		expect(status).toHaveAttribute("aria-label", "Chargement de la création");
	});

	it("includes an sr-only loading message", () => {
		const { container } = render(<ProductMainSkeleton />);
		const srOnly = container.querySelector(".sr-only");
		expect(srOnly?.textContent).toMatch(/chargement de la création/i);
	});

	it("preserves the desktop 2-column layout grid (anti-CLS)", () => {
		const { container } = render(<ProductMainSkeleton />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]");
	});

	it("keeps gallery sticky positioning on desktop", () => {
		const { container } = render(<ProductMainSkeleton />);
		const gallerySection = container.querySelector("section");
		expect(gallerySection?.className).toContain("lg:sticky");
		expect(gallerySection?.className).toContain("lg:top-20");
	});
});
