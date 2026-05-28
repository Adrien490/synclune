import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
	TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/components/multi-select", () => ({
	MultiSelect: () => <div data-testid="multi-select" />,
}));

vi.mock("@/modules/colors/components/admin/color-multi-select-field", () => ({
	ColorMultiSelectField: () => (
		<div data-testid="color-multi-select-field">
			<label htmlFor="mock-color-select">Couleur</label>
			<input id="mock-color-select" type="text" readOnly />
			<button type="button" aria-label="Créer une nouvelle couleur">
				+
			</button>
		</div>
	),
}));

vi.mock("@/modules/materials/components/admin/material-multi-select-field", () => ({
	MaterialMultiSelectField: () => (
		<div data-testid="material-multi-select-field">
			<label htmlFor="mock-material-select">Matériau</label>
			<input id="mock-material-select" type="text" readOnly />
			<button type="button" aria-label="Créer un nouveau matériau">
				+
			</button>
		</div>
	),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({
		children,
		"data-slot": dataSlot,
		...props
	}: {
		children: React.ReactNode;
		"data-slot"?: string;
	}) => (
		// Le `data-slot` distingue les alerts métier (`publication-warning`)
		// de l'éventuel global form-error alert : on n'ajoute le testid que sur ce dernier.
		<div data-testid={dataSlot ? undefined : "form-alert"} data-slot={dataSlot} {...props}>
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
	isValid?: boolean;
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
		materialIds?: string[];
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
		materialIds: [],
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
			status: overrides.status ?? "PUBLIC",
			initialSku: {
				...defaultInitialSku,
				...overrides.initialSku,
			},
		},
		canSubmit: overrides.canSubmit ?? true,
		isValid: overrides.isValid ?? true,
		isSubmitting: false,
	};

	return {
		state: formState,
		handleSubmit: vi.fn().mockResolvedValue(undefined),
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
		const action = vi.fn();

		mockUseCreateProductForm.mockReturnValue({
			form: mockForm,
			action,
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
			clearFailed: vi.fn(),
		});

		const routerPush = vi.fn();
		mockUseRouter.mockReturnValue({
			push: routerPush,
			refresh: vi.fn(),
		});

		return { mockForm, action, routerPush };
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

	describe("submit button", () => {
		it("renders single submit button with PUBLIC label by default", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Publier le bijou" })).toBeInTheDocument();
			expect(screen.queryByText("Enregistrer le brouillon")).not.toBeInTheDocument();
		});

		it("renders submit button with DRAFT label when status=DRAFT", () => {
			setup({ status: "DRAFT" });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Enregistrer le brouillon" })).toBeInTheDocument();
			expect(screen.queryByText("Publier le bijou")).not.toBeInTheDocument();
		});

		it("disables submit button when form cannot submit", () => {
			setup({ canSubmit: false });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /brouillon|publier/i })).toBeDisabled();
		});

		it("disables submit button when pending (PUBLIC)", () => {
			setup({}, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /publication/i })).toBeDisabled();
		});

		it("disables submit button when pending (DRAFT)", () => {
			setup({ status: "DRAFT" }, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /enregistrement/i })).toBeDisabled();
		});

		it("shows pending state announcement for screen readers", () => {
			setup({}, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("status")).toHaveTextContent("Envoi du formulaire en cours…");
		});

		it("disables submit button when media is uploading", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "uploading", completed: 0, total: 1, current: "file.jpg" },
				failedFiles: [],
				cancel: vi.fn(),
				retryFailed: vi.fn(),
				clearFailed: vi.fn(),
			});
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /téléversement/i })).toBeDisabled();
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
				failedFiles: [],
				cancel: vi.fn(),
				retryFailed: vi.fn(),
				clearFailed: vi.fn(),
			});
			render(<CreateProductForm {...defaultProps} />);

			const statusElements = screen.getAllByRole("status");
			expect(statusElements.some((el) => /Envoi/.test(String(el.textContent)))).toBe(true);
		});

		it("shows thumbnail generation phase text", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "generating-thumbnails", completed: 0, total: 1, current: null },
				failedFiles: [],
				cancel: vi.fn(),
				retryFailed: vi.fn(),
				clearFailed: vi.fn(),
			});
			render(<CreateProductForm {...defaultProps} />);

			const statusElements = screen.getAllByRole("status");
			expect(
				statusElements.some((el) => /Préparation des aperçus/.test(String(el.textContent))),
			).toBe(true);
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
				screen.getByText(
					"La première image sera l'image principale. Glissez-déposez pour réorganiser.",
				),
			).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Form errors
	// --------------------------------------------------------------------------

	describe("form errors", () => {
		it("never renders global errors alert (errors display under fields)", () => {
			setup({}, { formErrors: ["Le titre est déjà utilisé"] });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.queryByTestId("form-alert")).not.toBeInTheDocument();
			expect(screen.queryByText("Le titre est déjà utilisé")).not.toBeInTheDocument();
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
		it("renders hidden input for status with default PUBLIC value", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const statusInput = container.querySelector('input[name="status"]');
			expect(statusInput).toBeInTheDocument();
			expect(statusInput).toHaveAttribute("value", "PUBLIC");
		});

		it("renders hidden input for status with DRAFT value", () => {
			setup({ status: "DRAFT" });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const statusInput = container.querySelector('input[name="status"]');
			expect(statusInput).toHaveAttribute("value", "DRAFT");
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

		it("renders the Statut card with visibility label and help text", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("region", { name: "Statut du bijou" })).toBeInTheDocument();
			expect(screen.getByText("Visibilité")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Un brouillon reste invisible côté boutique. Public le rend visible immédiatement.",
				),
			).toBeInTheDocument();
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
					name: "Plus d'informations sur la variante",
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
				screen.getByText(
					"La première image sera l'image principale. Glissez-déposez pour réorganiser.",
				),
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

	// --------------------------------------------------------------------------
	// Escape-to-cancel shortcut
	// --------------------------------------------------------------------------

	describe("Escape-to-cancel shortcut", () => {
		it("navigates to the product list on Escape from outside any overlay", () => {
			const { routerPush } = setup();
			render(<CreateProductForm {...defaultProps} />);

			document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

			expect(routerPush).toHaveBeenCalledWith("/admin/catalogue/produits");
		});

		it("ignores Escape that originates from an open Select overlay", () => {
			// Regression: closing a Select with Escape must NOT trigger the cancel
			// navigation — the global handler used to miss data-slot='select-content'.
			const { routerPush } = setup();
			render(<CreateProductForm {...defaultProps} />);

			const overlay = document.createElement("div");
			overlay.setAttribute("data-slot", "select-content");
			const option = document.createElement("div");
			overlay.appendChild(option);
			document.body.appendChild(overlay);

			option.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

			expect(routerPush).not.toHaveBeenCalled();
			overlay.remove();
		});

		it("ignores Escape that originates from an open dropdown menu", () => {
			const { routerPush } = setup();
			render(<CreateProductForm {...defaultProps} />);

			const overlay = document.createElement("div");
			overlay.setAttribute("data-slot", "dropdown-menu-content");
			document.body.appendChild(overlay);

			overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

			expect(routerPush).not.toHaveBeenCalled();
			overlay.remove();
		});
	});

	// --------------------------------------------------------------------------
	// Accessibility
	// --------------------------------------------------------------------------

	describe("accessibility", () => {
		it("renders the required-fields legend", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByText("Les champs marqués d'un astérisque sont obligatoires."),
			).toBeInTheDocument();
		});

		it("marks the form aria-busy when pending", () => {
			setup({}, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
		});

		it("marks the form not aria-busy when idle", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "false");
		});
	});

	// --------------------------------------------------------------------------
	// Submit handler
	// --------------------------------------------------------------------------

	describe("submit handler", () => {
		it("invokes form.handleSubmit when the form is submitted", () => {
			const { mockForm } = setup();
			render(<CreateProductForm {...defaultProps} />);

			fireEvent.submit(screen.getByRole("form"));

			expect(mockForm.handleSubmit).toHaveBeenCalled();
		});

		it("calls the server action once validation passes", async () => {
			const { action } = setup({ isValid: true });
			render(<CreateProductForm {...defaultProps} />);

			fireEvent.submit(screen.getByRole("form"));

			// Flush the handleSubmit().then() microtask before asserting
			await Promise.resolve();
			await Promise.resolve();

			expect(action).toHaveBeenCalled();
		});

		it("does not call the server action when the form is invalid", async () => {
			// Regression: an invalid form runs client validation (handleSubmit) but
			// must NOT reach the server action — it focuses the first invalid field.
			const { mockForm, action } = setup({ isValid: false });
			render(<CreateProductForm {...defaultProps} />);

			fireEvent.submit(screen.getByRole("form"));

			// Flush the handleSubmit().then() microtask before asserting
			await Promise.resolve();
			await Promise.resolve();

			expect(mockForm.handleSubmit).toHaveBeenCalled();
			expect(action).not.toHaveBeenCalled();
		});
	});
});
