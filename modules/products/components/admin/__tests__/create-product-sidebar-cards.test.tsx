import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

const { mockOpenDialog } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		required?: boolean;
		optional?: boolean;
	}) => <label {...props}>{children}</label>,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-header">{children}</div>
	),
	CardTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-title">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		type?: "button" | "submit" | "reset";
		variant?: string;
		size?: string;
		className?: string;
	}) => (
		<button onClick={onClick} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input-group", () => ({
	InputGroupAddon: ({ children }: { children: React.ReactNode; align?: string }) => (
		<span data-testid="input-group-addon">{children}</span>
	),
	InputGroupText: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span data-testid="input-group-text" className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
	TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
		asChild ? <>{children}</> : <div>{children}</div>,
}));

vi.mock("@/modules/colors/components/color-form-dialog", () => ({
	COLOR_DIALOG_ID: "color-dialog",
	ColorFormDialog: () => null,
}));

vi.mock("@/modules/materials/components/material-form-dialog", () => ({
	MATERIAL_DIALOG_ID: "material-dialog",
	MaterialFormDialog: () => null,
}));

vi.mock("@/modules/materials/components/admin/material-multi-select-field", () => ({
	MaterialMultiSelectField: ({
		fieldName,
		options,
	}: {
		fieldName?: string;
		value?: string[];
		onValueChange?: (ids: string[]) => void;
		options: Array<{ id: string; name: string }>;
	}) => (
		<div data-testid={`field-${fieldName ?? "materialIds"}`}>
			<label htmlFor={`select-${fieldName ?? "materialIds"}`}>
				Matériau
				<select id={`select-${fieldName ?? "materialIds"}`} aria-label="Matériau">
					{options.map((opt) => (
						<option key={opt.id} value={opt.id}>
							{opt.name}
						</option>
					))}
				</select>
			</label>
			<button type="button" aria-label="Créer un nouveau matériau">
				+
			</button>
		</div>
	),
}));

vi.mock("@/modules/colors/components/admin/color-multi-select-field", () => ({
	ColorMultiSelectField: ({
		fieldName,
		options,
	}: {
		fieldName?: string;
		value?: string[];
		onValueChange?: (ids: string[]) => void;
		options: Array<{ id: string; name: string; hex: string }>;
	}) => (
		<div data-testid={`field-${fieldName ?? "colorIds"}`}>
			<label htmlFor={`select-${fieldName ?? "colorIds"}`}>
				Couleur
				<select id={`select-${fieldName ?? "colorIds"}`} aria-label="Couleur">
					{options.map((opt) => (
						<option key={opt.id} value={opt.id}>
							{opt.name}
						</option>
					))}
				</select>
			</label>
			<button type="button" aria-label="Créer une nouvelle couleur">
				+
			</button>
		</div>
	),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		open: mockOpenDialog,
		close: vi.fn(),
		isOpen: false,
	}),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		refresh: vi.fn(),
	}),
}));

vi.mock("lucide-react", () => ({
	Euro: (props: Record<string, unknown>) => <svg data-testid="icon-euro" {...props} />,
	Info: (props: Record<string, unknown>) => <svg data-testid="icon-info" {...props} />,
	Package: (props: Record<string, unknown>) => <svg data-testid="icon-package" {...props} />,
	Plus: (props: Record<string, unknown>) => <svg data-testid="icon-plus" {...props} />,
	X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
	ChevronDown: (props: Record<string, unknown>) => (
		<svg data-testid="icon-chevron-down" {...props} />
	),
	Check: (props: Record<string, unknown>) => <svg data-testid="icon-check" {...props} />,
	Search: (props: Record<string, unknown>) => <svg data-testid="icon-search" {...props} />,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { CreateProductSidebarCards } from "../create-product-sidebar-cards";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultColors = [
	{ id: "color-1", name: "Or", hex: "#FFD700" },
	{ id: "color-2", name: "Argent", hex: "#C0C0C0" },
];

const defaultMaterials = [
	{ id: "mat-1", name: "Argent 925" },
	{ id: "mat-2", name: "Plaqué or" },
];

function createMockForm(overrides?: Record<string, unknown>) {
	const defaultValues = {
		"initialSku.colorIds": [],
		"initialSku.materialIds": [],
		"initialSku.size": "",
		"initialSku.priceInclTaxEuros": 0,
		"initialSku.compareAtPriceEuros": undefined,
		"initialSku.inventory": 0,
		status: "DRAFT",
		...overrides,
	};

	return {
		state: { values: defaultValues },
		setFieldValue: vi.fn(),
		getFieldValue: vi.fn((name: string) => defaultValues[name as keyof typeof defaultValues]),
		AppField: ({
			name,
			children,
		}: {
			name: string;
			children: (field: unknown) => React.ReactNode;
			validators?: unknown;
		}) => {
			const value = defaultValues[name as keyof typeof defaultValues] ?? "";
			return children({
				name,
				state: { value, meta: { errors: [] } },
				handleChange: vi.fn(),
				InputField: (props: Record<string, unknown>) => (
					<input data-testid={`field-${name}`} {...props} />
				),
				TextareaField: (props: Record<string, unknown>) => (
					<textarea data-testid={`field-${name}`} {...props} />
				),
				SelectField: ({
					options,
					placeholder,
					...rest
				}: {
					options?: Array<{ value: string; label: string }>;
					placeholder?: string;
					label?: string;
					clearable?: boolean;
					renderOption?: unknown;
					renderValue?: unknown;
				}) => (
					<select data-testid={`field-${name}`} aria-label={placeholder ?? name} {...rest}>
						{options?.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				),
				InputGroupField: ({
					children: inputChildren,
					...rest
				}: {
					children?: React.ReactNode;
					type?: string;
					step?: string;
					min?: number;
					inputMode?: "search" | "text" | "none" | "tel" | "url" | "email" | "numeric" | "decimal";
					required?: boolean;
					placeholder?: string;
				}) => (
					<div data-testid={`field-${name}`}>
						<input {...rest} />
						{inputChildren}
					</div>
				),
				RadioGroupField: ({
					options,
				}: {
					options: Array<{ value: string; label: string }>;
					label?: string;
				}) => (
					<div data-testid={`field-${name}`} role="radiogroup">
						{options.map((opt) => (
							<label key={opt.value}>
								<input type="radio" name={name} value={opt.value} />
								{opt.label}
							</label>
						))}
					</div>
				),
			});
		},
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CreateProductSidebarCards", () => {
	function setup(formOverrides?: Record<string, unknown>) {
		const form = createMockForm(formOverrides);
		render(
			<CreateProductSidebarCards
				form={form as never}
				colors={defaultColors}
				materials={defaultMaterials}
			/>,
		);
		return form;
	}

	describe("renders 4 cards", () => {
		it("renders Variante card title", () => {
			setup();
			expect(screen.getByText("Variante")).toBeInTheDocument();
		});

		it("renders Tarification card title", () => {
			setup();
			expect(screen.getByText("Tarification")).toBeInTheDocument();
		});

		it("renders Stock card title", () => {
			setup();
			expect(screen.getByText("Stock")).toBeInTheDocument();
		});

		it("renders Statut card title", () => {
			setup();
			expect(screen.getByText("Statut")).toBeInTheDocument();
		});

		it("renders 4 card wrappers", () => {
			setup();
			const cards = screen.getAllByTestId("card");
			expect(cards.length).toBe(4);
		});
	});

	describe("VariantCard", () => {
		it("renders color select field", () => {
			setup();
			expect(screen.getByTestId("field-initialSku.colorIds")).toBeInTheDocument();
		});

		it("renders Couleur label", () => {
			setup();
			expect(screen.getByText("Couleur")).toBeInTheDocument();
		});

		it("renders color options in select", () => {
			setup();
			expect(screen.getByRole("option", { name: "Or" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "Argent" })).toBeInTheDocument();
		});

		it("renders create color button with correct aria-label", () => {
			setup();
			expect(
				screen.getByRole("button", { name: "Créer une nouvelle couleur" }),
			).toBeInTheDocument();
		});

		it("renders material select field", () => {
			setup();
			expect(screen.getByTestId("field-initialSku.materialIds")).toBeInTheDocument();
		});

		it("renders Matériau label", () => {
			setup();
			expect(screen.getByText("Matériau")).toBeInTheDocument();
		});

		it("renders material options in select", () => {
			setup();
			expect(screen.getByRole("option", { name: "Argent 925" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "Plaqué or" })).toBeInTheDocument();
		});

		it("renders create material button with correct aria-label", () => {
			setup();
			expect(screen.getByRole("button", { name: "Créer un nouveau matériau" })).toBeInTheDocument();
		});

		it("renders size input field", () => {
			setup();
			expect(screen.getByTestId("field-initialSku.size")).toBeInTheDocument();
		});

		it("renders Taille label", () => {
			setup();
			expect(screen.getByText("Taille")).toBeInTheDocument();
		});

		it("renders variant info tooltip button", () => {
			setup();
			expect(
				screen.getByRole("button", {
					name: "Plus d'informations sur la variante",
				}),
			).toBeInTheDocument();
		});

		it("renders Info icon for tooltip", () => {
			setup();
			expect(screen.getByTestId("icon-info")).toBeInTheDocument();
		});
	});

	describe("PricingCard", () => {
		it("renders price field", () => {
			setup();
			expect(screen.getByTestId("field-initialSku.priceInclTaxEuros")).toBeInTheDocument();
		});

		it("renders Prix de vente final label", () => {
			setup();
			expect(screen.getByText("Prix de vente final")).toBeInTheDocument();
		});

		it("renders Euro icon addons for price fields", () => {
			setup();
			const euroIcons = screen.getAllByTestId("icon-euro");
			expect(euroIcons.length).toBeGreaterThanOrEqual(1);
		});

		it("renders compare-at-price field", () => {
			setup();
			expect(screen.getByTestId("field-initialSku.compareAtPriceEuros")).toBeInTheDocument();
		});

		it("renders Ancien prix label", () => {
			setup();
			expect(screen.getByText("Ancien prix (affiché barré)")).toBeInTheDocument();
		});

		it("renders helper text for price", () => {
			setup();
			expect(screen.getByText("Le prix que paiera le client")).toBeInTheDocument();
		});

		it("renders helper text for compare-at-price with strikethrough example", () => {
			setup();
			expect(screen.getByText(/Sera affiché barré/)).toBeInTheDocument();
		});
	});

	describe("StockCard", () => {
		it("renders inventory field", () => {
			setup();
			expect(screen.getByTestId("field-initialSku.inventory")).toBeInTheDocument();
		});

		it("renders Quantité en stock label", () => {
			setup();
			expect(screen.getByText("Quantité en stock")).toBeInTheDocument();
		});

		it("renders Package icon addon", () => {
			setup();
			expect(screen.getByTestId("icon-package")).toBeInTheDocument();
		});

		it("renders unités text addon", () => {
			setup();
			expect(screen.getByTestId("input-group-text")).toHaveTextContent("unités");
		});

		it("renders helper text for stock field", () => {
			setup();
			expect(screen.getByText("Laissez vide ou 0 si le bijou est en rupture")).toBeInTheDocument();
		});
	});

	describe("StatusCard", () => {
		it("renders status radiogroup field", () => {
			setup();
			expect(screen.getByTestId("field-status")).toBeInTheDocument();
		});

		it("renders Visibilité label", () => {
			setup();
			expect(screen.getByText("Visibilité")).toBeInTheDocument();
		});

		it("renders both Brouillon and Public options", () => {
			setup();
			expect(screen.getByText("Brouillon")).toBeInTheDocument();
			expect(screen.getByText("Public")).toBeInTheDocument();
		});

		it("renders helper text explaining visibility impact", () => {
			setup();
			expect(
				screen.getByText(
					"Un brouillon reste invisible côté boutique. Public le rend visible immédiatement.",
				),
			).toBeInTheDocument();
		});
	});
});
