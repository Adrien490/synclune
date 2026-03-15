import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { FilterDefinition } from "@/shared/hooks/use-filter";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFilterHook, mockIsMobile } = vi.hoisted(() => ({
	mockFilterHook: {
		optimisticActiveFilters: [] as FilterDefinition[],
		removeFilterOptimistic: vi.fn(),
		clearAllFiltersOptimistic: vi.fn(),
		isPending: false,
	},
	mockIsMobile: { value: false },
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

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
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
	FilterBadge: ({
		filter,
		onRemove,
	}: {
		filter: FilterDefinition;
		onRemove: (key: string, value?: string) => void;
	}) => (
		<button
			data-testid={`filter-badge-${filter.id}`}
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
		mockIsMobile.value = false;
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
		const clearBtn = screen.getByLabelText("Effacer tous les filtres");
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
		fireEvent.click(screen.getByLabelText("Effacer tous les filtres"));
		expect(onClearAll).toHaveBeenCalled();
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
	// MOBILE
	// ============================================================================

	it("limits visible filters to min(6, maxVisibleFilters) on mobile", () => {
		mockIsMobile.value = true;
		mockFilterHook.optimisticActiveFilters = Array.from({ length: 10 }, (_, i) =>
			makeFilter(`${i}`, `k${i}`, `L${i}`),
		);
		render(<FilterBadges maxVisibleFilters={8} />);
		// effectiveMax = min(6, 8) = 6 → +4 autres
		expect(screen.getByText("+4 autres")).toBeInTheDocument();
	});
});
