import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react/ssr", () => ({
	CaretDownIcon: () => <span data-testid="caret-down" />,
	CaretUpIcon: () => <span data-testid="caret-up" />,
	MagnifyingGlassIcon: () => <span data-testid="search-icon" />,
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { FilterOverflowList, COMPARTMENT_VISIBLE_COUNT } from "../filter-overflow-list";

// ============================================================================
// HELPERS
// ============================================================================

const items = (n: number) => Array.from({ length: n }, (_, i) => `item-${i + 1}`);

function renderList(count: number) {
	return render(
		<FilterOverflowList
			items={items(count)}
			itemKey={(item) => item}
			renderItem={(item) => <span data-testid={`row-${item}`}>{item}</span>}
			moreLabel={(n) => `+ ${n} autres entrées`}
			matchesSearch={(item, query) => item.includes(query)}
			searchPlaceholder="Rechercher une entrée…"
		/>,
	);
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("FilterOverflowList", () => {
	it("rend tout sans bouton quand la liste tient (≤ 6)", () => {
		renderList(6);
		expect(screen.getAllByTestId(/^row-/)).toHaveLength(6);
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("borne à 6 entrées et affiche « + N autres »", () => {
		renderList(9);
		expect(screen.getAllByTestId(/^row-/)).toHaveLength(COMPARTMENT_VISIBLE_COUNT);
		const toggle = screen.getByRole("button", { name: "+ 3 autres entrées" });
		expect(toggle).toHaveAttribute("aria-expanded", "false");
	});

	it("déplie sur place — pas de drill-down, pas d'autoFocus", () => {
		renderList(9);
		fireEvent.click(screen.getByRole("button", { name: "+ 3 autres entrées" }));
		expect(screen.getAllByTestId(/^row-/)).toHaveLength(9);
		// Le champ de recherche apparaît (9 > SEARCH_THRESHOLD) mais NE vole pas le focus.
		const search = document.querySelector("input[type='search']");
		expect(search).toBeInTheDocument();
		expect(document.activeElement).not.toBe(search);
	});

	it("le bouton reste monté après le dépli (le focus clavier n'est pas lâché)", () => {
		renderList(9);
		const toggle = screen.getByRole("button", { name: "+ 3 autres entrées" });
		toggle.focus();
		fireEvent.click(toggle);
		const collapse = screen.getByRole("button", { name: "Réduire la liste" });
		expect(collapse).toHaveAttribute("aria-expanded", "true");
		expect(document.activeElement).toBe(collapse);
	});

	it("pas de recherche sous le seuil, même dépliée (7 ≤ 8)", () => {
		renderList(7);
		fireEvent.click(screen.getByRole("button", { name: "+ 1 autres entrées" }));
		expect(document.querySelector("input[type='search']")).toBeNull();
	});

	it("la recherche filtre la liste dépliée et « Réduire » la vide", () => {
		renderList(12);
		fireEvent.click(screen.getByRole("button", { name: "+ 6 autres entrées" }));
		const search = document.querySelector("input[type='search']")!;
		fireEvent.change(search, { target: { value: "item-12" } });
		expect(screen.getAllByTestId(/^row-/)).toHaveLength(1);

		fireEvent.change(search, { target: { value: "zzz" } });
		expect(screen.getByText("Aucun résultat")).toBeInTheDocument();

		// Repli : la recherche est purgée, la liste redevient bornée.
		fireEvent.click(screen.getByRole("button", { name: "Réduire la liste" }));
		expect(screen.getAllByTestId(/^row-/)).toHaveLength(COMPARTMENT_VISIBLE_COUNT);
	});
});
