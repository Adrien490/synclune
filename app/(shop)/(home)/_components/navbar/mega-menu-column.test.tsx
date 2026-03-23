import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
	usePathname: () => "/produits/bagues",
}));

// Mock NavigationMenu components
vi.mock("@/shared/components/ui/navigation-menu", () => ({
	NavigationMenuLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock LoadingIndicator
vi.mock("@/shared/components/navigation", () => ({
	LoadingIndicator: () => null,
}));

import { MegaMenuColumn } from "./mega-menu-column";

afterEach(cleanup);

const items = [
	{ href: "/produits", label: "Toutes les créations" },
	{ href: "/produits/bagues", label: "Bagues" },
	{ href: "/produits/colliers", label: "Colliers" },
	{ href: "/produits/bracelets", label: "Bracelets" },
];

describe("MegaMenuColumn", () => {
	it("returns null when items array is empty", () => {
		const { container } = render(<MegaMenuColumn title="Créations" items={[]} />);
		expect(container.innerHTML).toBe("");
	});

	it("renders a heading with the title", () => {
		render(<MegaMenuColumn title="Créations" items={items} />);

		const heading = screen.getByRole("heading", { name: "Créations" });
		expect(heading).toBeInTheDocument();
		expect(heading.tagName).toBe("H3");
	});

	it("renders a region with aria-labelledby pointing to the heading", () => {
		render(<MegaMenuColumn title="Créations" items={items} />);

		const region = screen.getByRole("region", { name: "Créations" });
		expect(region).toBeInTheDocument();
	});

	it("renders the first item as a primary CTA link", () => {
		render(<MegaMenuColumn title="Créations" items={items} />);

		const ctaLink = screen.getByRole("link", { name: /Toutes les créations/ });
		expect(ctaLink).toBeInTheDocument();
		expect(ctaLink.getAttribute("href")).toBe("/produits");
		// CTA has distinct styling (bg-accent/40)
		expect(ctaLink.className).toContain("font-medium");
	});

	it("renders remaining items in a list", () => {
		render(<MegaMenuColumn title="Créations" items={items} />);

		const listItems = screen.getAllByRole("listitem");
		expect(listItems.length).toBe(3); // Bagues, Colliers, Bracelets (sans le CTA)
	});

	it("marks the active item with aria-current=page", () => {
		render(<MegaMenuColumn title="Créations" items={items} />);

		const activeLink = screen.getByRole("link", { name: "Bagues" });
		expect(activeLink.getAttribute("aria-current")).toBe("page");
	});

	it("does not mark inactive items with aria-current", () => {
		render(<MegaMenuColumn title="Créations" items={items} />);

		const inactiveLink = screen.getByRole("link", { name: "Colliers" });
		expect(inactiveLink.getAttribute("aria-current")).toBeNull();
	});

	it("renders viewAllLink when provided", () => {
		render(
			<MegaMenuColumn
				title="Créations"
				items={items}
				viewAllLink={{ href: "/produits", label: "Voir tout" }}
			/>,
		);

		const viewAllLink = screen.getByRole("link", { name: /Voir tout/ });
		expect(viewAllLink).toBeInTheDocument();
		expect(viewAllLink.getAttribute("href")).toBe("/produits");
	});

	it("does not render viewAllLink when not provided", () => {
		render(<MegaMenuColumn title="Créations" items={items} />);

		expect(screen.queryByText("Voir tout")).toBeNull();
	});

	describe("grid layout", () => {
		it("applies 2-column grid when columns=2", () => {
			render(<MegaMenuColumn title="Créations" items={items} columns={2} />);

			const list = screen.getByRole("list");
			expect(list.className).toContain("grid-cols-2");
		});

		it("applies 3-column grid when columns=3", () => {
			render(<MegaMenuColumn title="Créations" items={items} columns={3} />);

			const list = screen.getByRole("list");
			expect(list.className).toContain("grid-cols-3");
		});

		it("does not apply grid when columns is not set", () => {
			render(<MegaMenuColumn title="Créations" items={items} />);

			const list = screen.getByRole("list");
			expect(list.className).not.toContain("grid-cols");
		});
	});

	describe("accessibility", () => {
		it("has ArrowRight icon with aria-hidden on CTA", () => {
			render(<MegaMenuColumn title="Créations" items={items} />);

			const ctaLink = screen.getByRole("link", { name: /Toutes les créations/ });
			const svg = ctaLink.querySelector("svg");
			expect(svg?.getAttribute("aria-hidden")).toBe("true");
		});

		it("all links have focus-visible ring styles", () => {
			render(<MegaMenuColumn title="Créations" items={items} />);

			const links = screen.getAllByRole("link");
			for (const link of links) {
				expect(link.className).toContain("focus-visible:ring-2");
			}
		});

		it("all list items have min-h-11 for WCAG 2.5.5 touch target", () => {
			render(<MegaMenuColumn title="Créations" items={items} />);

			const links = screen.getAllByRole("link");
			for (const link of links) {
				expect(link.className).toContain("min-h-11");
			}
		});
	});
});
