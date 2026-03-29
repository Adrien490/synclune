import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseCreateProductForm, mockUseMediaUpload, mockUseRouter, mockToast } = vi.hoisted(
	() => ({
		mockUseCreateProductForm: vi.fn(),
		mockUseMediaUpload: vi.fn(),
		mockUseRouter: vi.fn(),
		mockToast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
	}),
);

vi.mock("@/modules/products/hooks/use-create-product-form", () => ({
	useCreateProductForm: mockUseCreateProductForm,
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

vi.mock("@/shared/providers/dialog-store-provider", () => ({
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
	TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

import { CreateProductForm } from "../create-product-form";

// ============================================================================
// Fixtures
// ============================================================================

const defaultProps = {
	productTypes: [
		{ id: "type-1", label: "Bague" },
		{ id: "type-2", label: "Collier" },
	],
	collections: [
		{ id: "col-1", name: "Collection Lune" },
		{ id: "col-2", name: "Collection Étoile" },
	],
	colors: [
		{ id: "color-1", name: "Or", hex: "#FFD700" },
		{ id: "color-2", name: "Argent", hex: "#C0C0C0" },
	],
	materials: [
		{ id: "mat-1", name: "Argent 925" },
		{ id: "mat-2", name: "Plaqué or" },
	],
};

interface FormOverrides {
	canSubmit?: boolean;
	status?: string;
	collectionIds?: string[];
	initialSku?: {
		media?: Array<{
			url: string;
			mediaType: "IMAGE" | "VIDEO";
			altText?: string;
			thumbnailUrl?: string;
			blurDataUrl?: string;
		}>;
		colorId?: string;
		materialId?: string;
		size?: string;
		priceInclTaxEuros?: number;
		compareAtPriceEuros?: number;
		inventory?: number;
	};
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

	const defaultInitialSku = {
		media: [],
		colorId: "",
		materialId: "",
		size: "",
		priceInclTaxEuros: 0,
		compareAtPriceEuros: undefined,
		inventory: 0,
	};

	const formState = {
		values: {
			title: "",
			description: "",
			typeId: "",
			collectionIds: overrides.collectionIds ?? [],
			status: overrides.status ?? "DRAFT",
			initialSku: {
				...defaultInitialSku,
				...overrides.initialSku,
			},
		},
		canSubmit: overrides.canSubmit ?? true,
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
			selector: (state: Record<string, unknown>) => unknown[];
		}) => {
			const vals = selector(formState);
			return <>{children(vals)}</>;
		},
		Field: ({ children }: { children: (field: typeof fieldStub) => React.ReactNode }) => {
			return (
				<>
					{children({
						...fieldStub,
						name: "initialSku.media",
						state: { value: formState.values.initialSku.media, meta: { errors: [] } },
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
	};
}

// ============================================================================
// Tests
// ============================================================================

afterEach(cleanup);

describe("CreateProductForm", () => {
	function setup(formOverrides: FormOverrides = {}, hookOverrides: Record<string, unknown> = {}) {
		const mockForm = createMockForm(formOverrides);

		mockUseCreateProductForm.mockReturnValue({
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
		});

		mockUseRouter.mockReturnValue({
			push: vi.fn(),
			refresh: vi.fn(),
		});

		return { mockForm };
	}

	// --------------------------------------------------------------------------
	// Rendering
	// --------------------------------------------------------------------------

	describe("rendering", () => {
		it("renders the form with accessible label", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("form")).toHaveAttribute(
				"aria-label",
				"Formulaire de création de bijou",
			);
		});

		it("renders media section with label", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Médias")).toBeInTheDocument();
		});

		it("renders media counter badge", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("media-counter")).toBeInTheDocument();
		});

		it("renders upload dropzone when no media", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();
		});

		it("renders price fields", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Prix de vente final")).toBeInTheDocument();
			expect(screen.getByText("Ancien prix (affiché barré)")).toBeInTheDocument();
		});

		it("renders stock field", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Quantité en stock")).toBeInTheDocument();
		});

		it("renders variant attributes section", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Variante")).toBeInTheDocument();
			expect(screen.getByText("Couleur")).toBeInTheDocument();
			expect(screen.getByText("Matériau")).toBeInTheDocument();
		});

		it("renders sr-only status for screen readers", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("status")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Submit buttons
	// --------------------------------------------------------------------------

	describe("submit buttons", () => {
		it("renders draft and publish buttons", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Enregistrer comme brouillon")).toBeInTheDocument();
			expect(screen.getByText("Publier le bijou")).toBeInTheDocument();
		});

		it("disables buttons when form cannot submit", () => {
			setup({ canSubmit: false });
			render(<CreateProductForm {...defaultProps} />);

			const buttons = screen.getAllByRole("button", { name: /brouillon|publier/i });
			buttons.forEach((button) => {
				expect(button).toBeDisabled();
			});
		});

		it("disables buttons when pending", () => {
			setup({}, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			const buttons = screen.getAllByRole("button", { name: /enregistrement|publication/i });
			buttons.forEach((button) => {
				expect(button).toBeDisabled();
			});
		});

		it("shows pending state announcement for screen readers", () => {
			setup({}, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("status")).toHaveTextContent("Envoi du formulaire en cours...");
		});

		it("disables buttons when media is uploading", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "uploading", completed: 0, total: 1, current: "file.jpg" },
			});
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /upload en cours/i })).toBeDisabled();
			expect(screen.getByRole("button", { name: /brouillon/i })).toBeDisabled();
		});
	});

	// --------------------------------------------------------------------------
	// Upload progress
	// --------------------------------------------------------------------------

	describe("upload progress", () => {
		it("shows upload progress when uploading", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "uploading", completed: 1, total: 3, current: "image.jpg" },
			});
			render(<CreateProductForm {...defaultProps} />);

			const statusElements = screen.getAllByRole("status");
			expect(statusElements.some((el) => el.textContent!.includes("Upload en cours..."))).toBe(
				true,
			);
			expect(screen.getByText("1 / 3 fichier(s)")).toBeInTheDocument();
		});

		it("shows validation phase text", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "validating", completed: 0, total: 2, current: null },
			});
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Validation des fichiers...")).toBeInTheDocument();
		});

		it("shows thumbnail generation phase text", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "generating-thumbnails", completed: 0, total: 1, current: null },
			});
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Génération des miniatures...")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Media limit
	// --------------------------------------------------------------------------

	describe("media limit", () => {
		it("renders info text about first image requirement", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByText("La première image sera l'image principale. Glissez pour réordonner."),
			).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Form errors
	// --------------------------------------------------------------------------

	describe("form errors", () => {
		it("does not render alert when no form errors", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.queryByTestId("form-alert")).not.toBeInTheDocument();
		});

		it("renders alert when form errors are present", () => {
			setup({}, { formErrors: ["Le titre est déjà utilisé"] });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("form-alert")).toBeInTheDocument();
			expect(screen.getByText("Le titre est déjà utilisé")).toBeInTheDocument();
		});

		it("renders multiple error messages", () => {
			setup({}, { formErrors: ["Erreur A", "Erreur B"] });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Erreur A")).toBeInTheDocument();
			expect(screen.getByText("Erreur B")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Fieldset disabled state
	// --------------------------------------------------------------------------

	describe("fieldset disabled state", () => {
		it("fieldset is not disabled when not pending", () => {
			setup({}, { isPending: false });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const fieldset = container.querySelector("fieldset");
			expect(fieldset).not.toBeDisabled();
		});

		it("fieldset is disabled when isPending", () => {
			setup({}, { isPending: true });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const fieldset = container.querySelector("fieldset");
			expect(fieldset).toBeDisabled();
		});
	});

	// --------------------------------------------------------------------------
	// Hidden inputs
	// --------------------------------------------------------------------------

	describe("hidden inputs", () => {
		it("renders hidden input for status with default DRAFT value", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const statusInput = container.querySelector('input[name="status"]');
			expect(statusInput).toBeInTheDocument();
			expect(statusInput).toHaveAttribute("value", "DRAFT");
		});

		it("renders hidden input for status with PUBLIC value", () => {
			setup({ status: "PUBLIC" });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const statusInput = container.querySelector('input[name="status"]');
			expect(statusInput).toHaveAttribute("value", "PUBLIC");
		});

		it("renders hidden input for collectionIds as serialized JSON", () => {
			setup({ collectionIds: ["col-1", "col-2"] });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const collectionsInput = container.querySelector('input[name="collectionIds"]');
			expect(collectionsInput).toBeInTheDocument();
			expect(collectionsInput).toHaveAttribute("value", JSON.stringify(["col-1", "col-2"]));
		});

		it("renders hidden input for empty collectionIds", () => {
			setup({ collectionIds: [] });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const collectionsInput = container.querySelector('input[name="collectionIds"]');
			expect(collectionsInput).toHaveAttribute("value", "[]");
		});

		it("does not render media hidden input when no media", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const mediaInput = container.querySelector('input[name="initialSku.media"]');
			expect(mediaInput).not.toBeInTheDocument();
		});

		it("does not render deletedImageUrls hidden input when none deleted", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const deletedInput = container.querySelector('input[name="deletedImageUrls"]');
			expect(deletedInput).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Layout sections
	// --------------------------------------------------------------------------

	describe("layout sections", () => {
		it("renders the Informations card title", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Informations")).toBeInTheDocument();
		});

		it("renders the Tarification card title", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Tarification")).toBeInTheDocument();
		});

		it("renders the Stock card title", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Stock")).toBeInTheDocument();
		});

		it("renders the Variante card title", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Variante")).toBeInTheDocument();
		});

		it("renders collections multi-select", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("multi-select")).toBeInTheDocument();
		});

		it("renders tooltip info button for variant section", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByRole("button", {
					name: "Plus d'informations sur les attributs de la variante",
				}),
			).toBeInTheDocument();
		});

		it("renders create product type button", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: "Créer un nouveau type de produit" }),
			).toBeInTheDocument();
		});

		it("renders create color button", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: "Créer une nouvelle couleur" }),
			).toBeInTheDocument();
		});

		it("renders create material button", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Créer un nouveau matériau" })).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Media upload section
	// --------------------------------------------------------------------------

	describe("media upload section", () => {
		it("renders upload dropzone with correct endpoint", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			const dropzone = screen.getByTestId("upload-dropzone");
			expect(dropzone).toHaveAttribute("data-endpoint", "catalogMedia");
		});

		it("renders media upload zone container", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			expect(container.querySelector("#media-upload-zone")).toBeInTheDocument();
		});

		it("shows media grid when media items are present", () => {
			const mediaItems = [
				{
					url: "https://example.com/img1.jpg",
					mediaType: "IMAGE" as const,
					altText: undefined,
					thumbnailUrl: undefined,
					blurDataUrl: undefined,
				},
			];
			setup({ initialSku: { media: mediaItems } });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("media-upload-grid")).toBeInTheDocument();
			expect(screen.queryByTestId("upload-dropzone")).not.toBeInTheDocument();
		});

		it("shows media counter with zero when no media", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("media-counter")).toHaveTextContent("0/6");
		});

		it("shows hint text about image ordering", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByText("La première image sera l'image principale. Glissez pour réordonner."),
			).toBeInTheDocument();
		});

		it("shows media limit warning when at max capacity", () => {
			const maxMedia = Array.from({ length: 6 }, (_, i) => ({
				url: `https://example.com/img${i}.jpg`,
				mediaType: "IMAGE" as const,
				altText: undefined,
				thumbnailUrl: undefined,
				blurDataUrl: undefined,
			}));
			setup({ initialSku: { media: maxMedia } });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Limite de 6 médias atteinte")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// canSubmit — submit button enabled/disabled
	// --------------------------------------------------------------------------

	describe("canSubmit state", () => {
		it("enables submit buttons when canSubmit is true and not pending", () => {
			setup({ canSubmit: true }, { isPending: false });
			render(<CreateProductForm {...defaultProps} />);

			const submitButtons = screen
				.getAllByRole("button")
				.filter((btn) => btn.getAttribute("type") === "submit");
			submitButtons.forEach((button) => {
				expect(button).not.toBeDisabled();
			});
		});

		it("disables submit buttons when canSubmit is false", () => {
			setup({ canSubmit: false }, { isPending: false });
			render(<CreateProductForm {...defaultProps} />);

			const submitButtons = screen
				.getAllByRole("button")
				.filter((btn) => btn.getAttribute("type") === "submit");
			submitButtons.forEach((button) => {
				expect(button).toBeDisabled();
			});
		});

		it("disables submit buttons when isPending regardless of canSubmit", () => {
			setup({ canSubmit: true }, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			const submitButtons = screen
				.getAllByRole("button")
				.filter((btn) => btn.getAttribute("type") === "submit");
			submitButtons.forEach((button) => {
				expect(button).toBeDisabled();
			});
		});
	});
});
