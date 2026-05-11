import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ResizeObserver polyfill (required by @radix-ui/react-use-size in jsdom)
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/forms/checkbox-filter-item", () => ({
	CheckboxFilterItem: ({
		children,
		id,
	}: {
		children: React.ReactNode;
		id: string;
		checked?: boolean;
		onCheckedChange?: (v: boolean) => void;
	}) => (
		<label htmlFor={id} data-testid={`checkbox-item-${id}`}>
			<input type="checkbox" id={id} />
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/ui/accordion", () => ({
	AccordionItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`accordion-item-${value}`}>{children}</div>
	),
	AccordionTrigger: ({
		children,
	}: {
		children: React.ReactNode;
		headingLevel?: number;
		className?: string;
	}) => <div data-testid="accordion-trigger">{children}</div>,
	AccordionContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="accordion-content">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		id,
		type,
		value,
		onChange,
	}: {
		id?: string;
		type?: string;
		value?: string;
		onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
		className?: string;
	}) => <input data-testid={`input-${id}`} id={id} type={type} value={value} onChange={onChange} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({
		children,
		htmlFor,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		className?: string;
	}) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock(
	"/Users/adrienpoirier/Projets/synclune/modules/products/components/price-range-inputs",
	() => ({
		PriceRangeInputs: ({
			value,
		}: {
			value: [number, number];
			onChange: (v: [number, number]) => void;
			maxPrice: number;
		}) => <div data-testid="price-range-inputs" data-value={JSON.stringify(value)} />,
	}),
);

vi.mock(
	"/Users/adrienpoirier/Projets/synclune/modules/products/components/admin/products-filter-sheet-ui",
	() => ({
		SectionHeader: ({
			label,
			count,
		}: {
			label: string;
			count?: number;
			badgeContent?: string;
			onReset?: () => void;
		}) => (
			<div data-testid={`section-header-${label.toLowerCase().replace(/\s+/g, "-")}`}>
				<span>{label}</span>
				{count !== undefined && count > 0 && <span data-testid="section-count">{count}</span>}
			</div>
		),
	}),
);

vi.mock(
	"/Users/adrienpoirier/Projets/synclune/modules/products/components/admin/products-filter-sections-searchable",
	() => ({
		ColorsSection: () => <div data-testid="colors-section" />,
		MaterialsSection: () => <div data-testid="materials-section" />,
	}),
);

// STATUS_OPTIONS real values: PUBLIC, DRAFT, ARCHIVED — no mock needed as the real values are used

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { ProductsFilterSections } from "../products-filter-sections";

// ============================================================================
// HELPERS
// ============================================================================

function createMockForm(overrides?: Record<string, unknown>) {
	const defaultValues = {
		statuses: [] as string[],
		priceRange: [0, 500] as [number, number],
		typeSlugs: [] as string[],
		collectionIds: [] as string[],
		colorSlugs: [] as string[],
		materialSlugs: [] as string[],
		stockStatus: null as string | null,
		onSale: false,
		createdAfter: "",
		createdBefore: "",
		updatedAfter: "",
		updatedBefore: "",
		...overrides,
	};

	return {
		state: { values: defaultValues },
		setFieldValue: vi.fn(),
		getFieldValue: vi.fn((name: string) => defaultValues[name as keyof typeof defaultValues]),
		Field: ({
			name,
			children,
		}: {
			name: string;
			mode?: string;
			children: (field: unknown) => React.ReactNode;
			validators?: unknown;
		}) => {
			const fieldValue = defaultValues[name as keyof typeof defaultValues] ?? [];
			return children({
				state: { value: fieldValue, meta: { errors: [] } },
				handleChange: vi.fn(),
				pushValue: vi.fn(),
				removeValue: vi.fn(),
			});
		},
	};
}

const defaultProductTypes = [
	{ id: "type-1", label: "Bague", slug: "bague" },
	{ id: "type-2", label: "Collier", slug: "collier" },
];

const defaultCollections = [
	{ id: "col-1", name: "Collection Lune" },
	{ id: "col-2", name: "Collection Étoile" },
];

const defaultColors = [
	{
		id: "col-1",
		slug: "or",
		name: "Or",
		hex: "#FFD700",
		isActive: true,
		description: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		_count: { skus: 5 },
	},
];

const defaultMaterials = [
	{
		id: "mat-1",
		slug: "argent-925",
		name: "Argent 925",
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		_count: { skus: 8 },
	},
];

function renderSections(formOverrides?: Record<string, unknown>) {
	const form = createMockForm(formOverrides);
	render(
		<ProductsFilterSections
			form={form as never}
			productTypes={defaultProductTypes}
			collections={defaultCollections}
			sortedColors={defaultColors}
			sortedMaterials={defaultMaterials}
			filteredColors={defaultColors}
			filteredMaterials={defaultMaterials}
			colorSearch=""
			setColorSearch={vi.fn()}
			materialSearch=""
			setMaterialSearch={vi.fn()}
			defaultPriceRange={[0, 500]}
			maxPriceInEuros={500}
		/>,
	);
	return form;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProductsFilterSections", () => {
	describe("renders all main sections", () => {
		it("renders status accordion section", () => {
			renderSections();
			expect(screen.getByTestId("accordion-item-status")).toBeInTheDocument();
		});

		it("renders types accordion section when productTypes not empty", () => {
			renderSections();
			expect(screen.getByTestId("accordion-item-types")).toBeInTheDocument();
		});

		it("renders price accordion section", () => {
			renderSections();
			expect(screen.getByTestId("accordion-item-price")).toBeInTheDocument();
		});

		it("renders colors section", () => {
			renderSections();
			expect(screen.getByTestId("colors-section")).toBeInTheDocument();
		});

		it("renders materials section", () => {
			renderSections();
			expect(screen.getByTestId("materials-section")).toBeInTheDocument();
		});

		it("renders collections accordion section when collections not empty", () => {
			renderSections();
			expect(screen.getByTestId("accordion-item-collections")).toBeInTheDocument();
		});

		it("renders availability accordion section", () => {
			renderSections();
			expect(screen.getByTestId("accordion-item-availability")).toBeInTheDocument();
		});

		it("renders dates accordion section", () => {
			renderSections();
			expect(screen.getByTestId("accordion-item-dates")).toBeInTheDocument();
		});
	});

	describe("StatusSection", () => {
		it("renders status checkboxes for all STATUS_OPTIONS", () => {
			renderSections();
			expect(screen.getByTestId("checkbox-item-admin-status-PUBLIC")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-item-admin-status-DRAFT")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-item-admin-status-ARCHIVED")).toBeInTheDocument();
		});

		it("renders status option labels", () => {
			renderSections();
			expect(screen.getByText("Public")).toBeInTheDocument();
			expect(screen.getByText("Brouillon")).toBeInTheDocument();
			expect(screen.getByText("Archivé")).toBeInTheDocument();
		});

		it("renders Statut section header label", () => {
			renderSections();
			expect(screen.getByText("Statut")).toBeInTheDocument();
		});
	});

	describe("ProductTypesSection", () => {
		it("returns null when productTypes is empty", () => {
			const form = createMockForm();
			render(
				<ProductsFilterSections
					form={form as never}
					productTypes={[]}
					collections={defaultCollections}
					sortedColors={defaultColors}
					sortedMaterials={defaultMaterials}
					filteredColors={defaultColors}
					filteredMaterials={defaultMaterials}
					colorSearch=""
					setColorSearch={vi.fn()}
					materialSearch=""
					setMaterialSearch={vi.fn()}
					defaultPriceRange={[0, 500]}
					maxPriceInEuros={500}
				/>,
			);
			expect(screen.queryByTestId("accordion-item-types")).not.toBeInTheDocument();
		});

		it("renders type checkboxes for each productType", () => {
			renderSections();
			expect(screen.getByTestId("checkbox-item-admin-type-bague")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-item-admin-type-collier")).toBeInTheDocument();
		});

		it("renders type labels", () => {
			renderSections();
			expect(screen.getByText("Bague")).toBeInTheDocument();
			expect(screen.getByText("Collier")).toBeInTheDocument();
		});
	});

	describe("PriceSection", () => {
		it("renders PriceRangeInputs component", () => {
			renderSections();
			expect(screen.getByTestId("price-range-inputs")).toBeInTheDocument();
		});

		it("passes correct price range value", () => {
			renderSections();
			expect(screen.getByTestId("price-range-inputs")).toHaveAttribute(
				"data-value",
				JSON.stringify([0, 500]),
			);
		});

		it("renders Prix section header label", () => {
			renderSections();
			expect(screen.getByText("Prix")).toBeInTheDocument();
		});
	});

	describe("CollectionsSection", () => {
		it("returns null when collections is empty", () => {
			const form = createMockForm();
			render(
				<ProductsFilterSections
					form={form as never}
					productTypes={defaultProductTypes}
					collections={[]}
					sortedColors={defaultColors}
					sortedMaterials={defaultMaterials}
					filteredColors={defaultColors}
					filteredMaterials={defaultMaterials}
					colorSearch=""
					setColorSearch={vi.fn()}
					materialSearch=""
					setMaterialSearch={vi.fn()}
					defaultPriceRange={[0, 500]}
					maxPriceInEuros={500}
				/>,
			);
			expect(screen.queryByTestId("accordion-item-collections")).not.toBeInTheDocument();
		});

		it("renders collection checkboxes", () => {
			renderSections();
			expect(screen.getByTestId("checkbox-item-admin-collection-col-1")).toBeInTheDocument();
			expect(screen.getByTestId("checkbox-item-admin-collection-col-2")).toBeInTheDocument();
		});

		it("renders collection names", () => {
			renderSections();
			expect(screen.getByText("Collection Lune")).toBeInTheDocument();
			expect(screen.getByText("Collection Étoile")).toBeInTheDocument();
		});
	});

	describe("AvailabilitySection", () => {
		it("renders En stock checkbox", () => {
			renderSections();
			expect(screen.getByText("En stock")).toBeInTheDocument();
		});

		it("renders Rupture de stock checkbox", () => {
			renderSections();
			expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
		});

		it("renders En promotion checkbox", () => {
			renderSections();
			expect(screen.getByText("En promotion")).toBeInTheDocument();
		});

		it("renders Disponibilité section header label", () => {
			renderSections();
			expect(screen.getByText("Disponibilité")).toBeInTheDocument();
		});
	});

	describe("DatesSection", () => {
		it("renders fieldset for Date de création", () => {
			const { container } = render(
				<ProductsFilterSections
					form={createMockForm() as never}
					productTypes={defaultProductTypes}
					collections={defaultCollections}
					sortedColors={defaultColors}
					sortedMaterials={defaultMaterials}
					filteredColors={defaultColors}
					filteredMaterials={defaultMaterials}
					colorSearch=""
					setColorSearch={vi.fn()}
					materialSearch=""
					setMaterialSearch={vi.fn()}
					defaultPriceRange={[0, 500]}
					maxPriceInEuros={500}
				/>,
			);
			const fieldsets = container.querySelectorAll("fieldset");
			expect(fieldsets.length).toBeGreaterThanOrEqual(2);
		});

		it("renders Date de création legend", () => {
			renderSections();
			expect(screen.getByText("Date de création")).toBeInTheDocument();
		});

		it("renders Date de modification legend", () => {
			renderSections();
			expect(screen.getByText("Date de modification")).toBeInTheDocument();
		});

		it("renders date inputs for createdAfter and createdBefore", () => {
			renderSections();
			expect(screen.getByTestId("input-admin-created-after")).toBeInTheDocument();
			expect(screen.getByTestId("input-admin-created-before")).toBeInTheDocument();
		});

		it("renders date inputs for updatedAfter and updatedBefore", () => {
			renderSections();
			expect(screen.getByTestId("input-admin-updated-after")).toBeInTheDocument();
			expect(screen.getByTestId("input-admin-updated-before")).toBeInTheDocument();
		});

		it("renders Après/Avant labels for date inputs", () => {
			renderSections();
			const apresLabels = screen.getAllByText("Après");
			const avantLabels = screen.getAllByText("Avant");
			expect(apresLabels.length).toBe(2);
			expect(avantLabels.length).toBe(2);
		});

		it("renders Dates section header label", () => {
			renderSections();
			expect(screen.getByText("Dates")).toBeInTheDocument();
		});
	});
});
