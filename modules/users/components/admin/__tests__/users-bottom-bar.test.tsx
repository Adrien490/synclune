import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const mockSearchParamsEntries = vi.fn<() => [string, string][]>();
const mockSearchParamsGet = vi.fn<(key: string) => string | null>();

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		entries: () => mockSearchParamsEntries(),
		keys: () => mockSearchParamsEntries().map(([k]) => k),
		get: (key: string) => mockSearchParamsGet(key),
	}),
}));

vi.mock("../users-filter-sheet", () => ({
	UsersFilterSheet: ({ open, hideTrigger }: { open?: boolean; hideTrigger?: boolean }) => (
		<div
			data-testid="users-filter-sheet"
			data-open={String(open ?? false)}
			data-hide-trigger={String(hideTrigger ?? false)}
		/>
	),
}));

vi.mock("@/shared/components/sort-drawer", () => ({
	SortDrawer: ({ open }: { open?: boolean }) => (
		<div data-testid="sort-drawer" data-open={String(open ?? false)} />
	),
}));

// SearchInput dépend de TanStack Form + next/navigation Suspense ; on le réduit
// à un input nu — le test vérifie qu'il est rendu DIRECTEMENT (inline), pas son
// comportement de filtrage (couvert par search-input.test.tsx).
vi.mock("@/shared/components/search-input", () => ({
	SearchInput: ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => (
		<input data-testid="search-input" aria-label={ariaLabel} />
	),
}));

vi.mock("@/shared/components/sticky-action-bar", () => ({
	useSelectionToggleItem: () => null,
	StickyActionBar: ({
		items,
		search,
	}: {
		items: Array<{ key: string; label: string; ariaLabel: string; onClick?: () => void }>;
		search?: ReactNode;
	}) => (
		<nav data-testid="sticky-action-bar">
			{search ? <div data-testid="search-slot">{search}</div> : null}
			{items.map((item) => (
				<button
					key={item.key}
					type="button"
					data-testid={`bar-item-${item.key}`}
					data-label={item.label}
					aria-label={item.ariaLabel}
					onClick={item.onClick}
				>
					{item.label}
				</button>
			))}
		</nav>
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { UsersBottomBar } from "../users-bottom-bar";

// ============================================================================
// SETUP
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockSearchParamsEntries.mockReturnValue([]);
	mockSearchParamsGet.mockReturnValue(null);
});

// ============================================================================
// TESTS
// ============================================================================

describe("UsersBottomBar", () => {
	it("rend un champ de recherche persistant dans le slot search (plus de drawer)", () => {
		render(<UsersBottomBar />);
		const slot = screen.getByTestId("search-slot");
		expect(slot).toBeInTheDocument();
		expect(screen.getByLabelText("Rechercher un client par nom ou email")).toBeInTheDocument();
	});

	it("ne rend plus d'item bouton « Rechercher »", () => {
		render(<UsersBottomBar />);
		expect(screen.queryByTestId("bar-item-search")).toBeNull();
		expect(screen.queryByRole("button", { name: /recherche/i })).toBeNull();
	});

	it("conserve les boutons Filtrer et Trier", () => {
		render(<UsersBottomBar />);
		expect(screen.getByTestId("bar-item-filter")).toHaveAttribute("data-label", "Filtrer");
		expect(screen.getByTestId("bar-item-sort")).toHaveAttribute("data-label", "Trier");
	});

	it("clic Filtrer ouvre la FilterSheet", () => {
		render(<UsersBottomBar />);
		expect(screen.getByTestId("users-filter-sheet")).toHaveAttribute("data-open", "false");
		fireEvent.click(screen.getByTestId("bar-item-filter"));
		expect(screen.getByTestId("users-filter-sheet")).toHaveAttribute("data-open", "true");
	});

	it("clic Trier ouvre le SortDrawer", () => {
		render(<UsersBottomBar />);
		expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "false");
		fireEvent.click(screen.getByTestId("bar-item-sort"));
		expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
	});
});
