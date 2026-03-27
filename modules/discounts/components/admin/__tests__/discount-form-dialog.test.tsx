import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

let mockDialogState = {
	isOpen: true,
	close: vi.fn(),
	data: null as Record<string, unknown> | null,
};

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialogState,
}));

vi.mock("@/modules/discounts/actions/create-discount", () => ({
	createDiscount: vi.fn(),
}));

vi.mock("@/modules/discounts/actions/update-discount", () => ({
	updateDiscount: vi.fn(),
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_TYPE_LABELS: {
		PERCENTAGE: "Pourcentage",
		FIXED_AMOUNT: "Montant fixe",
	},
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	DiscountType: {
		PERCENTAGE: "PERCENTAGE",
		FIXED_AMOUNT: "FIXED_AMOUNT",
	},
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("react", async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await vi.importActual<typeof import("react")>("react");
	return {
		...actual,
		useActionState: (_action: unknown, _initial: unknown) => [undefined, vi.fn(), false],
	};
});

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => <div className={className}>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button
			data-testid="submit-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p data-testid="required-fields-note">* Champs obligatoires</p>,
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({
		children,
		htmlFor,
		required,
		optional,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		required?: boolean;
		optional?: boolean;
	}) => (
		<label htmlFor={htmlFor} data-required={required} data-optional={optional}>
			{children}
		</label>
	),
	useAppForm: () => ({
		AppField: ({
			children,
			name,
		}: {
			children: (field: {
				name: string;
				state: { value: unknown };
				InputField: (props: Record<string, unknown>) => React.ReactNode;
				SelectField: (props: Record<string, unknown>) => React.ReactNode;
				DateTimeField: (props: Record<string, unknown>) => React.ReactNode;
			}) => React.ReactNode;
			name: string;
		}) =>
			children({
				name,
				state: { value: 0 },
				InputField: ({
					_label,
					type,
					placeholder,
				}: {
					_label?: string;
					type?: string;
					placeholder?: string;
				}) => (
					<input
						data-testid={`field-${name}`}
						type={type}
						placeholder={placeholder as string | undefined}
					/>
				),
				SelectField: ({ placeholder }: { placeholder?: string }) => (
					<select data-testid={`select-${name}`}>
						<option value="">{placeholder}</option>
					</select>
				),
				DateTimeField: ({ label }: { label?: string }) => (
					<input
						data-testid={`datetime-${name}`}
						type="datetime-local"
						placeholder={label as string | undefined}
					/>
				),
			}),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (values: unknown) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown;
		}) => {
			const mockState = {
				canSubmit: true,
				values: { type: "PERCENTAGE" },
			};
			const selected = selector(mockState as Record<string, unknown>);
			return <>{children(selected)}</>;
		},
		reset: vi.fn(),
	}),
}));

import { DiscountFormDialog } from "../discount-form-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogState = {
			isOpen: true,
			close: vi.fn(),
			data: null,
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };
		render(<DiscountFormDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	// ─── Create mode ──────────────────────────────────────────────────────────

	it("shows 'Créer un code promo' title in create mode", () => {
		render(<DiscountFormDialog />);
		expect(screen.getByText("Créer un code promo")).toBeInTheDocument();
	});

	it("shows create mode description", () => {
		render(<DiscountFormDialog />);
		expect(
			screen.getByText("Configurez un nouveau code promo pour vos clients"),
		).toBeInTheDocument();
	});

	it("shows 'Créer' on submit button in create mode", () => {
		render(<DiscountFormDialog />);
		expect(screen.getByTestId("submit-button")).toHaveTextContent("Créer");
	});

	// ─── Update mode ──────────────────────────────────────────────────────────

	it("shows 'Modifier le code promo' title in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				discount: {
					id: "d-1",
					code: "PROMO10",
					type: "PERCENTAGE",
					value: 10,
					minOrderAmount: null,
					maxUsageCount: null,
					maxUsagePerUser: null,
					isActive: true,
					startsAt: null,
					endsAt: null,
				},
			},
		};
		render(<DiscountFormDialog />);
		expect(screen.getByText("Modifier le code promo")).toBeInTheDocument();
	});

	it("shows update mode description", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				discount: {
					id: "d-1",
					code: "PROMO10",
					type: "PERCENTAGE",
					value: 10,
					minOrderAmount: null,
					maxUsageCount: null,
					maxUsagePerUser: null,
					isActive: true,
					startsAt: null,
					endsAt: null,
				},
			},
		};
		render(<DiscountFormDialog />);
		expect(screen.getByText("Modifiez les paramètres du code promo existant")).toBeInTheDocument();
	});

	it("shows 'Enregistrer' on submit button in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				discount: {
					id: "d-1",
					code: "PROMO10",
					type: "PERCENTAGE",
					value: 10,
					minOrderAmount: null,
					maxUsageCount: null,
					maxUsagePerUser: null,
					isActive: true,
					startsAt: null,
					endsAt: null,
				},
			},
		};
		render(<DiscountFormDialog />);
		expect(screen.getByTestId("submit-button")).toHaveTextContent("Enregistrer");
	});

	it("shows hidden id input in update mode", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				discount: {
					id: "d-42",
					code: "PROMO10",
					type: "PERCENTAGE",
					value: 10,
					minOrderAmount: null,
					maxUsageCount: null,
					maxUsagePerUser: null,
					isActive: true,
					startsAt: null,
					endsAt: null,
				},
			},
		};
		const { container } = render(<DiscountFormDialog />);
		const hiddenInput = container.querySelector('input[name="id"]') as HTMLInputElement | null;
		expect(hiddenInput).not.toBeNull();
		expect(hiddenInput?.value).toBe("d-42");
	});

	it("does not show hidden id input in create mode", () => {
		const { container } = render(<DiscountFormDialog />);
		const hiddenInput = container.querySelector('input[name="id"]');
		expect(hiddenInput).toBeNull();
	});

	// ─── Form fields ──────────────────────────────────────────────────────────

	it("shows required fields note", () => {
		render(<DiscountFormDialog />);
		expect(screen.getByTestId("required-fields-note")).toBeInTheDocument();
	});

	it("renders code field", () => {
		render(<DiscountFormDialog />);
		expect(screen.getByTestId("field-code")).toBeInTheDocument();
	});

	it("renders type select field", () => {
		render(<DiscountFormDialog />);
		expect(screen.getByTestId("select-type")).toBeInTheDocument();
	});

	it("renders value field", () => {
		render(<DiscountFormDialog />);
		expect(screen.getByTestId("field-value")).toBeInTheDocument();
	});
});
