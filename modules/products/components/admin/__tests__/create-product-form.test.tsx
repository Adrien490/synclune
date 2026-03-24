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
			title: "",
			description: "",
			typeId: "",
			collectionIds: [],
			status: "DRAFT",
			initialSku: {
				media: [],
				colorId: "",
				materialId: "",
				size: "",
				priceInclTaxEuros: 0,
				compareAtPriceEuros: undefined,
				inventory: 0,
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
	function setup(
		formOverrides: Record<string, unknown> = {},
		hookOverrides: Record<string, unknown> = {},
	) {
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

			expect(screen.getByText("Attributs de la variante")).toBeInTheDocument();
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
	});
});
