import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockAction } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockAction: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (_id: string) => ({
		isOpen: true,
		data: { requestId: "req-1", clientName: "Sophie", currentNotes: "Note existante" },
		close: mockClose,
	}),
}));

vi.mock("@/modules/customizations/hooks/use-update-customization-notes", () => ({
	useUpdateCustomizationNotes: () => ({ action: mockAction, isPending: false }),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
		open ? <div data-testid="dialog">{children}</div> : null,
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		"aria-busy": ariaBusy,
		...rest
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		"aria-busy"?: boolean;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} disabled={disabled} aria-busy={ariaBusy} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: ({
		value,
		onChange,
		placeholder,
		"aria-label": ariaLabel,
		maxLength,
	}: {
		value?: string;
		onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
		placeholder?: string;
		"aria-label"?: string;
		maxLength?: number;
	}) => (
		<textarea
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			aria-label={ariaLabel}
			maxLength={maxLength}
		/>
	),
}));

import { UpdateNotesDialog } from "../update-notes-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("UpdateNotesDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the dialog title", () => {
		render(<UpdateNotesDialog />);
		expect(screen.getByText("Notes internes")).toBeInTheDocument();
	});

	it("shows the client name in the description", () => {
		render(<UpdateNotesDialog />);
		expect(screen.getByText("Sophie")).toBeInTheDocument();
	});

	it("renders the notes textarea with correct aria-label", () => {
		render(<UpdateNotesDialog />);
		expect(screen.getByLabelText("Notes internes pour la demande")).toBeInTheDocument();
	});

	it("renders the 'Enregistrer' button", () => {
		render(<UpdateNotesDialog />);
		expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
	});

	it("renders the 'Annuler' button", () => {
		render(<UpdateNotesDialog />);
		expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
	});

	it("shows character count", () => {
		render(<UpdateNotesDialog />);
		expect(screen.getByText(/\/2000 caractères/)).toBeInTheDocument();
	});
});
