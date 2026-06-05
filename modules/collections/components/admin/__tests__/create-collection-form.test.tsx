import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterPush, mockIsPending, mockCanSubmit } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockIsPending: { value: false },
	mockCanSubmit: { value: true },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof React>();
	return {
		...actual,
		useActionState: vi.fn((action: unknown) => [undefined, action, mockIsPending.value]),
	};
});

vi.mock("@/modules/collections/actions/create-collection", () => ({
	createCollection: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

type ToastCallbacksConfig = {
	onSuccess?: (result: unknown) => void;
};

const capturedToastCallbacks = vi.hoisted(() => ({ current: null as ToastCallbacksConfig | null }));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: (config: ToastCallbacksConfig) => {
		capturedToastCallbacks.current = config;
		return {};
	},
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/constants/ui-delays", () => ({
	FORM_SUCCESS_REDIRECT_DELAY_MS: 0,
}));

vi.mock("@/app/generated/prisma/enums", () => ({
	CollectionStatus: {
		DRAFT: "DRAFT",
		PUBLIC: "PUBLIC",
		ARCHIVED: "ARCHIVED",
	},
}));

vi.mock("@/modules/collections/constants/collection-status.constants", () => ({
	COLLECTION_STATUS_LABELS: {
		DRAFT: "Brouillon",
		PUBLIC: "Publiée",
		ARCHIVED: "Archivée",
	},
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(({ defaultValues }: { defaultValues: Record<string, unknown> }) => ({
		reset: vi.fn(),
		handleSubmit: vi.fn(),
		state: { isDirty: false, canSubmit: mockCanSubmit.value },
		setFieldValue: vi.fn(),
		AppField: ({
			name,
			children,
		}: {
			name: string;
			children: (field: Record<string, unknown>) => React.ReactNode;
		}) => (
			<div data-testid={`app-field-${name}`}>
				{children({
					name,
					InputField: ({
						label,
						placeholder,
						required,
						disabled,
					}: {
						label?: string;
						placeholder?: string;
						required?: boolean;
						disabled?: boolean;
					}) => (
						<div>
							{label && (
								<label>
									{label}
									{required && " *"}
								</label>
							)}
							<input data-testid={`input-${name}`} placeholder={placeholder} disabled={disabled} />
						</div>
					),
					TextareaField: ({
						label,
						placeholder,
						disabled,
					}: {
						label?: string;
						placeholder?: string;
						disabled?: boolean;
					}) => (
						<div>
							{label && <label>{label}</label>}
							<textarea
								data-testid={`textarea-${name}`}
								placeholder={placeholder}
								disabled={disabled}
							/>
						</div>
					),
					SelectField: ({
						label,
						options,
						disabled,
					}: {
						label?: string;
						options?: { value: string; label: string }[];
						disabled?: boolean;
					}) => (
						<div>
							{label && <label>{label}</label>}
							<select
								data-testid={`select-${name}`}
								defaultValue={defaultValues[name] as string}
								disabled={disabled}
							>
								{options?.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
					),
				})}
			</div>
		),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (values: unknown) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown;
		}) => {
			const fakeState = {
				canSubmit: mockCanSubmit.value,
				values: { ...defaultValues },
				submissionAttempts: 0,
				fieldMeta: {},
			};
			return <>{children(selector(fakeState))}</>;
		},
		AppForm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	})),
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
		<button disabled={disabled} type={type as "button" | "submit" | "reset"}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CreateCollectionForm } from "../create-collection-form";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateCollectionForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
		mockCanSubmit.value = true;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders without crashing", () => {
		expect(() => render(<CreateCollectionForm />)).not.toThrow();
	});

	it("renders the 'Nom' field label", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByText(/Nom/)).toBeInTheDocument();
	});

	it("renders the 'Description' field label", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByText("Description")).toBeInTheDocument();
	});

	it("renders the 'Statut' field label", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByText("Statut")).toBeInTheDocument();
	});

	it("renders the name input field", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("input-name")).toBeInTheDocument();
	});

	it("renders the description textarea", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("textarea-description")).toBeInTheDocument();
	});

	it("renders the status select", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("select-status")).toBeInTheDocument();
	});

	it("renders the submit button with 'Créer la collection' label", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByRole("button", { name: /Créer la collection/ })).toBeInTheDocument();
	});

	// ─── Status options ───────────────────────────────────────────────────────

	it("renders DRAFT and PUBLIC status options (not ARCHIVED for creation)", () => {
		render(<CreateCollectionForm />);
		const select = screen.getByTestId("select-status");
		expect(select).toBeInTheDocument();
		// The select has Brouillon and Publiée options
		expect(screen.getByText("Brouillon")).toBeInTheDocument();
		expect(screen.getByText("Publiée")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Création…' text when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateCollectionForm />);
		expect(screen.getByText("Création…")).toBeInTheDocument();
	});

	// ─── Name field placeholder ───────────────────────────────────────────────

	it("renders name input with correct placeholder", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByPlaceholderText("ex: Nouveautés 2025, Collection Été")).toBeInTheDocument();
	});

	// ─── Description placeholder ──────────────────────────────────────────────

	it("renders description textarea with correct placeholder", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByPlaceholderText("Décrivez cette collection…")).toBeInTheDocument();
	});

	// ─── ARCHIVED option excluded ─────────────────────────────────────────────

	it("does not render the 'Archivée' option in the status select", () => {
		render(<CreateCollectionForm />);
		expect(screen.queryByText("Archivée")).not.toBeInTheDocument();
	});

	// ─── Disabled states when isPending ───────────────────────────────────────

	it("disables the name input when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("input-name")).toBeDisabled();
	});

	it("disables the description textarea when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("textarea-description")).toBeDisabled();
	});

	it("disables the status select when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("select-status")).toBeDisabled();
	});

	it("disables the submit button when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateCollectionForm />);
		expect(screen.getByRole("button", { name: "Création…" })).toBeDisabled();
	});

	// ─── canSubmit=false ──────────────────────────────────────────────────────

	it("disables the submit button when canSubmit is false", () => {
		mockCanSubmit.value = false;
		render(<CreateCollectionForm />);
		expect(screen.getByRole("button", { name: /Créer la collection/ })).toBeDisabled();
	});

	// ─── Hidden status input ───────────────────────────────────────────────────

	it("renders a hidden input with name='status' and default value 'PUBLIC'", () => {
		render(<CreateCollectionForm />);
		const hiddenInput = document.querySelector(
			'input[type="hidden"][name="status"]',
		) as HTMLInputElement;
		expect(hiddenInput).not.toBeNull();
		expect(hiddenInput.value).toBe("PUBLIC");
	});

	// ─── Form element ─────────────────────────────────────────────────────────

	it("renders a <form> element", () => {
		const { container } = render(<CreateCollectionForm />);
		expect(container.querySelector("form")).not.toBeNull();
	});

	it("applies className prop to the form element", () => {
		const { container } = render(<CreateCollectionForm className="custom-class" />);
		const form = container.querySelector("form");
		expect(form?.className).toContain("custom-class");
	});

	// ─── enabled states when not pending ─────────────────────────────────────

	it("does not disable the name input when not pending", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("input-name")).not.toBeDisabled();
	});

	it("does not disable the description textarea when not pending", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("textarea-description")).not.toBeDisabled();
	});

	it("does not disable the status select when not pending", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByTestId("select-status")).not.toBeDisabled();
	});

	// ─── Props ────────────────────────────────────────────────────────────────

	it("accepts className prop", () => {
		const { container } = render(<CreateCollectionForm className="custom-class" />);
		expect(container.firstChild).toBeInTheDocument();
	});

	it("accepts onSuccess callback prop", () => {
		const onSuccess = vi.fn();
		expect(() => render(<CreateCollectionForm onSuccess={onSuccess} />)).not.toThrow();
	});

	it("accepts redirectOnSuccess=false without crashing", () => {
		expect(() => render(<CreateCollectionForm redirectOnSuccess={false} />)).not.toThrow();
	});

	// ─── onCreated callback ──────────────────────────────────────────────────

	it("accepts onCreated callback prop without crashing", () => {
		const onCreated = vi.fn();
		expect(() => render(<CreateCollectionForm onCreated={onCreated} />)).not.toThrow();
	});

	it("calls onCreated with the id returned by the action on success", () => {
		const onCreated = vi.fn();
		render(<CreateCollectionForm onCreated={onCreated} redirectOnSuccess={false} />);

		capturedToastCallbacks.current?.onSuccess?.({
			data: { id: "col-42", name: "Été 2026", collectionStatus: "DRAFT" },
			message: "Collection « Été 2026 » créée",
		});

		expect(onCreated).toHaveBeenCalledWith("col-42");
	});

	it("does not call onCreated when no id is returned", () => {
		const onCreated = vi.fn();
		render(<CreateCollectionForm onCreated={onCreated} redirectOnSuccess={false} />);

		capturedToastCallbacks.current?.onSuccess?.({
			data: { collectionStatus: "DRAFT" },
			message: "Collection « Été 2026 » créée",
		});

		expect(onCreated).not.toHaveBeenCalled();
	});
});
