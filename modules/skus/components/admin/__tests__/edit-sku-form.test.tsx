import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseUpdateProductSkuForm, mockUseMediaUpload, mockUseMediaFieldUpload, mockUseRouter } =
	vi.hoisted(() => ({
		mockUseUpdateProductSkuForm: vi.fn(),
		mockUseMediaUpload: vi.fn(),
		mockUseMediaFieldUpload: vi.fn(),
		mockUseRouter: vi.fn(),
	}));

vi.mock("@/modules/skus/hooks/use-update-sku-form", () => ({
	useUpdateProductSkuForm: mockUseUpdateProductSkuForm,
}));

vi.mock("@/modules/media/hooks/use-media-upload", () => ({
	useMediaUpload: mockUseMediaUpload,
}));

vi.mock("@/modules/products/hooks/use-media-field-upload", () => ({
	useMediaFieldUpload: mockUseMediaFieldUpload,
}));

vi.mock("next/navigation", () => ({
	useRouter: mockUseRouter,
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false }),
}));

vi.mock("@/modules/colors/components/color-form-dialog", () => ({
	COLOR_DIALOG_ID: "color-form",
}));

vi.mock("@/modules/materials/components/material-form-dialog", () => ({
	MATERIAL_DIALOG_ID: "material-form",
}));

vi.mock("../sku-sidebar-cards", () => ({
	SkuSidebarCards: () => <div data-testid="sku-sidebar-cards" />,
}));

vi.mock("../sku-media-card", () => ({
	SkuMediaCard: () => <div data-testid="sku-media-card" />,
}));

vi.mock("@/shared/components/forms/error-summary", () => ({
	ErrorSummary: () => <div data-testid="error-summary" />,
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
	}) => (
		<button disabled={disabled} type={type as "button" | "submit" | undefined} onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/kbd", () => ({
	Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { EditProductVariantForm } from "../edit-sku-form";
import type { SkuWithImages } from "@/modules/skus/data/get-sku";

// ============================================================================
// FIXTURES
// ============================================================================

const mockSku = {
	id: "sku-1",
	sku: "SKU-001",
	priceInclTax: 5000,
	compareAtPrice: null,
	inventory: 10,
	// Calculé par fetchSkuById (rang 0 de position) — remplace la colonne isDefault.
	isRepresentative: false,
	isActive: true,
	color: null,
	material: null,
	materialId: null,
	size: null,
	productId: "prod-1",
	images: [],
} as unknown as SkuWithImages;

const defaultProps = {
	colors: [{ id: "color-1", name: "Rouge", hex: "#FF0000" }],
	materials: [{ id: "mat-1", name: "Or" }],
	product: { id: "prod-1", title: "Bague Or" },
	productSlug: "bague-or",
	sku: mockSku,
};

interface FormStateOverrides {
	canSubmit?: boolean;
	isDirty?: boolean;
}

function createMockForm(overrides: FormStateOverrides = {}) {
	const formState = {
		values: {
			skuId: "sku-1",
			media: [],
			isActive: true,
			isDefault: false,
			colorId: "",
			materialIds: [],
			size: "",
			priceInclTaxEuros: 50,
			compareAtPriceEuros: undefined,
			inventory: 10,
		},
		canSubmit: overrides.canSubmit ?? true,
		isDirty: overrides.isDirty ?? false,
		submissionAttempts: 0,
		fieldMeta: {},
	};

	return {
		state: formState,
		store: { subscribe: vi.fn(() => () => undefined), getState: () => ({ errors: [] }) },
		handleSubmit: vi.fn(),
		setFieldValue: vi.fn(),
		setFieldMeta: vi.fn(),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (vals: unknown) => React.ReactNode;
			selector: (state: typeof formState) => unknown;
		}) => <>{children(selector(formState))}</>,
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
// TESTS
// ============================================================================

afterEach(cleanup);

describe("EditProductVariantForm", () => {
	function setup(
		formOverrides: FormStateOverrides = {},
		hookOverrides: Record<string, unknown> = {},
	) {
		const form = createMockForm(formOverrides);

		mockUseUpdateProductSkuForm.mockReturnValue({
			form,
			action: vi.fn(),
			isPending: false,
			formErrors: [],
			...hookOverrides,
		});

		mockUseMediaUpload.mockReturnValue({
			upload: vi.fn().mockResolvedValue([]),
			isUploading: false,
			progress: null,
			cancel: vi.fn(),
			cancelOne: vi.fn(),
			failedFiles: [],
			retryFailed: vi.fn(),
			retrySingle: vi.fn(),
			clearFailed: vi.fn(),
		});

		mockUseMediaFieldUpload.mockReturnValue({
			handleUpload: vi.fn(),
		});

		mockUseRouter.mockReturnValue({ push: vi.fn(), refresh: vi.fn() });

		return { form };
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form with accessible label", () => {
		setup();
		render(<EditProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("form")).toHaveAttribute(
			"aria-label",
			"Formulaire d'édition de variante",
		);
	});

	it("renders submit button", () => {
		setup();
		render(<EditProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("button", { name: /mettre à jour la variante/i })).toBeInTheDocument();
	});

	it("does not render a cancel button", () => {
		setup();
		render(<EditProductVariantForm {...defaultProps} />);

		expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
	});

	it("renders all card sections via mocks", () => {
		setup();
		render(<EditProductVariantForm {...defaultProps} />);

		expect(screen.getByTestId("sku-sidebar-cards")).toBeInTheDocument();
		expect(screen.getByTestId("sku-media-card")).toBeInTheDocument();
	});

	it("renders hidden skuId input", () => {
		setup();
		const { container } = render(<EditProductVariantForm {...defaultProps} />);

		const hiddenInput = container.querySelector('input[name="skuId"]');
		expect(hiddenInput).toBeInTheDocument();
		expect((hiddenInput as HTMLInputElement).value).toBe("sku-1");
	});

	it("disables submit when canSubmit is false", () => {
		setup({ canSubmit: false });
		render(<EditProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("button", { name: /mettre à jour la variante/i })).toBeDisabled();
	});

	it("disables submit and shows pending text when isPending", () => {
		setup({}, { isPending: true });
		render(<EditProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("button", { name: /mise à jour/i })).toBeDisabled();
	});

	it("disables submit when media is uploading", () => {
		setup();
		mockUseMediaUpload.mockReturnValue({
			upload: vi.fn(),
			isUploading: true,
			progress: null,
			cancel: vi.fn(),
			cancelOne: vi.fn(),
			failedFiles: [],
			retryFailed: vi.fn(),
			retrySingle: vi.fn(),
			clearFailed: vi.fn(),
		});
		render(<EditProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("button", { name: /téléversement/i })).toBeDisabled();
	});

	it("renders sr-only status announcement", () => {
		setup();
		render(<EditProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});
});
