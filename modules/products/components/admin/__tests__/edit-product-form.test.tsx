import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseUpdateProductForm, mockUseMediaUpload, mockUseRouter, mockToast } = vi.hoisted(
	() => ({
		mockUseUpdateProductForm: vi.fn(),
		mockUseMediaUpload: vi.fn(),
		mockUseRouter: vi.fn(),
		mockToast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
	}),
);

vi.mock("@/modules/products/hooks/use-update-product-form", () => ({
	useUpdateProductForm: mockUseUpdateProductForm,
}));

vi.mock("@/modules/media/hooks/use-media-upload", () => ({
	useMediaUpload: mockUseMediaUpload,
}));

vi.mock("next/navigation", () => ({
	useRouter: mockUseRouter,
}));

vi.mock("sonner", () => ({
	toast: mockToast,
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({ children, ...props }: { children: React.ReactNode }) => (
		<label {...props}>{children}</label>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
	}) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/components/ui/input-group", () => ({
	InputGroupAddon: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/components/multi-select", () => ({
	MultiSelect: () => <div data-testid="multi-select" />,
}));

vi.mock("../edit-product-media-section", () => ({
	EditProductMediaSection: () => <div data-testid="edit-media-section" />,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { EditProductForm } from "../edit-product-form";

// ============================================================================
// Fixtures
// ============================================================================

function createProduct(overrides: Record<string, unknown> = {}) {
	return {
		id: "prod-1",
		title: "Bague Lune Enchantée",
		slug: "bague-lune-enchantee",
		description: "Une bague artisanale inspirée de la lune",
		status: "PUBLIC" as const,
		type: { id: "type-1", label: "Bague" },
		collections: [{ collection: { id: "col-1", name: "Lune", slug: "lune" } }],
		skus: [
			{
				id: "sku-1",
				isDefault: true,
				isActive: true,
				priceInclTax: 4900,
				compareAtPrice: 5900,
				inventory: 10,
				size: "52",
				color: { id: "color-1", name: "Or", hex: "#FFD700" },
				material: { id: "mat-1", name: "Argent 925" },
				images: [
					{
						id: "img-1",
						url: "https://example.com/img1.jpg",
						altText: "Bague Lune",
						isPrimary: true,
						mediaType: "IMAGE" as const,
						thumbnailUrl: null,
						blurDataUrl: null,
					},
				],
			},
		],
		...overrides,
	};
}

const defaultProps = {
	productTypes: [{ id: "type-1", label: "Bague" }],
	collections: [{ id: "col-1", name: "Lune" }],
	colors: [{ id: "color-1", name: "Or", hex: "#FFD700" }],
	materials: [{ id: "mat-1", name: "Argent 925" }],
};

function createMockForm(overrides: Record<string, unknown> = {}) {
	const fieldStub = {
		name: "test",
		state: { value: "", meta: { errors: [] } },
		handleChange: vi.fn(),
		handleBlur: vi.fn(),
		InputField: () => <input />,
		TextareaField: () => <textarea />,
		SelectField: () => <select />,
		InputGroupField: ({ children }: { children?: React.ReactNode }) => (
			<div>
				<input />
				{children}
			</div>
		),
		RadioGroupField: () => <div />,
	};

	const formState = {
		values: {
			productId: "prod-1",
			title: "Bague Lune Enchantée",
			description: "Une bague artisanale",
			typeId: "type-1",
			collectionIds: ["col-1"],
			status: "PUBLIC",
			defaultSku: {
				skuId: "sku-1",
				media: [{ url: "https://example.com/img1.jpg", mediaType: "IMAGE" }],
				colorId: "color-1",
				materialId: "mat-1",
				size: "52",
				priceInclTaxEuros: 49,
				compareAtPriceEuros: 59,
				isActive: "true",
			},
		},
		canSubmit: true,
		...overrides,
	};

	return {
		state: formState,
		handleSubmit: vi.fn(),
		reset: vi.fn(),
		setFieldValue: vi.fn(),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (values: unknown[]) => React.ReactNode;
			selector: (state: unknown) => unknown[];
		}) => {
			// Return first value for simplicity
			const vals = selector(formState);
			return <>{children(vals)}</>;
		},
		Field: ({ children }: { children: (field: typeof fieldStub) => React.ReactNode }) => {
			return (
				<>
					{children({
						...fieldStub,
						name: "defaultSku.media",
						state: { value: formState.values.defaultSku.media, meta: { errors: [] } },
					} as unknown as typeof fieldStub)}
				</>
			);
		},
		AppField: ({ children }: { children: (field: typeof fieldStub) => React.ReactNode }) => {
			return <>{children(fieldStub)}</>;
		},
		AppForm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	};
}

// ============================================================================
// Tests
// ============================================================================

afterEach(cleanup);

describe("EditProductForm", () => {
	function setup(
		productOverrides: Record<string, unknown> = {},
		hookOverrides: Record<string, unknown> = {},
	) {
		const product = createProduct(productOverrides);
		const mockForm = createMockForm();

		mockUseUpdateProductForm.mockReturnValue({
			form: mockForm,
			action: vi.fn(),
			isPending: false,
			...hookOverrides,
		});

		mockUseMediaUpload.mockReturnValue({
			upload: vi.fn(),
			isUploading: false,
		});

		mockUseRouter.mockReturnValue({
			push: vi.fn(),
			refresh: vi.fn(),
		});

		return { product, mockForm };
	}

	// --------------------------------------------------------------------------
	// Rendering
	// --------------------------------------------------------------------------

	describe("rendering", () => {
		it("renders product title as h1", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bague Lune Enchantée");
		});

		it("renders slug SEO warning", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(
				screen.getByText(/slug restera inchangé pour préserver les liens SEO/),
			).toBeInTheDocument();
		});

		it("renders status radio group with archive warning", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(
				screen.getByText(/Archiver désactive automatiquement toutes les variantes/),
			).toBeInTheDocument();
		});

		it("renders media section component", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByTestId("edit-media-section")).toBeInTheDocument();
		});

		it("renders title field label", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Titre du bijou")).toBeInTheDocument();
		});

		it("renders price fields", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Prix de vente final")).toBeInTheDocument();
			expect(screen.getByText("Prix comparé (avant réduction)")).toBeInTheDocument();
		});

		it("renders SKU status field", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Statut du SKU")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Submit button
	// --------------------------------------------------------------------------

	describe("submit button", () => {
		it("renders save button", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Enregistrer les modifications")).toBeInTheDocument();
		});

		it("disables button when form cannot submit", () => {
			const { product } = setup();
			mockUseUpdateProductForm.mockReturnValue({
				form: createMockForm({ canSubmit: false }),
				action: vi.fn(),
				isPending: false,
			});
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Enregistrer les modifications").closest("button")).toBeDisabled();
		});

		it("shows loading text when pending", () => {
			const { product } = setup({}, { isPending: true });
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Enregistrement...")).toBeInTheDocument();
		});

		it("shows upload text when media is uploading", () => {
			const { product } = setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
			});
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Upload en cours...")).toBeInTheDocument();
		});

		it("disables button when pending", () => {
			const { product } = setup({}, { isPending: true });
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Enregistrement...").closest("button")).toBeDisabled();
		});
	});

	// --------------------------------------------------------------------------
	// Product title from props
	// --------------------------------------------------------------------------

	describe("product title rendering", () => {
		it("displays custom product title", () => {
			const { product } = setup({ title: "Collier Étoile Filante" });
			product.title = "Collier Étoile Filante";
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Collier Étoile Filante");
		});
	});
});
