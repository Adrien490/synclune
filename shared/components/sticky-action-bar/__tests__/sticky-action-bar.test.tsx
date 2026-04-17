import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArrowUpDown, Plus, Search, SlidersHorizontal } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StickyActionBar, type StickyActionBarItem } from "../sticky-action-bar";

afterEach(cleanup);

function baseItems(overrides: Partial<StickyActionBarItem> = {}): StickyActionBarItem[] {
	return [
		{
			key: "sort",
			icon: ArrowUpDown,
			label: "Trier",
			ariaLabel: "Ouvrir le tri",
			onClick: vi.fn(),
			...overrides,
		} as StickyActionBarItem,
		{
			key: "search",
			icon: Search,
			label: "Rechercher",
			ariaLabel: "Ouvrir la recherche",
			onClick: vi.fn(),
		},
		{
			key: "filter",
			icon: SlidersHorizontal,
			label: "Filtrer",
			ariaLabel: "Ouvrir les filtres",
			onClick: vi.fn(),
		},
	];
}

describe("StickyActionBar", () => {
	it("rend les items avec le bon label et icone", () => {
		render(<StickyActionBar items={baseItems()} ariaLabel="Tri et filtres" />);
		expect(screen.getByText("Trier")).toBeInTheDocument();
		expect(screen.getByText("Rechercher")).toBeInTheDocument();
		expect(screen.getByText("Filtrer")).toBeInTheDocument();
	});

	it("expose un <nav> et un <toolbar> avec aria-label", () => {
		render(<StickyActionBar items={baseItems()} ariaLabel="Tri et filtres" />);
		const nav = screen.getByRole("navigation", { name: "Tri et filtres" });
		expect(nav).toBeInTheDocument();
		const toolbar = screen.getByRole("toolbar", { name: "Tri et filtres" });
		expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
	});

	it("applique la classe md:hidden pour n'etre visible qu'en mobile", () => {
		const { container } = render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
		const nav = container.querySelector("nav");
		expect(nav?.className).toContain("md:hidden");
		expect(nav?.className).toContain("sticky");
	});

	it("appelle onClick du bouton clique", () => {
		const handleSort = vi.fn();
		const items: StickyActionBarItem[] = [
			{
				key: "sort",
				icon: ArrowUpDown,
				label: "Trier",
				ariaLabel: "Ouvrir le tri",
				onClick: handleSort,
			},
			...baseItems().slice(1),
		];
		render(<StickyActionBar items={items} ariaLabel="Actions" />);
		fireEvent.click(screen.getByLabelText("Ouvrir le tri"));
		expect(handleSort).toHaveBeenCalledTimes(1);
	});

	it("navigue au clavier avec ArrowRight entre items (roving tabindex)", () => {
		render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
		const sortBtn = screen.getByLabelText("Ouvrir le tri");
		const searchBtn = screen.getByLabelText("Ouvrir la recherche");

		expect(sortBtn).toHaveAttribute("tabIndex", "0");
		expect(searchBtn).toHaveAttribute("tabIndex", "-1");

		sortBtn.focus();
		fireEvent.keyDown(sortBtn, { key: "ArrowRight" });
		expect(document.activeElement).toBe(searchBtn);
	});

	it("navigue au clavier avec ArrowLeft (wrap-around)", () => {
		render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
		const sortBtn = screen.getByLabelText("Ouvrir le tri");
		const filterBtn = screen.getByLabelText("Ouvrir les filtres");

		sortBtn.focus();
		fireEvent.keyDown(sortBtn, { key: "ArrowLeft" });
		expect(document.activeElement).toBe(filterBtn);
	});

	it("Home/End deplacent au premier/dernier item", () => {
		render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
		const sortBtn = screen.getByLabelText("Ouvrir le tri");
		const searchBtn = screen.getByLabelText("Ouvrir la recherche");
		const filterBtn = screen.getByLabelText("Ouvrir les filtres");

		searchBtn.focus();
		fireEvent.keyDown(searchBtn, { key: "End" });
		expect(document.activeElement).toBe(filterBtn);

		fireEvent.keyDown(filterBtn, { key: "Home" });
		expect(document.activeElement).toBe(sortBtn);
	});

	it("affiche un badge numerique quand badgeCount > 0", () => {
		const items = baseItems();
		items[2] = { ...items[2]!, badgeCount: 3 } as StickyActionBarItem;
		render(<StickyActionBar items={items} ariaLabel="Actions" />);
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("affiche 99+ pour badgeCount > 99", () => {
		const items = baseItems();
		items[2] = { ...items[2]!, badgeCount: 120 } as StickyActionBarItem;
		render(<StickyActionBar items={items} ariaLabel="Actions" />);
		expect(screen.getByText("99+")).toBeInTheDocument();
	});

	it("rend un item 'link' comme <a> navigable", () => {
		const items: StickyActionBarItem[] = [
			...baseItems(),
			{
				kind: "link",
				key: "add",
				icon: Plus,
				label: "Ajouter",
				ariaLabel: "Ajouter un element",
				href: "/admin/produits/nouveau",
			},
		];
		render(<StickyActionBar items={items} ariaLabel="Actions" />);
		const link = screen.getByRole("link", { name: "Ajouter un element" });
		expect(link).toHaveAttribute("href", "/admin/produits/nouveau");
	});

	it("annonce les etats actifs via une live region polite", async () => {
		const items = baseItems();
		items[0] = { ...items[0]!, active: true, announcement: "Tri actif" } as StickyActionBarItem;
		render(<StickyActionBar items={items} ariaLabel="Actions" />);

		const liveRegion = screen.getByRole("status");
		expect(liveRegion).toHaveAttribute("aria-live", "polite");
		await waitFor(() => {
			expect(liveRegion.textContent).toContain("Tri actif");
		});
	});

	it("respecte haspopup sur le bouton", () => {
		const items = baseItems();
		items[0] = { ...items[0]!, haspopup: "dialog" } as StickyActionBarItem;
		render(<StickyActionBar items={items} ariaLabel="Actions" />);
		const sortBtn = screen.getByLabelText("Ouvrir le tri");
		expect(sortBtn).toHaveAttribute("aria-haspopup", "dialog");
	});
});
