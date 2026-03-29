import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";
import type { FaqListItem } from "../../../types/faq.types";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogIsOpen, mockDialogData, mockDialogClose, mockCreateAction, mockUpdateAction } =
	vi.hoisted(() => ({
		mockDialogIsOpen: { current: true },
		mockDialogData: {
			current: null as { faqItem?: FaqListItem } | null,
		},
		mockDialogClose: vi.fn(),
		mockCreateAction: vi.fn(),
		mockUpdateAction: vi.fn(),
	}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockDialogIsOpen.current,
		close: mockDialogClose,
		data: mockDialogData.current,
	}),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof React>();
	return {
		...actual,
		useActionState: vi.fn((action: unknown) => [
			undefined,
			action as (...args: unknown[]) => unknown,
			false,
		]),
		// Do NOT mock useState/useEffect/useRef - let React handle them naturally
	};
});

vi.mock("@/modules/faq/actions/create-faq-item", () => ({
	createFaqItem: mockCreateAction,
}));

vi.mock("@/modules/faq/actions/update-faq-item", () => ({
	updateFaqItem: mockUpdateAction,
}));

vi.mock("@/modules/faq/constants/dialog", () => ({
	FAQ_FORM_DIALOG_ID: "faq-form",
	DELETE_FAQ_DIALOG_ID: "delete-faq",
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({}),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(() => ({
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
						maxLength,
					}: {
						label?: string;
						placeholder?: string;
						required?: boolean;
						maxLength?: number;
					}) => (
						<div>
							{label && <label htmlFor={name}>{label}</label>}
							<input
								id={name}
								data-testid={`input-${name}`}
								placeholder={placeholder}
								required={required}
								maxLength={maxLength}
							/>
						</div>
					),
					TextareaField: ({
						label,
						placeholder,
						required,
						maxLength,
					}: {
						label?: string;
						placeholder?: string;
						required?: boolean;
						maxLength?: number;
					}) => (
						<div>
							{label && <label htmlFor={name}>{label}</label>}
							<textarea
								id={name}
								data-testid={`textarea-${name}`}
								placeholder={placeholder}
								required={required}
								maxLength={maxLength}
							/>
						</div>
					),
					CheckboxField: ({ label }: { label: string }) => (
						<label>
							<input type="checkbox" data-testid={`checkbox-${name}`} />
							{label}
						</label>
					),
				})}
			</div>
		),
	})),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="responsive-dialog-content">{children}</div>
	),
	ResponsiveDialogHeader: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => <div data-testid="responsive-dialog-header">{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="responsive-dialog-title">{children}</h2>
	),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p data-testid="required-fields-note">* Champs obligatoires</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		onClick,
		variant,
		size,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
		variant?: string;
		size?: string;
		"aria-label"?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | "reset"}
			onClick={onClick}
			data-variant={variant}
			aria-label={ariaLabel}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Plus: () => <svg data-testid="icon-plus" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FaqFormDialog } from "../faq-form-dialog";

// ============================================================================
// HELPERS
// ============================================================================

function createFaqItem(overrides: Partial<FaqListItem> = {}): FaqListItem {
	return {
		id: "faq-1",
		question: "Comment commander ?",
		answer: "Cliquez sur acheter.",
		links: null,
		position: 0,
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("FaqFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
		mockDialogData.current = null;
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		render(<FaqFormDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	it("renders dialog content when dialog is open", () => {
		render(<FaqFormDialog />);
		expect(screen.getByTestId("responsive-dialog")).toBeInTheDocument();
	});

	// ─── Create mode ─────────────────────────────────────────────────────────

	it("shows 'Nouvelle question FAQ' title in create mode", () => {
		mockDialogData.current = null;
		render(<FaqFormDialog />);
		expect(screen.getByText("Nouvelle question FAQ")).toBeInTheDocument();
	});

	it("shows 'Créer la question' submit button in create mode", () => {
		mockDialogData.current = null;
		render(<FaqFormDialog />);
		expect(screen.getByText("Créer la question")).toBeInTheDocument();
	});

	// ─── Update mode ─────────────────────────────────────────────────────────

	it("shows 'Modifier la question' title in update mode", () => {
		mockDialogData.current = { faqItem: createFaqItem() };
		render(<FaqFormDialog />);
		expect(screen.getByText("Modifier la question")).toBeInTheDocument();
	});

	it("shows 'Enregistrer' submit button in update mode", () => {
		mockDialogData.current = { faqItem: createFaqItem() };
		render(<FaqFormDialog />);
		expect(screen.getByText("Enregistrer")).toBeInTheDocument();
	});

	it("renders hidden id field in update mode", () => {
		mockDialogData.current = { faqItem: createFaqItem({ id: "faq-42" }) };
		render(<FaqFormDialog />);
		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.value).toBe("faq-42");
	});

	it("does not render hidden id field in create mode", () => {
		mockDialogData.current = null;
		render(<FaqFormDialog />);
		const input = document.querySelector('input[name="id"]');
		expect(input).toBeNull();
	});

	// ─── Form fields ──────────────────────────────────────────────────────────

	it("renders the 'Question' field label", () => {
		render(<FaqFormDialog />);
		expect(screen.getByText("Question")).toBeInTheDocument();
	});

	it("renders the 'Réponse' field label", () => {
		render(<FaqFormDialog />);
		expect(screen.getByText("Réponse")).toBeInTheDocument();
	});

	it("renders the 'Visible sur le site' checkbox field", () => {
		render(<FaqFormDialog />);
		expect(screen.getByText("Visible sur le site")).toBeInTheDocument();
	});

	it("renders the required fields note", () => {
		render(<FaqFormDialog />);
		expect(screen.getByTestId("required-fields-note")).toBeInTheDocument();
	});

	// ─── Links section ────────────────────────────────────────────────────────

	it("renders the 'Liens' section", () => {
		render(<FaqFormDialog />);
		expect(screen.getByText("Liens")).toBeInTheDocument();
	});

	it("renders the 'Ajouter un lien' button", () => {
		render(<FaqFormDialog />);
		expect(screen.getByText("Ajouter un lien")).toBeInTheDocument();
	});

	it("adds a link entry when 'Ajouter un lien' is clicked", () => {
		render(<FaqFormDialog />);
		fireEvent.click(screen.getByText("Ajouter un lien"));
		expect(screen.getByPlaceholderText("Texte du lien")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("URL (ex: /collections)")).toBeInTheDocument();
	});

	it("removes a link entry when delete button is clicked", () => {
		render(<FaqFormDialog />);
		fireEvent.click(screen.getByText("Ajouter un lien"));
		expect(screen.getByPlaceholderText("Texte du lien")).toBeInTheDocument();

		const deleteButton = screen.getByLabelText("Supprimer le lien 0");
		fireEvent.click(deleteButton);
		expect(screen.queryByPlaceholderText("Texte du lien")).not.toBeInTheDocument();
	});

	it("limits links to 5 entries (button disabled at max)", () => {
		render(<FaqFormDialog />);
		const addButton = screen.getByText("Ajouter un lien");
		// Add 5 links
		for (let i = 0; i < 5; i++) {
			fireEvent.click(addButton);
		}
		expect(addButton).toBeDisabled();
	});

	// ─── Links placeholder hint ───────────────────────────────────────────────

	it("shows placeholder syntax hint for links", () => {
		render(<FaqFormDialog />);
		expect(screen.getByText(/Utilisez.*link0.*link1.*dans la réponse/)).toBeInTheDocument();
	});

	// ─── Pre-filled links from faqItem ────────────────────────────────────────

	it("renders without crashing when faqItem has links", () => {
		mockDialogData.current = {
			faqItem: createFaqItem({
				links: [{ text: "Notre boutique", href: "/boutique" }],
			}),
		};
		// The component should render without error even when faqItem has links
		expect(() => render(<FaqFormDialog />)).not.toThrow();
	});
});
