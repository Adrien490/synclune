import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseCreateProductSkuForm, mockUseMediaUpload, mockUseMediaFieldUpload, mockUseRouter } =
	vi.hoisted(() => ({
		mockUseCreateProductSkuForm: vi.fn(),
		mockUseMediaUpload: vi.fn(),
		mockUseMediaFieldUpload: vi.fn(),
		mockUseRouter: vi.fn(),
	}));

vi.mock("@/modules/skus/hooks/use-create-sku-form", () => ({
	useCreateProductSkuForm: mockUseCreateProductSkuForm,
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

import { CreateProductVariantForm } from "../create-sku-form";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// FIXTURES
// ============================================================================

const defaultProps = {
	colors: [{ id: "color-1", name: "Rouge", hex: "#FF0000" }],
	materials: [{ id: "mat-1", name: "Or" }],
	product: { id: "prod-1", title: "Bague Or" },
	productSlug: "bague-or",
};

interface FormStateOverrides {
	canSubmit?: boolean;
	isDirty?: boolean;
}

function createMockForm(overrides: FormStateOverrides = {}) {
	const formState = {
		values: {
			productId: "",
			media: [],
			isActive: "true",
			isDefault: false,
			colorId: "",
			materialIds: [],
			size: "",
			priceInclTaxEuros: null,
			compareAtPriceEuros: undefined,
			inventory: null,
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

describe("CreateProductVariantForm", () => {
	function setup(
		formOverrides: FormStateOverrides = {},
		hookOverrides: Record<string, unknown> = {},
	) {
		const form = createMockForm(formOverrides);

		mockUseCreateProductSkuForm.mockReturnValue({
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
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("form")).toHaveAttribute(
			"aria-label",
			"Formulaire de création de variante",
		);
	});

	it("renders submit button", () => {
		setup();
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("button", { name: /créer la variante/i })).toBeInTheDocument();
	});

	it("renders all card sections via mocks", () => {
		setup();
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByTestId("sku-sidebar-cards")).toBeInTheDocument();
		expect(screen.getByTestId("sku-media-card")).toBeInTheDocument();
	});

	it("renders hidden productId input", () => {
		setup();
		const { container } = render(<CreateProductVariantForm {...defaultProps} />);

		const hiddenInput = container.querySelector('input[name="productId"]');
		expect(hiddenInput).toBeInTheDocument();
		expect((hiddenInput as HTMLInputElement).value).toBe("prod-1");
	});

	it("disables submit when canSubmit is false", () => {
		setup({ canSubmit: false });
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("button", { name: /créer la variante/i })).toBeDisabled();
	});

	it("disables submit and shows pending text when isPending", () => {
		setup({}, { isPending: true });
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("button", { name: /création/i })).toBeDisabled();
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
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("button", { name: /téléversement/i })).toBeDisabled();
	});

	it("renders sr-only status announcement", () => {
		setup();
		render(<CreateProductVariantForm {...defaultProps} />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	// --------------------------------------------------------------------------
	// Server errors (VALIDATION_ERROR — supprimées du toast par createToastCallbacks)
	// --------------------------------------------------------------------------

	describe("server errors", () => {
		it("mappe une VALIDATION_ERROR path-préfixée sur le champ via setFieldMeta", () => {
			const { form } = setup(
				{},
				{ state: { status: ActionStatus.VALIDATION_ERROR, message: "size: Trop long" } },
			);
			render(<CreateProductVariantForm {...defaultProps} />);

			expect(form.setFieldMeta).toHaveBeenCalledWith("size", expect.any(Function));
			const firstCall = form.setFieldMeta.mock.calls.at(0);
			const updater = firstCall?.[1] as (prev: Record<string, unknown>) => Record<string, unknown>;
			expect(updater({ errors: [] }).errors).toEqual(["Trop long"]);
			// Mappée au champ → pas d'alerte globale avec le message brut
			expect(screen.queryByText("size: Trop long")).not.toBeInTheDocument();
		});

		it("affiche une alerte globale pour une VALIDATION_ERROR sans path connu", () => {
			const { form } = setup(
				{},
				{ state: { status: ActionStatus.VALIDATION_ERROR, message: "Données invalides." } },
			);
			render(<CreateProductVariantForm {...defaultProps} />);

			expect(form.setFieldMeta).not.toHaveBeenCalled();
			expect(screen.getByText("Données invalides.")).toBeInTheDocument();
		});

		it("n'affiche rien pour un statut ERROR (couvert par le toast)", () => {
			const { form } = setup(
				{},
				{ state: { status: ActionStatus.ERROR, message: "Erreur serveur" } },
			);
			render(<CreateProductVariantForm {...defaultProps} />);

			expect(form.setFieldMeta).not.toHaveBeenCalled();
			expect(screen.queryByText("Erreur serveur")).not.toBeInTheDocument();
		});
	});
});
