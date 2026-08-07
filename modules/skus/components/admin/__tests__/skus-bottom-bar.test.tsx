import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const mockSearchParamsEntries = vi.fn<() => [string, string][]>();
const mockSearchParamsHas = vi.fn<(key: string) => boolean>();
const mockSearchParamsGet = vi.fn<(key: string) => string | null>();

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		entries: () => mockSearchParamsEntries(),
		keys: () => mockSearchParamsEntries().map(([k]) => k),
		has: (key: string) => mockSearchParamsHas(key),
		get: (key: string) => mockSearchParamsGet(key),
	}),
	// `OverlayStoreProvider` (requis ci-dessous) lit `usePathname` pour refermer
	// les tiroirs au changement de route.
	usePathname: () => "/admin/catalogue/produits/anneau-lune/variantes",
}));

vi.mock("../skus-filter-sheet", () => ({
	SkusFilterSheet: ({ open, hideTrigger }: { open?: boolean; hideTrigger?: boolean }) => (
		<div
			data-testid="skus-filter-sheet"
			data-open={String(open ?? false)}
			data-hide-trigger={String(hideTrigger ?? false)}
		/>
	),
}));

vi.mock("@/shared/components/sort-drawer", () => ({
	SortDrawer: ({
		open,
		options,
	}: {
		open?: boolean;
		options: { value: string; label: string }[];
	}) => (
		<div
			data-testid="sort-drawer"
			data-open={String(open ?? false)}
			data-options-count={options.length}
		/>
	),
}));

vi.mock("@/shared/components/sticky-action-bar", () => ({
	useSelectionToggleItem: () => null,
	StickyActionBar: ({
		items,
	}: {
		items: Array<{
			key: string;
			label: string;
			ariaLabel: string;
			badgeCount?: number;
			active?: boolean;
			href?: string;
			kind?: "link" | "button";
			onClick?: () => void;
		}>;
	}) => (
		<nav data-testid="sticky-action-bar">
			{items.map((item) =>
				item.kind === "link" ? (
					<a
						key={item.key}
						data-testid={`bar-item-${item.key}`}
						data-label={item.label}
						href={item.href}
						aria-label={item.ariaLabel}
					>
						{item.label}
					</a>
				) : (
					<button
						key={item.key}
						type="button"
						data-testid={`bar-item-${item.key}`}
						data-label={item.label}
						data-badge={item.badgeCount ?? 0}
						data-active={String(item.active ?? false)}
						aria-label={item.ariaLabel}
						onClick={item.onClick}
					>
						{item.label}
					</button>
				),
			)}
		</nav>
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { OverlayStoreProvider } from "@/shared/providers/overlay-store-provider";
import { SkusBottomBar } from "../skus-bottom-bar";

// ============================================================================
// SETUP
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockSearchParamsEntries.mockReturnValue([]);
	mockSearchParamsHas.mockReturnValue(false);
	mockSearchParamsGet.mockReturnValue(null);
});

// `useToolbarDrawer` tient l'état des tiroirs dans le `SheetStore` PARTAGÉ (et
// non dans un `useState` local) pour que le badge « Trié par : X », monté dans un
// autre sous-arbre de la page, puisse ouvrir le tiroir de la barre basse. Le
// provider est global (`app/layout.tsx`) ; ici il faut le fournir explicitement.
function renderBottomBar(ui: React.ReactElement) {
	return render(<OverlayStoreProvider>{ui}</OverlayStoreProvider>);
}

// ============================================================================
// TESTS
// ============================================================================

describe("SkusBottomBar", () => {
	it("renders the 3 actions Filtrer / Ajouter / Trier", () => {
		renderBottomBar(
			<SkusBottomBar productSlug="anneau-lune" colorOptions={[]} materialOptions={[]} />,
		);
		expect(screen.getByTestId("bar-item-filter")).toHaveAttribute("data-label", "Filtrer");
		expect(screen.getByTestId("bar-item-add")).toHaveAttribute("data-label", "Ajouter");
		expect(screen.getByTestId("bar-item-sort")).toHaveAttribute("data-label", "Trier");
	});

	it("Add item is a link to /admin/catalogue/produits/{slug}/variantes/nouveau", () => {
		renderBottomBar(
			<SkusBottomBar productSlug="anneau-lune" colorOptions={[]} materialOptions={[]} />,
		);
		expect(screen.getByTestId("bar-item-add")).toHaveAttribute(
			"href",
			"/admin/catalogue/produits/anneau-lune/variantes/nouveau",
		);
	});

	it("badge count Filter = number of filter_* URL keys", () => {
		mockSearchParamsEntries.mockReturnValue([
			["filter_stockStatus", "in-stock"],
			["filter_colorId", "abc"],
			["sortBy", "name-asc"],
			["cursor", "10"],
		]);
		renderBottomBar(<SkusBottomBar productSlug="x" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("bar-item-filter")).toHaveAttribute("data-badge", "2");
	});

	it("Filter badge stays at 0 when no filter_ keys", () => {
		mockSearchParamsEntries.mockReturnValue([
			["sortBy", "name-asc"],
			["cursor", "10"],
		]);
		renderBottomBar(<SkusBottomBar productSlug="x" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("bar-item-filter")).toHaveAttribute("data-badge", "0");
	});

	it("Sort item is active when sortBy URL param is present", () => {
		mockSearchParamsGet.mockImplementation((key) => (key === "sortBy" ? "name-asc" : null));
		renderBottomBar(<SkusBottomBar productSlug="x" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("bar-item-sort")).toHaveAttribute("data-active", "true");
	});

	it("Sort item not active when sortBy URL param is absent", () => {
		mockSearchParamsGet.mockReturnValue(null);
		renderBottomBar(<SkusBottomBar productSlug="x" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("bar-item-sort")).toHaveAttribute("data-active", "false");
	});

	it("clicking Filter opens the FilterSheet", () => {
		renderBottomBar(<SkusBottomBar productSlug="x" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("skus-filter-sheet")).toHaveAttribute("data-open", "false");
		fireEvent.click(screen.getByTestId("bar-item-filter"));
		expect(screen.getByTestId("skus-filter-sheet")).toHaveAttribute("data-open", "true");
	});

	it("clicking Sort opens the SortDrawer", () => {
		renderBottomBar(<SkusBottomBar productSlug="x" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "false");
		fireEvent.click(screen.getByTestId("bar-item-sort"));
		expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
	});

	it("FilterSheet receives hideTrigger=true (controlled mode)", () => {
		renderBottomBar(<SkusBottomBar productSlug="x" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("skus-filter-sheet")).toHaveAttribute("data-hide-trigger", "true");
	});

	it("SortDrawer renders all 8 sort options", () => {
		renderBottomBar(<SkusBottomBar productSlug="x" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-options-count", "8");
	});
});
