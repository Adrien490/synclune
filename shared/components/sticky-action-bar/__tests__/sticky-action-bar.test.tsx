import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArrowUpDown, Plus, Search, SlidersHorizontal } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetHapticCooldown } from "@/shared/hooks/use-haptic";

import { StickyActionBar, type StickyActionBarItem } from "../sticky-action-bar";

afterEach(() => {
	cleanup();
	__resetHapticCooldown();
});

beforeEach(() => {
	if (!("vibrate" in navigator)) {
		Object.defineProperty(navigator, "vibrate", {
			value: vi.fn().mockReturnValue(true),
			configurable: true,
			writable: true,
		});
	} else {
		(navigator.vibrate as unknown as ReturnType<typeof vi.fn>) = vi.fn().mockReturnValue(true);
	}
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
});

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

	describe("haptic feedback", () => {
		it("declenche une vibration 'selection' (5ms) au tap par defaut", () => {
			const handle = vi.fn();
			const items: StickyActionBarItem[] = [
				{
					key: "sort",
					icon: ArrowUpDown,
					label: "Trier",
					ariaLabel: "Ouvrir le tri",
					onClick: handle,
				},
				...baseItems().slice(1),
			];
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			fireEvent.click(screen.getByLabelText("Ouvrir le tri"));
			expect(navigator.vibrate).toHaveBeenCalledWith(5);
			expect(handle).toHaveBeenCalledTimes(1);
		});

		it("declenche le pattern haptic personnalise quand fourni", () => {
			const items: StickyActionBarItem[] = [
				{
					key: "sort",
					icon: ArrowUpDown,
					label: "Trier",
					ariaLabel: "Ouvrir le tri",
					onClick: vi.fn(),
					haptic: "medium",
				},
				...baseItems().slice(1),
			];
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			fireEvent.click(screen.getByLabelText("Ouvrir le tri"));
			expect(navigator.vibrate).toHaveBeenCalledWith(20);
		});

		it("ne declenche AUCUNE vibration quand haptic={false}", () => {
			const items: StickyActionBarItem[] = [
				{
					key: "sort",
					icon: ArrowUpDown,
					label: "Trier",
					ariaLabel: "Ouvrir le tri",
					onClick: vi.fn(),
					haptic: false,
				},
				...baseItems().slice(1),
			];
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			fireEvent.click(screen.getByLabelText("Ouvrir le tri"));
			expect(navigator.vibrate).not.toHaveBeenCalled();
		});

		it("declenche un haptic au click sur un item kind='link'", () => {
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
			fireEvent.click(screen.getByRole("link", { name: "Ajouter un element" }));
			expect(navigator.vibrate).toHaveBeenCalledWith(5);
		});

		it("ne declenche pas de vibration en prefers-reduced-motion: reduce", () => {
			window.matchMedia = vi.fn().mockImplementation((query: string) => ({
				matches: query.includes("reduce"),
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));
			render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
			fireEvent.click(screen.getByLabelText("Ouvrir le tri"));
			expect(navigator.vibrate).not.toHaveBeenCalled();
		});
	});

	it("applique touch-manipulation et neutralise le tap-highlight iOS", () => {
		render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
		const sortBtn = screen.getByLabelText("Ouvrir le tri");
		expect(sortBtn.className).toContain("touch-manipulation");
		expect(sortBtn.className).toContain("[-webkit-tap-highlight-color:transparent]");
	});

	it("applique le safe-area horizontal sur le toolbar (notch landscape)", () => {
		render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
		const toolbar = screen.getByRole("toolbar");
		expect(toolbar.className).toContain("pl-[env(safe-area-inset-left)]");
		expect(toolbar.className).toContain("pr-[env(safe-area-inset-right)]");
	});

	it("expose un fallback backdrop pour les navigateurs sans backdrop-filter", () => {
		const { container } = render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
		const nav = container.querySelector("nav");
		expect(nav?.className).toContain("supports-[backdrop-filter]:bg-background/60");
		expect(nav?.className).toContain("bg-background/95");
	});

	describe("disabled keyboard navigation", () => {
		it("skip un item disabled via ArrowRight", () => {
			const items: StickyActionBarItem[] = [
				{
					key: "sort",
					icon: ArrowUpDown,
					label: "Trier",
					ariaLabel: "Ouvrir le tri",
					onClick: vi.fn(),
				},
				{
					key: "search",
					icon: Search,
					label: "Rechercher",
					ariaLabel: "Ouvrir la recherche",
					onClick: vi.fn(),
					disabled: true,
				},
				{
					key: "filter",
					icon: SlidersHorizontal,
					label: "Filtrer",
					ariaLabel: "Ouvrir les filtres",
					onClick: vi.fn(),
				},
			];
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			const sortBtn = screen.getByLabelText("Ouvrir le tri");
			const filterBtn = screen.getByLabelText("Ouvrir les filtres");

			sortBtn.focus();
			fireEvent.keyDown(sortBtn, { key: "ArrowRight" });
			expect(document.activeElement).toBe(filterBtn);
		});

		it("skip un item disabled via ArrowLeft", () => {
			const items: StickyActionBarItem[] = [
				{
					key: "sort",
					icon: ArrowUpDown,
					label: "Trier",
					ariaLabel: "Ouvrir le tri",
					onClick: vi.fn(),
				},
				{
					key: "search",
					icon: Search,
					label: "Rechercher",
					ariaLabel: "Ouvrir la recherche",
					onClick: vi.fn(),
					disabled: true,
				},
				{
					key: "filter",
					icon: SlidersHorizontal,
					label: "Filtrer",
					ariaLabel: "Ouvrir les filtres",
					onClick: vi.fn(),
				},
			];
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			const sortBtn = screen.getByLabelText("Ouvrir le tri");
			const filterBtn = screen.getByLabelText("Ouvrir les filtres");

			filterBtn.focus();
			fireEvent.keyDown(filterBtn, { key: "ArrowLeft" });
			expect(document.activeElement).toBe(sortBtn);
		});

		it("Home goto premier non-disabled (skip item 0 disabled)", () => {
			const items: StickyActionBarItem[] = [
				{
					key: "sort",
					icon: ArrowUpDown,
					label: "Trier",
					ariaLabel: "Ouvrir le tri",
					onClick: vi.fn(),
					disabled: true,
				},
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
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			const searchBtn = screen.getByLabelText("Ouvrir la recherche");
			const filterBtn = screen.getByLabelText("Ouvrir les filtres");

			filterBtn.focus();
			fireEvent.keyDown(filterBtn, { key: "Home" });
			expect(document.activeElement).toBe(searchBtn);
		});

		it("ne crash pas si tous les items sont disabled", () => {
			const items: StickyActionBarItem[] = [
				{
					key: "a",
					icon: ArrowUpDown,
					label: "A",
					ariaLabel: "A",
					onClick: vi.fn(),
					disabled: true,
				},
				{
					key: "b",
					icon: Search,
					label: "B",
					ariaLabel: "B",
					onClick: vi.fn(),
					disabled: true,
				},
			];
			expect(() => render(<StickyActionBar items={items} ariaLabel="Actions" />)).not.toThrow();
			const a = screen.getByLabelText("A");
			a.focus();
			expect(() => fireEvent.keyDown(a, { key: "ArrowRight" })).not.toThrow();
		});
	});

	describe("badge sr-only auto-announce", () => {
		it("rend 'X éléments actifs' sr-only pour badgeCount = 3", () => {
			const items = baseItems();
			items[2] = { ...items[2]!, badgeCount: 3 } as StickyActionBarItem;
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			expect(screen.getByText(/3 éléments actifs/i)).toBeInTheDocument();
		});

		it("singularise pour badgeCount = 1", () => {
			const items = baseItems();
			items[2] = { ...items[2]!, badgeCount: 1 } as StickyActionBarItem;
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			expect(screen.getByText(/1 élément actif/i)).toBeInTheDocument();
		});

		it("annonce 'plus de 99 éléments actifs' pour badgeCount > 99", () => {
			const items = baseItems();
			items[2] = { ...items[2]!, badgeCount: 120 } as StickyActionBarItem;
			render(<StickyActionBar items={items} ariaLabel="Actions" />);
			expect(screen.getByText(/plus de 99 éléments actifs/i)).toBeInTheDocument();
		});
	});

	it("expose data-active='' quand active est true", () => {
		const items = baseItems();
		items[0] = { ...items[0]!, active: true } as StickyActionBarItem;
		render(<StickyActionBar items={items} ariaLabel="Actions" />);
		const sortBtn = screen.getByLabelText("Ouvrir le tri");
		expect(sortBtn).toHaveAttribute("data-active", "");
	});

	it("expose data-state='open' quand expanded est true", () => {
		const items = baseItems();
		items[0] = { ...items[0]!, expanded: true } as StickyActionBarItem;
		render(<StickyActionBar items={items} ariaLabel="Actions" />);
		const sortBtn = screen.getByLabelText("Ouvrir le tri");
		expect(sortBtn).toHaveAttribute("data-state", "open");
	});

	it("applique le viewTransitionName en style sur un item kind='link'", () => {
		const items: StickyActionBarItem[] = [
			...baseItems(),
			{
				kind: "link",
				key: "add",
				icon: Plus,
				label: "Ajouter",
				ariaLabel: "Ajouter un produit",
				href: "/admin/produits/nouveau",
				viewTransitionName: "admin-add-action",
			},
		];
		render(<StickyActionBar items={items} ariaLabel="Actions" />);
		const link = screen.getByRole("link", { name: "Ajouter un produit" });
		expect(link.getAttribute("style")).toContain("view-transition-name: admin-add-action");
	});

	it("refs restent stables apres rerender (focus toujours fonctionnel)", () => {
		const { rerender } = render(<StickyActionBar items={baseItems()} ariaLabel="Actions" />);
		const sortBtn = screen.getByLabelText("Ouvrir le tri");
		sortBtn.focus();

		const newItems = baseItems();
		newItems[1] = { ...newItems[1]!, label: "Search!" } as StickyActionBarItem;
		rerender(<StickyActionBar items={newItems} ariaLabel="Actions" />);

		const sortBtnAfter = screen.getByLabelText("Ouvrir le tri");
		sortBtnAfter.focus();
		fireEvent.keyDown(sortBtnAfter, { key: "ArrowRight" });
		const searchBtnAfter = screen.getByLabelText("Ouvrir la recherche");
		expect(document.activeElement).toBe(searchBtnAfter);
	});
});
