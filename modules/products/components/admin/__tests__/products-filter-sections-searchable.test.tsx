import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/forms/checkbox-filter-item", () => ({
	CheckboxFilterItem: ({
		children,
		id,
		checked,
		count,
		indicator,
	}: {
		children: React.ReactNode;
		id: string;
		checked: boolean;
		onCheckedChange: (v: boolean) => void;
		count?: number;
		indicator?: React.ReactNode;
	}) => (
		<label htmlFor={id} data-testid={`checkbox-item-${id}`} data-checked={checked}>
			<input type="checkbox" id={id} defaultChecked={checked} readOnly />
			{indicator}
			{children}
			{count !== undefined && <span data-testid={`count-${id}`}>{count}</span>}
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

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Check: (props: Record<string, unknown>) => <svg data-testid="icon-check" {...props} />,
	X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
}));

vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: vi.fn(() => false),
	getContrastTextColor: vi.fn(() => "#fff"),
}));

vi.mock(
	"/Users/adrienpoirier/Projets/synclune/modules/products/components/admin/products-filter-sheet-ui",
	() => ({
		SectionHeader: ({ label, count }: { label: string; count?: number; onReset?: () => void }) => (
			<div data-testid="section-header">
				<span>{label}</span>
				{count !== undefined && count > 0 && <span data-testid="section-count">{count}</span>}
			</div>
		),
		SectionSearch: ({
			value,
			onChange,
			placeholder,
		}: {
			value: string;
			onChange: (v: string) => void;
			placeholder?: string;
		}) => (
			<input
				data-testid="section-search"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
			/>
		),
	}),
);

// NOTE: SEARCH_THRESHOLD real value is 8 — tests use 9 items to exceed it

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { ColorsSection, MaterialsSection } from "../products-filter-sections-searchable";

// ============================================================================
// FIXTURES
// ============================================================================

const mockColors = [
	{
		id: "col-1",
		slug: "or",
		name: "Or",
		hex: "#FFD700",
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		_count: { skus: 5 },
	},
	{
		id: "col-2",
		slug: "argent",
		name: "Argent",
		hex: "#C0C0C0",
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		_count: { skus: 3 },
	},
];

const mockMaterials = [
	{
		id: "mat-1",
		slug: "argent-925",
		name: "Argent 925",
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		_count: { skus: 8 },
	},
	{
		id: "mat-2",
		slug: "or-14k",
		name: "Or 14K",
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		_count: { skus: 4 },
	},
];

function createColorForm(selectedSlugs: string[] = []) {
	return {
		state: { values: { colorSlugs: selectedSlugs } },
		setFieldValue: vi.fn(),
		getFieldValue: vi.fn(),
		Field: ({
			children,
		}: {
			name: string;
			mode?: string;
			children: (field: unknown) => React.ReactNode;
			validators?: unknown;
		}) =>
			children({
				state: { value: selectedSlugs, meta: { errors: [] } },
				handleChange: vi.fn(),
				pushValue: vi.fn(),
				removeValue: vi.fn(),
			}),
	};
}

function createMaterialForm(selectedSlugs: string[] = []) {
	return {
		state: { values: { materialSlugs: selectedSlugs } },
		setFieldValue: vi.fn(),
		getFieldValue: vi.fn(),
		Field: ({
			children,
		}: {
			name: string;
			mode?: string;
			children: (field: unknown) => React.ReactNode;
			validators?: unknown;
		}) =>
			children({
				state: { value: selectedSlugs, meta: { errors: [] } },
				handleChange: vi.fn(),
				pushValue: vi.fn(),
				removeValue: vi.fn(),
			}),
	};
}

// ============================================================================
// TESTS - ColorsSection
// ============================================================================

afterEach(cleanup);

describe("ColorsSection", () => {
	describe("null when empty", () => {
		it("returns null when sortedColors is empty", () => {
			const form = createColorForm();
			const { container } = render(
				<ColorsSection
					form={form as never}
					sortedColors={[]}
					filteredColors={[]}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(container.firstChild).toBeNull();
		});
	});

	describe("rendering", () => {
		it("renders accordion item for colors", () => {
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={mockColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("accordion-item-colors")).toBeInTheDocument();
		});

		it("renders section header with Couleurs label", () => {
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={mockColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByText("Couleurs")).toBeInTheDocument();
		});

		it("renders all filtered color items", () => {
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={mockColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByText("Or")).toBeInTheDocument();
			expect(screen.getByText("Argent")).toBeInTheDocument();
		});

		it("renders color count badges", () => {
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={mockColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("count-admin-color-or")).toHaveTextContent("5");
			expect(screen.getByTestId("count-admin-color-argent")).toHaveTextContent("3");
		});

		it("renders color circle indicator for each color", () => {
			const form = createColorForm();
			const { container } = render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={mockColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			// Color circles are spans with inline backgroundColor style
			const circles = container.querySelectorAll("span[style]");
			expect(circles.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("search threshold", () => {
		it("does not show search when count <= SEARCH_THRESHOLD (5)", () => {
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={mockColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.queryByTestId("section-search")).not.toBeInTheDocument();
		});

		it("shows search when colors count > SEARCH_THRESHOLD (8)", () => {
			// Real SEARCH_THRESHOLD = 8, use 9 items to exceed it
			const manyColors = Array.from({ length: 9 }, (_, i) => ({
				id: `color-${i}`,
				slug: `color-${i}`,
				name: `Color ${i}`,
				hex: "#000000",
				isActive: true,
				createdAt: new Date("2026-01-01"),
				updatedAt: new Date("2026-01-01"),
				_count: { skus: 1 },
			}));
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={manyColors}
					filteredColors={manyColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("section-search")).toBeInTheDocument();
		});

		it("passes correct placeholder to search input", () => {
			// Real SEARCH_THRESHOLD = 8, use 9 items to exceed it
			const manyColors = Array.from({ length: 9 }, (_, i) => ({
				id: `color-${i}`,
				slug: `color-${i}`,
				name: `Color ${i}`,
				hex: "#000000",
				isActive: true,
				createdAt: new Date("2026-01-01"),
				updatedAt: new Date("2026-01-01"),
				_count: { skus: 1 },
			}));
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={manyColors}
					filteredColors={manyColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("section-search")).toHaveAttribute(
				"placeholder",
				"Rechercher une couleur...",
			);
		});
	});

	describe("empty search results", () => {
		it("shows 'Aucun résultat' when filteredColors is empty but sortedColors is not", () => {
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={[]}
					colorSearch="xyz"
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
		});

		it("does not render color items when filtered is empty", () => {
			const form = createColorForm();
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={[]}
					colorSearch="xyz"
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.queryByText("Or")).not.toBeInTheDocument();
			expect(screen.queryByText("Argent")).not.toBeInTheDocument();
		});
	});

	describe("selected state", () => {
		it("marks selected colors as checked", () => {
			const form = createColorForm(["or"]);
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={mockColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("checkbox-item-admin-color-or")).toHaveAttribute(
				"data-checked",
				"true",
			);
			expect(screen.getByTestId("checkbox-item-admin-color-argent")).toHaveAttribute(
				"data-checked",
				"false",
			);
		});

		it("shows check icon on selected colors", () => {
			const form = createColorForm(["or"]);
			render(
				<ColorsSection
					form={form as never}
					sortedColors={mockColors}
					filteredColors={mockColors}
					colorSearch=""
					setColorSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("icon-check")).toBeInTheDocument();
		});
	});
});

// ============================================================================
// TESTS - MaterialsSection
// ============================================================================

describe("MaterialsSection", () => {
	describe("null when empty", () => {
		it("returns null when sortedMaterials is empty", () => {
			const form = createMaterialForm();
			const { container } = render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={[]}
					filteredMaterials={[]}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(container.firstChild).toBeNull();
		});
	});

	describe("rendering", () => {
		it("renders accordion item for materials", () => {
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={mockMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("accordion-item-materials")).toBeInTheDocument();
		});

		it("renders section header with Matériaux label", () => {
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={mockMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.getByText("Matériaux")).toBeInTheDocument();
		});

		it("renders all filtered material items", () => {
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={mockMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.getByText("Argent 925")).toBeInTheDocument();
			expect(screen.getByText("Or 14K")).toBeInTheDocument();
		});

		it("renders material count badges", () => {
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={mockMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("count-admin-material-argent-925")).toHaveTextContent("8");
			expect(screen.getByTestId("count-admin-material-or-14k")).toHaveTextContent("4");
		});

		it("does not render color circle indicators (no hex on materials)", () => {
			const form = createMaterialForm();
			const { container } = render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={mockMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			const circles = container.querySelectorAll("span[style*='backgroundColor']");
			expect(circles.length).toBe(0);
		});
	});

	describe("search threshold", () => {
		it("does not show search when count <= SEARCH_THRESHOLD (5)", () => {
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={mockMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.queryByTestId("section-search")).not.toBeInTheDocument();
		});

		it("shows search when materials count > SEARCH_THRESHOLD (8)", () => {
			// Real SEARCH_THRESHOLD = 8, use 9 items to exceed it
			const manyMaterials = Array.from({ length: 9 }, (_, i) => ({
				id: `mat-${i}`,
				slug: `mat-${i}`,
				name: `Material ${i}`,
				isActive: true,
				createdAt: new Date("2026-01-01"),
				updatedAt: new Date("2026-01-01"),
				_count: { skus: 1 },
			}));
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={manyMaterials}
					filteredMaterials={manyMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("section-search")).toBeInTheDocument();
		});

		it("passes correct placeholder to material search input", () => {
			// Real SEARCH_THRESHOLD = 8, use 9 items to exceed it
			const manyMaterials = Array.from({ length: 9 }, (_, i) => ({
				id: `mat-${i}`,
				slug: `mat-${i}`,
				name: `Material ${i}`,
				isActive: true,
				createdAt: new Date("2026-01-01"),
				updatedAt: new Date("2026-01-01"),
				_count: { skus: 1 },
			}));
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={manyMaterials}
					filteredMaterials={manyMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("section-search")).toHaveAttribute(
				"placeholder",
				"Rechercher un matériau...",
			);
		});
	});

	describe("empty search results", () => {
		it("shows 'Aucun résultat' when filteredMaterials is empty but sortedMaterials is not", () => {
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={[]}
					materialSearch="xyz"
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
		});

		it("does not render material items when filtered is empty", () => {
			const form = createMaterialForm();
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={[]}
					materialSearch="xyz"
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.queryByText("Argent 925")).not.toBeInTheDocument();
			expect(screen.queryByText("Or 14K")).not.toBeInTheDocument();
		});
	});

	describe("selected state", () => {
		it("marks selected materials as checked", () => {
			const form = createMaterialForm(["argent-925"]);
			render(
				<MaterialsSection
					form={form as never}
					sortedMaterials={mockMaterials}
					filteredMaterials={mockMaterials}
					materialSearch=""
					setMaterialSearch={vi.fn()}
				/>,
			);
			expect(screen.getByTestId("checkbox-item-admin-material-argent-925")).toHaveAttribute(
				"data-checked",
				"true",
			);
			expect(screen.getByTestId("checkbox-item-admin-material-or-14k")).toHaveAttribute(
				"data-checked",
				"false",
			);
		});
	});
});
