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

vi.mock("@/modules/collections/actions/update-collection", () => ({
	updateCollection: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
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
							<input
								data-testid={`input-${name}`}
								defaultValue={defaultValues[name] as string}
								placeholder={placeholder}
								disabled={disabled}
							/>
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
								defaultValue={defaultValues[name] as string}
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

import { EditCollectionForm } from "../edit-collection-form";

// ============================================================================
// HELPERS
// ============================================================================

function createCollection(overrides = {}) {
	return {
		id: "col-1",
		name: "Collection Été",
		slug: "collection-ete",
		description: "Une belle collection",
		status: "PUBLIC" as const,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("EditCollectionForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders without crashing", () => {
		expect(() => render(<EditCollectionForm collection={createCollection()} />)).not.toThrow();
	});

	it("renders the 'Nom' field label", () => {
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByText(/Nom/)).toBeInTheDocument();
	});

	it("renders the 'Description' field label", () => {
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByText("Description")).toBeInTheDocument();
	});

	it("renders the 'Statut' field label", () => {
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByText("Statut")).toBeInTheDocument();
	});

	it("renders the name input", () => {
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByTestId("input-name")).toBeInTheDocument();
	});

	it("renders the description textarea", () => {
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByTestId("textarea-description")).toBeInTheDocument();
	});

	it("renders the status select", () => {
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByTestId("select-status")).toBeInTheDocument();
	});

	it("renders the 'Enregistrer' submit button", () => {
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
	});

	// ─── Hidden collection ID ─────────────────────────────────────────────────

	it("includes a hidden input with the collection id", () => {
		render(<EditCollectionForm collection={createCollection({ id: "col-99" })} />);
		const hiddenInput = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(hiddenInput).not.toBeNull();
		expect(hiddenInput.value).toBe("col-99");
	});

	// ─── Pre-populated values ─────────────────────────────────────────────────

	it("pre-populates the name field with collection name", () => {
		render(<EditCollectionForm collection={createCollection({ name: "Bagues printemps" })} />);
		const input = screen.getByTestId("input-name");
		expect(input).toHaveValue("Bagues printemps");
	});

	it("pre-populates description with collection description", () => {
		render(<EditCollectionForm collection={createCollection({ description: "Joli bijoux" })} />);
		const textarea = screen.getByTestId("textarea-description");
		expect(textarea).toHaveValue("Joli bijoux");
	});

	// ─── Status options (all three for edit) ──────────────────────────────────

	it("renders all three status options including ARCHIVED", () => {
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByText("Brouillon")).toBeInTheDocument();
		expect(screen.getByText("Publiée")).toBeInTheDocument();
		expect(screen.getByText("Archivée")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Enregistrement...' when isPending is true", () => {
		mockIsPending.value = true;
		render(<EditCollectionForm collection={createCollection()} />);
		expect(screen.getByText("Enregistrement...")).toBeInTheDocument();
	});

	// ─── Props ────────────────────────────────────────────────────────────────

	it("accepts className prop without crashing", () => {
		expect(() =>
			render(<EditCollectionForm collection={createCollection()} className="custom-class" />),
		).not.toThrow();
	});

	it("accepts onSuccess callback prop", () => {
		const onSuccess = vi.fn();
		expect(() =>
			render(<EditCollectionForm collection={createCollection()} onSuccess={onSuccess} />),
		).not.toThrow();
	});

	it("accepts redirectOnSuccess=false without crashing", () => {
		expect(() =>
			render(<EditCollectionForm collection={createCollection()} redirectOnSuccess={false} />),
		).not.toThrow();
	});

	// ─── Null description ─────────────────────────────────────────────────────

	it("handles null description gracefully", () => {
		expect(() =>
			render(<EditCollectionForm collection={createCollection({ description: null })} />),
		).not.toThrow();
	});
});
