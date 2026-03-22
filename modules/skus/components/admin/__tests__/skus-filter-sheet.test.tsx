import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseForm, mockUseRouter, mockUseSearchParams } = vi.hoisted(() => ({
	mockUseForm: vi.fn(),
	mockUseRouter: vi.fn(),
	mockUseSearchParams: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="filter-sheet-wrapper">{children}</div>
	),
}));

vi.mock("@tanstack/react-form", () => ({
	useForm: mockUseForm,
}));

vi.mock("next/navigation", () => ({
	useRouter: mockUseRouter,
	useSearchParams: mockUseSearchParams,
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: (props: Record<string, unknown>) => (
		<input type="checkbox" data-testid="checkbox" {...props} />
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/shared/components/ui/radio-group", () => ({
	RadioGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="radio-group">{children}</div>
	),
	RadioGroupItem: ({ value }: { value: string }) => (
		<input type="radio" data-testid={`radio-${value}`} value={value} />
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { SkusFilterSheet } from "../skus-filter-sheet";

// ============================================================================
// FIXTURES
// ============================================================================

const mockForm = {
	Field: ({
		children,
	}: {
		name: string;
		mode?: string;
		children: (field: {
			state: { value: string | string[] };
			handleChange: ReturnType<typeof vi.fn>;
			handleBlur: ReturnType<typeof vi.fn>;
			pushValue: ReturnType<typeof vi.fn>;
			removeValue: ReturnType<typeof vi.fn>;
		}) => React.ReactNode;
	}) =>
		children({
			state: { value: "all" },
			handleChange: vi.fn(),
			handleBlur: vi.fn(),
			pushValue: vi.fn(),
			removeValue: vi.fn(),
		}),
	Subscribe: ({ children }: { children: (state: unknown) => React.ReactNode }) =>
		children({ canSubmit: true, isSubmitting: false }),
	reset: vi.fn(),
	setFieldValue: vi.fn(),
	handleSubmit: vi.fn(),
	store: { subscribe: vi.fn(), getState: vi.fn(() => ({ values: {} })) },
};

const mockSearchParams = {
	forEach: vi.fn(),
	toString: vi.fn(() => ""),
};

const colorOptions = [
	{ id: "color-1", name: "Rouge", hex: "#FF0000" },
	{ id: "color-2", name: "Bleu", hex: "#0000FF" },
];

const materialOptions = [
	{ id: "mat-1", name: "Or", slug: "or" },
	{ id: "mat-2", name: "Argent", slug: "argent" },
];

// ============================================================================
// TESTS
// ============================================================================

describe("SkusFilterSheet", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockUseForm.mockReturnValue(mockForm);
		mockUseRouter.mockReturnValue({ push: vi.fn() });
		mockUseSearchParams.mockReturnValue(mockSearchParams);
	});

	// ─── Smoke: render ────────────────────────────────────────────────────────

	it("renders without crash", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);

		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the variant status fieldset legend", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);

		expect(screen.getByText("Statut de la variante")).toBeInTheDocument();
	});

	it("renders the stock status fieldset legend", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);

		expect(screen.getByText("Statut du stock")).toBeInTheDocument();
	});

	it("renders stock status option labels", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);

		expect(screen.getByText("En stock")).toBeInTheDocument();
		expect(screen.getByText("Stock faible")).toBeInTheDocument();
		expect(screen.getByText("Rupture")).toBeInTheDocument();
	});

	it("renders active status option labels", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);

		expect(screen.getByText("Toutes")).toBeInTheDocument();
		expect(screen.getByText("Actives uniquement")).toBeInTheDocument();
		expect(screen.getByText("Inactives uniquement")).toBeInTheDocument();
	});

	it("renders color section when colorOptions provided", () => {
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={[]} />);

		expect(screen.getByText("Couleur")).toBeInTheDocument();
		expect(screen.getByText("Rouge")).toBeInTheDocument();
		expect(screen.getByText("Bleu")).toBeInTheDocument();
	});

	it("does not render color section when colorOptions is empty", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);

		expect(screen.queryByText("Couleur")).not.toBeInTheDocument();
	});

	it("renders material section when materialOptions provided", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={materialOptions} />);

		expect(screen.getByText("Matériau")).toBeInTheDocument();
		expect(screen.getByText("Or")).toBeInTheDocument();
		expect(screen.getByText("Argent")).toBeInTheDocument();
	});

	it("does not render material section when materialOptions is empty", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);

		expect(screen.queryByText("Matériau")).not.toBeInTheDocument();
	});

	it("accepts optional className prop", () => {
		render(<SkusFilterSheet className="custom-class" colorOptions={[]} materialOptions={[]} />);

		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});
});
