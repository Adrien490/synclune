import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpen, mockClose } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
	mockClose: vi.fn(),
}));

// ─── Infrastructure mocks (prevent Stripe/Prisma/Auth init errors) ─────────

vi.mock("stripe", () => ({
	default: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {},
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {},
	notDeleted: {},
	softDelete: {},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PrismaClient: vi.fn(),
}));

let mockIsPending = false;

// Form state used by Subscribe and form.state.values – set by each test before render.
let mockFormValues = {
	isClosed: false,
	closureMessage: "",
	reopensAt: "",
};

// Captures what useAppForm received as defaultValues – written during render.
// Tests that assert on default value initialization read this.
let capturedDefaultValues: typeof mockFormValues = {
	isClosed: false,
	closureMessage: "",
	reopensAt: "",
};

// Controls what Subscribe renders based on which selector is used.
// The form has two Subscribe calls:
//   1. selector=(state) => state.values.isClosed  → renders closure fields
//   2. selector=(state) => ({ isClosed, closureMessage, canSubmit }) → renders button
// We distinguish them by calling the selector with a probe state and checking the return type.
let mockSubscribeIsClosedValue = false;
let mockSubscribeCanSubmit = true;

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useActionState: (_action: unknown, _initial: unknown) => {
			return [undefined, vi.fn(), mockIsPending];
		},
	};
});

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		open: mockOpen,
		close: mockClose,
		isOpen: false,
	}),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: ({ defaultValues }: { defaultValues: typeof mockFormValues }) => {
		// Capture defaultValues for default-value assertion tests without overwriting mockFormValues
		capturedDefaultValues = { ...defaultValues };
		return {
			state: {
				values: mockFormValues,
			},
			AppField: ({
				children,
				name,
			}: {
				children: (field: Record<string, unknown>) => React.ReactNode;
				name: string;
			}) => (
				<div data-testid={`field-${name}`}>
					{children({
						SwitchField: ({ label }: { label: string }) => (
							<label data-testid={`switch-${name}`}>{label}</label>
						),
						TextareaField: ({
							label,
							placeholder,
						}: {
							label: string;
							placeholder?: string;
							maxLength?: number;
							showCounter?: boolean;
							rows?: number;
							required?: boolean;
						}) => (
							<div>
								<label>{label}</label>
								<textarea data-testid={`textarea-${name}`} placeholder={placeholder} />
							</div>
						),
						DateTimeField: ({
							label,
							placeholder,
						}: {
							label: string;
							placeholder?: string;
							optional?: boolean;
						}) => (
							<div>
								<label>{label}</label>
								<input
									data-testid={`datetime-${name}`}
									type="datetime-local"
									placeholder={placeholder}
								/>
							</div>
						),
					})}
				</div>
			),
			// Subscribe is called twice in the component:
			//   1st call: selector returns a boolean (isClosed) → renders closure fields or null
			//   2nd call: selector returns an object { isClosed, closureMessage, canSubmit } → renders button
			// We distinguish them by calling the selector with a probe state object and checking
			// whether the result is a boolean (1st) or an object (2nd).
			Subscribe: ({
				children,
				selector,
			}: {
				children: (value: unknown) => React.ReactNode;
				selector: (state: Record<string, unknown>) => unknown;
			}) => {
				const probeState = {
					values: {
						isClosed: mockSubscribeIsClosedValue,
						closureMessage: mockFormValues.closureMessage,
						reopensAt: mockFormValues.reopensAt,
					},
					canSubmit: mockSubscribeCanSubmit,
				};
				const selected = selector(probeState);
				// If selector returns a boolean, it is the 1st Subscribe (closure fields)
				if (typeof selected === "boolean") {
					return <>{children(selected)}</>;
				}
				// 2nd Subscribe: button rendering — return derived object
				return (
					<>
						{children({
							isClosed: mockSubscribeIsClosedValue,
							closureMessage: mockFormValues.closureMessage,
							canSubmit: mockSubscribeCanSubmit,
						})}
					</>
				);
			},
		};
	},
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid={`badge-${variant}`}>{children}</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		variant,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		variant?: string;
		onClick?: () => void;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
			data-variant={variant}
			onClick={onClick}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({ onSuccess: vi.fn() }),
}));

vi.mock("../../actions/toggle-store-closure", () => ({
	toggleStoreClosure: vi.fn(),
}));

vi.mock("../toggle-store-closure-alert-dialog", () => ({
	TOGGLE_STORE_CLOSURE_DIALOG_ID: "toggle-store-closure",
	ToggleStoreClosureAlertDialog: ({
		isPending,
	}: {
		action: (payload: FormData) => void;
		isPending: boolean;
	}) => <div data-testid="toggle-store-closure-alert-dialog" data-pending={isPending} />,
}));

import { StoreSettingsForm } from "../store-settings-form";
import type { StoreSettingsAdmin } from "../../../types/store-settings.types";

// ============================================================================
// HELPERS
// ============================================================================

function makeSettings(overrides: Partial<StoreSettingsAdmin> = {}): StoreSettingsAdmin {
	return {
		id: "settings-1",
		isClosed: false,
		closureMessage: null,
		reopensAt: null,
		closedAt: null,
		closedBy: null,
		updatedAt: new Date("2026-01-01T10:00:00Z"),
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("StoreSettingsForm", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockSubscribeIsClosedValue = false;
		mockSubscribeCanSubmit = true;
		mockFormValues = {
			isClosed: false,
			closureMessage: "",
			reopensAt: "",
		};
		capturedDefaultValues = {
			isClosed: false,
			closureMessage: "",
			reopensAt: "",
		};
	});

	// ─── Status badge ─────────────────────────────────────────────────────

	it("renders 'Ouverte' badge when store is open", () => {
		render(<StoreSettingsForm settings={makeSettings({ isClosed: false })} />);

		expect(screen.getByTestId("badge-success")).toBeInTheDocument();
		expect(screen.getByText("Ouverte")).toBeInTheDocument();
	});

	it("renders 'Fermée' badge when store is closed", () => {
		render(<StoreSettingsForm settings={makeSettings({ isClosed: true })} />);

		expect(screen.getByTestId("badge-destructive")).toBeInTheDocument();
		expect(screen.getByText("Fermée")).toBeInTheDocument();
	});

	it("shows 'par X le Y' info when closed with closedBy and closedAt", () => {
		render(
			<StoreSettingsForm
				settings={makeSettings({
					isClosed: true,
					closedBy: "admin@synclune.fr",
					closedAt: new Date("2026-03-01T14:30:00Z"),
				})}
			/>,
		);

		expect(screen.getByText(/par admin@synclune\.fr le/)).toBeInTheDocument();
	});

	it("does not show 'par X le Y' when store is open", () => {
		render(
			<StoreSettingsForm
				settings={makeSettings({
					isClosed: false,
					closedBy: "admin@synclune.fr",
					closedAt: new Date("2026-03-01T14:30:00Z"),
				})}
			/>,
		);

		expect(screen.queryByText(/par admin@synclune\.fr/)).not.toBeInTheDocument();
	});

	it("does not show 'par X le Y' when closedBy is null", () => {
		render(
			<StoreSettingsForm
				settings={makeSettings({
					isClosed: true,
					closedBy: null,
					closedAt: new Date("2026-03-01T14:30:00Z"),
				})}
			/>,
		);

		expect(screen.queryByText(/^par /)).not.toBeInTheDocument();
	});

	it("does not show 'par X le Y' when closedAt is null", () => {
		render(
			<StoreSettingsForm
				settings={makeSettings({
					isClosed: true,
					closedBy: "admin@synclune.fr",
					closedAt: null,
				})}
			/>,
		);

		expect(screen.queryByText(/par admin@synclune\.fr/)).not.toBeInTheDocument();
	});

	// ─── Button text ──────────────────────────────────────────────────────

	it("shows 'Fermer la boutique' button when isClosed is true", () => {
		mockSubscribeIsClosedValue = true;
		mockFormValues = { isClosed: true, closureMessage: "Fermée", reopensAt: "" };

		render(<StoreSettingsForm settings={makeSettings({ isClosed: true })} />);

		expect(screen.getByRole("button", { name: "Fermer la boutique" })).toBeInTheDocument();
	});

	it("shows 'Réouvrir la boutique' button when isClosed is false", () => {
		mockSubscribeIsClosedValue = false;
		mockFormValues = { isClosed: false, closureMessage: "", reopensAt: "" };

		render(<StoreSettingsForm settings={makeSettings({ isClosed: false })} />);

		expect(screen.getByRole("button", { name: "Réouvrir la boutique" })).toBeInTheDocument();
	});

	// ─── Closure fields visibility ────────────────────────────────────────

	it("shows closure fields when isClosed is true", () => {
		mockSubscribeIsClosedValue = true;

		render(<StoreSettingsForm settings={makeSettings({ isClosed: true })} />);

		expect(screen.getByTestId("field-closureMessage")).toBeInTheDocument();
		expect(screen.getByTestId("field-reopensAt")).toBeInTheDocument();
		expect(
			screen.getByText("La boutique sera automatiquement réouverte à cette date."),
		).toBeInTheDocument();
	});

	it("hides closure fields when isClosed is false", () => {
		mockSubscribeIsClosedValue = false;

		render(<StoreSettingsForm settings={makeSettings({ isClosed: false })} />);

		expect(screen.queryByTestId("field-closureMessage")).not.toBeInTheDocument();
		expect(screen.queryByTestId("field-reopensAt")).not.toBeInTheDocument();
	});

	// ─── Button disabled states ───────────────────────────────────────────

	it("disables button when isPending is true", () => {
		mockIsPending = true;

		render(<StoreSettingsForm settings={makeSettings()} />);

		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("disables button when canSubmit is false", () => {
		mockSubscribeCanSubmit = false;

		render(<StoreSettingsForm settings={makeSettings()} />);

		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("disables button when isClosed is true and closureMessage is empty", () => {
		mockSubscribeIsClosedValue = true;
		mockFormValues = { isClosed: true, closureMessage: "", reopensAt: "" };
		mockSubscribeCanSubmit = true;

		render(<StoreSettingsForm settings={makeSettings({ isClosed: true })} />);

		expect(screen.getByRole("button", { name: "Fermer la boutique" })).toBeDisabled();
	});

	it("disables button when isClosed is true and closureMessage is whitespace only", () => {
		mockSubscribeIsClosedValue = true;
		mockFormValues = { isClosed: true, closureMessage: "   ", reopensAt: "" };
		mockSubscribeCanSubmit = true;

		render(<StoreSettingsForm settings={makeSettings({ isClosed: true })} />);

		expect(screen.getByRole("button", { name: "Fermer la boutique" })).toBeDisabled();
	});

	it("enables button when isClosed is true and closureMessage is not empty", () => {
		mockSubscribeIsClosedValue = true;
		mockFormValues = { isClosed: true, closureMessage: "Boutique fermée", reopensAt: "" };
		mockSubscribeCanSubmit = true;
		mockIsPending = false;

		render(<StoreSettingsForm settings={makeSettings({ isClosed: true })} />);

		expect(screen.getByRole("button", { name: "Fermer la boutique" })).not.toBeDisabled();
	});

	// ─── confirmDialog.open call ──────────────────────────────────────────

	it("calls confirmDialog.open with form values when store is open and button is clicked", () => {
		mockSubscribeIsClosedValue = false;
		mockFormValues = { isClosed: false, closureMessage: "", reopensAt: "" };
		mockSubscribeCanSubmit = true;

		render(<StoreSettingsForm settings={makeSettings()} />);

		fireEvent.click(screen.getByRole("button", { name: "Réouvrir la boutique" }));

		expect(mockOpen).toHaveBeenCalledOnce();
		expect(mockOpen).toHaveBeenCalledWith({
			isClosed: false,
			closureMessage: "",
			reopensAt: "",
		});
	});

	it("calls confirmDialog.open with closure values when store is being closed", () => {
		mockSubscribeIsClosedValue = true;
		mockFormValues = {
			isClosed: true,
			closureMessage: "Maintenance",
			reopensAt: "2026-04-01T10:00",
		};
		mockSubscribeCanSubmit = true;

		render(<StoreSettingsForm settings={makeSettings({ isClosed: true })} />);

		fireEvent.click(screen.getByRole("button", { name: "Fermer la boutique" }));

		expect(mockOpen).toHaveBeenCalledOnce();
		expect(mockOpen).toHaveBeenCalledWith({
			isClosed: true,
			closureMessage: "Maintenance",
			reopensAt: "2026-04-01T10:00",
		});
	});

	// ─── ToggleStoreClosureAlertDialog ────────────────────────────────────

	it("renders ToggleStoreClosureAlertDialog", () => {
		render(<StoreSettingsForm settings={makeSettings()} />);

		expect(screen.getByTestId("toggle-store-closure-alert-dialog")).toBeInTheDocument();
	});

	it("passes isPending to ToggleStoreClosureAlertDialog", () => {
		mockIsPending = true;

		render(<StoreSettingsForm settings={makeSettings()} />);

		expect(screen.getByTestId("toggle-store-closure-alert-dialog")).toHaveAttribute(
			"data-pending",
			"true",
		);
	});

	// ─── Default values from settings ────────────────────────────────────

	it("initialises form with isClosed from settings", () => {
		render(<StoreSettingsForm settings={makeSettings({ isClosed: true })} />);

		expect(capturedDefaultValues.isClosed).toBe(true);
	});

	it("initialises form with empty closureMessage when settings.closureMessage is null", () => {
		render(<StoreSettingsForm settings={makeSettings({ closureMessage: null })} />);

		expect(capturedDefaultValues.closureMessage).toBe("");
	});

	it("initialises form with closureMessage from settings", () => {
		render(<StoreSettingsForm settings={makeSettings({ closureMessage: "Congés annuels" })} />);

		expect(capturedDefaultValues.closureMessage).toBe("Congés annuels");
	});

	it("initialises form with empty reopensAt when settings.reopensAt is null", () => {
		render(<StoreSettingsForm settings={makeSettings({ reopensAt: null })} />);

		expect(capturedDefaultValues.reopensAt).toBe("");
	});

	it("initialises form with formatted reopensAt when settings.reopensAt is set", () => {
		// Use a fixed local date to avoid timezone flakiness: construct with local parts
		const reopensAt = new Date(2026, 3, 1, 10, 30); // 2026-04-01 10:30 local time

		render(<StoreSettingsForm settings={makeSettings({ reopensAt })} />);

		expect(capturedDefaultValues.reopensAt).toBe("2026-04-01T10:30");
	});

	// ─── Switch field ─────────────────────────────────────────────────────

	it("renders the isClosed switch field", () => {
		render(<StoreSettingsForm settings={makeSettings()} />);

		expect(screen.getByTestId("field-isClosed")).toBeInTheDocument();
		expect(screen.getByText("Boutique fermée")).toBeInTheDocument();
	});

	// ─── Status label ─────────────────────────────────────────────────────

	it("renders the 'Statut actuel :' label", () => {
		render(<StoreSettingsForm settings={makeSettings()} />);

		expect(screen.getByText("Statut actuel :")).toBeInTheDocument();
	});
});
