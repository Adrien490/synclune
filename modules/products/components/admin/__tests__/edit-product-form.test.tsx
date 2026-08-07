import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

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

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: (props: Record<string, unknown>) => (
		<div data-testid="upload-dropzone" data-endpoint={props.endpoint} />
	),
}));

vi.mock("next/navigation", () => ({
	useRouter: mockUseRouter,
}));

vi.mock("sonner", () => ({
	toast: mockToast,
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({
		open: vi.fn(),
		close: vi.fn(),
		isOpen: false,
	}),
}));

vi.mock("@/modules/product-types/components/product-type-form-dialog", () => ({
	PRODUCT_TYPE_DIALOG_ID: "product-type-form",
	ProductTypeFormDialog: () => null,
}));

vi.mock("@/modules/colors/components/color-form-dialog", () => ({
	COLOR_DIALOG_ID: "color-form",
	ColorFormDialog: () => null,
}));

vi.mock("@/modules/materials/components/material-form-dialog", () => ({
	MATERIAL_DIALOG_ID: "material-form",
	MaterialFormDialog: () => null,
}));

vi.mock("@/modules/collections/components/admin/collection-form-dialog", () => ({
	COLLECTION_DIALOG_ID: "collection-form",
	CollectionFormDialog: () => null,
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({ children, ...props }: { children: React.ReactNode }) => (
		<label {...props}>{children}</label>
	),
}));

vi.mock("@/shared/components/media-upload/media-counter-badge", () => ({
	MediaCounterBadge: ({ count, max }: { count: number; max: number }) => (
		<span data-testid="media-counter">
			{count}/{max}
		</span>
	),
}));

vi.mock("@/shared/components/media-upload/media-upload-grid", () => ({
	MediaUploadGrid: () => <div data-testid="media-upload-grid" />,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		type?: "button" | "submit" | "reset";
		disabled?: boolean;
	}) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/components/ui/input-group", () => ({
	InputGroupAddon: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
	InputGroupText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	TooltipTrigger: (props: RenderPropMockProps) => renderPropMock("div", props),
}));

vi.mock("@/shared/components/multi-select", () => ({
	MultiSelect: () => <div data-testid="multi-select" />,
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, ...props }: { children: React.ReactNode }) => (
		<div data-testid="form-alert" {...props}>
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

interface FormOverrides {
	canSubmit?: boolean;
	status?: string;
	isActive?: string;
}

function createMockForm(overrides: FormOverrides = {}) {
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
			status: overrides.status ?? "PUBLIC",
			defaultSku: {
				skuId: "sku-1",
				media: [{ url: "https://example.com/img1.jpg", mediaType: "IMAGE" as const }],
				colorId: "color-1",
				materialId: "mat-1",
				size: "52",
				priceInclTaxEuros: 49,
				compareAtPriceEuros: 59,
				inventory: 10,
				isActive: overrides.isActive ?? "true",
			},
		},
		canSubmit: overrides.canSubmit ?? true,
		isDirty: false,
		submissionAttempts: 0,
		fieldMeta: {},
	};

	return {
		state: formState,
		store: {
			subscribe: vi.fn(() => () => undefined),
			getState: () => ({ errors: [] }),
		},
		handleSubmit: vi.fn(),
		setFieldValue: vi.fn(),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (values: unknown) => React.ReactNode;
			selector: (state: typeof formState) => unknown;
		}) => {
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
						pushValue: vi.fn(),
						removeValue: vi.fn(),
					} as unknown as typeof fieldStub)}
				</>
			);
		},
		AppField: ({ children }: { children: (field: typeof fieldStub) => React.ReactNode }) => {
			return <>{children(fieldStub)}</>;
		},
		AppForm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		// Mock fidèle du form.SubmitButton partagé (le vrai requiert le formContext)
		SubmitButton: ({
			isPending,
			idleLabel,
			pendingLabel,
		}: {
			isPending?: boolean;
			idleLabel: string;
			pendingLabel: string;
			showKbdHint?: boolean;
			className?: string;
		}) => (
			<button type="submit" disabled={!formState.canSubmit || isPending} aria-busy={isPending}>
				{isPending ? pendingLabel : idleLabel}
			</button>
		),
	};
}

// ============================================================================
// Tests
// ============================================================================

afterEach(cleanup);

describe("EditProductForm", () => {
	function setup(formOverrides: FormOverrides = {}, hookOverrides: Record<string, unknown> = {}) {
		const product = createProduct();
		const mockForm = createMockForm(formOverrides);

		mockUseUpdateProductForm.mockReturnValue({
			form: mockForm,
			action: vi.fn(),
			isPending: false,
			formErrors: [],
			...hookOverrides,
		});

		mockUseMediaUpload.mockReturnValue({
			upload: vi.fn(),
			isUploading: false,
			progress: null,
			failedFiles: [],
			cancel: vi.fn(),
			retryFailed: vi.fn(),
			retrySingle: vi.fn(),
			clearFailed: vi.fn(),
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
		it("renders the form with accessible label", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByRole("form")).toHaveAttribute(
				"aria-label",
				"Formulaire d'édition de bijou",
			);
		});

		it("renders slug SEO warning", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(
				screen.getByText(/slug d'URL restera inchangé pour préserver les liens SEO/),
			).toBeInTheDocument();
		});

		it("renders archive warning under status", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(
				screen.getByText(/Archiver désactive automatiquement toutes les variantes/),
			).toBeInTheDocument();
		});

		it("renders SKU active warning", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText(/Une variante inactive n'est plus achetable/)).toBeInTheDocument();
		});

		it("renders all card sections", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Informations")).toBeInTheDocument();
			expect(screen.getByText("Médias")).toBeInTheDocument();
			expect(screen.getByText("Variante")).toBeInTheDocument();
			expect(screen.getByText("Tarification")).toBeInTheDocument();
			expect(screen.getByText("Stock")).toBeInTheDocument();
			expect(screen.getByText("Statut")).toBeInTheDocument();
			expect(screen.getByText("Statut de la variante")).toBeInTheDocument();
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
			expect(screen.getByText("Ancien prix (affiché barré)")).toBeInTheDocument();
		});

		it("renders stock field", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByText("Quantité en stock")).toBeInTheDocument();
		});

		it("renders sr-only status for screen readers", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByRole("status")).toBeInTheDocument();
		});

		it("renders media counter badge", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByTestId("media-counter")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Submit / cancel buttons
	// --------------------------------------------------------------------------

	describe("submit button", () => {
		it("renders save button", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: "Enregistrer les modifications" }),
			).toBeInTheDocument();
		});

		it("does not render a cancel button", () => {
			const { product } = setup();
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
		});

		it("disables submit when form cannot submit", () => {
			const { product } = setup({ canSubmit: false });
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Enregistrer les modifications" })).toBeDisabled();
		});

		it("disables submit and shows pending text when isPending", () => {
			const { product } = setup({}, { isPending: true });
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByRole("button", { name: /enregistrement/i })).toBeDisabled();
		});

		it("shows pending state announcement for screen readers", () => {
			const { product } = setup({}, { isPending: true });
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByRole("status")).toHaveTextContent("Envoi du formulaire en cours…");
		});

		it("disables submit when media is uploading", () => {
			const { product } = setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "uploading", completed: 0, total: 1, current: "file.jpg" },
				failedFiles: [],
				cancel: vi.fn(),
				retryFailed: vi.fn(),
				retrySingle: vi.fn(),
				clearFailed: vi.fn(),
			});
			render(<EditProductForm product={product as never} {...defaultProps} />);

			expect(screen.getByRole("button", { name: /téléversement/i })).toBeDisabled();
		});
	});
});
