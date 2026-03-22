import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction } = vi.hoisted(() => ({
	mockAction: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

const mockForm = {
	Field: ({
		children,
	}: {
		name: string;
		mode?: string;
		children: (field: {
			state: { value: unknown; meta: { errors: string[] } };
			handleChange: ReturnType<typeof vi.fn>;
			handleBlur: ReturnType<typeof vi.fn>;
			setValue: ReturnType<typeof vi.fn>;
			pushValue: ReturnType<typeof vi.fn>;
		}) => React.ReactNode;
	}) =>
		children({
			state: { value: undefined, meta: { errors: [] } },
			handleChange: vi.fn(),
			handleBlur: vi.fn(),
			setValue: vi.fn(),
			pushValue: vi.fn(),
		}),
	AppField: ({
		children,
	}: {
		name: string;
		validators?: unknown;
		children: (field: {
			name: string;
			state: { value: unknown; meta: { errors: string[] } };
			handleChange: ReturnType<typeof vi.fn>;
			handleBlur: ReturnType<typeof vi.fn>;
			SelectField: () => null;
			RadioGroupField: () => null;
			CheckboxField: () => null;
			InputGroupField: () => null;
		}) => React.ReactNode;
	}) =>
		children({
			name: "field",
			state: { value: "", meta: { errors: [] } },
			handleChange: vi.fn(),
			handleBlur: vi.fn(),
			SelectField: () => null,
			RadioGroupField: () => null,
			CheckboxField: () => null,
			InputGroupField: () => null,
		}),
	AppForm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	Subscribe: ({
		children,
	}: {
		selector?: (state: unknown) => unknown;
		children: (state: unknown) => React.ReactNode;
	}) => children([true]),
	reset: vi.fn(),
	setFieldValue: vi.fn(),
	handleSubmit: vi.fn(),
	state: { isSubmitting: false, values: { primaryImage: undefined, galleryMedia: [] } },
	store: { subscribe: vi.fn(), getState: vi.fn(() => ({ values: {} })) },
};

vi.mock("@/modules/skus/hooks/use-create-sku-form", () => ({
	useCreateProductSkuForm: () => ({
		form: mockForm,
		action: mockAction,
	}),
}));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	useUploadThing: () => ({
		startUpload: vi.fn().mockResolvedValue([]),
		isUploading: false,
	}),
	UploadDropzone: () => <div data-testid="upload-dropzone" />,
}));

vi.mock("@/modules/media/hooks/use-media-upload", () => ({
	useMediaUpload: () => ({
		upload: vi.fn().mockResolvedValue([]),
		isUploading: false,
	}),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/modules/skus/components/admin/sku-primary-image-field", () => ({
	SkuPrimaryImageField: () => <div data-testid="sku-primary-image-field" />,
}));

vi.mock("@/modules/skus/components/admin/sku-gallery-field", () => ({
	SkuGalleryField: () => <div data-testid="sku-gallery-field" />,
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
		variant?: string;
		className?: string;
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined} onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input-group", () => ({
	InputGroupAddon: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
	InputGroupText: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("lucide-react", () => ({
	Euro: () => <span data-testid="icon-euro" />,
	Package: () => <span data-testid="icon-package" />,
}));

vi.mock("@/shared/constants/ui-delays", () => ({
	FORM_SUCCESS_REDIRECT_DELAY_MS: 0,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { CreateProductVariantForm } from "../create-sku-form";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultProps = {
	colors: [{ id: "color-1", name: "Rouge", hex: "#FF0000" }],
	materials: [{ id: "mat-1", name: "Or" }],
	product: { id: "prod-1", title: "Bague Or" },
	productSlug: "bague-or",
};

// ============================================================================
// TESTS
// ============================================================================

describe("CreateProductVariantForm", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// ─── Smoke: render ────────────────────────────────────────────────────────

	it("renders without crash", () => {
		const { container } = render(<CreateProductVariantForm {...defaultProps} />);

		expect(container.querySelector("form")).toBeInTheDocument();
	});

	it("renders a form element", () => {
		const { container } = render(<CreateProductVariantForm {...defaultProps} />);

		expect(container.querySelector("form")).toBeInTheDocument();
	});

	it("renders submit button", () => {
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByText("Créer la variante")).toBeInTheDocument();
	});

	it("renders cancel button", () => {
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByText("Annuler")).toBeInTheDocument();
	});

	it("renders primary image field", () => {
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByTestId("sku-primary-image-field")).toBeInTheDocument();
	});

	it("renders gallery field", () => {
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByTestId("sku-gallery-field")).toBeInTheDocument();
	});

	it("renders hidden productId input", () => {
		const { container } = render(<CreateProductVariantForm {...defaultProps} />);

		const hiddenInput = container.querySelector('input[name="productId"]');
		expect(hiddenInput).toBeInTheDocument();
		expect((hiddenInput as HTMLInputElement).value).toBe("prod-1");
	});
});
