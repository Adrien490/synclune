import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterPush, mockIsPending } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockIsPending: { value: false },
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

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
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
		}: {
			children: (values: unknown[]) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown[];
		}) => <>{children([true, defaultValues.status ?? "DRAFT"])}</>,
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

	it("renders the submit button with 'Créer' label", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
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

	it("shows 'Création...' text when isPending is true", () => {
		mockIsPending.value = true;
		render(<CreateCollectionForm />);
		expect(screen.getByText("Création...")).toBeInTheDocument();
	});

	// ─── Name field placeholder ───────────────────────────────────────────────

	it("renders name input with correct placeholder", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByPlaceholderText("ex: Nouveautés 2025, Collection Été")).toBeInTheDocument();
	});

	// ─── Description placeholder ──────────────────────────────────────────────

	it("renders description textarea with correct placeholder", () => {
		render(<CreateCollectionForm />);
		expect(screen.getByPlaceholderText("Décrivez cette collection...")).toBeInTheDocument();
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
});
