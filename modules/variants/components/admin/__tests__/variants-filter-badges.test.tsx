import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFilterBadges } = vi.hoisted(() => ({
	mockFilterBadges: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/filter-badges", () => ({
	FilterBadges: (props: Record<string, unknown>) => {
		mockFilterBadges(props);
		return <div data-testid="filter-badges" />;
	},
}));

vi.mock("@/shared/utils/format-status-filter", () => ({
	formatStatusFilter: vi.fn((value: string, activeLabel: string, inactiveLabel: string) =>
		value === "true"
			? { label: "Statut", displayValue: activeLabel }
			: { label: "Statut", displayValue: inactiveLabel },
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { VariantsFilterBadges } from "../variants-filter-badges";

// ============================================================================
// FIXTURES
// ============================================================================

const colors = [
	{ id: "color-1", name: "Rouge", hex: "#FF0000" },
	{ id: "color-2", name: "Bleu", hex: "#0000FF" },
];

const materials = [
	{ id: "mat-1", name: "Or", slug: "or" },
	{ id: "mat-2", name: "Argent", slug: "argent" },
];

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
	mockFilterBadges.mockClear();
});

afterEach(cleanup);

describe("VariantsFilterBadges", () => {
	it("renders FilterBadges", () => {
		render(<VariantsFilterBadges colors={colors} materials={materials} />);

		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	it("passes a formatFilter function to FilterBadges", () => {
		render(<VariantsFilterBadges colors={colors} materials={materials} />);

		expect(mockFilterBadges).toHaveBeenCalledWith(
			expect.objectContaining({ formatFilter: expect.any(Function) }),
		);
	});

	it("formatFilter resolves colorId to color name", () => {
		render(<VariantsFilterBadges colors={colors} materials={materials} />);

		const { formatFilter } = mockFilterBadges.mock.calls[0]![0] as {
			formatFilter: (filter: { key: string; value: unknown }) => unknown;
		};

		const result = formatFilter({ key: "filter_colorId", value: "color-1" });

		expect(result).toEqual({ label: "Couleur", displayValue: "Rouge" });
	});

	it("formatFilter resolves materialId to material name", () => {
		render(<VariantsFilterBadges colors={colors} materials={materials} />);

		const { formatFilter } = mockFilterBadges.mock.calls[0]![0] as {
			formatFilter: (filter: { key: string; value: unknown }) => unknown;
		};

		const result = formatFilter({ key: "filter_materialId", value: "mat-2" });

		expect(result).toEqual({ label: "Matériau", displayValue: "Argent" });
	});

	it("formatFilter returns stock status label for in_stock", () => {
		render(<VariantsFilterBadges colors={[]} materials={[]} />);

		const { formatFilter } = mockFilterBadges.mock.calls[0]![0] as {
			formatFilter: (filter: { key: string; value: unknown }) => unknown;
		};

		const result = formatFilter({ key: "filter_stockStatus", value: "in_stock" }) as {
			label: string;
			displayValue: string;
		};

		expect(result).toEqual({ label: "Stock", displayValue: "En stock" });
	});

	it("formatFilter returns stock status label for out_of_stock", () => {
		render(<VariantsFilterBadges colors={[]} materials={[]} />);

		const { formatFilter } = mockFilterBadges.mock.calls[0]![0] as {
			formatFilter: (filter: { key: string; value: unknown }) => unknown;
		};

		const result = formatFilter({ key: "filter_stockStatus", value: "out_of_stock" }) as {
			label: string;
			displayValue: string;
		};

		expect(result).toEqual({ label: "Stock", displayValue: "Rupture" });
	});

	/**
	 * ⚠️ Chemin JAMAIS couvert avant l'audit du 2026-08-19 — et cassé : le sheet
	 * écrit `filter_isActive`, le formateur testait `"active"`. Le filtre tombait
	 * dans le cas par défaut et le badge affichait « isActive : true » à l'admin.
	 */
	it("formatFilter formats the isActive filter as a readable status", () => {
		render(<VariantsFilterBadges colors={colors} materials={materials} />);

		const { formatFilter } = mockFilterBadges.mock.calls[0]![0] as {
			formatFilter: (filter: { key: string; value: unknown }) => unknown;
		};

		expect(formatFilter({ key: "filter_isActive", value: "true" })).toEqual({
			label: "Statut",
			displayValue: "Actives",
		});
		expect(formatFilter({ key: "filter_isActive", value: "false" })).toEqual({
			label: "Statut",
			displayValue: "Inactives",
		});
	});

	it("formatFilter falls back to raw value for unknown colorId", () => {
		render(<VariantsFilterBadges colors={colors} materials={materials} />);

		const { formatFilter } = mockFilterBadges.mock.calls[0]![0] as {
			formatFilter: (filter: { key: string; value: unknown }) => unknown;
		};

		const result = formatFilter({ key: "filter_colorId", value: "unknown-id" });

		expect(result).toEqual({ label: "Couleur", displayValue: "unknown-id" });
	});
});
