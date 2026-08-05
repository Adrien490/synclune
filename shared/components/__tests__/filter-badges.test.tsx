import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { FilterDefinition } from "@/shared/hooks/use-filter";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFilterHook } = vi.hoisted(() => ({
	mockFilterHook: {
		optimisticActiveFilters: [] as FilterDefinition[],
		removeFilterOptimistic: vi.fn(),
		clearAllFiltersOptimistic: vi.fn(),
		isPending: false,
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		m: {
			div: fRef(
				(
					{
						children,
						initial: _i,
						animate: _a,
						exit: _e,
						transition: _t,
						layout: _l,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("div", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: () => false,
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { duration: { fast: 0.15 } },
	maybeReduceMotion: (config: unknown) => config,
}));

vi.mock("@/shared/hooks/use-filter", () => ({
	useFilter: () => mockFilterHook,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("../filter-badge", () => ({
	// aria-label aligné sur le vrai composant : la gestion de focus du wrapper
	// cible `button[aria-label^="Supprimer"]`.
	FilterBadge: ({
		filter,
		onRemove,
	}: {
		filter: FilterDefinition;
		onRemove: (key: string, value?: string) => void;
	}) => (
		<button
			data-testid={`filter-badge-${filter.id}`}
			aria-label={`Supprimer le filtre ${filter.label}`}
			onClick={() => onRemove(filter.key, String(filter.value))}
		>
			{filter.label}
		</button>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FilterBadges } from "../filter-badges";

function makeFilter(id: string, key: string, label: string, value: string = ""): FilterDefinition {
	return { id, key, label, value, displayValue: value };
}

describe("FilterBadges", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFilterHook.optimisticActiveFilters = [];
		mockFilterHook.isPending = false;
	});
	afterEach(cleanup);

	// ============================================================================
	// NULL RENDERING
	// ============================================================================

	it("returns null when no active filters", () => {
		const { container } = render(<FilterBadges />);
		expect(container.innerHTML).toBe("");
	});

	// ============================================================================
	// BASIC RENDERING
	// ============================================================================

	it("renders label and badges for each filter", () => {
		mockFilterHook.optimisticActiveFilters = [
			makeFilter("1", "color", "Couleur", "Rouge"),
			makeFilter("2", "size", "Taille", "M"),
		];
		render(<FilterBadges />);
		expect(screen.getByText("Filtres actifs :")).toBeInTheDocument();
		expect(screen.getByTestId("filter-badge-1")).toBeInTheDocument();
		expect(screen.getByTestId("filter-badge-2")).toBeInTheDocument();
	});

	// ============================================================================
	// SR-ONLY COUNT
	// ============================================================================

	it("shows singular count for 1 filter", () => {
		mockFilterHook.optimisticActiveFilters = [makeFilter("1", "k", "L")];
		render(<FilterBadges />);
		expect(screen.getByText("1 filtre actif")).toBeInTheDocument();
	});

	it("shows plural count for multiple filters", () => {
		mockFilterHook.optimisticActiveFilters = [
			makeFilter("1", "k1", "L1"),
			makeFilter("2", "k2", "L2"),
			makeFilter("3", "k3", "L3"),
		];
		render(<FilterBadges />);
		expect(screen.getByText("3 filtres actifs")).toBeInTheDocument();
	});

	// ============================================================================
	// SHOW MORE / SHOW LESS
	// ============================================================================

	it("shows '+N autres' button when filters exceed maxVisibleFilters", () => {
		mockFilterHook.optimisticActiveFilters = Array.from({ length: 8 }, (_, i) =>
			makeFilter(`${i}`, `k${i}`, `L${i}`),
		);
		render(<FilterBadges maxVisibleFilters={3} />);
		expect(screen.getByText("+5 autres")).toBeInTheDocument();
	});

	it("toggles show all / show less on click", () => {
		mockFilterHook.optimisticActiveFilters = Array.from({ length: 6 }, (_, i) =>
			makeFilter(`${i}`, `k${i}`, `L${i}`),
		);
		render(<FilterBadges maxVisibleFilters={3} />);

		// Initially only 3 visible + show more button
		expect(screen.queryByTestId("filter-badge-5")).not.toBeInTheDocument();

		fireEvent.click(screen.getByText("+3 autres"));
		expect(screen.getByTestId("filter-badge-5")).toBeInTheDocument();
		expect(screen.getByText("Voir moins")).toBeInTheDocument();
	});

	// ============================================================================
	// CLEAR ALL
	// ============================================================================

	it("renders 'Tout effacer' button that calls clearAll", () => {
		mockFilterHook.optimisticActiveFilters = [makeFilter("1", "k", "L")];
		render(<FilterBadges />);
		// Le nom accessible EST le libellé visible (WCAG 2.5.3) — plus d'aria-label.
		const clearBtn = screen.getByRole("button", { name: "Tout effacer" });
		expect(clearBtn).toBeInTheDocument();
		fireEvent.click(clearBtn);
		expect(mockFilterHook.clearAllFiltersOptimistic).toHaveBeenCalled();
	});

	// ============================================================================
	// EXTERNAL PROPS
	// ============================================================================

	it("uses external activeFilters/onRemove/onClearAll when provided", () => {
		const externalFilters = [makeFilter("ext", "key", "External")];
		const onRemove = vi.fn();
		const onClearAll = vi.fn();

		render(
			<FilterBadges activeFilters={externalFilters} onRemove={onRemove} onClearAll={onClearAll} />,
		);

		expect(screen.getByTestId("filter-badge-ext")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));
		expect(onClearAll).toHaveBeenCalled();
	});

	it("external isPending drives aria-busy when the parent controls the list", () => {
		// Le hook INTERNE ne bouge jamais quand le parent contrôle : sans la prop,
		// aria-busy mentait en permanence sur le storefront (audit 2026-08-05).
		mockFilterHook.isPending = false;
		render(
			<FilterBadges
				activeFilters={[makeFilter("ext", "key", "External")]}
				onRemove={vi.fn()}
				onClearAll={vi.fn()}
				isPending
			/>,
		);
		expect(screen.getByRole("region", { name: "Filtres actifs" })).toHaveAttribute(
			"aria-busy",
			"true",
		);
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("has role='region' with aria-label and aria-busy", () => {
		mockFilterHook.optimisticActiveFilters = [makeFilter("1", "k", "L")];
		mockFilterHook.isPending = true;
		render(<FilterBadges />);
		const region = screen.getByRole("region", { name: "Filtres actifs" });
		expect(region).toHaveAttribute("aria-busy", "true");
	});

	// ============================================================================
	// FOCUS MANAGEMENT
	// ============================================================================

	it("moves focus to the neighbour badge (same index) after a removal", async () => {
		const filters = [
			makeFilter("a", "ka", "A"),
			makeFilter("b", "kb", "B"),
			makeFilter("c", "kc", "C"),
		];
		const onRemove = vi.fn();
		const { rerender } = render(
			<FilterBadges activeFilters={filters} onRemove={onRemove} onClearAll={vi.fn()} />,
		);

		// La cliente supprime le badge du MILIEU (index 1)…
		const badgeB = screen.getByTestId("filter-badge-b");
		badgeB.focus();
		fireEvent.click(badgeB);
		expect(onRemove).toHaveBeenCalledWith("kb", "");

		// …le parent re-rend sans lui (l'update optimiste est synchrone en vrai,
		// le rAF du composant ne part qu'à la frame suivante — après ce rerender)…
		rerender(
			<FilterBadges
				activeFilters={[filters[0]!, filters[2]!]}
				onRemove={onRemove}
				onClearAll={vi.fn()}
			/>,
		);
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

		// …le focus va au VOISIN (nouvel index 1), pas au premier badge
		// (régression de position, audit 2026-08-05).
		expect(document.activeElement).toBe(screen.getByTestId("filter-badge-c"));
	});
});
