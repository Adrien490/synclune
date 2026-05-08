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

vi.mock("@/shared/components/multi-select", () => ({
	MultiSelect: ({
		options,
		placeholder,
	}: {
		options: Array<{ value: string; label: string }>;
		defaultValue?: string[];
		onValueChange?: (v: string[]) => void;
		placeholder?: string;
		maxCount?: number;
		hideSelectAll?: boolean;
	}) => (
		<select data-testid="multi-select" aria-label={placeholder}>
			{options.map((opt) => (
				<option key={opt.value} value={opt.value}>
					{opt.label}
				</option>
			))}
		</select>
	),
}));

vi.mock("@/modules/product-types/components/product-type-form-dialog", () => ({
	PRODUCT_TYPE_DIALOG_ID: "product-type-dialog",
	ProductTypeFormDialog: () => null,
}));

vi.mock("@/modules/collections/components/admin/collection-form-dialog", () => ({
	COLLECTION_DIALOG_ID: "collection-form",
	CollectionFormDialog: () => null,
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
	Plus: (props: Record<string, unknown>) => <svg data-testid="icon-plus" {...props} />,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { CreateProductInfoCard } from "../create-product-info-card";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultProductTypes = [
	{ id: "type-1", label: "Bague" },
	{ id: "type-2", label: "Collier" },
];

const defaultCollections = [
	{ id: "col-1", name: "Collection Lune" },
	{ id: "col-2", name: "Collection Étoile" },
];

function createMockForm(overrides?: Record<string, unknown>) {
	const defaultValues = {
		title: "",
		description: "",
		typeId: "",
		collectionIds: [] as string[],
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
			const value = defaultValues[name as keyof typeof defaultValues];
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
				SelectField: (props: Record<string, unknown>) => {
					const { options, placeholder } = props as {
						options?: Array<{ value: string; label: string }>;
						placeholder?: string;
					};
					return (
						<select data-testid={`field-${name}`} aria-label={placeholder ?? name}>
							{options?.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					);
				},
				InputGroupField: (props: Record<string, unknown>) => (
					<input data-testid={`field-${name}`} {...props} />
				),
			});
		},
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CreateProductInfoCard", () => {
	function setup(formOverrides?: Record<string, unknown>) {
		const form = createMockForm(formOverrides);
		render(
			<CreateProductInfoCard
				form={form as never}
				productTypes={defaultProductTypes}
				collections={defaultCollections}
			/>,
		);
		return form;
	}

	describe("rendering", () => {
		it("renders card title Informations", () => {
			setup();
			expect(screen.getByTestId("card-title")).toHaveTextContent("Informations");
		});

		it("renders card wrapper", () => {
			setup();
			expect(screen.getByTestId("card")).toBeInTheDocument();
		});
	});

	describe("title field", () => {
		it("renders title field", () => {
			setup();
			expect(screen.getByTestId("field-title")).toBeInTheDocument();
		});

		it("renders Titre du bijou label", () => {
			setup();
			expect(screen.getByText("Titre du bijou")).toBeInTheDocument();
		});
	});

	describe("description field", () => {
		it("renders description textarea field", () => {
			setup();
			expect(screen.getByTestId("field-description")).toBeInTheDocument();
		});
	});

	describe("type select field", () => {
		it("renders typeId select field", () => {
			setup();
			expect(screen.getByTestId("field-typeId")).toBeInTheDocument();
		});

		it("renders Type de bijou label", () => {
			setup();
			expect(screen.getByText("Type de bijou")).toBeInTheDocument();
		});

		it("renders type options", () => {
			setup();
			expect(screen.getByRole("option", { name: "Bague" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "Collier" })).toBeInTheDocument();
		});

		it("renders create type button with correct aria-label", () => {
			setup();
			expect(
				screen.getByRole("button", { name: "Créer un nouveau type de produit" }),
			).toBeInTheDocument();
		});

		it("renders Plus icon in create type button", () => {
			setup();
			// Two Plus icons exist (typeId + collectionIds), so we assert at least one.
			expect(screen.getAllByTestId("icon-plus").length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("collections field", () => {
		it("renders multi-select for collections", () => {
			setup();
			expect(screen.getByTestId("multi-select")).toBeInTheDocument();
		});

		it("renders Collections label", () => {
			setup();
			expect(screen.getByText("Collections")).toBeInTheDocument();
		});

		it("renders collection options in MultiSelect", () => {
			setup();
			expect(screen.getByRole("option", { name: "Collection Lune" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "Collection Étoile" })).toBeInTheDocument();
		});

		it("renders helper text for collections", () => {
			setup();
			expect(
				screen.getByText("Un produit peut appartenir à plusieurs collections"),
			).toBeInTheDocument();
		});

		it("renders create-collection button with correct aria-label", () => {
			setup();
			expect(
				screen.getByRole("button", { name: "Créer une nouvelle collection" }),
			).toBeInTheDocument();
		});

		it("opens the collection dialog when the + button is clicked", async () => {
			const user = (await import("@testing-library/user-event")).default.setup();
			setup();
			await user.click(screen.getByRole("button", { name: "Créer une nouvelle collection" }));
			expect(mockOpenDialog).toHaveBeenCalledWith(
				expect.objectContaining({ onCreated: expect.any(Function) }),
			);
		});
	});
});
