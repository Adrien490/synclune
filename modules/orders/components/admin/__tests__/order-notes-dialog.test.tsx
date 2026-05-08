import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockOrderNotes } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: false,
		data: null as { orderId: string; orderNumber: string; [key: string]: unknown } | null,
		close: vi.fn(),
	},
	mockOrderNotes: {
		notes: [] as {
			id: string;
			content: string;
			authorName: string;
			createdAt: string;
		}[],
		fetchError: null as string | null,
		loadNotes: vi.fn(),
		reset: vi.fn(),
		add: vi.fn(),
		remove: vi.fn(),
		isPendingFetch: false,
		isPendingAdd: false,
		isPendingDelete: false,
	},
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-order-notes", () => ({
	useOrderNotes: () => mockOrderNotes,
}));

vi.mock("date-fns", () => ({
	format: (_date: Date, _fmt: string) => "1 jan. 2026 à 10:00",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
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
		onClick,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} onClick={onClick} {...(props as Record<string, unknown>)}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: ({
		placeholder,
		value,
		onChange,
		className,
	}: {
		placeholder?: string;
		value?: string;
		onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
		className?: string;
	}) => (
		<textarea
			data-testid="note-textarea"
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			className={className}
		/>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<svg data-testid="loader" className={className} />
	),
	MessageSquarePlus: () => <svg data-testid="icon-message-plus" />,
	StickyNote: () => <svg data-testid="icon-sticky-note" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { OrderNotesDialog } from "../order-notes-dialog";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function openDialog(overrides: { orderId?: string; orderNumber?: string } = {}) {
	mockDialog.isOpen = true;
	mockDialog.data = {
		orderId: "order-1",
		orderNumber: "CMD-001",
		...overrides,
	};
}

function makeNote(overrides: Partial<(typeof mockOrderNotes.notes)[0]> = {}) {
	return {
		id: "note-1",
		content: "Test note content",
		authorName: "Admin User",
		createdAt: "2026-01-01T10:00:00Z",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderNotesDialog", () => {
	describe("visibility", () => {
		it("renders nothing when dialog is closed", () => {
			mockDialog.isOpen = false;
			mockDialog.data = null;
			render(<OrderNotesDialog />);
			expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
		});

		it("shows title 'Notes internes' when open", () => {
			openDialog();
			render(<OrderNotesDialog />);
			expect(screen.getByText("Notes internes")).toBeInTheDocument();
		});

		it("shows order number in description", () => {
			openDialog({ orderNumber: "CMD-2026-007" });
			render(<OrderNotesDialog />);
			expect(screen.getByText("CMD-2026-007")).toBeInTheDocument();
		});
	});

	describe("textarea", () => {
		it("shows textarea with placeholder 'Ajouter une note…'", () => {
			openDialog();
			render(<OrderNotesDialog />);
			expect(screen.getByPlaceholderText("Ajouter une note…")).toBeInTheDocument();
		});

		it("add button is disabled when textarea is empty", () => {
			openDialog();
			render(<OrderNotesDialog />);
			const addButton = screen.getByRole("button", { name: /Ajouter/i });
			expect(addButton).toBeDisabled();
		});
	});

	describe("notes list states", () => {
		it("shows loading spinner when isPendingFetch is true", () => {
			openDialog();
			mockOrderNotes.isPendingFetch = true;
			mockOrderNotes.notes = [];
			mockOrderNotes.fetchError = null;
			render(<OrderNotesDialog />);
			expect(screen.getByTestId("loader")).toBeInTheDocument();
			mockOrderNotes.isPendingFetch = false;
		});

		it("shows error message when fetchError is set", () => {
			openDialog();
			mockOrderNotes.isPendingFetch = false;
			mockOrderNotes.fetchError = "Erreur de chargement des notes";
			mockOrderNotes.notes = [];
			render(<OrderNotesDialog />);
			expect(screen.getByText("Erreur de chargement des notes")).toBeInTheDocument();
			mockOrderNotes.fetchError = null;
		});

		it("shows empty state message when notes list is empty", () => {
			openDialog();
			mockOrderNotes.isPendingFetch = false;
			mockOrderNotes.fetchError = null;
			mockOrderNotes.notes = [];
			render(<OrderNotesDialog />);
			expect(screen.getByText("Aucune note pour cette commande")).toBeInTheDocument();
		});

		it("renders note content when notes exist", () => {
			openDialog();
			mockOrderNotes.isPendingFetch = false;
			mockOrderNotes.fetchError = null;
			mockOrderNotes.notes = [makeNote({ content: "Important: check address" })];
			render(<OrderNotesDialog />);
			expect(screen.getByText("Important: check address")).toBeInTheDocument();
		});

		it("renders note author name", () => {
			openDialog();
			mockOrderNotes.isPendingFetch = false;
			mockOrderNotes.fetchError = null;
			mockOrderNotes.notes = [makeNote({ authorName: "Marie Dupont" })];
			render(<OrderNotesDialog />);
			expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
		});

		it("renders formatted note date", () => {
			openDialog();
			mockOrderNotes.isPendingFetch = false;
			mockOrderNotes.fetchError = null;
			mockOrderNotes.notes = [makeNote()];
			render(<OrderNotesDialog />);
			expect(screen.getByText("1 jan. 2026 à 10:00")).toBeInTheDocument();
		});
	});
});
