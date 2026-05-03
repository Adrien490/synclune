import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="scroll-fade">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children }: { children: React.ReactNode }) => (
		<span data-testid="badge">{children}</span>
	),
}));

vi.mock("lucide-react", () => ({
	X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className} />,
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: (input: string) => `formatted-${input}`,
}));

// ============================================================================
// IMPORT (after mocks)
// ============================================================================

import {
	AdminFilterActiveChips,
	type AdminFilterChipDescriptor,
} from "../admin-filter-active-chips";
import type { AdminFilterFormData } from "../products-filter-sheet.types";

// ============================================================================
// TEST DATA
// ============================================================================

const baseDate = new Date("2026-01-01");

const colors = [
	{
		id: "c-or",
		slug: "or",
		name: "Or",
		hex: "#FFD700",
		isActive: true,
		position: 0,
		createdAt: baseDate,
		updatedAt: baseDate,
		_count: { skus: 10 },
	},
];

const materials = [{ id: "m-acier", slug: "acier", name: "Acier", _count: { skus: 15 } }];
const productTypes = [{ id: "pt-bagues", slug: "bagues", label: "Bagues" }];
const collections = [{ id: "col-ete", name: "Été" }];

const DEFAULT_PRICE_RANGE: [number, number] = [0, 500];

const emptyFormData: AdminFilterFormData = {
	statuses: [],
	priceRange: DEFAULT_PRICE_RANGE,
	typeSlugs: [],
	collectionIds: [],
	colorSlugs: [],
	materialSlugs: [],
	stockStatus: null,
	onSale: false,
	createdAfter: "",
	createdBefore: "",
	updatedAfter: "",
	updatedBefore: "",
};

function renderChips(overrides: Partial<AdminFilterFormData> = {}, onRemove = vi.fn()) {
	return render(
		<AdminFilterActiveChips
			formData={{ ...emptyFormData, ...overrides }}
			productTypes={productTypes}
			collections={collections}
			colors={colors}
			materials={materials}
			defaultPriceRange={DEFAULT_PRICE_RANGE}
			onRemove={onRemove}
		/>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("AdminFilterActiveChips", () => {
	describe("empty state", () => {
		it("renders nothing when no filters are active", () => {
			const { container } = renderChips();
			expect(container.firstChild).toBeNull();
		});
	});

	describe("status chips", () => {
		it("renders chip with human label for each active status", () => {
			renderChips({ statuses: ["PUBLIC", "DRAFT"] });
			expect(screen.getByText("Public")).toBeInTheDocument();
			expect(screen.getByText("Brouillon")).toBeInTheDocument();
		});

		it("falls back to raw value when status is unknown", () => {
			renderChips({ statuses: ["UNKNOWN"] });
			expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
		});
	});

	describe("type chips", () => {
		it("renders chip with type label", () => {
			renderChips({ typeSlugs: ["bagues"] });
			expect(screen.getByText("Bagues")).toBeInTheDocument();
		});

		it("uses slug as fallback when type lookup misses", () => {
			renderChips({ typeSlugs: ["unknown"] });
			expect(screen.getByText("unknown")).toBeInTheDocument();
		});
	});

	describe("collection chips", () => {
		it("renders chip with collection name", () => {
			renderChips({ collectionIds: ["col-ete"] });
			expect(screen.getByText("Été")).toBeInTheDocument();
		});

		it("uses id as fallback when collection lookup misses", () => {
			renderChips({ collectionIds: ["col-unknown"] });
			expect(screen.getByText("col-unknown")).toBeInTheDocument();
		});
	});

	describe("color chips", () => {
		it("renders chip with color name and swatch", () => {
			renderChips({ colorSlugs: ["or"] });
			expect(screen.getByText("Or")).toBeInTheDocument();
		});
	});

	describe("material chips", () => {
		it("renders chip with material name", () => {
			renderChips({ materialSlugs: ["acier"] });
			expect(screen.getByText("Acier")).toBeInTheDocument();
		});
	});

	describe("price chip", () => {
		it("does not render price chip at default range", () => {
			const { container } = renderChips({ priceRange: DEFAULT_PRICE_RANGE });
			expect(container.firstChild).toBeNull();
		});

		it("renders price chip when range differs from default", () => {
			renderChips({ priceRange: [50, 300] });
			expect(screen.getByText("50€ — 300€")).toBeInTheDocument();
		});
	});

	describe("availability chips", () => {
		it("renders En stock chip when stockStatus=in_stock", () => {
			renderChips({ stockStatus: "in_stock" });
			expect(screen.getByText("En stock")).toBeInTheDocument();
		});

		it("renders Rupture de stock chip when stockStatus=out_of_stock", () => {
			renderChips({ stockStatus: "out_of_stock" });
			expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
		});

		it("renders En promotion chip when onSale", () => {
			renderChips({ onSale: true });
			expect(screen.getByText("En promotion")).toBeInTheDocument();
		});
	});

	describe("date chips", () => {
		it("renders createdAfter chip with formatted date", () => {
			renderChips({ createdAfter: "2026-01-01" });
			expect(screen.getByText("Créé après le formatted-2026-01-01")).toBeInTheDocument();
		});

		it("renders createdBefore chip", () => {
			renderChips({ createdBefore: "2026-01-31" });
			expect(screen.getByText("Créé avant le formatted-2026-01-31")).toBeInTheDocument();
		});

		it("renders updatedAfter chip", () => {
			renderChips({ updatedAfter: "2026-02-01" });
			expect(screen.getByText("Modifié après le formatted-2026-02-01")).toBeInTheDocument();
		});

		it("renders updatedBefore chip", () => {
			renderChips({ updatedBefore: "2026-02-15" });
			expect(screen.getByText("Modifié avant le formatted-2026-02-15")).toBeInTheDocument();
		});
	});

	describe("interaction", () => {
		it("fires onRemove with matching status descriptor", () => {
			const onRemove = vi.fn();
			renderChips({ statuses: ["PUBLIC"] }, onRemove);
			fireEvent.click(screen.getByRole("button", { name: /Supprimer le filtre Public/i }));
			expect(onRemove).toHaveBeenCalledTimes(1);
			const descriptor = onRemove.mock.calls[0]![0] as AdminFilterChipDescriptor;
			expect(descriptor.kind).toBe("status");
			if (descriptor.kind === "status") expect(descriptor.value).toBe("PUBLIC");
		});

		it("fires onRemove with matching collection descriptor", () => {
			const onRemove = vi.fn();
			renderChips({ collectionIds: ["col-ete"] }, onRemove);
			fireEvent.click(screen.getByRole("button", { name: /Supprimer le filtre Été/i }));
			const descriptor = onRemove.mock.calls[0]![0] as AdminFilterChipDescriptor;
			expect(descriptor.kind).toBe("collection");
			if (descriptor.kind === "collection") expect(descriptor.id).toBe("col-ete");
		});

		it("fires onRemove with stockStatus descriptor", () => {
			const onRemove = vi.fn();
			renderChips({ stockStatus: "in_stock" }, onRemove);
			fireEvent.click(screen.getByRole("button", { name: /Supprimer le filtre En stock/i }));
			const descriptor = onRemove.mock.calls[0]![0] as AdminFilterChipDescriptor;
			expect(descriptor.kind).toBe("stockStatus");
		});

		it("fires haptic('light') on remove", () => {
			renderChips({ onSale: true });
			fireEvent.click(screen.getByRole("button", { name: /Supprimer le filtre En promotion/i }));
			expect(mockHaptic).toHaveBeenCalledWith("light");
		});
	});

	describe("aria-label", () => {
		it("exposes the section role with chip count", () => {
			renderChips({
				statuses: ["PUBLIC"],
				colorSlugs: ["or"],
				onSale: true,
			});
			expect(screen.getByRole("region", { name: "Filtres actifs : 3" })).toBeInTheDocument();
		});
	});
});
